
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, ChevronDown, Check, Mail, Plus } from 'lucide-react';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePendingInvitations } from '@/hooks/usePendingInvitations';
import { useInvitationModal } from '@/hooks/useInvitationModal';
import { InvitationModal } from '@/components/invitations/InvitationModal';
import { Link } from 'react-router-dom';
import { logger } from '@/utils/logger';

interface CompanySwitcherProps {
  className?: string;
  variant?: 'sidebar' | 'header' | 'inline';
}

export const CompanySwitcher: React.FC<CompanySwitcherProps> = ({
  className = '',
  variant = 'sidebar'
}) => {
  const { 
    companies: allCompanies, 
    currentCompany, 
    switchCompany, 
    hasMultipleCompanies,
    loading,
    refreshCompanies 
  } = useMultiCompanyAccess();
  
  // Show all companies including teste
  const companies = allCompanies;
  
  logger.debug('🏢 CompanySwitcher: Debug info', {
    allCompanies: allCompanies.map(c => ({ id: c.id, name: c.name, slug: c.slug })),
    currentCompany: currentCompany ? { id: currentCompany?.id, name: currentCompany?.name, slug: currentCompany?.slug } : null,
    filteredCompanies: companies.map(c => ({ id: c.id, name: c.name, slug: c.slug })),
    hasMultipleCompanies,
    loading
  });
  
  const { invitations } = usePendingInvitations();
  const { isOpen, openModal, setIsOpen } = useInvitationModal();
  const [isSwitching, setIsSwitching] = useState(false);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 p-2 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-secondary rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (!currentCompany) {
    // No company - show dropdown with Invitations and New Company
    return (
      <>
        <div className={className}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-[13px] font-semibold truncate">No Company</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Company</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={openModal} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>Invitations</span>
                </div>
                {invitations.length > 0 && (
                  <Badge variant="secondary" className="h-4 min-w-4 text-xs font-medium">
                    {invitations.length}
                  </Badge>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/new-company" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>New Company</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <InvitationModal open={isOpen} onOpenChange={setIsOpen} />
      </>
    );
  }

  const handleCompanySwitch = async (companyId: string) => {
    if (companyId !== currentCompany?.id) {
      setIsSwitching(true);
      try {
        await switchCompany(companyId);
      } catch (error) {
        logger.error('Failed to switch company:', error);
      } finally {
        setIsSwitching(false);
      }
    }
  };

  if (variant === 'sidebar') {
    return (
      <>
        <div className={className}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={isSwitching}>
              <Button variant="ghost" className="w-full justify-between p-2 h-auto" disabled={isSwitching}>
                <div className="flex items-center gap-2 min-w-0">
                  {currentCompany?.logo_url ? (
                    <div className="w-5 h-5 rounded-[4px] overflow-hidden flex-shrink-0">
                      <img src={currentCompany.logo_url} alt={currentCompany.name} className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="text-[13px] font-semibold truncate">
                    {isSwitching ? 'Switching...' : currentCompany?.name}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Switch Company</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ScrollArea className="max-h-[300px]" style={{ maxHeight: '300px' }}>
                <div className="pr-4">
                  {companies.map((company) => (
                    <DropdownMenuItem
                      key={company.id}
                      onClick={() => handleCompanySwitch(company.id)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span className="truncate">{company.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {company.id === currentCompany?.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              </ScrollArea>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={openModal} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>Invitations</span>
                </div>
                {invitations.length > 0 && (
                  <Badge variant="secondary" className="h-4 min-w-4 text-xs font-medium">
                    {invitations.length}
                  </Badge>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/new-company" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>New Company</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <InvitationModal open={isOpen} onOpenChange={setIsOpen} />
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isSwitching}>
        <Button variant="outline" size="sm" className={className} disabled={isSwitching}>
          <Building2 className="h-4 w-4 mr-2" />
          {isSwitching ? 'Switching...' : currentCompany?.name}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Switch Company</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="max-h-[300px]" style={{ maxHeight: '300px' }}>
          <div className="pr-4">
            {companies.map((company) => (
              <DropdownMenuItem
                key={company.id}
                onClick={() => handleCompanySwitch(company.id)}
                className="flex items-center justify-between"
              >
                <span>{company.name}</span>
                {company.id === currentCompany?.id && (
                  <Check className="h-4 w-4" />
                )}
              </DropdownMenuItem>
            ))}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
