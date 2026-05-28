import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SopSpace } from '@/types/sops';
import { usePages } from '@/hooks/sops/usePages';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const SopsSpace = () => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const { pages, createPage } = usePages(spaceId);
  const [showPageDialog, setShowPageDialog] = useState(false);
  const [pageTitle, setPageTitle] = useState('');

  const { data: space, isLoading } = useQuery({
    queryKey: ['sop_space', spaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sop_spaces')
        .select('*')
        .eq('id', spaceId!)
        .single();

      if (error) throw error;
      return data as SopSpace;
    },
    enabled: !!spaceId
  });

  const handleCreatePage = async () => {
    if (!pageTitle.trim()) return;

    const page = await createPage({ 
      title: pageTitle, 
      space_id: spaceId 
    });
    setPageTitle('');
    setShowPageDialog(false);
    navigate(`/sops/page/${page.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!space) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Space not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-5xl">{space.icon || '📁'}</span>
            <h1 className="text-3xl font-bold">{space.name}</h1>
          </div>
          {space.description && (
            <p className="text-muted-foreground">{space.description}</p>
          )}
        </div>
        <Button onClick={() => setShowPageDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Page
        </Button>
      </div>

      {/* Pages in this space */}
      {pages.length > 0 ? (
        <div className="space-y-2">
          {pages.map((page) => (
            <button
              key={page.id}
              onClick={() => navigate(`/sops/page/${page.id}`)}
              className="w-full p-4 border rounded-lg hover:bg-accent transition-colors text-left flex items-center gap-3"
            >
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-semibold">{page.title}</h3>
                <p className="text-xs text-muted-foreground">
                  Updated {new Date(page.updated_at).toLocaleDateString()}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No pages yet</h3>
          <p className="text-muted-foreground mb-4">Create your first page in this space</p>
          <Button onClick={() => setShowPageDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Page
          </Button>
        </div>
      )}

      {/* Create Page Dialog */}
      <Dialog open={showPageDialog} onOpenChange={setShowPageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Page</DialogTitle>
            <DialogDescription>
              Add a new page to {space.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="page-title">Page Title</Label>
              <Input
                id="page-title"
                value={pageTitle}
                onChange={(e) => setPageTitle(e.target.value)}
                placeholder="e.g., Deployment Process"
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePage()}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPageDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePage} disabled={!pageTitle.trim()}>
                Create Page
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
