import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useDebouncedCallback } from 'use-debounce';
import { useState } from 'react';

export interface MentionUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export interface MentionData {
  type: 'mention';
  userId: string;
  displayName: string;
}

export function useCommentMentions() {
  const { currentCompany } = useMultiCompany();
  const [searchQuery, setSearchQuery] = useState('');

  // Search users for mentions
  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['mention-suggestions', currentCompany?.id, searchQuery],
    queryFn: async () => {
      if (!currentCompany?.id || !searchQuery) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, email')
        .eq('company_id', currentCompany?.id)
        .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      return data as MentionUser[];
    },
    enabled: !!currentCompany?.id && searchQuery.length > 0,
  });

  // Debounced search
  const debouncedSearch = useDebouncedCallback((query: string) => {
    setSearchQuery(query);
  }, 300);

  // Create mention records
  const createMentions = useMutation({
    mutationFn: async ({ commentId, mentionedUserIds }: { commentId: string; mentionedUserIds: string[] }) => {
      const mentionRecords = mentionedUserIds.map(userId => ({
        comment_id: commentId,
        mentioned_user_id: userId,
      }));

      const { error } = await supabase
        .from('sop_comment_mentions')
        .insert(mentionRecords);

      if (error) throw error;
    },
  });

  // Parse content for mentions
  const parseMentions = (content: string): string[] => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const userIds: string[] = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      userIds.push(match[2]); // Extract userId from @[Display Name](userId)
    }

    return userIds;
  };

  // Format mention for storage
  const formatMention = (user: MentionUser): string => {
    const displayName = user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.email || 'Unknown User';
    
    return `@[${displayName}](${user.id})`;
  };

  // Parse content and extract mention data
  const extractMentions = (content: string): Array<{ displayName: string; userId: string; isCurrentUser: boolean }> => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: Array<{ displayName: string; userId: string; isCurrentUser: boolean }> = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push({
        displayName: match[1],
        userId: match[2],
        isCurrentUser: false, // Will be set by caller
      });
    }

    return mentions;
  };

  return {
    suggestions,
    isLoading,
    searchUsers: debouncedSearch,
    createMentions: createMentions.mutate,
    parseMentions,
    formatMention,
    extractMentions,
  };
}
