import React, { useState, useEffect, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarChart2, Loader2, Search, User } from 'lucide-react';
import { insightsClient } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface InsightsCandidate {
  id: string;
  full_name: string;
  email: string;
  profile_name?: string | null;
  scores: Record<string, number>;
  company_id: string;
}

interface InsightsCandidatePickerProps {
  onSelect: (candidate: InsightsCandidate) => void;
  disabled?: boolean;
}

export const InsightsCandidatePicker: React.FC<InsightsCandidatePickerProps> = ({
  onSelect,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<InsightsCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!open) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        let query = insightsClient
          .from('survey_submissions')
          .select('id, full_name, email, profile_name, scores, company_id')
          .eq('is_active', true)
          .is('deleted_at', null)
          .limit(20);

        if (search.trim()) {
          query = query.ilike('full_name', `%${search.trim()}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        setResults((data ?? []) as InsightsCandidate[]);
      } catch (err) {
        logger.error('InsightsCandidatePicker: fetch error', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, open]);

  const handleSelect = (candidate: InsightsCandidate) => {
    onSelect(candidate);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2.5 gap-1.5 border-border hover:border-primary/50 bg-background"
          disabled={disabled}
        >
          <BarChart2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">From Insights</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Select Insights candidate</p>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-7 h-8 text-sm"
              autoFocus
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {search ? 'No candidates found' : 'Type to search candidates'}
              </p>
            ) : (
              results.map(candidate => (
                <button
                  key={candidate.id}
                  type="button"
                  className="w-full text-left px-2 py-1.5 rounded-md hover:bg-accent transition-colors"
                  onClick={() => handleSelect(candidate)}
                >
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {candidate.full_name}
                      </p>
                      {candidate.profile_name && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {candidate.profile_name}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground truncate">{candidate.email}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
