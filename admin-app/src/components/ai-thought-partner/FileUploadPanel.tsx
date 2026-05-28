import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Paperclip, X, FileText, Image, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AttachedFile, uploadChatFile, validateFile } from '@/services/fileUploadService';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface FileUploadPanelProps {
  sessionId: string;
  userId: string;
  attachedFiles: AttachedFile[];
  onFilesChange: (files: AttachedFile[]) => void;
  disabled?: boolean;
}

export const FileUploadPanel: React.FC<FileUploadPanelProps> = ({
  sessionId,
  userId,
  attachedFiles,
  onFilesChange,
  disabled = false
}) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (disabled || attachedFiles.length >= 5) {
      toast({
        title: 'Upload limit reached',
        description: 'Maximum 5 files per chat session',
        variant: 'destructive'
      });
      return;
    }

    setIsUploading(true);

    try {
      const uploadPromises = acceptedFiles.slice(0, 5 - attachedFiles.length).map(async (file) => {
        const validation = validateFile(file);
        if (!validation.valid) {
          toast({
            title: 'Invalid file',
            description: validation.error,
            variant: 'destructive'
          });
          return null;
        }

        try {
          const uploadedFile = await uploadChatFile(file, sessionId, userId);
          return uploadedFile;
        } catch (error: any) {
          toast({
            title: 'Upload failed',
            description: error.message || 'Failed to upload file',
            variant: 'destructive'
          });
          return null;
        }
      });

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter((f): f is AttachedFile => f !== null);

      if (successfulUploads.length > 0) {
        onFilesChange([...attachedFiles, ...successfulUploads]);
        toast({
          title: 'Files uploaded',
          description: `${successfulUploads.length} file(s) attached successfully`
        });
      }
    } catch (error) {
      logger.error('Error uploading files:', error);
    } finally {
      setIsUploading(false);
    }
  }, [attachedFiles, sessionId, userId, disabled, onFilesChange, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 5,
    disabled: disabled || isUploading || attachedFiles.length >= 5
  });

  const removeFile = (fileId: string) => {
    onFilesChange(attachedFiles.filter(f => f.id !== fileId));
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileSpreadsheet className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (attachedFiles.length === 0 && !isDragActive) {
    return (
      <div {...getRootProps()} className="cursor-pointer">
        <input {...getInputProps()} />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || isUploading}
          className="text-muted-foreground hover:text-foreground"
        >
          <Paperclip className="w-4 h-4 mr-2" />
          {isUploading ? 'Uploading...' : 'Attach files'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg text-sm border border-border"
            >
              {getFileIcon(file.type)}
              <span className="max-w-[150px] truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </span>
              <button
                onClick={() => removeFile(file.id)}
                className="ml-1 text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 rounded-sm p-0.5"
                disabled={disabled}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {attachedFiles.length < 5 && (
        <div {...getRootProps()} className="cursor-pointer">
          <input {...getInputProps()} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || isUploading}
            className={`text-muted-foreground hover:text-foreground ${isDragActive ? 'bg-primary/10' : ''}`}
          >
            <Paperclip className="w-4 h-4 mr-2" />
            {isDragActive ? 'Drop files here' : isUploading ? 'Uploading...' : `Add more (${5 - attachedFiles.length} left)`}
          </Button>
        </div>
      )}
    </div>
  );
};
