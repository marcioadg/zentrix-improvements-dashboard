
import { useWikiFolders } from "@/hooks/wiki/useWikiFolders";
import { useWikiPages } from "@/hooks/wiki/useWikiPages";
import SidebarItem from "./SidebarItem";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";

type SidebarProps = {
  selectedPageId: string | null;
  setSelectedPageId: (id: string | null) => void;
};

export default function WikiSidebar({ selectedPageId, setSelectedPageId }: SidebarProps) {
  const { folders, createFolder } = useWikiFolders();
  const { pages, createPage } = useWikiPages();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Show root-level folders, and root-level pages (folder_id === null)
  const rootFolders = folders.filter(f => !f.parent_folder_id);
  const rootPages = pages.filter(p => !p.folder_id);

  const handleNewFolder = async () => {
    const name = prompt("Folder name?");
    if (!name) return;
    await createFolder({ name, parent_folder_id: selectedFolderId });
  };

  const handleNewPage = async () => {
    const title = prompt("Page title?");
    if (!title) return;
    const page = await createPage({ title, folder_id: selectedFolderId });
    if (page?.id) setSelectedPageId(page.id);
  };

  return (
    <aside className="w-64 border-r h-full flex flex-col bg-card">
      <div className="p-4 flex flex-col gap-3">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleNewFolder}>
            <Plus className="h-4 w-4" />
            New Folder
          </Button>
          <Button size="sm" onClick={handleNewPage}>
            <Plus className="h-4 w-4" />
            New Page
          </Button>
        </div>
        <div className="mt-4">
          {rootFolders.map(folder =>
            <SidebarItem
              key={folder.id}
              item={folder}
              type="folder"
              selectedPageId={selectedPageId}
              setSelectedPageId={setSelectedPageId}
              setSelectedFolderId={setSelectedFolderId}
            />
          )}
          {rootPages.map(page =>
            <SidebarItem
              key={page.id}
              item={page}
              type="page"
              selectedPageId={selectedPageId}
              setSelectedPageId={setSelectedPageId}
              setSelectedFolderId={setSelectedFolderId}
            />
          )}
        </div>
      </div>
    </aside>
  );
}
