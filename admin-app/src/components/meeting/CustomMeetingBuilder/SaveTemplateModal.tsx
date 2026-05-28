import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AgendaItem } from '@/types/meeting';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ensureWrapUpSection } from '@/utils/meetingSectionMapping';
import { logger } from '@/utils/logger';

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingName: string;
  sections: AgendaItem[];
  companyId: string;
  onTemplateSaved?: (templateId: string) => void;
}

export const SaveTemplateModal = ({ 
  isOpen, 
  onClose, 
  meetingName, 
  sections,
  companyId,
  onTemplateSaved,
}: SaveTemplateModalProps) => {
  const [templateName, setTemplateName] = useState(meetingName);
  const [description, setDescription] = useState('');
  const [shared, setShared] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveAsNew = async () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    if (sections.length === 0) {
      toast.error('Cannot save template with no sections');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to save templates');
        return;
      }

      const sectionsWithWrapUp = ensureWrapUpSection(sections);

      const { data, error } = await supabase
        .from('meeting_templates')
        .insert({
          name: templateName,
          meeting_title: meetingName,
          description: description || null,
          sections: sectionsWithWrapUp,
          company_id: companyId,
          created_by: user.id,
          owner_id: user.id,
          shared,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Track custom_meeting_created event (non-blocking)
      try {
        const { trackCustomMeetingCreated } = await import('@/lib/statsigAnalytics');
        // Extract section types/names for analytics
        const sectionNames = sectionsWithWrapUp.map(s => s.type || s.title);
        logger.log('📊 Tracking custom_meeting_created with sections:', sectionNames);
        trackCustomMeetingCreated({
          user_id: user.id,
          company_id: companyId,
          meeting_id: data.id,
          meeting_name: templateName,
          is_recurring: 'false', // Templates are reusable, not recurring by default
          sections: JSON.stringify(sectionNames),
          section_count: sectionsWithWrapUp.length,
        });
      } catch (e) {
        logger.error('❌ Error tracking custom_meeting_created:', e);
      }
      
      // Call the callback with the new template ID
      if (data && onTemplateSaved) {
        onTemplateSaved(data.id);
      }
      
      onClose();
      setTemplateName(meetingName);
      setDescription('');
      setShared(false);
    } catch (error) {
      logger.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as New Template</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Enter template name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-description">Description (Optional)</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe when to use this template"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="share-template"
              checked={shared}
              onCheckedChange={(checked) => setShared(checked === true)}
            />
            <Label 
              htmlFor="share-template" 
              className="text-sm font-normal cursor-pointer"
            >
              Share with company
            </Label>
          </div>

          <div className="text-sm text-muted-foreground">
            This template will include {sections.length} section{sections.length !== 1 ? 's' : ''}.
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveAsNew} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
