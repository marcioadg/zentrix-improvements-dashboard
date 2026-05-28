import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  /**
   * Path within the `chat-files` storage bucket. The agent edge function uses
   * this to download bytes server-side and feed them to Gemini as inlineData,
   * which avoids round-tripping a multi-MB base64 payload through the HTTP
   * gateway. Optional only because sessions saved before this field existed
   * may not have it on re-load — newly-uploaded files always set it.
   */
  storagePath?: string;
  extractedText?: string;
  imageData?: string; // Base64 data URL for images
  uploadedAt: Date;
}

// Convert WebP to PNG using canvas (for AI compatibility)
export const convertWebPToPNG = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(img.src);
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      // Convert to PNG data URL
      const pngDataUrl = canvas.toDataURL('image/png');
      URL.revokeObjectURL(img.src);
      resolve(pngDataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load webp image for conversion'));
    };
    img.src = URL.createObjectURL(file);
  });
};

// Convert image file to base64 data URL
export const convertImageToBase64 = async (file: File): Promise<string> => {
  // For webp files, convert to PNG for better AI compatibility
  if (file.type === 'image/webp') {
    logger.log('🔄 Converting WebP to PNG for AI compatibility:', file.name);
    return convertWebPToPNG(file);
  }
  
  // For other formats, use standard FileReader
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

// Check if file is an image type that AI can analyze
export const isAnalyzableImage = (fileType: string): boolean => {
  return ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(fileType);
};

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/plain',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp'
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_FILE_SIZE_LABEL = '25MB';

// Cap the inlined extracted-text payload so large multi-sheet workbooks don't
// blow up the request body. Gemini still gets the full PDF/image via storage
// download, this only affects the text-extracted view of XLSX/CSV/TXT.
const MAX_EXTRACTED_TEXT_CHARS = 100_000;

const isExcelType = (fileType: string): boolean =>
  fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
  fileType === 'application/vnd.ms-excel';

export const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} not supported. Please upload PDF, DOCX, XLSX, CSV, TXT, or images.`
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE_LABEL} limit. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`
    };
  }

  return { valid: true };
};

/**
 * Parse an Excel workbook into LLM-friendly text. Each sheet becomes a
 * CSV-style block with a clear header so the agent can distinguish sheets in
 * a multi-sheet workbook. SheetJS is dynamically imported so it doesn't
 * inflate bundles on pages that never touch the uploader.
 */
const extractExcelText = async (file: File): Promise<string> => {
  // Dynamic import keeps SheetJS (~1MB) out of every page bundle that doesn't
  // touch the uploader. The interop dance handles both ESM and CJS builds of
  // the package — different bundler configs land us on either shape.
  const mod = await import('xlsx');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const XLSX: any = (mod as any).default ?? mod;
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const sheetBlocks = (workbook.SheetNames as string[]).map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const csv: string = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    return `=== SHEET: ${sheetName} ===\n${csv.trim()}\n=== END SHEET ===`;
  });

  return sheetBlocks.join('\n\n');
};

export const uploadChatFile = async (
  file: File,
  sessionId: string,
  userId: string
): Promise<AttachedFile | null> => {
  try {
    logger.log('📎 Uploading file:', file.name);

    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Upload to Supabase Storage. The path INSIDE the bucket must start with
    // the user's auth.uid — the RLS policy on storage.objects checks
    //   auth.uid()::text = (storage.foldername(name))[1]
    // so prefixing with the bucket name ('chat-files/...') here would land
    // the file under a "chat-files" first folder and get rejected.
    const filePath = `${userId}/${sessionId}/${Date.now()}_${file.name}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      logger.error('Error uploading file:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('chat-files')
      .getPublicUrl(filePath);

    logger.log('✅ File uploaded successfully:', filePath);

    // Extract text content if applicable.
    //  - text/plain & text/csv: read the file directly.
    //  - xlsx/xls: parse with SheetJS into a CSV-style block per sheet.
    //  - images: also convert to base64 for the legacy non-agent chat path.
    //  - PDFs: skipped here. The agent edge function downloads the PDF from
    //    storage and passes it to Gemini as native inlineData (no client-side
    //    extraction needed).
    let extractedText: string | undefined;
    let imageData: string | undefined;

    if (file.type === 'text/plain' || file.type === 'text/csv') {
      extractedText = await file.text();
    } else if (isExcelType(file.type)) {
      try {
        extractedText = await extractExcelText(file);
        logger.log('📊 Excel parsed for AI analysis:', file.name, `(${extractedText.length} chars)`);
      } catch (e) {
        logger.error('Failed to parse Excel file, falling back to filename-only context:', file.name, e);
      }
    } else if (isAnalyzableImage(file.type)) {
      // Convert image to base64 for AI analysis
      imageData = await convertImageToBase64(file);
      logger.log('📷 Image converted to base64 for AI analysis:', file.name);
    }

    if (extractedText && extractedText.length > MAX_EXTRACTED_TEXT_CHARS) {
      extractedText =
        extractedText.slice(0, MAX_EXTRACTED_TEXT_CHARS) +
        `\n\n[Truncated — file was ${extractedText.length} chars, sent first ${MAX_EXTRACTED_TEXT_CHARS}]`;
    }

    const attachedFile: AttachedFile = {
      id: uploadData.path,
      name: file.name,
      size: file.size,
      type: file.type,
      url: urlData.publicUrl,
      storagePath: uploadData.path,
      extractedText,
      imageData,
      uploadedAt: new Date()
    };

    return attachedFile;
  } catch (error) {
    logger.error('Error in uploadChatFile:', error);
    throw error;
  }
};

export const deleteChatFile = async (filePath: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from('chat-files')
      .remove([filePath]);

    if (error) {
      logger.error('Error deleting file:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error in deleteChatFile:', error);
    return false;
  }
};

export const formatFileContext = (files: AttachedFile[]): string => {
  if (files.length === 0) return '';

  let context = '\n\n=== ATTACHED FILES CONTEXT ===\n';

  files.forEach(file => {
    context += `\nFile: ${file.name} (${file.type})\n`;
    if (file.extractedText) {
      context += `Content:\n${file.extractedText}\n`;
    } else if (file.type === 'application/pdf') {
      context += `[PDF attached — the agent reads it natively via the upload payload]\n`;
    } else {
      context += `[File attached but text extraction not available for this file type]\n`;
    }
  });

  context += '\n=== END ATTACHED FILES ===\n\n';

  return context;
};

// Create storage bucket if it doesn't exist (run once on app init)
export const initializeChatFilesBucket = async () => {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'chat-files');

    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket('chat-files', {
        public: false,
        fileSizeLimit: MAX_FILE_SIZE
      });

      if (error) {
        logger.error('Error creating chat-files bucket:', error);
      } else {
        logger.log('✅ chat-files bucket created');
      }
    } else {
      // Bucket may have been created earlier with an old size cap. Raise it
      // to the current MAX_FILE_SIZE so we don't silently reject uploads at
      // the storage layer after bumping the client-side limit.
      const { error } = await supabase.storage.updateBucket('chat-files', {
        public: false,
        fileSizeLimit: MAX_FILE_SIZE,
      });
      if (error) {
        logger.warn('Could not update chat-files bucket size limit (non-fatal):', error.message);
      }
    }
  } catch (error) {
    logger.error('Error initializing chat-files bucket:', error);
  }
};
