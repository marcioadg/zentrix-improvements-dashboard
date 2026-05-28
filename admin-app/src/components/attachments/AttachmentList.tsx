
import React from 'react';
import { File, Download, Trash2, Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Attachment } from '@/hooks/useAttachments';
import { cn } from '@/lib/utils';

interface AttachmentListProps {
  attachments: Attachment[];
  onDownload: (attachment: Attachment) => void;
  onDelete: (attachment: Attachment) => void;
  onView: (attachment: Attachment) => void;
  loading?: boolean;
  className?: string;
}

export const AttachmentList: React.FC<AttachmentListProps> = ({
  attachments,
  onDownload,
  onDelete,
  onView,
  loading = false,
  className,
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string, fileName: string) => {
    if (fileType.startsWith('image/')) {
      return '🖼️';
    } else if (fileType === 'application/pdf') {
      return '📄';
    } else if (fileType.includes('word') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
      return '📝';
    } else if (fileType.includes('excel') || fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
      return '📊';
    } else if (fileType.startsWith('text/')) {
      return '📃';
    }
    return '📎';
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-4", className)}>
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2 text-sm text-muted-foreground">Loading attachments...</span>
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className={cn("text-center py-4 text-muted-foreground text-sm", className)}>
        No attachments yet
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center justify-between p-2 sm:p-3 border rounded-lg hover:bg-muted/50 gap-2"
        >
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
            <span className="text-base sm:text-lg flex-shrink-0" role="img" aria-label="file">
              {getFileIcon(attachment.file_type, attachment.file_name)}
            </span>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-xs sm:text-sm font-medium text-foreground truncate leading-tight">
                {attachment.file_name}
              </p>
              <div className="flex items-center space-x-1 sm:space-x-2 mt-0.5 sm:mt-1">
                <Badge variant="secondary" className="text-xs">
                  {formatFileSize(attachment.file_size)}
                </Badge>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {new Date(attachment.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-0.5 sm:space-x-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(attachment)}
              title="View"
              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
            >
              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDownload(attachment)}
              title="Download"
              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(attachment)}
              title="Delete"
              className="text-destructive hover:text-destructive/80 h-7 w-7 sm:h-8 sm:w-8 p-0"
            >
              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
