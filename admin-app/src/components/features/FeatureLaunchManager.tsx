import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Rocket, Plus, Edit, Play, Pause, Trash2, Eye, ExternalLink } from 'lucide-react';
import { FeatureNews, FeatureArticle } from '@/components/ui/feature-news';
import { featureAnnouncementService, FeatureAnnouncement } from '@/services/featureAnnouncementService';
import { ImageUpload } from '@/components/ui/ImageUpload';

export const FeatureLaunchManager: React.FC = () => {
  const [features, setFeatures] = useState<FeatureAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newFeature, setNewFeature] = useState({
    title: '',
    summary: '',
    image: '',
    type: 'feature' as 'feature' | 'update' | 'announcement',
    target_audience: 'all' as 'all' | 'admins' | 'specific_company'
  });
  const [previewFeatures, setPreviewFeatures] = useState<FeatureArticle[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const loadFeatures = async () => {
    try {
      setLoading(true);
      const data = await featureAnnouncementService.getAllAnnouncements();
      setFeatures(data);
    } catch (error) {
      toast({
        title: 'Error loading features',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeatures();
  }, []);

  const handleCreate = async () => {
    if (!newFeature.title.trim() || !newFeature.summary.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter both title and description',
        variant: 'destructive',
      });
      return;
    }

    try {
      await featureAnnouncementService.createAnnouncement({
        title: newFeature.title.trim(),
        summary: newFeature.summary.trim(),
        image: newFeature.image || undefined,
        type: newFeature.type,
        target_audience: newFeature.target_audience
      });
      
      setNewFeature({
        title: '',
        summary: '',
        image: '',
        type: 'feature',
        target_audience: 'all'
      });
      setIsCreating(false);
      await loadFeatures();
      toast({
        title: 'Feature launched!',
        description: 'The feature announcement has been created and will appear in user newsfeeds',
      });
    } catch (error) {
      toast({
        title: 'Error creating feature',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feature announcement? This action cannot be undone.')) {
      return;
    }

    try {
      await featureAnnouncementService.deleteAnnouncement(id);
      await loadFeatures();
      toast({
        title: 'Feature deleted',
        description: 'The feature announcement has been permanently deleted',
      });
    } catch (error) {
      toast({
        title: 'Error deleting feature',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await featureAnnouncementService.updateAnnouncement(id, { 
        is_active: !currentStatus 
      });
      await loadFeatures();
      toast({
        title: currentStatus ? 'Feature deactivated' : 'Feature activated',
        description: currentStatus 
          ? 'The feature announcement is no longer visible to users'
          : 'The feature announcement is now active and visible to users',
      });
    } catch (error) {
      toast({
        title: 'Error updating feature',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  const handlePreview = () => {
    if (!newFeature.title.trim() || !newFeature.summary.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter both title and description to preview',
        variant: 'destructive',
      });
      return;
    }

    const previewFeature: FeatureArticle = {
      title: newFeature.title,
      summary: newFeature.summary,  
      href: '#preview',
      image: newFeature.image || undefined,
      type: newFeature.type,
      created_at: new Date().toISOString(),
    };
    setPreviewFeatures([previewFeature]);
    setShowPreview(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'feature':
        return <Rocket className="h-4 w-4" />;
      case 'update':
        return <Play className="h-4 w-4" />;
      case 'announcement':
        return <ExternalLink className="h-4 w-4" />;
      default:
        return <Rocket className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'feature':
        return 'bg-primary/10 text-primary border-primary/30';
      case 'update':
        return 'bg-success/10 text-success border-success/30';
      case 'announcement':
        return 'bg-warning/10 text-warning border-warning/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
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
        <Rocket className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-medium">Feature Launch Manager</h3>
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Preview (News Card):</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(false)}
            >
              Hide Preview
            </Button>
          </div>
          <div className="w-56 h-[400px] border rounded-lg bg-gradient-to-br from-background to-muted relative">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-56">
              <FeatureNews articles={previewFeatures} />
            </div>
          </div>
        </div>
      )}

      {/* Create New Feature */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Launch New Feature</CardTitle>
          <CardDescription>
            Create a new feature announcement that will appear in user newsfeeds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isCreating ? (
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Launch Feature
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    placeholder="Feature title..."
                    value={newFeature.title}
                    onChange={(e) => setNewFeature({ ...newFeature, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select
                    value={newFeature.type}
                    onValueChange={(value: 'feature' | 'update' | 'announcement') => 
                      setNewFeature({ ...newFeature, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Feature description..."
                  value={newFeature.summary}
                  onChange={(e) => setNewFeature({ ...newFeature, summary: e.target.value })}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Feature Image</label>
                  <ImageUpload
                    onImageUpload={(imageUrl) => setNewFeature({ ...newFeature, image: imageUrl })}
                    currentImage={newFeature.image}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Audience</label>
                  <Select
                    value={newFeature.target_audience}
                    onValueChange={(value: 'all' | 'admins' | 'specific_company') => 
                      setNewFeature({ ...newFeature, target_audience: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="admins">Admins Only</SelectItem>
                      <SelectItem value="specific_company">Company Specific</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreate} size="sm">
                  Launch Feature
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                  disabled={!newFeature.title.trim() || !newFeature.summary.trim()}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsCreating(false);
                    setNewFeature({ title: '', summary: '', image: '', type: 'feature', target_audience: 'all' });
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

      {/* Existing Features */}
      <div className="space-y-4">
        <h4 className="font-medium">Launched Features</h4>
        
        {features.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No features launched yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {features.map((feature) => (
              <Card key={feature.id}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={`${getTypeColor(feature.type)} ${feature.is_active ? '' : 'opacity-50'}`}>
                          {getTypeIcon(feature.type)}
                          <span className="ml-1 capitalize">{feature.type}</span>
                        </Badge>
                        <Badge variant={feature.is_active ? 'default' : 'secondary'}>
                          {feature.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Launched {formatDate(feature.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h5 className="font-medium">{feature.title}</h5>
                      <p className="text-sm text-muted-foreground">{feature.summary}</p>
                      {feature.image && (
                        <div className="mt-2">
                          <img
                            src={feature.image}
                            alt={feature.title}
                            className="w-20 h-20 object-cover rounded border"
                          />
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Target: {feature.target_audience === 'all' ? 'All Users' : 
                                feature.target_audience === 'admins' ? 'Company Admins' : 
                                'Current Company'}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(feature.id, feature.is_active)}
                      >
                        {feature.is_active ? (
                          <>
                            <Pause className="h-4 w-4 mr-2" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Activate
                          </>
                        )}
                      </Button>
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(feature.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
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
