
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Save, Trash2, FileText, Loader2, Sparkles } from 'lucide-react';
import { useCustomInstructions } from '@/hooks/useCustomInstructions';
import { INSTRUCTION_TEMPLATES } from '@/services/aiCustomInstructionsService';

export const CustomInstructionsManager = () => {
  const {
    instructions,
    loading,
    saving,
    saveInstructions,
    deleteInstructions,
    hasInstructions
  } = useCustomInstructions();

  const [instructionsText, setInstructionsText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // Load current instructions when component mounts
  useEffect(() => {
    if (instructions?.instructions) {
      setInstructionsText(instructions.instructions);
    }
  }, [instructions]);

  const handleSave = async () => {
    if (!instructionsText.trim()) return;
    await saveInstructions(instructionsText.trim());
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete your custom instructions? This cannot be undone.')) {
      const success = await deleteInstructions();
      if (success) {
        setInstructionsText('');
      }
    }
  };

  const handleTemplateSelect = (templateKey: string) => {
    if (templateKey && INSTRUCTION_TEMPLATES[templateKey as keyof typeof INSTRUCTION_TEMPLATES]) {
      setInstructionsText(INSTRUCTION_TEMPLATES[templateKey as keyof typeof INSTRUCTION_TEMPLATES]);
      setSelectedTemplate(templateKey);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading instructions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Custom Instructions
          </CardTitle>
          <CardDescription>
            Set persistent background instructions that will be included in every AI conversation.
            These instructions help the AI understand your role, preferences, and how you want responses formatted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="editor" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="editor">Instructions Editor</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>
            
            <TabsContent value="editor" className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Your AI Instructions</label>
                  {hasInstructions() && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Instructions Active
                    </Badge>
                  )}
                </div>
                <Textarea
                  value={instructionsText}
                  onChange={(e) => setInstructionsText(e.target.value)}
                  placeholder="Enter your custom instructions for the AI here. For example:

- I'm a CEO, so focus on strategic insights and high-level recommendations
- Always ask follow-up questions to help me think deeper
- Present key points in bullet format
- Be direct and actionable in your responses
- Challenge my assumptions when appropriate"
                  className="min-h-[200px] resize-none"
                  disabled={saving}
                />
                <div className="text-xs text-muted-foreground">
                  {instructionsText.length} characters
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={!instructionsText.trim() || saving}
                  className="flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Instructions
                </Button>
                {hasInstructions() && (
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={saving}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                )}
              </div>

              {hasInstructions() && (
                <div className="bg-muted border border-border rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-foreground">
                      <strong>Instructions Active:</strong> These instructions will be automatically included in all your AI conversations as background context.
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Choose a Template</label>
                  <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role-based template..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="executive">Executive/CEO Template</SelectItem>
                      <SelectItem value="manager">Manager Template</SelectItem>
                      <SelectItem value="analyst">Analyst Template</SelectItem>
                      <SelectItem value="entrepreneur">Entrepreneur Template</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Template Previews:</h4>
                  {Object.entries(INSTRUCTION_TEMPLATES).map(([key, template]) => (
                    <Card key={key} className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="capitalize">{key}</Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleTemplateSelect(key)}
                        >
                          Use Template
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3">{template}</p>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Custom instructions are automatically prepended to every AI conversation</p>
          <p>• They help the AI understand your role, communication style, and preferences</p>
          <p>• Instructions persist across all chat sessions until you change them</p>
          <p>• You can use templates or write completely custom instructions</p>
        </CardContent>
      </Card>
    </div>
  );
};
