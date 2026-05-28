import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { SopsSidebar } from './SopsSidebar';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

export const SopsLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen w-full">
      {/* SOPs Secondary Sidebar */}
      <aside
        className={`border-r bg-card transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-0'
        } overflow-hidden`}
      >
        <SopsSidebar />
      </aside>

      {/* Main SOPs Content */}
      <main className="flex-1 overflow-auto relative">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-8 w-8"
            aria-label="Toggle SOPs sidebar"
          >
            {sidebarOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="container max-w-5xl mx-auto py-6 px-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
