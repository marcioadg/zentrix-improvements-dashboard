import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Loader2, Check, X, BarChart3 } from 'lucide-react';
import { useUserPersonalMetrics } from '@/hooks/useUserPersonalMetrics';
import { useMetricsFormatting } from '@/hooks/useMetricsFormatting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@/contexts/SettingsContext';
import { getCurrentWeekStart } from '@/lib/dateUtils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MetricConfigurationModal } from '@/components/modals/MetricConfigurationModal';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MetricsCardSkeleton } from '@/components/skeletons/MetricsCardSkeleton';
import { logger } from '@/utils/logger';
import { updateMetricValue as updateMetricValueService } from '@/services/metricOperations';
import { useAuth } from '@/contexts/AuthContext';

interface UserMetricsTableProps {
  selectedTeamId?: string | null;
}

export const UserMetricsTable: React.FC<UserMetricsTableProps> = ({ selectedTeamId }) => {
  const { user } = useAuth();
  const {
    metrics,
    loading,
    updateMetricValue,
    displayedWeekStart
  } = useUserPersonalMetrics();
  const {
    formatValue,
    getValueColor
  } = useMetricsFormatting();
  const navigate = useNavigate();
  const {
    settings
  } = useSettings();
  const {
    toast
  } = useToast();

  // State for inline editing
  const [editingCell, setEditingCell] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState<string>('');
  const [editingMetric, setEditingMetric] = useState<any>(null);

  // Use the same week start as metrics page
  const currentWeekStart = getCurrentWeekStart(settings?.week_start_day || 'monday');

  // Deduplicate and filter metrics by selected team
  const uniqueMetrics = React.useMemo(() => {
    const seen = new Set();
    const deduplicated = metrics.filter(metric => {
      if (seen.has(metric.id)) {
        return false;
      }
      seen.add(metric.id);
      // Filter by team if selected
      if (selectedTeamId && metric.team_id !== selectedTeamId) {
        return false;
      }
      return true;
    });
    return deduplicated;
  }, [metrics, selectedTeamId]);

  
  const formatWeekDate = (weekStart: string) => {
    const [year, month, day] = weekStart.split('-').map(Number);
    const startDate = new Date(year, month - 1, day);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    const startFormatted = startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    const endFormatted = endDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    return `${startFormatted} - ${endFormatted}`;
  };
  const getOwnerInitials = (fullName: string) => {
    if (!fullName || fullName.trim() === '') return 'UN';
    return fullName.split(' ').map(name => name.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  // Use the standardized getValueColor function for consistency with /metrics page

  // Handle starting edit mode with double click
  const handleEditClick = (metricId: string, currentValue: number | null) => {
    const cellKey = `${metricId}-${displayedWeekStart}`;
    setEditingCell(cellKey);
    setEditValue(currentValue?.toString() || '');
  };

  // Handle double click for editing
  const handleDoubleClick = (metricId: string, currentValue: number | null) => {
    handleEditClick(metricId, currentValue);
  };

  // Handle saving edited value
  const handleSaveEdit = async (metricId: string) => {
    try {
      const trimmedValue = editValue.trim();

      let numericValue: number | null;

      if (trimmedValue === '') {
        // Empty string means delete the value (set to null)
        numericValue = null;
      } else {
        const parsed = parseFloat(trimmedValue);
        if (isNaN(parsed)) {
          toast({
            title: "Invalid value",
            description: "Please enter a valid number",
            variant: "destructive"
          });
          return;
        }
        numericValue = parsed;
      }

      // Store original value for potential rollback
      const originalMetric = metrics.find(m => m.id === metricId);
      const originalValue = originalMetric?.weeklyValues?.[displayedWeekStart] ?? null;

      // Optimistically update the UI immediately
      updateMetricValue(metricId, numericValue, displayedWeekStart);

      // Clear editing state
      setEditingCell(null);
      setEditValue('');

      // Use the centralized service that handles upserts safely via RPC
      try {
        await updateMetricValueService(
          metricId,
          displayedWeekStart,
          numericValue,
          originalMetric,
          user?.id || ''
        );
        
        // Show optimistic success message
        toast({
          title: "Metric updated",
          description: "Your metric value has been saved"
        });
      } catch (error) {
        logger.error('❌ Error saving metric:', error);
        
        // Rollback the optimistic update on error
        updateMetricValue(metricId, originalValue || 0, displayedWeekStart);
        
        toast({
          title: "Error saving metric",
          description: error instanceof Error ? error.message : "Failed to save metric value",
          variant: "destructive"
        });
        return;
      }
    } catch (error) {
      logger.error('Error saving metric:', error);
      toast({
        title: "Error saving metric",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Handle metric click to open configuration modal
  const handleMetricClick = (metric: any) => {
    setEditingMetric(metric);
  };

  const handleMetricUpdate = async (config: any) => {
    setEditingMetric(null);
    // Refresh metrics could be added here if needed
  };
  if (loading) {
    return <MetricsCardSkeleton />;
  }
  return <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div>
          <h2 className="text-[16px] font-medium text-foreground">
            Metrics
          </h2>
          {displayedWeekStart && (
            <p className="text-[11px] text-muted-foreground">
              Week of {formatWeekDate(displayedWeekStart)}
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/metrics')} className="text-[13px] text-muted-foreground hover:text-foreground font-normal h-9 px-3 transition-colors duration-150">
          View all
        </Button>
      </div>
      <div className="flex-1 min-h-0">
        {uniqueMetrics.length === 0 ? <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
            <p className="text-[14px] font-medium text-foreground">
              {selectedTeamId ? "No metrics for this team" : "No metrics yet"}
            </p>
            <p className="text-[13px] text-muted-foreground">Track key numbers to measure what matters most</p>
            {!selectedTeamId && (
              <Button onClick={() => navigate('/metrics', { state: { openAddMetric: true } })} size="sm">
                Set up metrics
              </Button>
            )}
          </div> : <ScrollArea className="h-full">
            <div className="space-y-1 pr-3">
            {uniqueMetrics.map((metric, index) => {
                const currentWeekValue = metric.weeklyValues?.[displayedWeekStart] ?? null;
                const isEditing = editingCell === `${metric.id}-${displayedWeekStart}`;
                
                return <div key={metric.id} className="flex items-center justify-between py-2 border-b border-border hover:bg-muted/50 transition-colors duration-150 px-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-[13px] text-foreground cursor-pointer hover:text-primary focus-visible:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-sm transition-colors duration-150 truncate" role="button" tabIndex={0} onClick={() => handleMetricClick(metric)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleMetricClick(metric); } }} title={metric.metric_name}>
                                {metric.metric_name}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs md:text-sm">
                              {/* Owner */}
                              <div className="flex items-center">
                                {metric.owner_avatar_url ? (
                                  <img 
                                    src={metric.owner_avatar_url} 
                                    alt={metric.owner || 'Owner'}
                                    className="w-6 h-6 rounded-full object-cover border border-border/30"
                                    onError={(e) => {
                                      const img = e.currentTarget;
                                      const fallback = img.nextElementSibling as HTMLElement;
                                      img.style.display = 'none';
                                      if (fallback) fallback.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div className={`w-6 h-6 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-[11px] font-medium ${metric.owner_avatar_url ? 'hidden' : ''}`}>
                                  {getOwnerInitials(metric.owner)}
                                </div>
                              </div>
                              
                              {/* Target */}
                              <div className="text-[11px] text-muted-foreground min-w-[50px] text-center">
                                {metric.target_value ? (
                                  <span>
                                    {(() => {
                                      switch (metric.target_logic) {
                                        case 'greater_than_or_equal': return '≥';
                                        case 'less_than_or_equal': return '≤';
                                        case 'greater_than': return '>';
                                        case 'less_than': return '<';
                                        case 'equal_to':
                                        case 'equal': return '=';
                                        default: return '≥';
                                      }
                                    })()} {formatValue(metric.target_value, metric.unit)}
                                  </span>
                                ) : (
                                  <span>-</span>
                                )}
                              </div>
                              
                               {/* Value */}
                              <div
                                className={`min-w-[70px] md:min-w-[80px] text-center rounded-md px-2 md:px-3 py-2 min-h-[44px] md:min-h-fit flex items-center justify-center hover:bg-muted/50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${getValueColor(currentWeekValue, metric, displayedWeekStart)}`}
                                role="button"
                                tabIndex={0}
                                onClick={() => !isEditing && handleEditClick(metric.id, currentWeekValue)}
                                onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !isEditing) { e.preventDefault(); handleEditClick(metric.id, currentWeekValue); } }}
                              >
                                {isEditing ? (
                                  <div className="flex items-center gap-1">
                                     <Input 
                                       value={editValue} 
                                       onChange={e => setEditValue(e.target.value)} 
                                       className="w-14 md:w-16 h-8 md:h-6 text-center mobile-caption md:text-xs border-border" 
                                       type="text"
                                       inputMode="decimal"
                                       placeholder="Value"
                                       onKeyDown={e => {
                                         if (e.key === 'Enter') {
                                           handleSaveEdit(metric.id);
                                         } else if (e.key === 'Escape') {
                                           handleCancelEdit();
                                         }
                                       }} 
                                       autoFocus 
                                     />
                                    <Button size="sm" variant="ghost" className="h-10 w-10 md:h-8 md:w-8 p-0" aria-label="Save metric" onClick={(e) => {
                                      e.stopPropagation();
                                      handleSaveEdit(metric.id);
                                    }}>
                                      <Check className="h-4 w-4 text-status-success" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-10 w-10 md:h-8 md:w-8 p-0" aria-label="Cancel editing" onClick={(e) => {
                                      e.stopPropagation();
                                      handleCancelEdit();
                                    }}>
                                      <X className="h-4 w-4 text-status-error" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span
                                    className="font-normal text-[13px] tabular-nums"
                                  >
                                    {formatValue(currentWeekValue, metric.unit)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>;
               })}
           </div>
          </ScrollArea>}

        {editingMetric && (
          <MetricConfigurationModal
            open={!!editingMetric}
            onOpenChange={(open) => !open && setEditingMetric(null)}
            metric={editingMetric}
            onSave={handleMetricUpdate}
          />
        )}
      </div>
    </div>;
};