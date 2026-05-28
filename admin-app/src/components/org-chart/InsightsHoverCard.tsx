import React, { useState, useEffect } from 'react';
import { insightsClient } from '@/integrations/supabase/client';
import { InsightsMiniChart } from '@/components/modals/user-profile/InsightsMiniChart';
import { Loader2 } from 'lucide-react';

interface InsightsHoverCardProps {
  email: string;
  fullName: string;
  imageUrl?: string | null;
  /** Pre-loaded scores from the role (set via Insights picker) — skips live fetch */
  savedScores?: Record<string, number> | null;
}

interface InsightsData {
  profile_name: string | null;
  scores: Record<string, number>;
}

export const InsightsHoverCard: React.FC<InsightsHoverCardProps> = ({ email, fullName, imageUrl, savedScores }) => {
  const [insights, setInsights] = useState<InsightsData | null>(
    savedScores ? { profile_name: null, scores: savedScores } : null
  );
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(!!savedScores);

  useEffect(() => {
    // If we have saved scores, no need for live fetch
    if (savedScores) {
      setInsights({ profile_name: null, scores: savedScores });
      return;
    }
    if (fetched || !email) return;
    setFetched(true);
    setLoading(true);

    insightsClient
      .from('survey_submissions')
      .select('profile_name, scores')
      .eq('email', email)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setInsights(data as InsightsData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [email, fetched, savedScores]);

  return (
    <div className="space-y-2 min-w-[160px]">
      <p className="text-xs font-semibold text-foreground">{fullName}</p>

      {imageUrl && (
        <div className="flex items-center justify-center">
          <img
            src={imageUrl}
            alt="Personality Profile Chart"
            className="rounded-lg border border-border shadow-sm object-contain bg-background"
            style={{ maxWidth: '240px', maxHeight: '240px' }}
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading Insights…
        </div>
      ) : insights ? (
        <div className="space-y-1">
          {insights.profile_name && (
            <p className="text-[10px] text-muted-foreground font-medium">{insights.profile_name}</p>
          )}
          <InsightsMiniChart scores={insights.scores} />
        </div>
      ) : (
        !imageUrl && (
          <p className="text-xs text-muted-foreground">No Insights profile</p>
        )
      )}
    </div>
  );
};
