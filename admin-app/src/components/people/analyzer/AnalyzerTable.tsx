
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Eye, UserX, Calendar } from 'lucide-react';
import { ScoreCell } from './ScoreCell';
import { AnalyzerPerson, AnalyzerColumn, AnalyzerBar, ScoreValue } from '@/types/analyzer';
import { SortField, SortDirection } from '@/hooks/useAnalyzerData';
import { logger } from '@/utils/logger';

interface AnalyzerTableProps {
  columns: AnalyzerColumn[];
  people: AnalyzerPerson[];
  bars: AnalyzerBar[];
  showTheBar: boolean;
  canEditScores: boolean;
  canEditBars: boolean;
  sortField: SortField;
  sortDirection: SortDirection;
  onUpdateScore: (userId: string, columnKey: string, score: ScoreValue) => void;
  onUpdateBar: (columnKey: string, score: ScoreValue) => void;
  onSort: (field: SortField) => void;
  selectedEvaluationDates?: Record<string, string>; // NEW
  availableDatesPerUser?: Record<string, string[]>; // NEW
  onEvaluationDateChange?: (userId: string, date: string | null) => void; // NEW
}

export const AnalyzerTable: React.FC<AnalyzerTableProps> = ({
  columns,
  people,
  bars,
  showTheBar,
  canEditScores,
  canEditBars,
  sortField,
  sortDirection,
  onUpdateScore,
  onUpdateBar,
  onSort,
  selectedEvaluationDates = {},
  availableDatesPerUser = {},
  onEvaluationDateChange,
}) => {
  // Helper to format date for display
  // Parse YYYY-MM-DD directly to avoid timezone issues
  // Don't use new Date() which interprets as UTC and can shift dates
  const formatDate = (dateString: string): string => {
    // Parse YYYY-MM-DD directly to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    
    // Create date in local timezone using components
    const date = new Date(year, month - 1, day); // month is 0-indexed
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  const getBarValue = (column: AnalyzerColumn): ScoreValue | undefined => {
    const bar = bars.find(b => 
      b.score_type === column.type &&
      (column.core_value_name ? b.core_value_name === column.core_value_name : true)
    );
    return bar?.required_score;
  };

  const SortableHeader: React.FC<{ field: SortField; children: React.ReactNode; className?: string }> = ({ 
    field, 
    children, 
    className = "" 
  }) => (
    <Button
      variant="ghost"
      onClick={() => onSort(field)}
      className={`h-auto p-0 font-medium text-[11px] uppercase tracking-wide text-muted-foreground hover:bg-transparent flex items-center gap-1 ${className}`}
    >
      {children}
      {sortField === field && (
        sortDirection === 'asc' ? 
          <ChevronUp className="h-3 w-3 text-muted-foreground/60" /> : 
          <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
      )}
    </Button>
  );

  return (
    <Card className="overflow-hidden border-border/40">
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Header */}
          <thead className="bg-muted/30 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left min-w-[180px]">
                <SortableHeader field="name">Team Member</SortableHeader>
              </th>
              {columns.map((column) => {
                // Define descriptions for standard EOS columns
                const getColumnDescription = (type: string) => {
                  switch (type) {
                    case 'gets_it':
                      return 'Team members fully understand their role, responsibilities, and how their work fits into the company\'s vision.';
                    case 'wants_it':
                      return 'Team members have genuine desire and passion for their role and the company\'s mission.';
                    case 'capacity':
                      return 'Team members possess the mental, physical, and emotional ability to fulfill their role\'s requirements.';
                    default:
                      return null;
                  }
                };

                const description = column.type === 'core_value' ? column.explanation : getColumnDescription(column.type);

                return (
                  <th
                    key={column.key}
                    className="px-2 py-3 text-center min-w-[80px]"
                  >
                    {description ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <SortableHeader field={column.key} className="justify-center">
                              {column.label}
                            </SortableHeader>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p className="font-semibold">{column.label}</p>
                          <p className="text-sm mt-1">{description}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <SortableHeader field={column.key} className="justify-center">
                        {column.label}
                      </SortableHeader>
                    )}
                  </th>
                );
              })}
              <th className="px-2 py-3 text-center min-w-[80px]">
                <SortableHeader field="totalScore" className="justify-center">
                  Total
                </SortableHeader>
              </th>
              <th className="px-2 py-3 text-center min-w-[90px]">
                <SortableHeader field="meetsBar" className="justify-center">
                  Status
                </SortableHeader>
              </th>
              <th className="px-2 py-3 text-center min-w-[120px]">
                <SortableHeader field="lastUpdated" className="justify-center">
                  Last Updated
                </SortableHeader>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border/30">
            {/* The Bar Row */}
            {showTheBar && (
              <tr className="bg-primary/5 border-b border-primary/10">
                <td className="px-4 py-3">
                  <div className="flex items-center">
                    <div className="font-semibold text-foreground text-[13px]">THE BAR</div>
                    <div className="ml-2 text-xs text-muted-foreground/60">Min. Requirements</div>
                  </div>
                </td>
                {columns.map((column) => (
                  <td key={column.key} className="px-2 py-3 text-center">
                    <ScoreCell
                      value={getBarValue(column)}
                      onChange={canEditBars ? (value) => onUpdateBar(column.key, value) : undefined}
                      disabled={!canEditBars}
                      isBarRow={true}
                      scoreType={column.type}
                    />
                  </td>
                ))}
                <td className="px-2 py-3 text-center">
                  <span className="text-muted-foreground font-semibold text-[13px]">--</span>
                </td>
                <td className="px-2 py-3 text-center">
                  <Badge variant="outline" className="border-primary/20 text-primary text-xs">
                    Benchmark
                  </Badge>
                </td>
                <td className="px-2 py-3 text-center">
                  <span className="text-muted-foreground font-semibold text-[13px]">--</span>
                </td>
              </tr>
            )}

            {/* People Rows */}
            {people.map((person) => {
              logger.log(`Rendering person ${person.full_name}: is_active=${person.is_active}`);
              
              // Determine if editing should be disabled
              // Disable if: no edit permission, person inactive, OR a past date is selected
              const availableDates = availableDatesPerUser[person.id] || [];
              const selectedDate = selectedEvaluationDates[person.id];
              const isPastDateSelected = selectedDate && availableDates.length > 0 && selectedDate !== availableDates[0];
              const isEditable = canEditScores && person.is_active && !isPastDateSelected;
              
              return (
              <tr 
                key={person.id} 
                className={`hover:bg-muted/20 transition-colors ${!person.meetsBar ? 'bg-muted/30' : ''} ${!person.is_active ? 'opacity-50 bg-muted/20' : ''}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {!person.is_active && (
                        <UserX className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div className={`font-medium text-[13px] text-foreground ${!person.is_active ? 'line-through text-muted-foreground' : ''}`}>
                        {person.full_name}
                      </div>
                      {!person.is_active && (
                        <Badge variant="destructive" className="text-xs">
                          INACTIVE
                        </Badge>
                      )}
                    </div>
                    {person.visibilityLabel && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 cursor-help">
                            <Eye className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {person.visibilityLabel === 'Private' ? '0' : (person.visibleToCount || (person.visiblePeople?.length ?? 0))}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <div className="space-y-3">
                            <div>
                              <p className="font-semibold text-sm mb-2">Who can see {person.full_name}'s results:</p>
                              {person.visiblePeople && person.visiblePeople.length > 0 ? (
                                <div className="space-y-2">
                                  <div className="grid gap-1">
                                    {person.visiblePeople.map((visiblePerson, index) => (
                                      <div key={index} className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{visiblePerson.name}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {visiblePerson.role}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-sm">
                                  <UserX className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">Results are private - no additional viewers</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </td>
                {columns.map((column) => (
                  <td key={column.key} className="px-2 py-3 text-center">
                    <ScoreCell
                      value={person.scores[column.key]}
                      onChange={isEditable ? (value) => onUpdateScore(person.id, column.key, value) : undefined}
                      disabled={!isEditable}
                      scoreType={column.type}
                    />
                  </td>
                ))}
                <td className="px-2 py-3 text-center">
                  <div className={`font-semibold text-[13px] text-foreground ${!person.is_active ? 'text-muted-foreground' : ''}`}>
                    {person.totalScore}%
                  </div>
                </td>
                <td className="px-2 py-3 text-center">
                  {!person.is_active ? (
                    <Badge variant="outline" className="text-xs border-muted-foreground text-muted-foreground">
                      N/A
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className={person.meetsBar ? "border-transparent bg-[var(--success)]/10 text-[var(--success)] text-xs" : "border-transparent bg-destructive/10 text-destructive text-xs"}
                    >
                      {person.meetsBar ? 'Meets' : 'Below'}
                    </Badge>
                  )}
                </td>
                <td className="px-2 py-3 text-center">
                  {(() => {
                    const availableDates = availableDatesPerUser[person.id] || [];
                    const selectedDate = selectedEvaluationDates[person.id];
                    
                    if (availableDates.length > 0) {
                      const currentIndex = selectedDate 
                        ? availableDates.indexOf(selectedDate)
                        : 0;
                      const displayDate = selectedDate || availableDates[0];
                      const canGoNewer = currentIndex > 0;
                      const canGoOlder = currentIndex < availableDates.length - 1;

                      const handleNavigate = (direction: 'newer' | 'older') => {
                        if (!onEvaluationDateChange) return;
                        const newIndex = direction === 'newer' ? currentIndex - 1 : currentIndex + 1;
                        if (newIndex < 0 || newIndex >= availableDates.length) return;
                        
                        // If navigating to most recent (index 0), clear selection
                        if (newIndex === 0) {
                          onEvaluationDateChange(person.id, null);
                        } else {
                          onEvaluationDateChange(person.id, availableDates[newIndex]);
                        }
                      };

                      return (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            disabled={!canGoOlder}
                            onClick={() => handleNavigate('older')}
                            aria-label="View older evaluation"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </Button>
                          <div className="flex items-center gap-1 min-w-[90px] justify-center">
                            <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-xs whitespace-nowrap">
                              {formatDate(displayDate)}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            disabled={!canGoNewer}
                            onClick={() => handleNavigate('newer')}
                            aria-label="View newer evaluation"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    } else if (person.lastUpdated) {
                      return (
                        <span className="text-xs text-muted-foreground">
                          {formatDate(person.lastUpdated)}
                        </span>
                      );
                    } else {
                      return (
                        <span className="text-xs text-muted-foreground">—</span>
                      );
                    }
                  })()}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>

        {people.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No team members to analyze yet.</p>
            <p className="text-sm mt-1">Add team members to start using the People Analyzer.</p>
          </div>
        )}
      </div>
    </Card>
  );
};
