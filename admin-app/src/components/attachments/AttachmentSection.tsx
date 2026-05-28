
import React, { useEffect, useState } from 'react';
import { Paperclip, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AttachmentDropzone } from './AttachmentDropzone';
import { AttachmentList } from './AttachmentList';
import { useAttachments } from '@/hooks/useAttachments';
import { logger } from '@/utils/logger';

interface AttachmentSectionProps {
  entityType: 'task' | 'issue';
  entityId: string;
  title?: string;
  className?: string;
}

export const AttachmentSection: React.FC<AttachmentSectionProps> = ({
  entityType,
  entityId,
  title = "Attachments",
  className,
}) => {
  const [showDropzone, setShowDropzone] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const {
    attachments,
    loading,
    uploading,
    fetchAttachments,
    uploadFile,
    deleteAttachment,
    getDownloadUrl,
    getViewUrl,
  } = useAttachments(entityType, entityId);

  useEffect(() => {
    if (entityId) {
      logger.log('🔍 AttachmentSection: useEffect triggered', { entityType, entityId });
      fetchAttachments();
    }
  }, [entityId, entityType]);

  const handleFilesSelected = async (files: File[]) => {
    for (const file of files) {
      await uploadFile(file);
    }
    setShowDropzone(false);
  };

  const handleDownload = async (attachment: any) => {
    const url = await getDownloadUrl(attachment);
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleView = async (attachment: any) => {
    const url = await getViewUrl(attachment);
    if (url) {
      // Open in new tab for viewing
      window.open(url, '_blank');
    }
  };

  const handleDelete = async (attachment: any) => {
    if (confirm(`Are you sure you want to delete ${attachment.file_name}?`)) {
      await deleteAttachment(attachment);
    }
  };

  return (
    <div className={className}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-0 h-auto">
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              <span className="font-medium">{title}</span>
              {attachments.length > 0 && (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                  {attachments.length}
                </span>
              )}
            </div>
            <Plus className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-45' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-3 mt-3">
          {showDropzone ? (
            <div className="space-y-3">
              <AttachmentDropzone
                onFilesSelected={handleFilesSelected}
                disabled={uploading}
              />
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowDropzone(false)}
                  disabled={uploading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDropzone(true)}
              disabled={uploading}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Attachment
            </Button>
          )}

          <AttachmentList
            attachments={attachments}
            onDownload={handleDownload}
            onView={handleView}
            onDelete={handleDelete}
            loading={loading}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
