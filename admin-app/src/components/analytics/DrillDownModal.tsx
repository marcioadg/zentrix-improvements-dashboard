import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search } from 'lucide-react';
import { DrillDownData, DrillDownColumn } from '@/types/analyticsDrillDown';
import { format } from 'date-fns';

interface DrillDownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  data: DrillDownData[];
  columns: DrillDownColumn[];
  loading: boolean;
}

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
};

export const DrillDownModal: React.FC<DrillDownModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  data,
  columns,
  loading,
}) => {
  const [searchText, setSearchText] = useState('');
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const filteredData = useMemo(() => {
    if (!searchText) return data;
    
    const searchLower = searchText.toLowerCase();
    return data.filter(row => {
      return Object.values(row).some(value => {
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(searchLower);
      });
    });
  }, [data, searchText]);

  const renderCell = (row: any, column: DrillDownColumn) => {
    const value = row[column.key];
    
    if (column.render) {
      return column.render(value, row);
    }

    // Default rendering
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">—</span>;
    }

    // Format dates
    if (column.key.includes('date') || column.key.includes('_at')) {
      try {
        return format(new Date(value), 'MMM d, yyyy');
      } catch {
        return String(value);
      }
    }

    // Format numbers
    if (typeof value === 'number' && !Number.isInteger(value)) {
      return value.toFixed(2);
    }

    return String(value);
  };

  const content = (
    <>
      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <ScrollArea className="h-[500px] w-full rounded-md border">
        {loading ? (
          <div className="flex items-center justify-center h-full py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex items-center justify-center h-full py-12 text-muted-foreground">
            {searchText ? 'No matching results found' : 'No data available'}
          </div>
        ) : (
          <div className="w-full">
            <table className="w-full">
              <thead className="sticky top-0 bg-muted z-10">
                <tr>
                  {columns.map((column, colIdx) => (
                    <th
                      key={column.key}
                      className={`px-4 py-3 text-left text-sm font-semibold text-foreground border-b ${
                        colIdx === 0 ? 'max-w-[280px]' : ''
                      }`}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row: any, idx) => (
                  <tr
                    key={row.id || idx}
                    className="border-b hover:bg-muted/50 transition-colors"
                  >
                    {columns.map((column, colIdx) => (
                      <td
                        key={`${row.id}-${column.key}`}
                        className={`px-4 py-3 text-sm ${
                          colIdx === 0 ? 'max-w-[280px] truncate' : ''
                        }`}
                        title={colIdx === 0 ? String(row[column.key] || '') : undefined}
                      >
                        {renderCell(row, column)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ScrollArea>

      {/* Footer with count */}
      {!loading && filteredData.length > 0 && (
        <div className="mt-4 text-sm text-muted-foreground text-right">
          Showing {filteredData.length} {filteredData.length === 1 ? 'record' : 'records'}
        </div>
      )}
    </>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
          {description && <DrawerDescription>{description}</DrawerDescription>}
        </DrawerHeader>
        <div className="px-4 pb-4">
          {content}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
