
import React from "react";

export default function MetaPanel({ pageId }: { pageId: string | null }) {
  // In the next iteration this will have Publish/Draft toggles, Share, and Version History
  if (!pageId) return null;
  return (
    <div className="flex items-center gap-2">
      {/* Draft/Published toggle, Share and Version History buttons */}
      <span className="text-xs text-muted-foreground">Meta controls coming soon</span>
    </div>
  );
}
