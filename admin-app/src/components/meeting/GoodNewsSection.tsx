
import React from 'react';
import { User, Briefcase } from 'lucide-react';

interface GoodNewsSectionProps {
  teamId?: string;
}

export const GoodNewsSection: React.FC<GoodNewsSectionProps> = ({ teamId }) => {
  return (
    <div className="space-y-6 bg-background p-6 rounded-lg border border-border/20">
      {/* Standardized header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Good News
        </h2>
        <p className="text-muted-foreground font-medium">
          Share personal and professional wins
        </p>
      </div>

      {/* Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-y-auto max-h-[calc(100vh-16rem)]">
        {/* Personal Wins Section */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="border-b border-border p-6">
            <div className="flex items-center gap-3 mb-2">
              <User className="h-6 w-6 text-foreground" />
              <h3 className="text-lg font-bold text-foreground">
                Personal Wins
              </h3>
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              Share personal achievements and milestones
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="bg-muted border border-border rounded-md p-6">
              <h4 className="font-bold text-foreground mb-4">
                Discussion Prompts
              </h4>
              <ul className="space-y-3 text-sm text-foreground">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-foreground">•</span>
                  <span>Health and fitness goals achieved</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-foreground">•</span>
                  <span>Family milestones and celebrations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-foreground">•</span>
                  <span>Learning new skills or hobbies</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-foreground">•</span>
                  <span>Travel experiences and adventures</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-foreground">•</span>
                  <span>Personal growth achievements</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Professional Wins Section */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="border-b border-border p-6">
            <div className="flex items-center gap-3 mb-2">
              <Briefcase className="h-6 w-6 text-foreground" />
              <h3 className="text-lg font-bold text-foreground">
                Professional Wins
              </h3>
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              Celebrate work accomplishments
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="bg-muted border border-border rounded-md p-6">
              <h4 className="font-bold text-foreground mb-4">
                Discussion Prompts
              </h4>
              <ul className="space-y-3 text-sm text-foreground">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-foreground">•</span>
                  <span>Project completions and successes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-foreground">•</span>
                  <span>Client feedback and testimonials</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-foreground">•</span>
                  <span>Team collaboration achievements</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-foreground">•</span>
                  <span>Process improvements implemented</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-foreground">•</span>
                  <span>Recognition and career advancement</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
