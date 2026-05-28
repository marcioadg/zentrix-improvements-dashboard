
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface AttachmentDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  acceptedFileTypes?: Record<string, string[]>;
  disabled?: boolean;
  className?: string;
}

const DEFAULT_ACCEPTED_TYPES = {
  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
  'application/pdf': ['.pdf'],
  'text/*': ['.txt', '.md'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
};

export const AttachmentDropzone: React.FC<AttachmentDropzoneProps> = ({
  onFilesSelected,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB
  acceptedFileTypes = DEFAULT_ACCEPTED_TYPES,
  disabled = false,
  className,
}) => {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesSelected(acceptedFiles);
    setDragActive(false);
  }, [onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    maxFiles,
    maxSize,
    disabled,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1",
          isDragActive || dragActive
            ? "border-primary bg-primary/5"
            : "border-border",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
        <p className="text-sm text-muted-foreground mb-1">
          {isDragActive ? (
            "Drop the files here..."
          ) : (
            "Drag & drop files here, or click to select"
          )}
        </p>
        <p className="text-xs text-muted-foreground/70">
          Max {maxFiles} files, up to {formatFileSize(maxSize)} each
        </p>
      </div>

      {fileRejections.length > 0 && (
        <div className="mt-2 space-y-1">
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name} className="text-xs text-destructive dark:text-red-400 flex items-center gap-1">
              <X className="h-3 w-3" />
              <span>{file.name}: {errors.map(e => e.message).join(', ')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
