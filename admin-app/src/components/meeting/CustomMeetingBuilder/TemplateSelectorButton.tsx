import { FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TemplateSelectorButtonProps {
  currentTemplateId?: string;
  currentTemplateName: string | null;
  meetingName: string;
  onClick: () => void;
  hasUnsavedChanges: boolean;
}

export function TemplateSelectorButton({
  currentTemplateId,
  currentTemplateName,
  meetingName,
  onClick,
  hasUnsavedChanges,
}: TemplateSelectorButtonProps) {
  const displayValue = currentTemplateName || meetingName;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="h-9 text-sm min-w-[200px] justify-between gap-2"
    >
      <span className="truncate">
        {displayValue}
        {hasUnsavedChanges && <span className="text-orange-500 ml-1">*</span>}
      </span>
      <FolderOpen className="h-4 w-4 shrink-0" />
    </Button>
  );
}
