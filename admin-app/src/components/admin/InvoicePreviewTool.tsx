import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, Receipt } from 'lucide-react';
import { useInvoicePreview } from '@/hooks/useInvoicePreview';
import type { CompanyStats } from '@/types/superAdmin';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface InvoicePreviewToolProps {
  companies: CompanyStats[];
}

export const InvoicePreviewTool: React.FC<InvoicePreviewToolProps> = ({ companies }) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const { previewInvoice, clearInvoice, invoice, loading } = useInvoicePreview();

  const handlePreview = () => {
    if (selectedCompanyId) {
      previewInvoice(selectedCompanyId);
    }
  };

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="text-amber-800 dark:text-amber-200 font-medium">
          ⚠️ TEST MODE ONLY - Using Stripe Test API
        </AlertDescription>
      </Alert>

      {/* Main Tool Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            <CardTitle>Invoice Preview Tool</CardTitle>
          </div>
          <CardDescription>
            Preview upcoming Stripe invoices for any company in the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Company Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Company</label>
            <div className="flex gap-2">
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Choose a company..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name} ({company.user_count} users)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handlePreview} 
                disabled={!selectedCompanyId || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Preview Invoice'
                )}
              </Button>
            </div>
          </div>

          {/* Results Display */}
          {invoice && (
            <div className="space-y-4 pt-4 border-t">
              {/* Summary Card */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Amount Due</CardDescription>
                    <CardTitle className="text-3xl">
                      {invoice.currency} ${invoice.amount_due.toFixed(2)}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Billing Period</CardDescription>
                    <CardTitle className="text-lg">
                      {new Date(invoice.period_start).toLocaleDateString()} - {new Date(invoice.period_end).toLocaleDateString()}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Subscription Tier</CardDescription>
                    <CardTitle className="text-lg">
                      {invoice.subscription_tier}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Line Items Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Line Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-center">Quantity</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.lines.map((line, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {line.description}
                            {line.period.start && (
                              <div className="text-xs text-muted-foreground">
                                {new Date(line.period.start).toLocaleDateString()} - {line.period.end ? new Date(line.period.end).toLocaleDateString() : 'N/A'}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">{line.quantity}</TableCell>
                          <TableCell className="text-right font-mono">
                            ${line.amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            {line.proration ? (
                              <Badge variant="secondary">Prorated</Badge>
                            ) : (
                              <Badge variant="outline">Regular</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold">
                        <TableCell colSpan={2}>Total</TableCell>
                        <TableCell className="text-right font-mono">
                          ${invoice.total.toFixed(2)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Test Mode Badge */}
              <div className="flex justify-end">
                <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                  Test Data
                </Badge>
              </div>
            </div>
          )}

          {/* No Results State */}
          {!invoice && !loading && selectedCompanyId && (
            <div className="text-center py-8 text-muted-foreground">
              Click "Preview Invoice" to fetch upcoming invoice data
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
