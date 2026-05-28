import React from 'react';
import { Link } from 'react-router-dom';

export const VTOFooter: React.FC = () => (
  <footer className="border-t border-border py-12 px-6 bg-background">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
      <div>© {new Date().getFullYear()} Zentrix. All rights reserved.</div>
      <div className="flex gap-8">
        <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
        <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
      </div>
    </div>
  </footer>
);
