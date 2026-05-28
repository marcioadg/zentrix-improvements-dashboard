import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Megaphone, Plus, Edit, Play, Pause, Trash2, Eye } from 'lucide-react';
import { announcementService, SystemAnnouncement } from '@/services/announcementService';

export const AnnouncementManagement: React.FC = () => {
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [previewMessage, setPreviewMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await announcementService.getAllAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      toast({
        title: 'Error loading announcements',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleCreate = async () => {
    if (!newMessage.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an announcement message',
        variant: 'destructive',
      });
      return;
    }

    try {
      await announcementService.createAnnouncement(newMessage.trim());
      setNewMessage('');
      setIsCreating(false);
      await loadAnnouncements();
      toast({
        title: 'Announcement created',
        description: 'The announcement has been created and is now active',
      });
    } catch (error) {
      toast({
        title: 'Error creating announcement',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editMessage.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an announcement message',
        variant: 'destructive',
      });
      return;
    }

    try {
      await announcementService.updateAnnouncement(id, editMessage.trim());
      setEditingId(null);
      setEditMessage('');
      await loadAnnouncements();
      toast({
        title: 'Announcement updated',
        description: 'The announcement has been updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error updating announcement',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await announcementService.activateAnnouncement(id);
      await loadAnnouncements();
      toast({
        title: 'Announcement activated',
        description: 'The announcement is now active and visible to all users',
      });
    } catch (error) {
      toast({
        title: 'Error activating announcement',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await announcementService.deactivateAnnouncement(id);
      await loadAnnouncements();
      toast({
        title: 'Announcement deactivated',
        description: 'The announcement is no longer visible to users',
      });
    } catch (error) {
      toast({
        title: 'Error deactivating announcement',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement? This action cannot be undone.')) {
      return;
    }

    try {
      await announcementService.deleteAnnouncement(id);
      await loadAnnouncements();
      toast({
        title: 'Announcement deleted',
        description: 'The announcement has been permanently deleted',
      });
    } catch (error) {
      toast({
        title: 'Error deleting announcement',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleStartEdit = (announcement: SystemAnnouncement) => {
    setEditingId(announcement.id);
    setEditMessage(announcement.message);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditMessage('');
  };

  const handlePreview = (message: string) => {
    setPreviewMessage(message);
    setShowPreview(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-medium">System Announcements</h3>
      </div>

      {/* Preview Banner */}
      {showPreview && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Preview:</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(false)}
            >
              Hide Preview
            </Button>
          </div>
          <div className="bg-destructive text-white p-3 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex-1 text-center">
                <p className="text-sm font-medium">{previewMessage}</p>
              </div>
              <div className="ml-4 flex-shrink-0 text-white/80">×</div>
            </div>
          </div>
        </div>
      )}

      {/* Create New Announcement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create New Announcement</CardTitle>
          <CardDescription>
            Create a new system-wide announcement. Only one announcement can be active at a time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isCreating ? (
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Announcement
            </Button>
          ) : (
            <div className="space-y-4">
              <Textarea
                placeholder="Enter your announcement message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <div className="flex gap-2">
                <Button onClick={handleCreate} size="sm">
                  Create & Activate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreview(newMessage)}
                  disabled={!newMessage.trim()}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsCreating(false);
                    setNewMessage('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Existing Announcements */}
      <div className="space-y-4">
        <h4 className="font-medium">Existing Announcements</h4>
        
        {announcements.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No announcements created yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={announcement.is_active ? 'default' : 'secondary'}>
                          {announcement.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Created {formatDate(announcement.created_at)}
                        </span>
                      </div>
                    </div>

                    {editingId === announcement.id ? (
                      <div className="space-y-4">
                        <Textarea
                          value={editMessage}
                          onChange={(e) => setEditMessage(e.target.value)}
                          rows={3}
                          className="resize-none"
                        />
                        <div className="flex gap-2">
                          <Button 
                            size="sm"
                            onClick={() => handleUpdate(announcement.id)}
                          >
                            Save Changes
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreview(editMessage)}
                            disabled={!editMessage.trim()}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm">{announcement.message}</p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStartEdit(announcement)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          
                          {announcement.is_active ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeactivate(announcement.id)}
                            >
                              <Pause className="h-4 w-4 mr-2" />
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleActivate(announcement.id)}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Activate
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreview(announcement.message)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(announcement.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
