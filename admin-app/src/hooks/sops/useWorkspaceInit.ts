import { useState, useEffect } from 'react';
import { useSpaces } from './useSpaces';
import { usePages } from './usePages';
import { useBlocks } from './useBlocks';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export const useWorkspaceInit = () => {
  const { spaces, isLoading: spacesLoading } = useSpaces();
  const { createSpace } = useSpaces();
  const { createPage } = usePages();
  const [isSeeding, setIsSeeding] = useState(false);
  const [needsInit, setNeedsInit] = useState(false);

  useEffect(() => {
    if (!spacesLoading && spaces.length === 0) {
      setNeedsInit(true);
    } else {
      setNeedsInit(false);
    }
  }, [spaces, spacesLoading]);

  const seedWorkspace = async () => {
    setIsSeeding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Create default space
      const space = await createSpace({
        name: 'Company Home',
        description: 'Your main workspace for documentation',
        icon: '🏠',
      });

      // Create welcome page
      const welcomePage = await createPage({
        title: '👋 Welcome to SOPs',
        space_id: space.id,
      });

      // Add welcome content blocks
      const welcomeBlocks = [
        {
          type: 'heading1' as const,
          content: { text: 'Welcome to Your Workspace!' },
          position: 0,
        },
        {
          type: 'paragraph' as const,
          content: { 
            text: 'This is your central hub for creating and managing standard operating procedures, documentation, and knowledge bases.' 
          },
          position: 1,
        },
        {
          type: 'heading2' as const,
          content: { text: 'Getting Started' },
          position: 2,
        },
        {
          type: 'bulletList' as const,
          content: { text: 'Create new pages using the "+" button in the sidebar' },
          position: 3,
        },
        {
          type: 'bulletList' as const,
          content: { text: 'Type "/" to see all available block types' },
          position: 4,
        },
        {
          type: 'bulletList' as const,
          content: { text: 'Explore templates to get started quickly' },
          position: 5,
        },
        {
          type: 'bulletList' as const,
          content: { text: 'Invite your team to collaborate' },
          position: 6,
        },
      ];

      for (const block of welcomeBlocks) {
        await supabase.from('sop_blocks').insert({
          page_id: welcomePage.id,
          type: block.type,
          content: block.content,
          position: block.position,
        });
      }

      // Create quick start guide
      const guidePage = await createPage({
        title: '🚀 Quick Start Guide',
        space_id: space.id,
      });

      const guideBlocks = [
        {
          type: 'heading1' as const,
          content: { text: 'Quick Start Guide' },
          position: 0,
        },
        {
          type: 'callout' as const,
          content: { 
            text: 'Tip: Press Cmd/Ctrl + K to quickly search across all your pages!',
            calloutType: 'info' as const,
            calloutIcon: '💡'
          },
          position: 1,
        },
      ];

      for (const block of guideBlocks) {
        await supabase.from('sop_blocks').insert({
          page_id: guidePage.id,
          type: block.type,
          content: block.content,
          position: block.position,
        });
      }

      setNeedsInit(false);
    } catch (error) {
      logger.error('Error seeding workspace:', error);
    } finally {
      setIsSeeding(false);
    }
  };

  return {
    needsInit,
    isSeeding,
    seedWorkspace,
  };
};
