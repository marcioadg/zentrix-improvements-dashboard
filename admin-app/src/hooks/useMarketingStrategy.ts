import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export type SectionType = 'core-four' | 'lead-getters';

export interface MarketingBlock {
  id: string;
  sessionId: string;
  sectionType: SectionType;
  blockId: string;
  blockTitle: string;
  blockData: Record<string, string>;
  visible: boolean;
  focused: boolean;
}

export interface MarketingSession {
  id: string;
  userId: string;
  companyId?: string;
  teamId?: string;
}

export const useMarketingStrategy = (userId: string | null, companyId: string | null) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<MarketingSession | null>(null);
  const [blocks, setBlocks] = useState<MarketingBlock[]>([]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    loadOrCreateSession();
  }, [userId, companyId]);

  const loadOrCreateSession = async () => {
    try {
      setLoading(true);
      
      // First, try to find existing session
      const { data: existingSessions, error: sessionError } = await supabase
        .from('marketing_strategy_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (sessionError) {
        // Check if it's a table not found error (migration not run yet)
        if (sessionError.message.includes('relation "public.marketing_strategy_sessions" does not exist') || 
            sessionError.code === 'PGRST116') {
          logger.log('⚠️ MarketingStrategy: Table not found, migration may not be applied yet');
          setSession(null);
          setBlocks([]);
          return;
        }
        throw sessionError;
      }

      let currentSession = existingSessions?.[0];

      // Create session if none exists
      if (!currentSession) {
        const { data: newSession, error: createError } = await supabase
          .from('marketing_strategy_sessions')
          .insert({
            user_id: userId,
            company_id: companyId,
          })
          .select()
          .single();

        if (createError) throw createError;
        currentSession = newSession;
      }

      setSession(currentSession);

      // Load existing blocks for this session
      const { data: existingBlocks, error: blocksError } = await supabase
        .from('marketing_strategy_blocks')
        .select('*')
        .eq('session_id', currentSession.id);

      if (blocksError) {
        // Check if it's a table not found error
        if (blocksError.message.includes('relation "public.marketing_strategy_blocks" does not exist') || 
            blocksError.code === 'PGRST116') {
          logger.log('⚠️ MarketingStrategy: Blocks table not found, migration may not be applied yet');
          setBlocks([]);
          return;
        }
        throw blocksError;
      }

      setBlocks(existingBlocks || []);
    } catch (error) {
      logger.error('Error loading marketing strategy session:', error);
      toast({
        title: "Error Loading Session",
        description: "Failed to load your marketing strategy session.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveBlock = async (
    sectionType: SectionType,
    blockId: string,
    blockTitle: string,
    blockData: Record<string, string>,
    visible: boolean = true,
    focused: boolean = false
  ) => {
    if (!session || !userId) return;

    try {
      const blockPayload = {
        session_id: session.id,
        user_id: userId,
        company_id: companyId,
        section_type: sectionType,
        block_id: blockId,
        block_title: blockTitle,
        block_data: blockData,
        visible,
        focused,
      };

      const { data, error } = await supabase
        .from('marketing_strategy_blocks')
        .upsert(blockPayload, {
          onConflict: 'session_id,block_id'
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setBlocks(prev => {
        const existingIndex = prev.findIndex(b => b.blockId === blockId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            id: data.id,
            sessionId: data.session_id,
            sectionType: data.section_type as SectionType,
            blockId: data.block_id,
            blockTitle: data.block_title,
            blockData: data.block_data,
            visible: data.visible,
            focused: data.focused,
          };
          return updated;
        } else {
          return [...prev, {
            id: data.id,
            sessionId: data.session_id,
            sectionType: data.section_type as SectionType,
            blockId: data.block_id,
            blockTitle: data.block_title,
            blockData: data.block_data,
            visible: data.visible,
            focused: data.focused,
          }];
        }
      });
    } catch (error) {
      logger.error('Error saving marketing strategy block:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save your marketing strategy data.",
        variant: "destructive",
      });
    }
  };

  const getBlockData = (blockId: string): MarketingBlock | undefined => {
    return blocks.find(block => block.blockId === blockId);
  };

  const getBlocksBySection = (sectionType: SectionType): MarketingBlock[] => {
    return blocks.filter(block => block.sectionType === sectionType);
  };

  const getProgress = () => {
    const coreBlocks = getBlocksBySection('core-four');
    const leadBlocks = getBlocksBySection('lead-getters');
    
    const coreProgress = coreBlocks.filter(block => 
      Object.values(block.blockData).some(value => value.trim())
    ).length;
    
    const leadProgress = leadBlocks.filter(block => 
      Object.values(block.blockData).some(value => value.trim())
    ).length;

    return {
      coreProgress,
      leadProgress,
      totalProgress: coreProgress + leadProgress,
      totalBlocks: 8, // 4 core + 4 lead getter blocks
    };
  };

  return {
    loading,
    session,
    blocks,
    saveBlock,
    getBlockData,
    getBlocksBySection,
    getProgress,
  };
};