import React, { useState } from 'react';
import WikiSidebar from '@/components/wiki/Sidebar';
import { Process2Editor } from '@/components/process2/Process2Editor';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

export default function Process2() {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`border-r bg-card transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-0'
        } overflow-hidden`}
      >
        <WikiSidebar
          selectedPageId={selectedPageId}
          setSelectedPageId={setSelectedPageId}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b px-4 py-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-8 w-8"
          >
            {sidebarOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-auto">
          <Process2Editor pageId={selectedPageId} />
        </div>
      </main>
    </div>
  );
}
