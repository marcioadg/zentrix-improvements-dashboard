import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Users, UserPlus } from 'lucide-react';
import { PlaybookEditor } from './PlaybookEditor';
import { CreateExamplePlaybookButton } from './CreateExamplePlaybookButton';
import { AssignPlaybookModal } from './AssignPlaybookModal';
import { usePlaybooks } from '@/hooks/usePlaybooks';
import { useAssignments } from '@/hooks/useAssignments';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from "react-router-dom";
import { PlaybookSettingsDropdown } from "./PlaybookSettingsDropdown";
import { logger } from '@/utils/logger';

export const PlaybookManagement: React.FC = () => {
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('list');
  const [selectedPlaybook, setSelectedPlaybook] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [playbookToAssign, setPlaybookToAssign] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState('');

  const { playbooks, loading, createPlaybook, updatePlaybook, deletePlaybook, error } = usePlaybooks();
  const { selfAssignPlaybook } = useAssignments();

  // Don't render anything if profile is not loaded yet
  if (!profile) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
        <span className="ml-2">Loading profile...</span>
      </div>
    );
  }

  // Show error if no company is assigned
  if (!profile.company_id) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                No company assigned to your account. Please contact your administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreatePlaybook = () => {
    logger.log('Creating new playbook');
    setSelectedPlaybook(null);
    setActiveTab('editor');
  };

  const handleCreateExamplePlaybook = async (exampleData: any) => {
    logger.log('Creating example playbook:', exampleData);
    try {
      await createPlaybook(exampleData);
      // Stay on the list view to see the created playbook
    } catch (error) {
      logger.error('Error creating example playbook:', error);
    }
  };

  const handleEditPlaybook = (playbook: any) => {
    logger.log('Editing playbook:', playbook.id);
    setSelectedPlaybook(playbook);
    setActiveTab('editor');
  };

  const handleSavePlaybook = async (playbookData: any) => {
    try {
      logger.log('PlaybookManagement: Saving playbook, selectedPlaybook:', selectedPlaybook?.id);
      if (selectedPlaybook) {
        await updatePlaybook(selectedPlaybook.id, playbookData);
      } else {
        await createPlaybook(playbookData);
      }
      
      setActiveTab('list');
      setSelectedPlaybook(null);
    } catch (error) {
      logger.error('Error saving playbook:', error);
      // Error handling is done in the hook
    }
  };

  const handleDeletePlaybook = async (playbookId: string) => {
    try {
      await deletePlaybook(playbookId);
    } catch (error) {
      logger.error('Error deleting playbook:', error);
      // Error handling is done in the hook
    }
  };

  const handleAssignPlaybook = (playbook: any) => {
    setPlaybookToAssign(playbook);
    setAssignModalOpen(true);
  };

  const handleSelfAssign = async (playbook: any) => {
    try {
      await selfAssignPlaybook(playbook.id);
    } catch (error) {
      logger.error('Error self-assigning playbook:', error);
    }
  };

  const filteredPlaybooks = playbooks.filter(playbook => {
    const matchesSearch = playbook.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         playbook.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = !filterTag || (playbook.tags && playbook.tags.includes(filterTag));
    return matchesSearch && matchesFilter;
  });

  const allTags = Array.from(new Set(playbooks.flatMap(p => p.tags || [])));

    // Add: Handler for copying playbooks (duplicate)
    const handleCopyPlaybook = async (playbook: any) => {
      try {
        // Make a shallow copy and reset necessary fields
        const duplicated = {
          ...playbook,
          id: undefined,
          title: playbook.title + " (Copy)",
          // Optionally clear out timestamps, assignments, etc if needed
        };
        await createPlaybook(duplicated);
      } catch (error) {
        logger.error('Error copying playbook:', error);
      }
    };

  if (activeTab === 'editor') {
    return (
      <PlaybookEditor
        playbookId={selectedPlaybook?.id}
        initialData={selectedPlaybook}
        onSave={handleSavePlaybook}
        onClose={() => setActiveTab('list')}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
        <span className="ml-2">Loading playbooks...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-destructive mb-4">Error loading playbooks: {error}</p>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Add visibility badge helper ---
  function getVisibilityBadge(playbook) {
    switch (playbook.visibility_type) {
      case "everyone": return <Badge variant="default" className="text-xs">Everyone</Badge>;
      case "teams": return <Badge variant="outline" className="text-xs">Teams</Badge>;
      case "people": return <Badge variant="outline" className="text-xs">People</Badge>;
      default: return <Badge variant="secondary" className="text-xs">Assignments Only</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Playbook Management</h2>
          <p className="text-muted-foreground">Create and manage your training playbooks</p>
        </div>
        <div className="flex gap-2">
          {/* Show Training Management button only to admin/manager roles */}
          {profile?.role === 'director' || profile?.role === 'manager' ? (
            <button
              className="flex items-center px-3 py-2 gap-2 bg-secondary rounded-md border border-input hover:bg-accent/60 transition text-primary-foreground"
              title="View Training Management Dashboard"
              onClick={() => navigate('/training-management')}
              type="button"
            >
              <Users className="h-4 w-4" />
              Training Management
            </button>
          ) : null}
          <CreateExamplePlaybookButton onCreateExample={handleCreateExamplePlaybook} />
          <Button onClick={handleCreatePlaybook}>
            <Plus className="h-4 w-4 mr-2" />
            Create Playbook
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search playbooks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
              >
                <option value="">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Playbooks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlaybooks.map(playbook => (
          <Card key={playbook.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{playbook.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{playbook.description}</p>
                  <div className="flex gap-1 mt-1">
                    {getVisibilityBadge(playbook)}
                  </div>
                </div>
                <Badge variant={playbook.is_active ? "default" : "secondary"}>
                  {playbook.is_active ? "Active" : "Draft"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{playbook.modules?.length || 0}</div>
                    <div className="text-xs text-muted-foreground">Modules</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {playbook.modules?.reduce((total, module) => 
                        total + (module.lessons?.length || 0), 0) || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Lessons</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {playbook.modules?.reduce((total, module) => 
                        total + (module.lessons?.reduce((lessonTotal, lesson) => 
                          lessonTotal + (lesson.estimated_duration_minutes || 0), 0) || 0), 0) || 0}m
                    </div>
                    <div className="text-xs text-muted-foreground">Duration</div>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {(playbook.tags || []).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleEditPlaybook(playbook)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  {/* Remove Self-Assign and Copy buttons, move them into settings */}
                  <PlaybookSettingsDropdown
                    onDelete={() => handleDeletePlaybook(playbook.id)}
                    onSelfAssign={() => handleSelfAssign(playbook)}
                    onCopy={() => handleCopyPlaybook(playbook)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPlaybooks.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterTag ? 'No playbooks match your filters' : 'No playbooks created yet'}
              </p>
              <Button onClick={handleCreatePlaybook}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Playbook
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignment Modal */}
      <AssignPlaybookModal
        playbook={playbookToAssign}
        isOpen={assignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setPlaybookToAssign(null);
        }}
      />
    </div>
  );
};
