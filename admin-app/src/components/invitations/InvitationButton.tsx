import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail } from 'lucide-react';
import { usePendingInvitations } from '@/hooks/usePendingInvitations';
import { useInvitationModal } from '@/hooks/useInvitationModal';
import { InvitationModal } from './InvitationModal';
interface InvitationButtonProps {
  variant?: 'sidebar' | 'onboarding';
  className?: string;
  onInvitationAccepted?: () => void;
}
export const InvitationButton = ({
  variant = 'sidebar',
  className,
  onInvitationAccepted
}: InvitationButtonProps) => {
  const {
    invitations
  } = usePendingInvitations();
  const {
    isOpen,
    openModal,
    setIsOpen
  } = useInvitationModal();
  const hasInvitations = invitations.length > 0;
  if (variant === 'sidebar') {
    return <>
        <Button variant="ghost" size="sm" onClick={openModal} className={`w-full justify-start ${className}`}>
          <Mail className="mr-2 h-4 w-4" />
          <span>Invitations</span>
          {hasInvitations && <Badge variant="destructive" className="ml-auto h-5 min-w-5 text-xs">
              {invitations.length}
            </Badge>}
        </Button>
        <InvitationModal open={isOpen} onOpenChange={setIsOpen} onInvitationAccepted={onInvitationAccepted} />
      </>;
  }
  return <>
      
      <InvitationModal open={isOpen} onOpenChange={setIsOpen} onInvitationAccepted={onInvitationAccepted} />
    </>;
};