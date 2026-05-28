import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Save, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchCustomerSuccessData, updateCustomerSuccess } from '@/services/customerSuccessService';
import type { CustomerSuccessRow } from '@/types/customerSuccess';
import type { CompanyStats } from '@/types/superAdmin';
import {
  ACCOUNT_STAGE_OPTIONS,
  CUSTOMER_MIGRATION_OPTIONS,
  CUSTOMER_HEALTH_OPTIONS,
  WHATSAPP_GROUP_OPTIONS,
  ONBOARDING_VIDEO_OPTIONS,
  SUBS_STATUS_OPTIONS,
} from '@/types/customerSuccess';

interface CustomerSuccessTableProps {
  companies: CompanyStats[];
  loading: boolean;
}

export const CustomerSuccessTable: React.FC<CustomerSuccessTableProps> = ({
  companies,
  loading: companiesLoading,
}) => {
  const [data, setData] = useState<CustomerSuccessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'name' | 'mrr' | 'tier'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [hideInternalTest, setHideInternalTest] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [companies]);

  const loadData = async () => {
    setLoading(true);
    const rows = await fetchCustomerSuccessData(companies);
    setData(rows);
    setLoading(false);
  };

  const handleUpdate = async (companyId: string, field: string, value: string | null) => {
    setSaving(prev => new Set(prev).add(`${companyId}-${field}`));

    const result = await updateCustomerSuccess(companyId, {
      [field]: value,
    });

    setSaving(prev => {
      const next = new Set(prev);
      next.delete(`${companyId}-${field}`);
      return next;
    });

    if (result.success) {
      // Update local state
      setData(prev =>
        prev.map(row =>
          row.company_id === companyId ? { ...row, [field]: value } : row
        )
      );
      toast({
        title: 'Success',
        description: 'Customer data updated successfully',
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to update customer data',
        variant: 'destructive',
      });
    }
  };

  const getTierColor = (tier: 1 | 2 | 3) => {
    switch (tier) {
      case 1:
        return 'bg-primary text-primary-foreground';
      case 2:
        return 'bg-secondary text-secondary-foreground';
      case 3:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleSort = (field: 'name' | 'mrr' | 'tier') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const HIDDEN_STAGES = ['Internal Company', 'Test Company', 'Done', 'Churned'];
  
  const filteredData = data.filter(row => {
    if (hideInternalTest) {
      return !HIDDEN_STAGES.includes(row.account_stage || '');
    }
    return true;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortField) {
      case 'name':
        aValue = a.company_name.toLowerCase();
        bValue = b.company_name.toLowerCase();
        break;
      case 'mrr':
        aValue = a.mrr;
        bValue = b.mrr;
        break;
      case 'tier':
        aValue = a.customer_tier;
        bValue = b.customer_tier;
        break;
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const SortIcon = ({ field }: { field: 'name' | 'mrr' | 'tier' }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline ml-1" />
    );
  };

  if (loading || companiesLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="sticky top-0 z-20 p-4 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="hide-internal-test" className="text-sm font-medium cursor-pointer">
            Hide Closed Accounts
          </Label>
          <Switch
            id="hide-internal-test"
            checked={hideInternalTest}
            onCheckedChange={setHideInternalTest}
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {sortedData.length} of {data.length} companies
        </div>
      </div>
      <div className="max-h-[600px] overflow-y-auto overflow-x-auto relative">
        <table className="w-full caption-bottom text-sm">
          <thead className="sticky top-0 z-10 bg-muted border-b">
            <tr>
              <th
                className="h-12 px-4 text-left align-middle font-semibold cursor-pointer hover:bg-muted/80 transition-colors text-muted-foreground"
                onClick={() => handleSort('name')}
              >
                Nome <SortIcon field="name" />
              </th>
              <th className="h-12 px-4 text-left align-middle font-semibold text-muted-foreground">
                Account Stage
              </th>
              <th
                className="h-12 px-4 text-left align-middle font-semibold cursor-pointer hover:bg-muted/80 transition-colors text-muted-foreground"
                onClick={() => handleSort('tier')}
              >
                Customer Tier <SortIcon field="tier" />
              </th>
              <th
                className="h-12 px-4 text-left align-middle font-semibold cursor-pointer hover:bg-muted/80 transition-colors text-muted-foreground"
                onClick={() => handleSort('mrr')}
              >
                MRR (US$) <SortIcon field="mrr" />
              </th>
              <th className="h-12 px-4 text-left align-middle font-semibold text-muted-foreground">
                Customer Migration
              </th>
              <th className="h-12 px-4 text-left align-middle font-semibold text-muted-foreground">
                Customer Health
              </th>
              <th className="h-12 px-4 text-left align-middle font-semibold text-muted-foreground">
                Whatsapp Group
              </th>
              <th className="h-12 px-4 text-left align-middle font-semibold text-muted-foreground">
                Onboarding Video
              </th>
              <th className="h-12 px-4 text-left align-middle font-semibold text-muted-foreground">
                Subs Status
              </th>
              <th className="h-12 px-4 text-left align-middle font-semibold text-muted-foreground min-w-[300px]">
                Customer Status
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row) => (
              <tr key={row.company_id} className="border-b transition-all duration-150 hover:bg-muted/30 last:border-0">
                <td className="p-4 align-middle font-medium">{row.company_name}</td>

                <td className="p-4 align-middle">
                  <Select
                    value={row.account_stage || ""}
                    onValueChange={(value) => handleUpdate(row.company_id, "account_stage", value)}
                  >
                    <SelectTrigger className="w-[180px] bg-background">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      {ACCOUNT_STAGE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: option.color }}
                            />
                            {option.value}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>

                <td className="p-4 align-middle">
                  <Badge className={getTierColor(row.customer_tier)}>Tier {row.customer_tier}</Badge>
                </td>

                <td className="p-4 align-middle font-medium">${row.mrr.toFixed(2)}</td>

                <td className="p-4 align-middle">
                  <Select
                    value={row.customer_migration || ""}
                    onValueChange={(value) => handleUpdate(row.company_id, "customer_migration", value)}
                  >
                    <SelectTrigger className="w-[150px] bg-background">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      {CUSTOMER_MIGRATION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: option.color }}
                            />
                            {option.value}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>

                <td className="p-4 align-middle">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor:
                          CUSTOMER_HEALTH_OPTIONS.find(
                            (opt) => opt.value === row.customer_health
                          )?.color || 'hsl(var(--muted))',
                      }}
                    />
                    <span className="text-sm font-medium">
                      {row.customer_health || 'N/A'}
                      {row.health_score_label && (
                        <span className="text-muted-foreground ml-1">
                          ({row.health_score_label})
                        </span>
                      )}
                    </span>
                  </div>
                </td>

                <td className="p-4 align-middle">
                  <Select
                    value={row.whatsapp_group || ""}
                    onValueChange={(value) => handleUpdate(row.company_id, "whatsapp_group", value)}
                  >
                    <SelectTrigger className="w-[150px] bg-background">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      {WHATSAPP_GROUP_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: option.color }}
                            />
                            {option.value}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>

                <td className="p-4 align-middle">
                  <Select
                    value={row.onboarding_video || ""}
                    onValueChange={(value) => handleUpdate(row.company_id, "onboarding_video", value)}
                  >
                    <SelectTrigger className="w-[150px] bg-background">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {ONBOARDING_VIDEO_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: option.color }}
                            />
                            {option.value}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>

                <td className="p-4 align-middle">
                  <Select
                    value={row.subs_status || ""}
                    onValueChange={(value) => handleUpdate(row.company_id, "subs_status", value)}
                  >
                    <SelectTrigger className="w-[140px] bg-background">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {SUBS_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: option.color }}
                            />
                            {option.value}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>

                <td className="p-4 align-middle">
                  <div className="flex items-center gap-2">
                    <Textarea
                      value={row.customer_status_notes || ""}
                      onChange={(e) => {
                        setData((prev) =>
                          prev.map((r) =>
                            r.company_id === row.company_id
                              ? { ...r, customer_status_notes: e.target.value }
                              : r
                          )
                        );
                      }}
                      placeholder="Add status updates..."
                      className="min-h-[80px] bg-background resize-y"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleUpdate(
                          row.company_id,
                          "customer_status_notes",
                          row.customer_status_notes
                        )
                      }
                      disabled={saving.has(`${row.company_id}-customer_status_notes`)}
                    >
                      {saving.has(`${row.company_id}-customer_status_notes`) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
