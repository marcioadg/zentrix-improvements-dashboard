import React, { useState } from 'react';
import { SUPABASE_URL } from '@/integrations/supabase/client';
import { useCompanyApiKeys, ApiKey } from '@/hooks/useCompanyApiKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Key, Plus, Copy, Check, Trash2, Ban, Clock, ExternalLink } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export function ApiKeysSettings() {
  const { apiKeys, loading, creating, createApiKey, revokeApiKey, deleteApiKey } = useCompanyApiKeys();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    const key = await createApiKey(newKeyName.trim());
    if (key) {
      setNewlyCreatedKey(key);
      setNewKeyName('');
    }
  };

  const handleCopyKey = async () => {
    if (newlyCreatedKey) {
      await navigator.clipboard.writeText(newlyCreatedKey);
      setCopiedKey(true);
      toast.success('API key copied to clipboard');
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleCloseCreateDialog = () => {
    setShowCreateDialog(false);
    setNewlyCreatedKey(null);
    setNewKeyName('');
    setCopiedKey(false);
  };

  const getKeyStatus = (key: ApiKey): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    if (key.revoked_at) {
      return { label: 'Revoked', variant: 'destructive' };
    }
    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      return { label: 'Expired', variant: 'secondary' };
    }
    return { label: 'Active', variant: 'default' };
  };

  const activeKeys = apiKeys.filter(k => !k.revoked_at && (!k.expires_at || new Date(k.expires_at) >= new Date()));

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[16px] font-semibold">API Keys</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage API keys for external integrations
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            {!newlyCreatedKey ? (
              <>
                <DialogHeader>
                  <DialogTitle>Create API Key</DialogTitle>
                  <DialogDescription>
                    Create a new API key for external services to access your company data.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="key-name">Key Name</Label>
                    <Input
                      id="key-name"
                      placeholder="e.g., OpenClaw Integration"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
                    />
                    <p className="text-xs text-muted-foreground">
                      Give your key a descriptive name to identify its purpose.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseCreateDialog}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateKey} disabled={creating}>
                    {creating ? 'Creating...' : 'Create Key'}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>API Key Created</DialogTitle>
                  <DialogDescription>
                    Copy your API key now. You won't be able to see it again!
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="p-4 bg-muted rounded-lg border">
                    <code className="text-sm font-mono break-all">{newlyCreatedKey}</code>
                  </div>
                  <Button onClick={handleCopyKey} className="w-full gap-2">
                    {copiedKey ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy to Clipboard
                      </>
                    )}
                  </Button>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      <strong>Important:</strong> Store this key securely. It will only be shown once.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCloseCreateDialog}>Done</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* API Documentation Link */}
      <div className="flex items-center justify-between py-3 border-b border-border/40">
        <div>
          <p className="text-sm font-medium">API Documentation</p>
          <p className="text-xs text-muted-foreground">Learn how to use the API endpoints</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <a href="https://docs.zentrixos.com/api" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            View Docs
          </a>
        </Button>
      </div>

      {/* Keys list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : apiKeys.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Key className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No API keys created yet</p>
          <p className="text-sm">Create a key to allow external services to access your data.</p>
        </div>
      ) : (
        <div className="space-y-0 mt-2">
          <p className="text-sm text-muted-foreground py-2">
            {activeKeys.length} active key{activeKeys.length !== 1 ? 's' : ''}
          </p>
          {apiKeys.map((key, idx) => {
            const status = getKeyStatus(key);
            const isActive = status.label === 'Active';
            const isLast = idx === apiKeys.length - 1;

            return (
              <div
                key={key.id}
                className={`py-3 ${!isLast ? 'border-b border-border/40' : ''} ${!isActive ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{key.name}</h4>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">
                      {key.key_prefix}...
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Created {formatDistanceToNow(new Date(key.created_at))} ago</span>
                      {key.last_used_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last used {formatDistanceToNow(new Date(key.last_used_at))} ago
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isActive && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1">
                            <Ban className="h-4 w-4" />
                            Revoke
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will immediately disable the API key "{key.name}". Any services using this key will lose access. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => revokeApiKey(key.id)}>
                              Revoke Key
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the API key "{key.name}". This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteApiKey(key.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Key
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Separator className="my-6" />

      {/* Available Endpoints */}
      <div>
        <h3 className="text-[13px] font-semibold mb-3">Available Endpoints</h3>
        <div className="space-y-0">
          {[
            { endpoint: 'GET /company-api/company', desc: 'Company info' },
            { endpoint: 'GET /company-api/teams', desc: 'All teams' },
            { endpoint: 'GET /company-api/goals', desc: 'Goals & rocks' },
            { endpoint: 'GET /company-api/tasks', desc: 'To-dos' },
            { endpoint: 'GET /company-api/issues', desc: 'Open issues' },
            { endpoint: 'GET /company-api/metrics', desc: 'Scorecard' },
            { endpoint: 'GET /company-api/org-chart', desc: 'Org chart roles' },
            { endpoint: 'GET /company-api/strategy', desc: 'Strategic plans' },
          ].map((item, idx, arr) => (
            <div
              key={item.endpoint}
              className={`flex items-center justify-between py-2 ${idx < arr.length - 1 ? 'border-b border-border/40' : ''}`}
            >
              <code className="text-xs font-mono">{item.endpoint}</code>
              <span className="text-muted-foreground text-xs">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <Separator className="my-6" />

      {/* Quick Start */}
      <div>
        <h3 className="text-[13px] font-semibold mb-2">Quick Start</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Use your API key in the Authorization header:
        </p>
        <pre className="p-3 bg-muted/30 rounded-md border text-xs overflow-x-auto">
          <code>{`curl -X GET "${SUPABASE_URL}/functions/v1/company-api/teams" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</code>
        </pre>
      </div>
    </div>
  );
}
