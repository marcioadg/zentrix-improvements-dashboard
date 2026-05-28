import React, { useState, useEffect, useMemo } from 'react';
import { Building2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { useToast } from '@/hooks/use-toast';
import { useMobileShellSafe } from '@/contexts/MobileShellContext';

export const MobileCompanySwitcher: React.FC = () => {
  const {
    companies,
    currentCompany,
    switchCompany,
    hasMultipleCompanies
  } = useMultiCompanyAccess();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const { toast } = useToast();
  
  // Safely get context - returns null if outside MobileShellProvider
  const mobileShellContext = useMobileShellSafe();

  // Sync open state with context to hide bottom nav (only if context is available)
  useEffect(() => {
    if (mobileShellContext?.setIsCompanySwitcherOpen) {
      mobileShellContext.setIsCompanySwitcherOpen(open);
    }
  }, [open, mobileShellContext]);

  // Sort companies with current company first
  const sortedCompanies = useMemo(() => {
    return [...companies].sort((a, b) => {
      if (a.id === currentCompany?.id) return -1;
      if (b.id === currentCompany?.id) return 1;
      return 0;
    });
  }, [companies, currentCompany?.id]);

  if (!hasMultipleCompanies) {
    return null;
  }

  const handleCompanySwitch = async (companyId: string) => {
    if (companyId === currentCompany?.id || switching) return;
    setSwitching(true);
    try {
      await switchCompany(companyId);
      setOpen(false);
      toast({
        title: "Company Switched",
        description: `Switched to ${companies.find(c => c.id === companyId)?.name}`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to switch company",
        variant: "destructive"
      });
    } finally {
      setSwitching(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Switch company">
          <Building2 className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto max-h-[70vh] flex flex-col overflow-hidden mb-[calc(64px+env(safe-area-inset-bottom)+8px)]">
        <SheetHeader className="mb-4 flex-shrink-0">
          <SheetTitle>Switch Company</SheetTitle>
        </SheetHeader>
        <div
          className="flex-1 min-h-0 -mx-6 px-6 pb-2 h-[55vh] max-h-[55vh] overflow-y-auto overscroll-contain"
          onWheelCapture={(e) => e.stopPropagation()}
          onTouchMoveCapture={(e) => e.stopPropagation()}
        >
          <div className="space-y-2 pr-2">
            {sortedCompanies.map(company => {
              const isActive = company.id === currentCompany?.id;
              return (
                <button
                  key={company.id}
                  onClick={() => handleCompanySwitch(company.id)}
                  disabled={switching}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    isActive ? 'bg-primary/10 border-primary' : 'bg-background border-border hover:bg-muted'
                  } ${switching ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center gap-3">
                    <Building2 className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-[13px] font-semibold ${isActive ? 'text-primary' : 'text-foreground'}`}>
                      {company.name}
                    </span>
                  </div>
                  {isActive && <Check className="h-5 w-5 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
        {switching && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Switching...
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
