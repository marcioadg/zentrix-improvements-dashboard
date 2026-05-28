
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useUserTeams } from '@/hooks/useUserTeams';
import { Plus, Send } from 'lucide-react';

interface TaskFormProps {
  onSubmit: (
    title: string, 
    description: string, 
    isAnonymous: boolean,
    teamSelection: { type: 'personal' | 'team'; teamId?: string }
  ) => void;
  loading?: boolean;
}

export const TaskForm: React.FC<TaskFormProps> = ({ onSubmit, loading = false }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [teamSelection, setTeamSelection] = useState<string>('personal');
  
  const { teams } = useUserTeams();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const teamSelectionData = teamSelection === 'personal' 
      ? { type: 'personal' as const }
      : { type: 'team' as const, teamId: teamSelection };

    onSubmit(title.trim(), description.trim(), isAnonymous, teamSelectionData);
    
    // Reset form
    setTitle('');
    setDescription('');
    setIsAnonymous(false);
    setTeamSelection('personal');
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add New Task
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title..."
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="team-selection">Task Type</Label>
              <Select value={teamSelection} onValueChange={setTeamSelection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select task type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      Team: {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="anonymous"
                checked={isAnonymous}
                onCheckedChange={setIsAnonymous}
              />
              <Label htmlFor="anonymous" className="text-sm">
                Submit as anonymous feedback
              </Label>
            </div>

            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? (
                "Adding..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Add Task
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
