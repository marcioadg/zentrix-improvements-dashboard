import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Eye, EyeOff, ExternalLink, RefreshCw } from 'lucide-react';
import { useBlogPosts, BlogPost } from '@/hooks/useBlogPosts';
import { BlogPostEditor } from './BlogPostEditor';
import { format } from 'date-fns';
import { updateBlogPostsContent } from '@/utils/blogContentUpdater';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { logger } from '@/utils/logger';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const BlogManagement: React.FC = () => {
  const { posts, loading, deletePost, updatePost, fetchPosts } = useBlogPosts();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);
  const [isUpdatingContent, setIsUpdatingContent] = useState(false);
  const { toast } = useToast();

  const handleUpdateContent = async () => {
    setIsUpdatingContent(true);
    try {
      const results = await updateBlogPostsContent();
      const success = results.every(r => r.success);
      if (success) {
        toast({
          title: 'Content Updated',
          description: 'Blog posts have been updated with formatted markdown.',
        });
        await fetchPosts();
      } else {
        toast({
          title: 'Error',
          description: 'Some posts failed to update.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Error updating content:', error);
      toast({
        title: 'Error',
        description: 'Failed to update blog content.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingContent(false);
    }
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingPost(null);
    setEditorOpen(true);
  };

  const handleDelete = (post: BlogPost) => {
    setPostToDelete(post);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (postToDelete) {
      await deletePost(postToDelete.id);
      setDeleteDialogOpen(false);
      setPostToDelete(null);
    }
  };

  const togglePublished = async (post: BlogPost) => {
    await updatePost({
      id: post.id,
      published: !post.published,
    });
  };

  const publishedCount = posts.filter(p => p.published).length;
  const draftCount = posts.filter(p => !p.published).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Blog Management</h2>
          <p className="text-muted-foreground">
            Create and manage blog posts for zentrixos.com/blog
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleUpdateContent} 
            variant="outline" 
            className="gap-2"
            disabled={isUpdatingContent}
          >
            <RefreshCw className={`h-4 w-4 ${isUpdatingContent ? 'animate-spin' : ''}`} />
            {isUpdatingContent ? 'Updating...' : 'Update Content'}
          </Button>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            New Post
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{posts.length}</div>
            <p className="text-muted-foreground text-sm">Total Posts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-success">{publishedCount}</div>
            <p className="text-muted-foreground text-sm">Published</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">{draftCount}</div>
            <p className="text-muted-foreground text-sm">Drafts</p>
          </CardContent>
        </Card>
      </div>

      {/* Posts Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Posts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading posts...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No blog posts yet</p>
              <Button onClick={handleCreate} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Create your first post
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{post.title}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          /blog/{post.slug}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={post.published ? 'default' : 'secondary'}>
                        {post.published ? 'Published' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell>{post.author}</TableCell>
                    <TableCell>
                      {post.published_at
                        ? format(new Date(post.published_at), 'MMM d, yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => togglePublished(post)}
                          aria-label={post.published ? 'Unpublish' : 'Publish'}
                          title={post.published ? 'Unpublish' : 'Publish'}
                        >
                          {post.published ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        {post.published && (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            aria-label="View live"
                            title="View live"
                          >
                            <a
                              href={`/blog/${post.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(post)}
                          aria-label="Edit post"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(post)}
                          aria-label="Delete post"
                          title="Delete"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Editor Dialog */}
      <BlogPostEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        post={editingPost}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blog Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{postToDelete?.title}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
