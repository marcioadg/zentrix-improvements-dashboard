
import React from "react";
import { useWikiPages } from "@/hooks/wiki/useWikiPages";

// Placeholder; will be replaced by full block editor
export default function WikiEditor({ pageId }: { pageId: string | null }) {
  const { pages, updatePage } = useWikiPages();
  const page = pages.find(p => p.id === pageId);

  if (!pageId)
    return <div className="p-8 text-2xl text-muted-foreground">Select a page to start editing…</div>;
  if (!page)
    return <div className="p-8 text-xl text-muted-foreground">Page not found</div>;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Demo: Set content_blocks as plain text array for now
    updatePage({ id: pageId, patch: { content_blocks: [e.target.value] } });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{page.title}</h1>
      <textarea
        className="w-full h-[60vh] border rounded p-3 text-base bg-background"
        value={page.content_blocks?.[0] || ""}
        onChange={handleChange}
      />
      {/* Block editor, /-command and autosave here soon! */}
    </div>
  );
}
