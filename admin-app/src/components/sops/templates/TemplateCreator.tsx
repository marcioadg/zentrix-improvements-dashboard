import React, { useState } from 'react';
import { useTemplateCategories } from '@/hooks/sops/useTemplateCategories';
import { useTemplateCreation } from '@/hooks/sops/useTemplateCreation';
import { usePages } from '@/hooks/sops/usePages';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface TemplateCreatorProps {
  onClose: () => void;
  existingPageId?: string;
}

export const TemplateCreator: React.FC<TemplateCreatorProps> = ({
  onClose,
  existingPageId,
}) => {
  const { categories } = useTemplateCategories();
  const { pages } = usePages();
  const { convertToTemplate, isConverting, uploadThumbnail } = useTemplateCreation();

  const [selectedPageId, setSelectedPageId] = useState(existingPageId || '');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setThumbnailFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPageId || !categoryId || !description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      let thumbnailUrl: string | undefined;

      // Upload thumbnail if provided
      if (thumbnailFile) {
        setIsUploading(true);
        thumbnailUrl = await uploadThumbnail(thumbnailFile);
        setIsUploading(false);
      }

      // Convert page to template
      await convertToTemplate({
        pageId: selectedPageId,
        metadata: {
          categoryId,
          description,
          thumbnail: thumbnailUrl,
        },
      });

      onClose();
    } catch (error) {
      logger.error('Error creating template:', error);
      setIsUploading(false);
    }
  };

  const nonTemplatePages = pages.filter(p => !p.is_template);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Select Page */}
          {!existingPageId && (
            <div className="space-y-2">
              <Label htmlFor="page">Select Page to Convert</Label>
              <Select value={selectedPageId} onValueChange={setSelectedPageId}>
                <SelectTrigger id="page">
                  <SelectValue placeholder="Choose a page..." />
                </SelectTrigger>
                <SelectContent>
                  {nonTemplatePages.map((page) => (
                    <SelectItem key={page.id} value={page.id}>
                      {page.icon} {page.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {nonTemplatePages.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No pages available. Create a page first.
                </p>
              )}
            </div>
          )}

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Choose a category..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe what this template is for and how to use it..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Thumbnail Upload */}
          <div className="space-y-2">
            <Label htmlFor="thumbnail">Thumbnail (optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="thumbnail"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="flex-1"
              />
              {thumbnailFile && (
                <Button variant="outline" size="sm" onClick={() => setThumbnailFile(null)}>
                  Clear
                </Button>
              )}
            </div>
            {thumbnailFile && (
              <div className="mt-2 border rounded-lg p-2 flex items-center gap-2">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{thumbnailFile.name}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isConverting || isUploading || !selectedPageId || !categoryId || !description.trim()}
          >
            {isUploading ? 'Uploading...' : isConverting ? 'Creating...' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
