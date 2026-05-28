import React, { useState } from 'react';
import { useTemplates } from '@/hooks/sops/useTemplates';
import { useTemplateCategories } from '@/hooks/sops/useTemplateCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';
import { CategorySidebar } from './CategorySidebar';
import { TemplateCard } from './TemplateCard';
import { TemplatePreview } from './TemplatePreview';
import { TemplateCreator } from './TemplateCreator';
import { useNavigate } from 'react-router-dom';

export const TemplatesGallery = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [showCreator, setShowCreator] = useState(false);

  const { templates, isLoading, useTemplate, isUsingTemplate } = useTemplates(selectedCategory, searchQuery);
  const { categories } = useTemplateCategories();

  const handleUseTemplate = async (templateId: string) => {
    const newPage = await useTemplate(templateId);
    navigate(`/sops/page/${newPage.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading templates...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <CategorySidebar
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Main Content */}
      <div className="flex-1 p-6">
        {/* Header */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Template Gallery</h1>
              <p className="text-muted-foreground mt-1">
                Start with pre-built templates or create your own
              </p>
            </div>
            <Button onClick={() => setShowCreator(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Templates Grid */}
        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-lg font-semibold mb-2">No templates found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try a different search term' : 'Be the first to create a template'}
            </p>
            <Button onClick={() => setShowCreator(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onPreview={() => setPreviewTemplateId(template.id)}
                onUse={() => handleUseTemplate(template.id)}
                isUsing={isUsingTemplate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewTemplateId && (
        <TemplatePreview
          templateId={previewTemplateId}
          onClose={() => setPreviewTemplateId(null)}
          onUse={() => {
            handleUseTemplate(previewTemplateId);
            setPreviewTemplateId(null);
          }}
          isUsing={isUsingTemplate}
        />
      )}

      {/* Creator Modal */}
      {showCreator && (
        <TemplateCreator
          onClose={() => setShowCreator(false)}
        />
      )}
    </div>
  );
};
