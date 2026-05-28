import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Send, Users, X, CheckSquare, Square, Loader2, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { FilterSplitButton } from './FilterSplitButton';
import { SavedFilter } from '@/hooks/useSavedCompanyFilters';
import { logger } from '@/utils/logger';

interface PlatformUser {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  company_id: string | null;
}

export const AdminEmailMessage: React.FC = () => {
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [excludedCompanyIds, setExcludedCompanyIds] = useState<string[]>([]);
  const [showAtRisk, setShowAtRisk] = useState(false);
  const [filterSearchQuery, setFilterSearchQuery] = useState('');

  // Fetch all companies for filter
  const { data: companies = [] } = useQuery({
    queryKey: ['platform-companies-for-email'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');
      
      if (error) {
        logger.error('Error fetching companies:', error);
        throw error;
      }
      return data || [];
    }
  });

  // Fetch all platform users with their company memberships
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['platform-users-for-email'],
    queryFn: async (): Promise<PlatformUser[]> => {
      // Get all profiles with their company info
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          company_members!inner(
            company_id,
            companies(name)
          )
        `)
        .order('full_name');

      if (error) {
        logger.error('Error fetching users:', error);
        throw error;
      }

      // Transform data - keep company_id for filtering
      const transformedUsers: PlatformUser[] = (profiles || []).map((profile: any) => {
        const companyMember = profile.company_members?.[0];
        const companyName = companyMember?.companies?.name || null;
        const companyId = companyMember?.company_id || null;
        
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          company_name: companyName,
          company_id: companyId
        };
      });

      // Remove duplicates by email (user might be in multiple companies)
      const uniqueUsers = Array.from(
        new Map(transformedUsers.map(u => [u.email, u])).values()
      );

      return uniqueUsers;
    }
  });

  // Filter users based on search and company filter
  const filteredUsers = useMemo(() => {
    let filtered = users;
    
    // Apply company exclusion filter
    if (excludedCompanyIds.length > 0) {
      filtered = filtered.filter(user => !user.company_id || !excludedCompanyIds.includes(user.company_id));
    }
    
    // Apply filter search query (from saved filter)
    if (filterSearchQuery.trim()) {
      const query = filterSearchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.company_name?.toLowerCase().includes(query)
      );
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(query) ||
        (user.full_name?.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [users, searchQuery, excludedCompanyIds, filterSearchQuery]);

  // Current filters for the FilterSplitButton
  const currentFilters: SavedFilter['filter_data'] = {
    searchQuery: filterSearchQuery,
    excludedCompanyIds,
    showAtRisk,
  };

  // Handle loading a saved filter
  const handleLoadFilter = (filterData: SavedFilter['filter_data']) => {
    if (filterData.searchQuery !== undefined) setFilterSearchQuery(filterData.searchQuery);
    if (filterData.excludedCompanyIds !== undefined) setExcludedCompanyIds(filterData.excludedCompanyIds);
    if (filterData.showAtRisk !== undefined) setShowAtRisk(filterData.showAtRisk);
  };

  // Handle clearing filters
  const handleClearFilter = () => {
    setFilterSearchQuery('');
    setExcludedCompanyIds([]);
    setShowAtRisk(false);
  };

  // Selected users list
  const selectedUsers = useMemo(() => {
    return users.filter(u => selectedUserIds.has(u.id));
  }, [users, selectedUserIds]);

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const selectAll = () => {
    const allIds = new Set(filteredUsers.map(u => u.id));
    setSelectedUserIds(allIds);
  };

  const deselectAll = () => {
    setSelectedUserIds(new Set());
  };

  const removeSelected = (userId: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  };

  const handleSendEmail = async () => {
    if (!subject.trim()) {
      toast({
        title: 'Missing subject',
        description: 'Please enter an email subject.',
        variant: 'destructive'
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: 'Missing content',
        description: 'Please enter the email message.',
        variant: 'destructive'
      });
      return;
    }

    if (selectedUserIds.size === 0) {
      toast({
        title: 'No recipients',
        description: 'Please select at least one recipient.',
        variant: 'destructive'
      });
      return;
    }

    setSending(true);

    try {
      // Send recipients with their data for placeholder replacement (first name only)
      const recipients = selectedUsers.map(u => {
        const firstName = u.full_name?.split(' ')[0] || 'there';
        return {
          email: u.email,
          name: firstName
        };
      });

      const { data, error } = await supabase.functions.invoke('send-admin-email', {
        body: {
          subject: subject.trim(),
          content: content.trim(),
          recipients
        }
      });

      if (error) throw error;

      toast({
        title: 'Emails sent!',
        description: `Successfully sent email to ${recipients.length} recipient(s).`
      });

      // Reset form
      setSubject('');
      setContent('');
      setSelectedUserIds(new Set());

    } catch (error: any) {
      logger.error('Error sending emails:', error);
      toast({
        title: 'Failed to send emails',
        description: error.message || 'An error occurred while sending emails.',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Send Email Message
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Compose and send custom email messages to selected platform users. Emails will use the standard Zentrix OS header and footer.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Content Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-subject">Email Subject</Label>
            <Input
              id="email-subject"
              placeholder="Enter email subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-content">Message Body</Label>
            <Textarea
              id="email-content"
              placeholder="Enter your message here... Use [name] to personalize with the recipient's name."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Available placeholders:</span>
              <Badge variant="outline" className="text-xs font-mono">[name]</Badge>
              <span className="text-muted-foreground">→ recipient's first name</span>
              <Badge variant="outline" className="text-xs font-mono">[email]</Badge>
              <span className="text-muted-foreground">→ recipient's email</span>
            </div>
          </div>
        </div>

        {/* Recipients Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Recipients
              {selectedUserIds.size > 0 && (
                <Badge variant="secondary">{selectedUserIds.size} selected</Badge>
              )}
            </Label>
            <div className="flex gap-2">
              <FilterSplitButton
                currentFilters={currentFilters}
                onLoadFilter={handleLoadFilter}
                onClearFilter={handleClearFilter}
                companies={companies}
              />
              <Button variant="outline" size="sm" onClick={selectAll}>
                <CheckSquare className="h-4 w-4 mr-1" />
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                <Square className="h-4 w-4 mr-1" />
                Deselect All
              </Button>
            </div>
          </div>

          {/* Selected Users Chips */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
              {selectedUsers.map(user => (
                <Badge
                  key={user.id}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  {user.full_name || user.email}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive/20"
                    onClick={() => removeSelected(user.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* User List */}
          <ScrollArea className="h-[300px] border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {searchQuery ? 'No users match your search' : 'No users found'}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className={`flex items-center gap-3 p-3 rounded-md hover:bg-accent cursor-pointer transition-colors ${
                      selectedUserIds.has(user.id) ? 'bg-accent' : ''
                    }`}
                    onClick={() => toggleUser(user.id)}
                  >
                    <Checkbox
                      checked={selectedUserIds.has(user.id)}
                      onCheckedChange={() => toggleUser(user.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.full_name || 'No name'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Send Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSendEmail}
            disabled={sending || selectedUserIds.size === 0 || !subject.trim() || !content.trim()}
            size="lg"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Email to {selectedUserIds.size} Recipient{selectedUserIds.size !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
