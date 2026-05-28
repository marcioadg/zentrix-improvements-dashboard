import { useState, useCallback, useRef } from 'react';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useWikiPages, WikiPage } from './useWikiPages';
import { BlockType, BlockContent } from '@/types/sops';
import { logger } from '@/utils/logger';

export interface WikiBlock {
  id: string;
  type: BlockType;
  content: BlockContent;
  position: number;
}

export const useWikiBlocks = (pageId: string | null) => {
  const { pages, updatePage } = useWikiPages();
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const localBlocksRef = useRef<WikiBlock[]>([]);

  const currentPage = pages.find((p) => p.id === pageId);
  const blocks: WikiBlock[] = currentPage?.content_blocks || [];

  // Initialize local blocks ref
  if (pageId && localBlocksRef.current.length === 0 && blocks.length > 0) {
    localBlocksRef.current = blocks;
  }

  const [debouncedSave] = useDebouncedCallback(
    async (updatedBlocks: WikiBlock[]) => {
      if (!pageId) return;
      
      try {
        setIsSaving(true);
        await updatePage({
          id: pageId,
          patch: {
            content_blocks: updatedBlocks,
          },
        });
        
        // Show "Saved" confirmation
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 1500);
      } catch (error) {
        logger.error('Failed to save blocks:', error);
      } finally {
        setIsSaving(false);
      }
    },
    1500
  );

  const createBlock = useCallback(
    (type: BlockType, position: number) => {
      if (!pageId) return;

      const newBlock: WikiBlock = {
        id: `block-${crypto.randomUUID()}`,
        type,
        content: { text: '' },
        position,
      };

      const updatedBlocks = [...blocks];
      updatedBlocks.splice(position, 0, newBlock);

      // Update positions
      const reindexed = updatedBlocks.map((block, idx) => ({
        ...block,
        position: idx,
      }));

      localBlocksRef.current = reindexed;
      debouncedSave(reindexed);
    },
    [pageId, blocks, debouncedSave]
  );

  const updateBlock = useCallback(
    (blockId: string, content: BlockContent) => {
      if (!pageId) return;

      const updatedBlocks = blocks.map((block) =>
        block.id === blockId ? { ...block, content } : block
      );

      localBlocksRef.current = updatedBlocks;
      debouncedSave(updatedBlocks);
    },
    [pageId, blocks, debouncedSave]
  );

  const deleteBlock = useCallback(
    (blockId: string) => {
      if (!pageId || blocks.length <= 1) return;

      const updatedBlocks = blocks
        .filter((block) => block.id !== blockId)
        .map((block, idx) => ({ ...block, position: idx }));

      localBlocksRef.current = updatedBlocks;
      debouncedSave(updatedBlocks);
    },
    [pageId, blocks, debouncedSave]
  );

  const reorderBlocks = useCallback(
    (newOrder: WikiBlock[]) => {
      if (!pageId) return;

      const reindexed = newOrder.map((block, idx) => ({
        ...block,
        position: idx,
      }));

      localBlocksRef.current = reindexed;
      debouncedSave(reindexed);
    },
    [pageId, debouncedSave]
  );

  const convertBlockType = useCallback(
    (blockId: string, newType: BlockType) => {
      if (!pageId) return;

      const updatedBlocks = blocks.map((block) =>
        block.id === blockId ? { ...block, type: newType } : block
      );

      localBlocksRef.current = updatedBlocks;
      debouncedSave(updatedBlocks);
    },
    [pageId, blocks, debouncedSave]
  );

  return {
    blocks,
    currentPage,
    isSaving,
    justSaved,
    createBlock,
    updateBlock,
    deleteBlock,
    reorderBlocks,
    convertBlockType,
  };
};
