
import { useWikiFolders } from "@/hooks/wiki/useWikiFolders";
import { useWikiPages } from "@/hooks/wiki/useWikiPages";
import { useState } from "react";
import { Folder, Plus, Search, Edit, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";

type SidebarProps = {
  selectedPageId: string | null;
  setSelectedPageId: (id: string | null) => void;
};

export default function WikiSidebarV2({ selectedPageId, setSelectedPageId }: SidebarProps) {
  const { folders, createFolder, renameFolder, deleteFolder } = useWikiFolders();
  const { pages, createPage, renamePage, deletePage } = useWikiPages();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [creatingPage, setCreatingPage] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newPageTitle, setNewPageTitle] = useState("");

  // Hierarchical rendering
  function renderItems({ parentId, level = 0 }: { parentId?: string | null; level?: number }) {
    return (
      <>
        {folders.filter(f => f.parent_folder_id === parentId).map(folder => (
          <div key={folder.id} className={`ml-${level * 3} group`}>
            <div className={`flex items-center px-3 py-1.5 rounded cursor-pointer transition-colors ${selectedFolderId === folder.id ? "bg-accent/80" : "hover:bg-accent/50"}`}>
              <Folder className="h-4 w-4 mr-2 text-primary" />
              <span
                className="flex-1 font-semibold truncate"
                onClick={() => setSelectedFolderId(folder.id)}
                title={folder.name}
              >
                {folder.name}
              </span>
              <button onClick={async () => {
                const newName = prompt("Rename folder", folder.name);
                if (newName) await renameFolder({ id: folder.id, newName });
              }} className="invisible group-hover:visible px-1">
                <Edit className="w-4 h-4" />
              </button>
              <button onClick={async () => {
                if (window.confirm("Delete this folder?")) await deleteFolder({ id: folder.id });
              }} className="invisible group-hover:visible px-1 text-destructive">
                <Trash className="w-4 h-4" />
              </button>
            </div>
            <div className="ml-3">{renderItems({ parentId: folder.id, level: level + 1 })}</div>
            {/* Folder children pages */}
            <div className="ml-6">
              {pages.filter(p => p.folder_id === folder.id).map(page => (
                <div
                  key={page.id}
                  className={`flex items-center gap-2 px-3 py-1 rounded text-sm cursor-pointer transition-colors ${
                    selectedPageId === page.id
                      ? "bg-primary/10 text-primary font-semibold"
                      : "hover:bg-muted/60"
                  }`}
                  onClick={() => setSelectedPageId(page.id)}
                  title={page.title}
                >
                  <span className="truncate">{page.title}</span>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const newName = prompt("Rename page", page.title);
                      if (newName) await renamePage({ id: page.id, newName });
                    }}
                    className="invisible group-hover:visible p-1"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (window.confirm("Delete this page?")) await deletePage({ id: page.id });
                    }}
                    className="invisible group-hover:visible p-1 text-destructive"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {/* Root-level pages */}
        {parentId == null && pages.filter(p => !p.folder_id).map(page => (
          <div
            key={page.id}
            className={`flex items-center gap-2 px-3 py-1 rounded text-sm cursor-pointer transition-colors ${
              selectedPageId === page.id
                ? "bg-primary/10 text-primary font-semibold"
                : "hover:bg-muted/60"
            }`}
            onClick={() => setSelectedPageId(page.id)}
            title={page.title}
          >
            <span className="truncate">{page.title}</span>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                const newName = prompt("Rename page", page.title);
                if (newName) await renamePage({ id: page.id, newName });
              }}
              className="ml-auto p-1"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (window.confirm("Delete this page?")) await deletePage({ id: page.id });
              }}
              className="p-1 text-destructive"
            >
              <Trash className="w-4 h-4" />
            </button>
          </div>
        ))}
      </>
    );
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder({ name: newFolderName.trim(), parent_folder_id: selectedFolderId });
    setNewFolderName("");
    setCreatingFolder(false);
  };
  const handleCreatePage = async () => {
    if (!newPageTitle.trim()) return;
    const page = await createPage({ title: newPageTitle.trim(), folder_id: selectedFolderId });
    setNewPageTitle("");
    setCreatingPage(false);
    if (page?.id) setSelectedPageId(page.id);
  };

  return (
    <aside className="relative w-72 min-w-[260px] max-w-[320px] h-[calc(100vh-120px)] bg-card/80 border-r flex flex-col p-0 shadow-lg rounded-r-lg transition-all">
      <section className="flex flex-col gap-2 p-4 border-b">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 opacity-60" />
          <input
            type="text"
            className="rounded border px-2 py-1 w-full bg-muted/40 focus:bg-white focus:outline-accent transition"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search pages..."
          />
        </div>
        <div className="flex flex-row gap-2 mt-2">
          <Button size="sm" variant="outline" className="w-1/2" onClick={() => setCreatingFolder(f => !f)}>
            <Plus className="h-4 w-4" /> Folder
          </Button>
          <Button size="sm" variant="default" className="w-1/2" onClick={() => setCreatingPage(p => !p)}>
            <Plus className="h-4 w-4" /> Page
          </Button>
        </div>
        {creatingFolder && (
          <form className="flex flex-row gap-2 mt-2" onSubmit={e => { e.preventDefault(); handleCreateFolder(); }}>
            <input
              className="rounded border px-2 py-1 w-full"
              autoFocus
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="Folder name…"
              maxLength={64}
            />
            <Button size="sm" type="submit">Add</Button>
          </form>
        )}
        {creatingPage && (
          <form className="flex flex-row gap-2 mt-2" onSubmit={e => { e.preventDefault(); handleCreatePage(); }}>
            <input
              className="rounded border px-2 py-1 w-full"
              autoFocus
              value={newPageTitle}
              onChange={e => setNewPageTitle(e.target.value)}
              placeholder="Page title…"
              maxLength={64}
            />
            <Button size="sm" type="submit">Add</Button>
          </form>
        )}
      </section>
      <nav className="flex-1 overflow-auto p-2">
        {renderItems({ parentId: null })}
      </nav>
      <div className="h-4" />
    </aside>
  );
}
