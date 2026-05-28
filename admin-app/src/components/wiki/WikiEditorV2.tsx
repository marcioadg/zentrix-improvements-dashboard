
import React from "react";
import { useWikiPages } from "@/hooks/wiki/useWikiPages";
import { Button } from "@/components/ui/button";

type WikiEditorV2Props = {
  pageId: string | null;
};

export default function WikiEditorV2({ pageId }: WikiEditorV2Props) {
  const { pages, updatePage } = useWikiPages();
  const page = pages.find((p) => p.id === pageId);

  if (!pageId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <img
          src="https://illustrations.popsy.co/amber/chart-bar-2.svg"
          aria-hidden
          className="w-56 mb-6 opacity-70"
        />
        <div className="text-2xl font-bold text-muted-foreground mb-2">Select or create a page</div>
        <div className="text-muted-foreground">Choose a page from the sidebar or create a new page to start editing your team’s knowledge base.</div>
      </div>
    );
  }
  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <img src="https://illustrations.popsy.co/amber/error-2.svg" aria-hidden className="w-52 mb-6" />
        <div className="text-xl font-bold text-destructive mb-2">Page not found</div>
        <div className="text-muted-foreground">Try selecting another page or create a new one.</div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updatePage({ id: pageId, patch: { content_blocks: [e.target.value] } });
  };

  return (
    <section className="w-full max-w-3xl mx-auto bg-card rounded-[6px] shadow-md mt-2 p-8 flex flex-col transition-all">
      {/* Editable Title */}
      <input
        className="text-[20px] font-semibold mb-5 w-full bg-transparent focus:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-[5px]"
        value={page.title}
        onChange={e => updatePage({ id: pageId, patch: { title: e.target.value } })}
        placeholder="Untitled page"
        maxLength={120}
      />
      {/* Simple (for now) content editor */}
      <textarea
        className="h-72 w-full resize-vertical rounded border px-3 py-2 text-base bg-background focus:outline-accent"
        value={page.content_blocks?.[0] || ""}
        onChange={handleChange}
        placeholder="Start writing here…"
      />
      {/* Will add block-style editor, formatting, etc. soon */}
      <div className="flex justify-end mt-4">
        <Button variant="secondary" size="sm" className="opacity-70 cursor-not-allowed" disabled>
          Autosaved
        </Button>
      </div>
    </section>
  );
}
