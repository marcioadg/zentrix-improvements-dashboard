import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SopPage } from '@/types/sops';
import { usePages } from '@/hooks/sops/usePages';
import { useBlocks } from '@/hooks/sops/useBlocks';
import { useRealtimePresence } from '@/hooks/sops/useRealtimePresence';
import { useRealtimeBlocks } from '@/hooks/sops/useRealtimeBlocks';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { BlockType, BlockContent, SopBlock as SopBlockType } from '@/types/sops';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Block } from '@/components/sops/editor/Block';
import { DragHandle } from '@/components/sops/editor/DragHandle';
import { SlashMenu } from '@/components/sops/editor/SlashMenu';
import { BlockToolbar } from '@/components/sops/editor/BlockToolbar';

export const SopsPage = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const { updatePage } = usePages();
  const { blocks, createBlock, debouncedUpdate, deleteBlock, reorderBlocks, isSaving } = useBlocks(pageId!);
  const { users } = useRealtimePresence(pageId!);
  useRealtimeBlocks(pageId!);
  const [slashMenuState, setSlashMenuState] = useState<{
    isOpen: boolean;
    position: { top: number; left: number };
    blockId: string | null;
  }>({ isOpen: false, position: { top: 0, left: 0 }, blockId: null });
  
  const [toolbarState, setToolbarState] = useState<{
    isVisible: boolean;
    position: { top: number; left: number };
    blockId: string | null;
  }>({ isVisible: false, position: { top: 0, left: 0 }, blockId: null });

  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);

  // Get page details
  const { data: page } = useQuery({
    queryKey: ['sop_page', pageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sop_pages')
        .select('*')
        .eq('id', pageId!)
        .single();
      
      if (error) throw error;
      return data as SopPage;
    },
    enabled: !!pageId
  });

  const handleTitleChange = async (newTitle: string) => {
    if (!page || !pageId) return;
    await updatePage({ id: pageId, updates: { title: newTitle } });
  };

  const handleContentChange = (blockId: string, content: BlockContent) => {
    debouncedUpdate(blockId, content);
  };

  const handleAddBlock = async (type: BlockType = 'paragraph', position?: number) => {
    const newPosition = position !== undefined ? position : blocks.length;
    const newBlock = await createBlock({ type, position: newPosition, content: { text: '' } });
    if (newBlock) {
      setFocusedBlockId(newBlock.id);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent, blockId: string, index: number) => {
    // Enter key: create new block below
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setSlashMenuState({ isOpen: false, position: { top: 0, left: 0 }, blockId: null });
      await handleAddBlock('paragraph', index + 1);
    }
    
    // Backspace on empty block: delete it
    if (e.key === 'Backspace') {
      const block = blocks[index];
      if (!block.content.text && blocks.length > 1) {
        e.preventDefault();
        await deleteBlock(blockId);
      }
    }

    // Escape: close menus
    if (e.key === 'Escape') {
      setSlashMenuState({ isOpen: false, position: { top: 0, left: 0 }, blockId: null });
      setToolbarState({ isVisible: false, position: { top: 0, left: 0 }, blockId: null });
    }
  };

  const handleSlashCommand = (blockId: string, position: { top: number; left: number }) => {
    setSlashMenuState({ isOpen: true, position, blockId });
  };

  const handleSlashMenuSelect = async (type: BlockType) => {
    if (!slashMenuState.blockId) return;
    
    const blockIndex = blocks.findIndex(b => b.id === slashMenuState.blockId);
    if (blockIndex === -1) return;

    // Remove the slash and convert the block
    const block = blocks[blockIndex];
    const newText = (block.content.text || '').slice(0, -1); // Remove trailing slash
    
    await handleContentChange(slashMenuState.blockId, { 
      ...block.content, 
      text: newText 
    });
    
    // Update block type by creating a new block and deleting the old one
    await deleteBlock(slashMenuState.blockId);
    await handleAddBlock(type, blockIndex);
    
    setSlashMenuState({ isOpen: false, position: { top: 0, left: 0 }, blockId: null });
  };

  const handleTextSelect = (blockId: string, position: { top: number; left: number }) => {
    setToolbarState({ isVisible: true, position, blockId });
  };

  const handleFormat = (format: 'bold' | 'italic' | 'underline') => {
    if (!toolbarState.blockId) return;
    
    const block = blocks.find(b => b.id === toolbarState.blockId);
    if (!block) return;

    const formatting = block.content.formatting || {};
    const newFormatting = {
      ...formatting,
      [format]: !formatting[format]
    };

    handleContentChange(toolbarState.blockId, {
      ...block.content,
      formatting: newFormatting
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex(b => b.id === active.id);
    const newIndex = blocks.findIndex(b => b.id === over.id);

    const reorderedBlocks = [...blocks];
    const [movedBlock] = reorderedBlocks.splice(oldIndex, 1);
    reorderedBlocks.splice(newIndex, 0, movedBlock);

    await reorderBlocks(reorderedBlocks);
  };

  if (!page) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      {/* Header with presence and saving indicator */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex-1" />
        <div className="flex items-center gap-4">
          {/* Presence avatars */}
          {users.length > 0 && (
            <div className="flex -space-x-2">
              {users.slice(0, 5).map((user) => (
                <Avatar key={user.user_id} className="h-8 w-8 border-2 border-background">
                  <AvatarFallback className="text-xs">
                    {user.user_id.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {users.length > 5 && (
                <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">+{users.length - 5}</span>
                </div>
              )}
            </div>
          )}
          
          {/* Saving indicator */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isSaving && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Page title */}
      <Input
        className="text-4xl font-bold border-0 focus:ring-0 px-0 mb-8"
        value={page.title}
        onChange={(e) => handleTitleChange(e.target.value)}
        placeholder="Untitled"
      />

      {/* Blocks with drag and drop */}
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {blocks.map((block, index) => (
              <DragHandle key={block.id} block={block}>
                <Block
                  block={block}
                  index={index}
                  onChange={(content) => handleContentChange(block.id, content)}
                  onKeyDown={(e) => handleKeyDown(e, block.id, index)}
                  onSlashCommand={(pos) => handleSlashCommand(block.id, pos)}
                  onTextSelect={(pos) => handleTextSelect(block.id, pos)}
                  autoFocus={focusedBlockId === block.id}
                />
              </DragHandle>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Empty state */}
      {blocks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Start typing or press / for commands</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={() => handleAddBlock('paragraph')}>
              Add Paragraph
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleAddBlock('heading1')}>
              Add Heading
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleAddBlock('bulletList')}>
              Add List
            </Button>
          </div>
        </div>
      )}

      {/* Add block button */}
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 text-muted-foreground"
        onClick={() => handleAddBlock()}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add block
      </Button>

      {/* Slash menu */}
      <SlashMenu
        isOpen={slashMenuState.isOpen}
        position={slashMenuState.position}
        onSelect={handleSlashMenuSelect}
        onClose={() => setSlashMenuState({ isOpen: false, position: { top: 0, left: 0 }, blockId: null })}
      />

      {/* Block toolbar */}
      {toolbarState.blockId && (
        <BlockToolbar
          isVisible={toolbarState.isVisible}
          position={toolbarState.position}
          content={blocks.find(b => b.id === toolbarState.blockId)?.content || {}}
          onFormat={handleFormat}
        />
      )}
    </div>
  );
};
