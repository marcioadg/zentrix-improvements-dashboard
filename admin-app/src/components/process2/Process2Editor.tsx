import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Check } from 'lucide-react';
import { useWikiBlocks, WikiBlock } from '@/hooks/wiki/useWikiBlocks';
import { useWikiPages } from '@/hooks/wiki/useWikiPages';
import { BlockType } from '@/types/sops';
import { Block } from '@/components/sops/editor/Block';
import { SlashMenu } from '@/components/sops/editor/SlashMenu';
import { BlockToolbar } from '@/components/sops/editor/BlockToolbar';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { SopBlock } from '@/types/sops';

interface Process2EditorProps {
  pageId: string | null;
}

export const Process2Editor: React.FC<Process2EditorProps> = ({ pageId }) => {
  const { blocks, currentPage, isSaving, justSaved, createBlock, updateBlock, deleteBlock, reorderBlocks, convertBlockType } = useWikiBlocks(pageId);
  const { updatePage } = useWikiPages();

  const [localTitle, setLocalTitle] = useState('');
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Sync local title with current page
  useEffect(() => {
    if (currentPage) {
      setLocalTitle(currentPage.title);
    }
  }, [currentPage]);

  const [debouncedUpdateTitle] = useDebouncedCallback(
    async (newTitle: string) => {
      if (pageId && newTitle !== currentPage?.title) {
        await updatePage({
          id: pageId,
          patch: { title: newTitle },
        });
      }
    },
    1500
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);
    debouncedUpdateTitle(newTitle);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newBlocks = [...blocks];
    const [movedBlock] = newBlocks.splice(oldIndex, 1);
    newBlocks.splice(newIndex, 0, movedBlock);

    reorderBlocks(newBlocks);
  };

  const handleSlashCommand = useCallback((blockId: string, position: { top: number; left: number }) => {
    setSlashMenuState({ isOpen: true, position, blockId });
  }, []);

  const handleSlashSelect = useCallback((type: BlockType) => {
    if (slashMenuState.blockId) {
      convertBlockType(slashMenuState.blockId, type);
    }
    setSlashMenuState({ isOpen: false, position: { top: 0, left: 0 }, blockId: null });
  }, [slashMenuState.blockId, convertBlockType]);

  const handleTextSelect = useCallback((blockId: string, position: { top: number; left: number }) => {
    setToolbarState({ isVisible: true, position, blockId });
  }, []);

  const handleFormat = useCallback((format: 'bold' | 'italic' | 'underline') => {
    if (!toolbarState.blockId) return;

    const block = blocks.find((b) => b.id === toolbarState.blockId);
    if (!block) return;

    const formatting = block.content.formatting || {};
    updateBlock(toolbarState.blockId, {
      ...block.content,
      formatting: {
        ...formatting,
        [format]: !formatting[format],
      },
    });
  }, [toolbarState.blockId, blocks, updateBlock]);

  const handleKeyDown = useCallback((blockId: string, e: React.KeyboardEvent) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;

    // Enter: Create new paragraph below
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const position = blocks.findIndex((b) => b.id === blockId) + 1;
      createBlock('paragraph', position);
    }

    // Backspace on empty block: Delete block (if not the last one)
    if (e.key === 'Backspace' && (!block.content.text || block.content.text === '') && blocks.length > 1) {
      e.preventDefault();
      deleteBlock(blockId);
    }
  }, [blocks, createBlock, deleteBlock]);

  const handleAddBlock = () => {
    createBlock('paragraph', blocks.length);
  };

  // Memoize block transformations for performance
  const sopBlocks = useMemo(() => {
    return blocks.map((block): SopBlock => ({
      ...block,
      page_id: pageId || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }, [blocks, pageId]);

  const blockIds = useMemo(() => blocks.map((b) => b.id), [blocks]);

  // Initialize with one block if empty
  useEffect(() => {
    if (pageId && blocks.length === 0) {
      createBlock('paragraph', 0);
    }
  }, [pageId, blocks.length]);

  if (!pageId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">Select a page from the sidebar to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-auto">
      {/* Header with title */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <Input
            value={localTitle}
            onChange={handleTitleChange}
            placeholder="Untitled"
            className="text-3xl font-bold border-0 focus-visible:ring-0 px-0"
          />
          <div className="flex items-center gap-2 text-xs text-muted-foreground h-5">
            {isSaving ? (
              <span className="animate-pulse">Saving...</span>
            ) : justSaved ? (
              <span className="flex items-center gap-1 text-success dark:text-green-400">
                <Check className="h-3 w-3" />
                Saved
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Editor content */}
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {sopBlocks.map((sopBlock, index) => (
                <div key={sopBlock.id} className="group relative">
                  <div className="flex items-start gap-2">
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded"
                    >
                      <span className="text-muted-foreground">⋮⋮</span>
                    </button>
                    <div className="flex-1">
                      <Block
                        block={sopBlock}
                        index={index}
                        onChange={(updatedContent) => updateBlock(sopBlock.id, updatedContent)}
                        onKeyDown={(e) => handleKeyDown(sopBlock.id, e)}
                        onSlashCommand={(position) => handleSlashCommand(sopBlock.id, position)}
                        onTextSelect={(position) => handleTextSelect(sopBlock.id, position)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddBlock}
          className="mt-4 text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add block
        </Button>
      </div>

      {/* Slash menu */}
      <SlashMenu
        isOpen={slashMenuState.isOpen}
        position={slashMenuState.position}
        onSelect={handleSlashSelect}
        onClose={() => setSlashMenuState({ isOpen: false, position: { top: 0, left: 0 }, blockId: null })}
      />

      {/* Block toolbar */}
      <BlockToolbar
        isVisible={toolbarState.isVisible}
        position={toolbarState.position}
        content={blocks.find((b) => b.id === toolbarState.blockId)?.content || { text: '' }}
        onFormat={handleFormat}
      />
    </div>
  );
};
