import React from 'react';
import { cn } from '@/lib/utils';
import { LayoutGrid } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  template_count?: any;
}

interface CategorySidebarProps {
  categories: Category[];
  selectedCategory?: string;
  onSelectCategory: (categoryId?: string) => void;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div className="w-64 border-r bg-muted/30 p-4">
      <h3 className="font-semibold mb-4 px-2">Categories</h3>
      
      <div className="space-y-1">
        {/* All Templates */}
        <button
          onClick={() => onSelectCategory(undefined)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
            !selectedCategory
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent'
          )}
        >
          <LayoutGrid className="h-4 w-4" />
          <span className="flex-1 text-left">All Templates</span>
        </button>

        {/* Category List */}
        {categories.map((category) => {
          const count = Array.isArray(category.template_count) 
            ? category.template_count.length 
            : 0;
          
          return (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                selectedCategory === category.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              )}
            >
              <span className="text-lg">{category.icon || '📁'}</span>
              <span className="flex-1 text-left">{category.name}</span>
              <span className="text-xs text-muted-foreground">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
