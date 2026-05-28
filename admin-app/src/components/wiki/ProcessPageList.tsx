import React, { useState } from "react";
import { GripVertical, Edit, Settings } from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, verticalListSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import ProcessPermissionsModal from "./ProcessPermissionsModal";
import { useWikiPages } from "@/hooks/wiki/useWikiPages";
import ProcessDeleteConfirmDialog from "./ProcessDeleteConfirmDialog";
import { useProfile } from "@/hooks/useProfile";
import ProcessPageSettingsDropdown from "./ProcessPageSettingsDropdown";
import EmojiPicker from "./EmojiPicker";
import { useToast } from "@/hooks/use-toast";

type Page = {
  id: string;
  title: string;
  visibility_type?: string;
  archived?: boolean;
  archived_at?: string | null;
  deleted_at?: string | null;
  emoji?: string | null;
};

type ProcessPageListProps = {
  pages: Page[];
  onSelect: (id: string) => void;
  onReorder?: (ids: string[]) => void;
};

function getVisibilityLabel(type: string | undefined) {
  switch (type) {
    case "everyone": return "Public";
    case "teams": return "Team";
    case "roles": return "Position";
    case "people": return "Private";
    default: return "Private";
  }
}

// Draggable & emoji-editable item
function DraggablePageItem({
  page,
  onClick,
  onClickPermissions,
  onArchive,
  onDelete,
  onRestore,
  canDelete,
  setDeleteConfirmPage,
  onSetEmoji,
  emojiAnchor,
  setEmojiAnchor,
  emojiOptimistic,
}: {
  page: Page;
  onClick: (id: string) => void;
  onClickPermissions: (p: Page) => void;
  onArchive: (args: { id: string }) => void;
  onDelete: (args: { id: string }) => void;
  onRestore: (args: { id: string }) => void;
  canDelete: boolean;
  setDeleteConfirmPage: (page: Page | null) => void;
  onSetEmoji: (id: string, emoji: string | null) => void;
  emojiAnchor: HTMLElement | null;
  setEmojiAnchor: (el: HTMLElement | null) => void;
  emojiOptimistic: Record<string, string | null>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: page.id });

  // Remove bg, card, and other icon styles as requested
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 4 : "auto",
    opacity: isDragging ? 0.7 : (page.archived ? 0.5 : 1),
    background: "transparent",
    boxShadow: isDragging
      ? "0 2px 8px hsl(var(--foreground) / 0.07), 0 1.5px 2px hsl(var(--foreground) / 0.05)"
      : undefined,
  };

  // Emoji anchor for picker positioning
  const emojiButtonRef = React.useRef<HTMLButtonElement>(null);

  // Use the optimistic emoji if there's one for this page
  const emojiToShow = emojiOptimistic[page.id] !== undefined
    ? emojiOptimistic[page.id]
    : page.emoji || "📘";

  return (
      <div
        ref={setNodeRef}
        style={style}
        className={
          "flex items-center w-full p-3 rounded-lg text-left bg-transparent group transition mb-0.5 relative cursor-pointer hover:bg-accent/50"
        }
        tabIndex={0}
        {...attributes}
        {...listeners}
        aria-label={`Drag ${page.title}`}
        onClick={() => onClick(page.id)}
      >
      {/* Emoji selector */}
      <button
        ref={emojiButtonRef}
        type="button"
        className="mr-2 w-8 h-8 flex items-center justify-center transition hover:bg-accent focus-visible:ring-1 focus-visible:ring-primary bg-transparent"
        tabIndex={0}
        aria-label="Pick an emoji"
        style={{
          fontSize: "1.5rem",
          lineHeight: 1,
          flexShrink: 0,
          border: "none",
          background: "none",
          borderRadius: 0,
          boxShadow: "none",
        }}
        onClick={(e) => {
          e.stopPropagation();
          setEmojiAnchor(emojiButtonRef.current);
        }}
      >
        <span className="pointer-events-none select-none w-full flex items-center justify-center">
          {emojiToShow}
        </span>
      </button>
      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab mr-2" />
      <span className="flex-1 font-semibold truncate">{page.title || "Untitled"}</span>
      <span className="text-xs text-muted-foreground font-medium mr-2">
        {getVisibilityLabel(page.visibility_type)}
      </span>
      <ProcessPageSettingsDropdown
        page={page}
        onSetVisibility={onClickPermissions}
        onArchive={onArchive}
        onRestore={onRestore}
        onDelete={onDelete}
        canDelete={canDelete}
        setDeleteConfirmPage={setDeleteConfirmPage}
      />
      {/* Emoji picker, render if opened/anchored to this row */}
      {emojiAnchor &&
        emojiAnchor === emojiButtonRef.current && (
          <EmojiPicker
            value={page.emoji}
            onChange={(emoji) => {
              onSetEmoji(page.id, emoji);
              setEmojiAnchor(null);
            }}
            onClose={() => setEmojiAnchor(null)}
            anchorEl={emojiAnchor}
          />
        )}
    </div>
  );
}

export default function ProcessPageList({
  pages,
  onSelect,
  onReorder,
}: ProcessPageListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );
  const itemIds = pages.map((page) => page.id);

  const [order, setOrder] = React.useState(itemIds);
  const [currentPermissionsPage, setCurrentPermissionsPage] = useState<Page | null>(null);
  const [deleteConfirmPage, setDeleteConfirmPage] = useState<Page | null>(null);

  const { profile } = useProfile();
  const {
    pages: allPages,
    archivePage,
    restorePage,
    deletePage,
    canDeleteProcess,
    updatePage // <-- Use to save emoji
  } = useWikiPages();
  const [showArchived, setShowArchived] = useState(false);

  // For emoji picker anchor per list (global, only one open at a time)
  const [emojiAnchor, setEmojiAnchor] = React.useState<HTMLElement | null>(null);

  // Optimistic local emoji state: { [pageId]: emoji }
  const [emojiOptimistic, setEmojiOptimistic] = React.useState<{ [id: string]: string | null }>({});

  const { toast } = useToast();

  React.useEffect(() => {
    setOrder(itemIds);
  }, [itemIds.join(",")]);
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || !active) return;
    if (active.id !== over.id) {
      const oldIndex = order.indexOf(active.id as string);
      const newIndex = order.indexOf(over.id as string);
      const newOrder = arrayMove(order, oldIndex, newIndex);
      setOrder(newOrder);
      if (onReorder) onReorder(newOrder);
    }
  }

  const filteredOrder = order.filter(id => {
    const page = pages.find((p) => p.id === id);
    if (!page) return false;
    if (showArchived) return page.archived !== false;
    return !page.archived && !page.deleted_at;
  });

  // Deletion handler with dialog and permission
  const handleDeleteConfirmed = async () => {
    if (deleteConfirmPage && canDeleteProcess(profile?.role)) {
      await deletePage({ id: deleteConfirmPage.id });
      setDeleteConfirmPage(null);
    }
  };

  // Emoji updater, optimistic
  async function handleSetEmoji(id: string, emoji: string | null) {
    // Optimistically update the front-end UI
    setEmojiOptimistic(prev => ({ ...prev, [id]: emoji }));
    try {
      await updatePage({ id, patch: { emoji } });
      // When query refetch completes, clear the optimistic UI for this id
      setTimeout(() => setEmojiOptimistic(prev => {
        if (prev[id] !== undefined) {
          const { [id]: _, ...rest } = prev;
          return rest;
        }
        return prev;
      }), 800);
    } catch (err) {
      toast({
        title: "Failed to save emoji.",
        description: "Please try again.",
        variant: "destructive"
      });
      setEmojiOptimistic(prev => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-base">Process Pages</span>
        <label className="flex items-center space-x-2 cursor-pointer select-none">
          <input
            type="checkbox"
            className="mr-1"
            checked={showArchived}
            onChange={() => setShowArchived(v => !v)}
          />
          <span className="text-xs">Show Archived</span>
        </label>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        autoScroll={true}
      >
        <SortableContext items={filteredOrder} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1">
            {filteredOrder.map((id) => {
              const page = pages.find((p) => p.id === id);
              if (!page) return null;
              return (
                <DraggablePageItem
                  key={page.id}
                  page={page}
                  onClick={onSelect}
                  onClickPermissions={setCurrentPermissionsPage}
                  onArchive={archivePage}
                  onRestore={restorePage}
                  onDelete={deletePage}
                  canDelete={canDeleteProcess(profile?.role)}
                  setDeleteConfirmPage={setDeleteConfirmPage}
                  onSetEmoji={handleSetEmoji}
                  emojiAnchor={emojiAnchor}
                  setEmojiAnchor={setEmojiAnchor}
                  emojiOptimistic={emojiOptimistic}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
      {currentPermissionsPage && (
        <ProcessPermissionsModal
          open={!!currentPermissionsPage}
          onClose={() => setCurrentPermissionsPage(null)}
          pageId={currentPermissionsPage.id}
          permissions={allPages.find(p => p.id === currentPermissionsPage.id)?.permissions || null}
          ownerId={""}
          visibilityType={allPages.find(p => p.id === currentPermissionsPage.id)?.visibility_type}
        />
      )}
      <ProcessDeleteConfirmDialog
        open={!!deleteConfirmPage}
        onOpenChange={(open) => setDeleteConfirmPage(open ? deleteConfirmPage : null)}
        onConfirm={handleDeleteConfirmed}
        pageTitle={deleteConfirmPage?.title || ""}
      />
    </>
  );
}
