
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface TeamUpdatesSectionProps {
  meetingId: string;
  teamId: string;
}

export const TeamUpdatesSection: React.FC<TeamUpdatesSectionProps> = ({ meetingId, teamId }) => {
  const { toast } = useToast();
  const [newNote, setNewNote] = useState('');
  
  // Mock team notes
  const [notes, setNotes] = useState([
    {
      id: '1',
      content: 'We need to schedule a client demo for next week. Sarah will coordinate with the client.',
      profile: { full_name: 'John Doe' },
      created_at: '2024-01-15T10:30:00Z',
    },
    {
      id: '2',
      content: 'New office policy update: All team members should use the new project management tool starting next month.',
      profile: { full_name: 'Jane Smith' },
      created_at: '2024-01-15T10:32:00Z',
    },
  ]);

  const handleAddNote = () => {
    if (!newNote.trim()) return;

    const note = {
      id: Date.now().toString(),
      content: newNote,
      profile: { full_name: 'Current User' },
      created_at: new Date().toISOString(),
    };

    setNotes(prev => [note, ...prev]);
    setNewNote('');
    
    logger.debug('Team update added (toast suppressed)');
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-foreground mb-2">Team Updates</h3>
        <p className="text-muted-foreground">Share announcements, notes, and important information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Team Update</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Share an announcement, policy update, or general information..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-[100px]"
          />
          <Button 
            onClick={handleAddNote}
            disabled={!newNote.trim()}
            className="w-full"
          >
            Add Update
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Updates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground">{note.profile?.full_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(note.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-foreground/80">{note.content}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
