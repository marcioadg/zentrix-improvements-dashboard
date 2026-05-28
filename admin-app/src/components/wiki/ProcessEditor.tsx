import React, { useRef } from "react";
import DOMPurify from "dompurify";
import ProcessNavigationBar from "./ProcessNavigationBar";
import { useWikiPages } from "@/hooks/wiki/useWikiPages";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ProcessEditorToolbar from "./ProcessEditorToolbar";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { toast } from "@/hooks/use-toast";
import ProcessPermissionsModal from "./ProcessPermissionsModal";
import { useProfile } from "@/hooks/useProfile";
import {
  toggleBold,
  toggleItalic,
  toggleUnderline,
  toggleStrikethrough,
  toggleCode,
  toggleBlockquote,
  insertList,
  setFormatBlock,
  insertLink,
  isTagActive,
  getActiveBlockType,
} from "./editorFormattingUtils";
import ProcessEditorSettingsDropdown from "./ProcessEditorSettingsDropdown";

function sanitizeHTML(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'code', 'ul', 'ol', 'li', 'p', 'h1', 'h2', 'h3', 'blockquote', 'pre', 's', 'a', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

import { useProcessCompletion } from "@/hooks/wiki/useProcessCompletion"; // new import

type ProcessEditorProps = {
  pageId: string;
  onBack: () => void;
  allPageIds?: string[]; // allows UI to know all pages for nav
  onNavigateTo?: (pageId: string) => void;
};

export default function ProcessEditor({
  pageId,
  onBack,
  allPageIds,
  onNavigateTo
}: ProcessEditorProps) {
  const { pages, updatePage, isPageShared } = useWikiPages();
  const { profile } = useProfile();
  const contentRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [empty, setEmpty] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editing, setEditing] = React.useState(false); // NEW: true as soon as user types
  const [showPerms, setShowPerms] = React.useState(false);
  const [currFormat, setCurrFormat] = React.useState("paragraph");

  // Track title saving state
  const [titleValue, setTitleValue] = React.useState("");
  const [titleSaving, setTitleSaving] = React.useState(false);
  const [titleError, setTitleError] = React.useState<string | null>(null);

  const page = pages.find((p) => p.id === pageId);

  React.useEffect(() => {
    if (page) {
      setTitleValue(page.title || "");
      setTitleError(null);
    }
  }, [page?.title, pageId]);

  // Auto-focus on title if it's empty (likely a new page)
  React.useEffect(() => {
    if (titleInputRef.current && (!titleValue || titleValue.trim() === "")) {
      titleInputRef.current.focus();
    }
  }, [titleInputRef, titleValue]);

  if (!page) {
    return (
      <div className="flex flex-col items-center py-16">
        <div className="text-xl font-bold text-destructive mb-2">Page not found</div>
        <Button onClick={onBack} variant="outline" className="mt-2">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

  // --- Debounced title saving, enhanced with editing state ---
  const [debouncedSaveTitle, flushTitleSave] = useDebouncedCallback(async (val: string) => {
    setTitleSaving(true);
    setEditing(true); // Mark saving in progress
    setTitleError(null);
    try {
      // Don't allow empty title
      const trimmed = val.trim();
      if (trimmed.length === 0) {
        setTitleError("Title cannot be empty.");
        setTitleSaving(false);
        setEditing(false);
        return;
      }
      await updatePage({ id: pageId, patch: { title: trimmed } });
    } catch (err: any) {
      toast({ title: "Failed to update title", description: err?.message || "An error occurred", variant: "destructive" });
      setTitleError("Update failed. Try again.");
    } finally {
      setTitleSaving(false);
      setEditing(false); // Saving done
    }
  }, 1000);

  // Handle title input change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Title max length and validation
    if (val.length > 120) return; // Prevent further input
    setTitleValue(val);
    if (val.trim().length === 0) {
      setTitleError("Title cannot be empty.");
    } else {
      setTitleError(null);
    }
    debouncedSaveTitle(val);
  };

  // On blur, flush debounced save immediately
  const handleTitleBlur = () => {
    flushTitleSave();
  };

  const [contentError, setContentError] = React.useState<string | null>(null);

  // In content save, also reflect editing state
  const [debouncedSave, flushSave] = useDebouncedCallback(async () => {
    if (!contentRef.current) return;
    setIsSaving(true);
    setEditing(true); // Mark saving in progress
    setContentError(null);
    try {
      // sanitize but do not strip essential formatting tags
      const html = sanitizeHTML(contentRef.current.innerHTML);
      await updatePage({ id: pageId, patch: { content_blocks: [html] } });
      setIsSaving(false);
      setEditing(false); // Done saving
    } catch (err: any) {
      toast({ title: "Failed to save content", description: err?.message || "An error occurred", variant: "destructive" });
      setIsSaving(false);
      setEditing(false);
      setContentError("Could not save your changes. Please check your connection and try again.");
    }
  }, 2000);

  function hasTextSelected() {
    const selection = window.getSelection();
    return (
      selection &&
      selection.rangeCount > 0 &&
      !selection.isCollapsed &&
      selection.toString().trim().length > 0 &&
      contentRef.current &&
      contentRef.current.contains(selection.anchorNode)
    );
  }

  // Main formatting handler for toolbar
  const handleToolbar = (cmd: string, value?: string) => {
    if (contentRef.current && document.activeElement !== contentRef.current) {
      contentRef.current.focus();
    }

    // For block commands, always run
    if (cmd === "heading1") setFormatBlock("h1");
    else if (cmd === "heading2") setFormatBlock("h2");
    else if (cmd === "heading3") setFormatBlock("h3");
    else if (cmd === "paragraph") setFormatBlock("p");
    else if (cmd === "bulleted-list") insertList("ul");
    else if (cmd === "numbered-list") insertList("ol");
    // Inline
    else if (cmd === "bold") toggleBold();
    else if (cmd === "italic") toggleItalic();
    else if (cmd === "underline") toggleUnderline();
    else if (cmd === "strikethrough") toggleStrikethrough();
    else if (cmd === "code") toggleCode();
    else if (cmd === "blockquote") toggleBlockquote();
    else if (cmd === "link") insertLink(value);

    debouncedSave();
    updateEmptyState();
    setCurrFormat(getActiveBlockType());
    if (contentRef.current) contentRef.current.focus();
  };

  // Regularly check if any text left for placeholder
  const updateEmptyState = () => {
    if (contentRef.current) {
      setEmpty(
        !contentRef.current.textContent ||
          contentRef.current.textContent.trim() === ""
      );
    }
  };

  const handleContentInput = () => {
    setEditing(true);   // Mark as editing for instant "Saving..." feedback
    debouncedSave();
    updateEmptyState();
    setCurrFormat(getActiveBlockType());
  };

  const handleContentBlur = () => {
    flushSave();
    updateEmptyState();
  };

  // Set contenteditable initial value
  React.useEffect(() => {
    if (contentRef.current && page.content_blocks?.[0]) {
      contentRef.current.innerHTML = sanitizeHTML(page.content_blocks[0]);
    }
    updateEmptyState();
    // eslint-disable-next-line
  }, [page.content_blocks]);

  // Keybindings for content editor
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement !== contentRef.current) return;
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === "b") {
        e.preventDefault();
        handleToolbar("bold");
      } else if (e.key === "i") {
        e.preventDefault();
        handleToolbar("italic");
      } else if (e.key === "u") {
        e.preventDefault();
        handleToolbar("underline");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Listen to selection changes to update toolbar's block type state
  React.useEffect(() => {
    const onSelectionChange = () => {
      setCurrFormat(getActiveBlockType());
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  // Navigation logic (ordered by display_order/created_at)
  const pageOrder: string[] =
    allPageIds && allPageIds.length > 0
      ? allPageIds
      : pages.map((p) => p.id);
  const currentIdx = pageOrder.indexOf(pageId);
  const totalPages = pageOrder.length;
  const prevPageId = currentIdx > 0 ? pageOrder[currentIdx - 1] : null;
  const nextPageId = currentIdx < totalPages - 1 ? pageOrder[currentIdx + 1] : null;

  // Completion hooks
  const {
    completedPageIds,
    markComplete,
    unmarkComplete,
    isMarking,
    isUnmarking,
  } = useProcessCompletion(pageOrder);
  const isCompleted = completedPageIds.includes(pageId);

  // Add a retrySaveContent handler for manual retry
  const retrySaveContent = async () => {
    setIsSaving(true);
    setContentError(null);
    if (!contentRef.current) return;
    try {
      const html = sanitizeHTML(contentRef.current.innerHTML);
      await updatePage({ id: pageId, patch: { content_blocks: [html] } });
      setIsSaving(false);
      setContentError(null);
      toast({ title: "Content saved!", variant: "default" });
    } catch (err: any) {
      setIsSaving(false);
      setContentError("Could not save your changes. Please check your connection and try again.");
      toast({ title: "Save failed", description: err?.message || "An error occurred", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-2 mb-4">
        <Button onClick={onBack} variant="outline" size="sm" className="group">
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span className="text-sm group-hover:underline">Back</span>
        </Button>
        {/* --- Enhanced title input w/ placeholder, indicator, and ARIA --- */}
        <div className="flex-1 relative">
          <input
            ref={titleInputRef}
            type="text"
            className={`text-[20px] bg-transparent font-semibold flex-1 rounded-[5px] focus:outline-none focus-visible:ring-1 focus-visible:ring-primary px-2 pr-20 transition-colors 
              ${titleError ? "ring-2 ring-destructive" : ""}
            `}
            aria-label="Page title"
            aria-invalid={!!titleError}
            aria-describedby={titleError ? "process-title-error" : undefined}
            value={titleValue}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            maxLength={120}
            placeholder="Untitled page"
          />
          {/* Saving indicator */}
          {titleSaving && (
            <span className="absolute top-1 right-4 text-xs text-accent font-medium animate-pulse pointer-events-none" aria-live="polite">
              Saving…
            </span>
          )}
          {!titleSaving && titleValue && (
            <span className="absolute top-1 right-4 text-xs text-muted-foreground opacity-75 pointer-events-none">
              Autosaved
            </span>
          )}
          {titleError && (
            <div id="process-title-error" className="absolute left-2 -bottom-6 text-xs text-destructive mt-1">{titleError}</div>
          )}
        </div>
        {/* Settings dropdown for Set Visibility */}
        <ProcessEditorSettingsDropdown
          onSetVisibility={() => setShowPerms(true)}
        />
      </header>
      {/* Navigation Bar for prev/next/complete */}
      <ProcessNavigationBar
        pageIndex={currentIdx}
        totalPages={totalPages}
        onPrev={() => prevPageId && onNavigateTo && onNavigateTo(prevPageId)}
        onNext={() => nextPageId && onNavigateTo && onNavigateTo(nextPageId)}
        canPrev={!!prevPageId}
        canNext={!!nextPageId}
        onMarkComplete={() => markComplete(pageId)}
        onUnmarkComplete={() => unmarkComplete(pageId)}
        isCompleted={isCompleted}
        isMarking={isMarking || isUnmarking}
        showMarkComplete={true}
      />
      <div className="border rounded bg-background shadow-sm p-1 md:p-2">
        <ProcessEditorToolbar onAction={handleToolbar} formatValue={currFormat} />
        <div className="relative">
          <div
            ref={contentRef}
            className="h-80 w-full px-3 py-2 text-base bg-background outline-none focus-visible:ring-1 focus-visible:ring-primary rounded resize-none overflow-auto process-content"
            contentEditable
            spellCheck={true}
            aria-label="Page content"
            data-gramm="false"
            onInput={handleContentInput}
            onBlur={handleContentBlur}
            tabIndex={0}
            suppressContentEditableWarning
            style={{ minHeight: "16rem" }}
          />
          {empty && (
            <div
              className="absolute left-3 top-2 text-muted-foreground pointer-events-none select-none"
              style={{ userSelect: "none" }}
              aria-hidden
            >
              Start writing here…
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-3 relative">
        {/* Status Indicator */}
        <div>
          {contentError ? (
            <div className="flex items-center gap-2 text-destructive text-sm animate-pulse">
              <span>Save failed</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={retrySaveContent}
                className="px-2 py-0 h-7"
                disabled={isSaving}
              >
                Retry
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              className={`opacity-70 pointer-events-none ${isSaving || editing ? "animate-pulse text-accent" : ""}`}
              disabled
            >
              {isSaving || editing ? "Saving…" : "Autosaved"}
            </Button>
          )}
        </div>
      </div>
      {/* Optionally show the error in a larger box below */}
      {contentError && (
        <div className="mt-2 text-center text-sm text-destructive bg-destructive/10 rounded p-2">
          {contentError}
        </div>
      )}
      <ProcessPermissionsModal
        open={showPerms}
        onClose={() => setShowPerms(false)}
        pageId={page.id}
        permissions={page.permissions}
        ownerId={page.created_by}
      />
      {/* Minimal styling for in-editor formatting */}
      <style>
        {`
          .process-content p, .process-content li { margin-bottom: 0.5em; }
          .process-content h1 { font-size: 1.7em; margin-top: 1em; margin-bottom: 0.5em; font-weight: bold;}
          .process-content h2 { font-size: 1.3em; margin-top: 0.9em; margin-bottom: 0.4em; font-weight: bold;}
          .process-content h3 { font-size: 1.1em; margin-top: 0.7em; margin-bottom: 0.3em; font-weight: bold;}
          .process-content ul, .process-content ol { padding-left: 1.5em; margin-bottom: 1em;}
          .process-content li { list-style-position: inside; }
          .process-content code { font-family: mono, monospace; background: var(--surface-raised); color: var(--error); padding: 0.1em 0.3em; border-radius: 3px;}
          .process-content blockquote { border-left: 4px solid var(--border); margin: 0.5em 0; padding-left: 1em; color: var(--text-muted); background: var(--surface-raised);}
          .process-content a { color: var(--accent); text-decoration: underline;}
          .process-content b, .process-content strong { font-weight: bold; }
          .process-content i, .process-content em { font-style: italic; }
          .process-content u { text-decoration: underline; }
          .process-content s { text-decoration: line-through;}
        `}
      </style>
    </div>
  );
}
