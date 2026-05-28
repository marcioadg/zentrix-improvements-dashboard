import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Calendar, Target, Users, Zap, AlertTriangle, TrendingUp, TrendingDown, Shield, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { useProfiles } from '@/hooks/useProfiles';

interface StrategicPlanVersion {
  id: string;
  strategic_plan_id: string;
  plan_data: any;
  version_number: number;
  change_summary?: string;
  created_by: string;
  created_at: string;
}

interface StrategyVersionPreviewProps {
  version: StrategicPlanVersion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StrategyVersionPreview: React.FC<StrategyVersionPreviewProps> = ({
  version,
  open,
  onOpenChange,
}) => {
  const { profiles } = useProfiles();

  const getProfileName = (userId: string) => {
    const profile = profiles.find(p => p.id === userId);
    return profile?.full_name || 'Unknown User';
  };

  if (!version) return null;

  const data = version.plan_data || {};

  // Helper to safely render arrays
  const renderList = (items: any[] = [], renderFn: (item: any, index: number) => React.ReactNode) => {
    if (!Array.isArray(items) || items.length === 0) {
      return <p className="text-sm text-muted-foreground italic">None defined</p>;
    }
    return <div className="space-y-2">{items.map(renderFn)}</div>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Version {version.version_number} Preview
          </DialogTitle>
          <DialogDescription>
            Created by {getProfileName(version.created_by)} on{' '}
            {format(new Date(version.created_at), 'MMM d, yyyy h:mm a')}
            {version.change_summary && (
              <span className="block mt-1 font-medium">"{version.change_summary}"</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Purpose */}
            {data.purpose && (
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Purpose Statement
                </h3>
                <p className="text-sm bg-muted p-3 rounded-lg">{data.purpose}</p>
              </div>
            )}

            {/* Niche/Unique Edge */}
            {data.niche && (
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Niche / Unique Edge
                </h3>
                <p className="text-sm bg-muted p-3 rounded-lg">{data.niche}</p>
              </div>
            )}

            {/* Long Term Objective */}
            {data.longTermObjective && (
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Long-Term Objective
                </h3>
                <p className="text-sm bg-muted p-3 rounded-lg">{data.longTermObjective}</p>
              </div>
            )}

            <Separator />

            {/* Core Values */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Core Values
              </h3>
              {renderList(data.coreValues, (value, index) => (
                <div key={index} className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{value.value}</p>
                  {value.explanation && (
                    <p className="text-sm text-muted-foreground mt-1">{value.explanation}</p>
                  )}
                </div>
              ))}
            </div>

            <Separator />

            {/* Quarterly Priorities */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Quarterly Priorities
              </h3>
              {renderList(data.quarterlyPriorities, (priority, index) => (
                <div key={index} className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{priority.priority}</Badge>
                    <span className="font-medium">{priority.name}</span>
                  </div>
                  {priority.description && (
                    <p className="text-sm text-muted-foreground">{priority.description}</p>
                  )}
                </div>
              ))}
            </div>

            <Separator />

            {/* Issues */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Issues
              </h3>
              {renderList(data.issues, (issue, index) => (
                <div key={index} className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{issue.name}</p>
                  {issue.description && (
                    <p className="text-sm text-muted-foreground mt-1">{issue.description}</p>
                  )}
                </div>
              ))}
            </div>

            <Separator />

            {/* SWOT Analysis */}
            {data.swotData && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  SWOT Analysis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Strengths */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2 text-success">
                      <Shield className="h-4 w-4" />
                      Strengths
                    </h4>
                    {renderList(data.swotData.strengths, (item, index) => (
                      <div key={index} className="p-2 bg-success/5 dark:bg-green-950/20 rounded text-sm">
                        {item.text}
                      </div>
                    ))}
                  </div>

                  {/* Weaknesses */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2 text-destructive">
                      <TrendingDown className="h-4 w-4" />
                      Weaknesses
                    </h4>
                    {renderList(data.swotData.weaknesses, (item, index) => (
                      <div key={index} className="p-2 bg-destructive/5 dark:bg-red-950/20 rounded text-sm">
                        {item.text}
                      </div>
                    ))}
                  </div>

                  {/* Opportunities */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2 text-primary">
                      <TrendingUp className="h-4 w-4" />
                      Opportunities
                    </h4>
                    {renderList(data.swotData.opportunities, (item, index) => (
                      <div key={index} className="p-2 bg-primary/5 dark:bg-blue-950/20 rounded text-sm">
                        {item.text}
                      </div>
                    ))}
                  </div>

                  {/* Threats */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2 text-warning">
                      <AlertTriangle className="h-4 w-4" />
                      Threats
                    </h4>
                    {renderList(data.swotData.threats, (item, index) => (
                      <div key={index} className="p-2 bg-orange-50 dark:bg-orange-950/20 rounded text-sm">
                        {item.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Fallback for raw data if schema doesn't match */}
            {Object.keys(data).length === 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Raw version data:</p>
                <pre className="text-xs overflow-auto bg-background p-2 rounded border">
                  {JSON.stringify(version.plan_data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};