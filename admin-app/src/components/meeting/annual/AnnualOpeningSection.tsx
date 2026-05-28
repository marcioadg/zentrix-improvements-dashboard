
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, MessageSquare } from 'lucide-react';

interface AnnualOpeningSectionProps {
  teamId: string;
}

export const AnnualOpeningSection: React.FC<AnnualOpeningSectionProps> = ({ teamId }) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Opening & Check-In</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Welcome to Day 1 of your Annual Strategic Planning Session. Take a moment to check in 
          with each team member before diving into the strategic work ahead.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-purple-500" />
            Discussion Prompts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="font-medium text-sm mb-2">Best Personal Moment</p>
              <p className="text-sm text-muted-foreground">
                Share your best personal moment from the last year.
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="font-medium text-sm mb-2">Best Professional Moment</p>
              <p className="text-sm text-muted-foreground">
                Share your best professional moment from the last year.
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="font-medium text-sm mb-2">How Are You Feeling?</p>
              <p className="text-sm text-muted-foreground">
                How are you feeling coming into this planning session?
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="font-medium text-sm mb-2">What's On Your Mind?</p>
              <p className="text-sm text-muted-foreground">
                What's on your mind?
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnnualOpeningSection;
