
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Star, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { safeStorage } from '@/utils/safeStorage';

interface CustomPrompt {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CustomPromptManagerProps {
  onPromptSelect: (prompt: string) => void;
}

const DEFAULT_CATEGORIES = [
  'Strategy',
  'Operations', 
  'Team',
  'Financial',
  'Marketing',
  'Product',
  'Custom'
];

export const CustomPromptManager: React.FC<CustomPromptManagerProps> = ({ onPromptSelect }) => {
  const [prompts, setPrompts] = useState<CustomPrompt[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Load prompts from localStorage on component mount
  useEffect(() => {
    const savedPrompts = safeStorage.getItem('customPrompts');
    if (savedPrompts) {
      try {
        const parsed = JSON.parse(savedPrompts);
        setPrompts(parsed.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt)
        })));
      } catch (error) {
        logger.error('Error loading prompts:', error);
      }
    }
  }, []);

  // Save prompts to localStorage whenever prompts change
  useEffect(() => {
    safeStorage.setItem('customPrompts', JSON.stringify(prompts));
  }, [prompts]);

  const handleCreatePrompt = (promptData: Omit<CustomPrompt, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newPrompt: CustomPrompt = {
      ...promptData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setPrompts(prev => [...prev, newPrompt]);
    setIsCreateModalOpen(false);
    
    toast({
      title: "Success",
      description: "Custom prompt created successfully"
    });
  };

  const handleEditPrompt = (promptData: Omit<CustomPrompt, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingPrompt) return;
    
    setPrompts(prev => prev.map(p => 
      p.id === editingPrompt.id 
        ? { ...p, ...promptData, updatedAt: new Date() }
        : p
    ));
    
    setEditingPrompt(null);
    
    toast({
      title: "Success", 
      description: "Prompt updated successfully"
    });
  };

  const handleDeletePrompt = (id: string) => {
    setPrompts(prev => prev.filter(p => p.id !== id));
    toast({
      title: "Success",
      description: "Prompt deleted successfully"
    });
  };

  const handleToggleFavorite = (id: string) => {
    setPrompts(prev => prev.map(p => 
      p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
    ));
  };

  const filteredPrompts = prompts.filter(prompt => {
    const matchesCategory = selectedCategory === 'All' || prompt.category === selectedCategory;
    const matchesSearch = prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prompt.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prompt.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const categories = ['All', ...DEFAULT_CATEGORIES];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Custom Prompts</h3>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Prompt
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Custom Prompt</DialogTitle>
            </DialogHeader>
            <PromptForm onSubmit={handleCreatePrompt} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Input
          placeholder="Search prompts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-2 flex-wrap">
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Prompts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPrompts.map(prompt => (
          <Card key={prompt.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm line-clamp-2">{prompt.title}</CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleFavorite(prompt.id)}
                    className="p-1 h-auto"
                  >
                    <Star className={`h-3 w-3 ${prompt.isFavorite ? 'fill-warning text-warning' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingPrompt(prompt)}
                    className="p-1 h-auto"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePrompt(prompt.id)}
                    className="p-1 h-auto text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground line-clamp-3">{prompt.content}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex gap-1 flex-wrap">
                  <Badge variant="secondary" className="text-xs">{prompt.category}</Badge>
                  {prompt.tags.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                  {prompt.tags.length > 2 && (
                    <Badge variant="outline" className="text-xs">+{prompt.tags.length - 2}</Badge>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPromptSelect(prompt.content)}
                  className="flex-1"
                >
                  Use Prompt
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(prompt.content);
                    toast({ title: "Copied to clipboard" });
                  }}
                  className="p-2"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPrompts.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No prompts found. Create your first custom prompt to get started!</p>
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={editingPrompt !== null} onOpenChange={(open) => !open && setEditingPrompt(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Prompt</DialogTitle>
          </DialogHeader>
          {editingPrompt && (
            <PromptForm 
              initialData={editingPrompt}
              onSubmit={handleEditPrompt}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Separate form component for creating/editing prompts
interface PromptFormProps {
  initialData?: Partial<CustomPrompt>;
  onSubmit: (data: Omit<CustomPrompt, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

const PromptForm: React.FC<PromptFormProps> = ({ initialData, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    content: initialData?.content || '',
    category: initialData?.category || 'Custom',
    tags: initialData?.tags || [],
    isFavorite: initialData?.isFavorite || false
  });
  const [newTag, setNewTag] = useState('');

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title.trim() && formData.content.trim()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Title</label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Enter prompt title..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Content</label>
        <Textarea
          value={formData.content}
          onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
          placeholder="Enter your prompt content... Use {company_name}, {time_period} for dynamic variables"
          rows={6}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Category</label>
        <select
          value={formData.category}
          onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
          className="w-full p-2 border border-border rounded-md"
        >
          {DEFAULT_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Tags</label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add tag..."
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
          />
          <Button type="button" onClick={handleAddTag}>Add</Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {formData.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
              {tag} ×
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="favorite"
          checked={formData.isFavorite}
          onChange={(e) => setFormData(prev => ({ ...prev, isFavorite: e.target.checked }))}
        />
        <label htmlFor="favorite" className="text-sm">Mark as favorite</label>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="submit">
          {initialData ? 'Update' : 'Create'} Prompt
        </Button>
      </div>
    </form>
  );
};
