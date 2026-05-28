
import React, { useState } from 'react';
import { BaseModal } from '@/components/modals/BaseModal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useFeedbackSubmission } from '@/hooks/useFeedbackSubmission';
import { X } from 'lucide-react';

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { submitFeedback, loading } = useFeedbackSubmission();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
    // Reset file input
    const fileInput = document.getElementById('feedback-image') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      return;
    }

    const success = await submitFeedback(title, description, image);
    
    if (success) {
      // Reset form
      setTitle('');
      setDescription('');
      setImage(null);
      setImagePreview(null);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setTitle('');
    setDescription('');
    setImage(null);
    setImagePreview(null);
    onOpenChange(false);
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Submit Feedback"
      description="Help us improve by sharing your feedback"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitText="Submit Feedback"
      submitDisabled={!title.trim() || loading}
      loading={loading}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="feedback-title">Title *</Label>
          <Input
            id="feedback-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief description of your feedback..."
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="feedback-description">Description</Label>
          <Textarea
            id="feedback-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide more details about your feedback..."
            rows={4}
            maxLength={500}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="feedback-image">Attach Screenshot (optional)</Label>
          <Input
            id="feedback-image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="cursor-pointer"
          />
          
          {imagePreview && (
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-w-full max-h-32 rounded border"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                onClick={handleRemoveImage}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          
          {image && (
            <p className="text-sm text-muted-foreground">
              Selected: {image.name}
            </p>
          )}
        </div>
      </div>
    </BaseModal>
  );
};
