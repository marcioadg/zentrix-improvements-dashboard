
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';

interface Team {
  id: string;
  name: string;
}

interface SimpleAddTaskFormProps {
  teams: Team[];
  onAddTask: (title: string, description: string, teamSelection: { type: 'personal' | 'team'; teamId?: string }) => void;
}

export const SimpleAddTaskForm: React.FC<SimpleAddTaskFormProps> = ({
  teams,
  onAddTask
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('personal');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const teamSelection = selectedTeam === 'personal' 
      ? { type: 'personal' as const }
      : { type: 'team' as const, teamId: selectedTeam };

    onAddTask(title, description, teamSelection);
    
    // Reset form
    setTitle('');
    setDescription('');
    setSelectedTeam('personal');
    setIsExpanded(false);
  };

  if (!isExpanded) {
    return (
      <Card>
        <CardContent className="p-4">
          <Button 
            onClick={() => setIsExpanded(true)}
            className="w-full gap-2"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            Add New Task
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Task</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          
          <div>
            <Textarea
              placeholder="Task description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          
          <div>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger>
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal Tasks</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            <Button type="submit" disabled={!title.trim()}>
              Add Task
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsExpanded(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
