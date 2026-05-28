
import { useWikiFolders } from "@/hooks/wiki/useWikiFolders";
import { useWikiPages } from "@/hooks/wiki/useWikiPages";
import { useState } from "react";
import { ChevronDown, ChevronRight, MoreHorizontal, FileText, Folder as FolderIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type SidebarItemProps = {
  item: any;
  type: "folder" | "page";
  selectedPageId: string | null;
  setSelectedPageId: (id: string | null) => void;
  setSelectedFolderId: (id: string | null) => void;
  level?: number;
};

export default function SidebarItem({
  item, type, selectedPageId,
  setSelectedPageId, setSelectedFolderId, level = 0
}: SidebarItemProps) {
  const isFolder = type === "folder";
  const [expanded, setExpanded] = useState(false);
  const { folders, renameFolder, deleteFolder } = useWikiFolders();
  const { pages, renamePage, deletePage } = useWikiPages();

  const childFolders = isFolder ? folders.filter(f => f.parent_folder_id === item.id) : [];
  const childPages = isFolder ? pages.filter(p => p.folder_id === item.id) : [];

  const handleSelect = () => {
    if (isFolder) setSelectedFolderId(item.id);
    else setSelectedPageId(item.id);
  };

  const handleRename = async () => {
    const newName = prompt("Rename " + (isFolder ? "folder" : "page"), item.name || item.title);
    if (!newName) return;
    if (isFolder) await renameFolder({ id: item.id, newName });
    else await renamePage({ id: item.id, newName });
  };

  const handleDelete = async () => {
    if (!confirm(`Delete this ${isFolder ? "folder" : "page"}?`)) return;
    if (isFolder) await deleteFolder({ id: item.id });
    else await deletePage({ id: item.id });
  };

  return (
    <div className={`pl-${level * 4} flex flex-col`}>
      <div className={`flex items-center gap-2 h-8 rounded cursor-pointer hover:bg-accent pr-2 ${selectedPageId === item.id ? "bg-muted" : ""}`}>
        {isFolder ? (
          <Button
            size="icon"
            variant="ghost"
            aria-label={expanded ? "Collapse folder" : "Expand folder"}
            className="mr-1"
            onClick={() => setExpanded(exp => !exp)}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        ) : <FileText className="h-4 w-4 text-primary" />}
        <span
          className={`flex-1 truncate ${isFolder ? "font-semibold" : ""}`}
          onClick={handleSelect}
          title={isFolder ? item.name : item.title}
        >
          {isFolder ? item.name : item.title}
        </span>
        <Button size="icon" variant="ghost" aria-label="More options" className="ml-auto" onClick={handleRename}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" aria-label="Delete" className="text-destructive" onClick={handleDelete}>
          ×
        </Button>
      </div>
      {isFolder && expanded && (
        <div className="ml-5">
          {/* Children folders/pages */}
          {childFolders.map(child =>
            <SidebarItem
              key={child.id}
              item={child}
              type="folder"
              selectedPageId={selectedPageId}
              setSelectedPageId={setSelectedPageId}
              setSelectedFolderId={setSelectedFolderId}
              level={level + 1}
            />
          )}
          {childPages.map(child =>
            <SidebarItem
              key={child.id}
              item={child}
              type="page"
              selectedPageId={selectedPageId}
              setSelectedPageId={setSelectedPageId}
              setSelectedFolderId={setSelectedFolderId}
              level={level + 1}
            />
          )}
        </div>
      )}
    </div>
  );
}
