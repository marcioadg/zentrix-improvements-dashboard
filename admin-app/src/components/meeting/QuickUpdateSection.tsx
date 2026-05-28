
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface QuickUpdateSectionProps {
  meetingId: string;
  teamId: string;
}

export const QuickUpdateSection: React.FC<QuickUpdateSectionProps> = ({ meetingId, teamId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [personalUpdate, setPersonalUpdate] = useState('');
  const [professionalUpdate, setProfessionalUpdate] = useState('');
  
  // Mock team members
  const teamMembers = [
    { id: '1', full_name: 'John Doe', avatar_url: null },
    { id: '2', full_name: 'Jane Smith', avatar_url: null },
    { id: '3', full_name: 'Mike Johnson', avatar_url: null },
  ];

  // Mock updates
  const existingUpdates = [
    {
      id: '1',
      user_id: '1',
      content: 'Completed the new feature implementation ahead of schedule',
      type: 'professional' as const,
      profile: { full_name: 'John Doe' },
    },
    {
      id: '2',
      user_id: '1',
      content: 'Just got back from a great vacation in Spain!',
      type: 'personal' as const,
      profile: { full_name: 'John Doe' },
    },
  ];

  const handleSaveUpdate = (type: 'personal' | 'professional') => {
    const content = type === 'personal' ? personalUpdate : professionalUpdate;
    if (!content.trim()) return;

    // Here you would save to Supabase
    // Removed success toast - form clearing provides sufficient feedback

    if (type === 'personal') {
      setPersonalUpdate('');
    } else {
      setProfessionalUpdate('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-foreground mb-2">Quick Updates</h3>
        <p className="text-muted-foreground">Share a quick personal or professional highlight with your team</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal Update</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Share something personal (hobby, vacation, achievement, etc.)"
              value={personalUpdate}
              onChange={(e) => setPersonalUpdate(e.target.value)}
              className="min-h-[100px]"
            />
            <Button 
              onClick={() => handleSaveUpdate('personal')}
              disabled={!personalUpdate.trim()}
              className="w-full"
            >
              Share Personal Update
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Professional Update</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Share a work highlight (project completion, learning, recognition, etc.)"
              value={professionalUpdate}
              onChange={(e) => setProfessionalUpdate(e.target.value)}
              className="min-h-[100px]"
            />
            <Button 
              onClick={() => handleSaveUpdate('professional')}
              disabled={!professionalUpdate.trim()}
              className="w-full"
            >
              Share Professional Update
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Updates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {existingUpdates.map((update) => (
              <div key={update.id} className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground">{update.profile?.full_name}</span>
                  <Badge variant={update.type === 'personal' ? 'secondary' : 'default'}>
                    {update.type}
                  </Badge>
                </div>
                <p className="text-foreground">{update.content}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
