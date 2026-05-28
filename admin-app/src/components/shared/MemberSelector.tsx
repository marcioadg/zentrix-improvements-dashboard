import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Users, Clock, Lock } from 'lucide-react';
import { CompanyUser } from '@/types/companyUser';
import { logger } from '@/utils/logger';
interface MemberSelectorProps {
  members: CompanyUser[];
  selectedMembers: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  excludeMembers?: string[];
  lockedMembers?: string[];
  loading?: boolean;
}
export const MemberSelector: React.FC<MemberSelectorProps> = ({
  members,
  selectedMembers,
  onSelectionChange,
  excludeMembers = [],
  lockedMembers = [],
  loading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  logger.log('🎯 MemberSelector Debug:', {
    totalMembers: members.length,
    selectedMembers,
    lockedMembers,
    excludeMembers,
    allMemberIds: members.map(m => ({
      id: m.id,
      user_id: m.user_id,
      email: m.email,
      status: m.status,
      full_name: m.full_name
    }))
  });
  
  // Filter out excluded members, pending users, and users without valid user_id
  const availableMembers = members.filter(member => 
    member.user_id && // Only include users with valid profile IDs
    !excludeMembers.includes(member.id) && 
    member.status !== 'pending' &&
    member.status !== 'invited'
  );
  
  logger.log('✅ Available members after filtering:', {
    count: availableMembers.length,
    filtered: availableMembers.map(m => ({ id: m.id, user_id: m.user_id, email: m.email, status: m.status }))
  });
  
  const filteredMembers = availableMembers.filter(member => 
    (member.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (member.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const handleMemberToggle = (memberId: string) => {
    logger.log('🔄 handleMemberToggle called:', {
      memberId,
      isLocked: lockedMembers.includes(memberId),
      currentlySelected: selectedMembers.includes(memberId)
    });
    
    // Prevent toggling locked members
    if (lockedMembers.includes(memberId)) {
      logger.log('🔒 Member is locked, preventing toggle');
      return;
    }
    
    const isSelected = selectedMembers.includes(memberId);
    if (isSelected) {
      const newSelection = selectedMembers.filter(id => id !== memberId);
      logger.log('➖ Deselecting member. New selection:', newSelection);
      onSelectionChange(newSelection);
    } else {
      const newSelection = [...selectedMembers, memberId];
      logger.log('➕ Selecting member. New selection:', newSelection);
      onSelectionChange(newSelection);
    }
  };
  const handleSelectAll = () => {
    const allFilteredIds = filteredMembers.map(member => member.user_id || member.id);
    const allSelected = allFilteredIds.every(id => selectedMembers.includes(id));
    if (allSelected) {
      onSelectionChange(selectedMembers.filter(id => !allFilteredIds.includes(id)));
    } else {
      const newSelection = [...new Set([...selectedMembers, ...allFilteredIds])];
      onSelectionChange(newSelection);
    }
  };
  if (loading) {
    return <div className="space-y-3">
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted rounded"></div>)}
        </div>
      </div>;
  }
  return <div className="space-y-3">
      <div>
        <Label className="text-sm font-medium">Select Team Members</Label>
        
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search members..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9" />
      </div>

      {filteredMembers.length > 0}

      <ScrollArea className="h-32 border rounded-lg p-2">
        {filteredMembers.length === 0 ? <div className="text-center py-6 text-muted-foreground">
            <Users className="h-6 w-6 mx-auto mb-2" />
            <p className="text-sm">No members found</p>
            {searchTerm && <p className="text-xs">Try adjusting your search</p>}
          </div> : <div className="space-y-1">
            {filteredMembers.map(member => {
              const memberId = member.user_id || member.id;
              const isLocked = lockedMembers.includes(memberId);
              return <div 
                key={member.id} 
                className={`flex items-center space-x-2 p-2 rounded ${isLocked ? 'bg-accent/50 border border-primary/20' : 'hover:bg-accent cursor-pointer'}`}
                onClick={() => !isLocked && handleMemberToggle(memberId)}
              >
                <Checkbox 
                  checked={selectedMembers.includes(memberId)} 
                  disabled={isLocked}
                  onChange={() => {}} // Handled by parent div click
                />
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <p className="text-sm font-medium truncate">
                    {member.full_name}
                  </p>
                  {lockedMembers.includes(memberId) && (
                    <div className="flex items-center gap-1 text-xs text-primary">
                      <Lock className="h-3 w-3" />
                      <span className="font-medium">(You)</span>
                    </div>
                  )}
                </div>
                {/* Show indicator if this is a recently added member */}
                {member.id.startsWith('temp-') && <div title="Recently added">
                    <Clock className="h-3 w-3 text-orange-500" />
                  </div>}
              </div>;
            })}
          </div>}
      </ScrollArea>
    </div>;
};