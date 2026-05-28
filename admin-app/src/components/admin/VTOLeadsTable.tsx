import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Search, Download, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface VTOLead {
  id: string;
  name: string;
  email: string;
  company: string;
  company_size: string;
  role: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  utm_adset: string | null;
  utm_ad: string | null;
  gclid: string | null;
  fbclid: string | null;
  li_fat_id: string | null;
  landing_page_url: string | null;
  referral_source: string | null;
  completed_vto: boolean;
  created_at: string;
}

export const VTOLeadsTable: React.FC = () => {
  const [leads, setLeads] = useState<VTOLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vto_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads((data as VTOLead[]) || []);
    } catch (err) {
      logger.error('Error fetching VTO leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, []);

  const filtered = leads.filter(l =>
    !searchQuery ||
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDaysAgo = (date: string) => {
    const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    if (days >= 30) return `${Math.floor(days / 30)} months ago`;
    return `${days} days ago`;
  };

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Company', 'Size', 'Role', 'Source', 'Medium', 'Campaign', 'Landing Page', 'Completed', 'Date'];
    const rows = filtered.map(l => [
      l.name, l.email, l.company, l.company_size, l.role,
      l.utm_source || '', l.utm_medium || '', l.utm_campaign || '',
      l.landing_page_url || '', l.completed_vto ? 'Yes' : 'No',
      new Date(l.created_at).toLocaleDateString()
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'vto-leads.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const dash = <span className="text-xs text-muted-foreground">—</span>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads by name, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline" className="gap-1.5">
          <FileText className="h-3 w-3" />
          {filtered.length} leads
        </Badge>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={fetchLeads} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="h-4 bg-muted rounded animate-pulse w-48"></div>
                  <div className="h-3 bg-muted rounded animate-pulse w-24"></div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No VTO leads captured yet</p>
            </div>
          ) : (
            <div className="rounded-lg overflow-auto" style={{ height: 'calc(100vh - 280px)' }}>
              <table className="w-full min-w-max caption-bottom text-sm relative">
                <TableHeader className="bg-gradient-to-r from-muted/30 to-muted/10 backdrop-blur-sm sticky top-0 z-10">
                  <TableRow className="border-b border-border/50 hover:bg-transparent">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Company</TableHead>
                    <TableHead className="font-semibold">Size</TableHead>
                    <TableHead className="font-semibold">Role</TableHead>
                    <TableHead className="font-semibold">Completed</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold whitespace-nowrap">Source</TableHead>
                    <TableHead className="font-semibold whitespace-nowrap">Medium</TableHead>
                    <TableHead className="font-semibold whitespace-nowrap">Campaign</TableHead>
                    <TableHead className="font-semibold whitespace-nowrap">Content</TableHead>
                    <TableHead className="font-semibold whitespace-nowrap">Term</TableHead>
                    <TableHead className="font-semibold whitespace-nowrap">Landing Page</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(lead => (
                    <TableRow key={lead.id} className="border-b border-border/30 hover:bg-muted/30 transition-all duration-150">
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell className="text-sm">{lead.email}</TableCell>
                      <TableCell className="text-sm font-medium">{lead.company}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{lead.company_size}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{lead.role}</TableCell>
                      <TableCell>
                        <Badge variant={lead.completed_vto ? 'success' : 'secondary'} className="text-xs">
                          {lead.completed_vto ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{getDaysAgo(lead.created_at)}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{lead.utm_source || dash}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{lead.utm_medium || dash}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{lead.utm_campaign || dash}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{lead.utm_content || dash}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{lead.utm_term || dash}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap max-w-[200px] truncate" title={lead.landing_page_url || ''}>
                        {lead.landing_page_url ? (() => { try { return new URL(lead.landing_page_url).pathname; } catch { return lead.landing_page_url; } })() : dash}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
