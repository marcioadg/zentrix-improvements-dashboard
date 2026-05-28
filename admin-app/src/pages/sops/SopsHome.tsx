import React, { useState, useEffect } from 'react';
import { useSpaces } from '@/hooks/sops/useSpaces';
import { usePages } from '@/hooks/sops/usePages';
import { useWorkspaceInit } from '@/hooks/sops/useWorkspaceInit';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Folder, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { Label } from '@/components/ui/label';
import { WelcomeModal } from '@/components/sops/onboarding/WelcomeModal';

export const SopsHome = () => {
  const navigate = useNavigate();
  const { spaces, isLoading: spacesLoading, createSpace } = useSpaces();
  const { pages, isLoading: pagesLoading, createPage } = usePages();
  const { needsInit, isSeeding, seedWorkspace } = useWorkspaceInit();
  const [showSpaceDialog, setShowSpaceDialog] = useState(false);
  const [showPageDialog, setShowPageDialog] = useState(false);
  const [spaceName, setSpaceName] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);

  // Check if user has seen welcome modal
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('sops_onboarding_completed');
    if (!hasSeenWelcome && !spacesLoading && spaces.length === 0) {
      setShowWelcome(true);
    }
  }, [spacesLoading, spaces]);

  const handleGetStarted = () => {
    localStorage.setItem('sops_onboarding_completed', 'true');
    setShowWelcome(false);
    if (needsInit) {
      seedWorkspace();
    }
  };

  const handleSkipWelcome = () => {
    localStorage.setItem('sops_onboarding_completed', 'true');
    setShowWelcome(false);
  };

  const handleCreateSpace = async () => {
    if (!spaceName.trim()) return;
    
    await createSpace({ name: spaceName });
    setSpaceName('');
    setShowSpaceDialog(false);
  };

  const handleCreatePage = async () => {
    if (!pageTitle.trim()) return;
    
    const page = await createPage({ title: pageTitle });
    setPageTitle('');
    setShowPageDialog(false);
    navigate(`/sops/page/${page.id}`);
  };

  if (spacesLoading || pagesLoading || isSeeding) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingState message={isSeeding ? 'Setting up your workspace...' : 'Loading...'} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Welcome Modal */}
      {showWelcome && (
        <WelcomeModal
          onGetStarted={handleGetStarted}
          onSkip={handleSkipWelcome}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SOPs & Documentation</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your standard operating procedures
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/sops/templates')} variant="outline">
            <Sparkles className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button onClick={() => setShowSpaceDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Space
          </Button>
          <Button onClick={() => setShowPageDialog(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            New Page
          </Button>
        </div>
      </div>

      {/* Spaces */}
      {spaces.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Spaces
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {spaces.map((space) => (
              <button
                key={space.id}
                onClick={() => navigate(`/sops/space/${space.id}`)}
                className="p-4 border rounded-lg hover:bg-accent transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{space.icon || '📁'}</div>
                  <div>
                    <h3 className="font-semibold">{space.name}</h3>
                    {space.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {space.description}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Pages */}
      {pages.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Pages
          </h2>
          <div className="space-y-2">
            {pages.slice(0, 10).map((page) => (
              <button
                key={page.id}
                onClick={() => navigate(`/sops/page/${page.id}`)}
                className="w-full p-3 border rounded-lg hover:bg-accent transition-colors text-left flex items-center gap-3"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>{page.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {spaces.length === 0 && pages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No content yet</h3>
          <p className="text-muted-foreground mb-4">Create your first space or page to get started</p>
          <div className="flex gap-2">
            <Button onClick={() => setShowSpaceDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Space
            </Button>
            <Button onClick={() => setShowPageDialog(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              New Page
            </Button>
          </div>
        </div>
      )}

      {/* Create Space Dialog */}
      <Dialog open={showSpaceDialog} onOpenChange={setShowSpaceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Space</DialogTitle>
            <DialogDescription>
              Spaces help you organize related pages together
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="space-name">Space Name</Label>
              <Input
                id="space-name"
                value={spaceName}
                onChange={(e) => setSpaceName(e.target.value)}
                placeholder="e.g., Engineering SOPs"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSpace()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSpaceDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSpace} disabled={!spaceName.trim()}>
                Create Space
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Page Dialog */}
      <Dialog open={showPageDialog} onOpenChange={setShowPageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Page</DialogTitle>
            <DialogDescription>
              Start documenting your processes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="page-title">Page Title</Label>
              <Input
                id="page-title"
                value={pageTitle}
                onChange={(e) => setPageTitle(e.target.value)}
                placeholder="e.g., Onboarding Process"
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePage()}
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
