/**
 * MobileDrillDownSheet — bottom sheet showing one row card per record from a
 * chart drill-down query. Generic over the row shape: the parent provides the
 * rows + how to render each one (renderRow).
 *
 * The shell handles loading / empty / error states so the parent can focus on
 * data fetching + row-level rendering.
 */
import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';

interface MobileDrillDownSheetProps<Row> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  rows: Row[];
  loading?: boolean;
  /** Shown in the empty state when rows.length === 0 and !loading. */
  emptyMessage?: string;
  /** Optional summary line (e.g. "12 records") shown above the list. */
  countLabel?: string;
  /** Render a single row card. Must return a stable React element. */
  renderRow: (row: Row, index: number) => React.ReactNode;
  /** Stable key for a row (used as React key). */
  rowKey: (row: Row, index: number) => string;
}

export function MobileDrillDownSheet<Row>({
  open,
  onOpenChange,
  title,
  subtitle,
  rows,
  loading = false,
  emptyMessage = 'No records to show for this selection.',
  countLabel,
  renderRow,
  rowKey,
}: MobileDrillDownSheetProps<Row>) {
  const showEmpty = !loading && rows.length === 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="z-[101] rounded-t-[22px] max-h-[85vh] p-5 pb-[max(env(safe-area-inset-bottom,16px),20px)] overflow-y-auto"
      >
        <SheetHeader className="text-left mb-3">
          <SheetTitle className="text-[17px] font-bold tracking-[-0.01em]">
            {title}
          </SheetTitle>
          {subtitle && (
            <div className="text-[11.5px] text-muted-foreground mt-1">
              {subtitle}
            </div>
          )}
        </SheetHeader>

        {countLabel && !loading && (
          <div className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
            {countLabel}
          </div>
        )}

        {loading && (
          <div className="py-10 flex items-center justify-center">
            <LoadingSpinner size="md" />
          </div>
        )}

        {showEmpty && (
          <div className="py-10 text-center text-[13px] text-muted-foreground">
            {emptyMessage}
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className={cn('flex flex-col gap-2')}>
            {rows.map((row, i) => (
              <React.Fragment key={rowKey(row, i)}>{renderRow(row, i)}</React.Fragment>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default MobileDrillDownSheet;
