import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plug,
  Loader2,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  listMcpServers,
  testMcpServer,
  installMcpServer,
  uninstallMcpServer,
  startMcpOAuth,
  openMcpOAuthPopup,
  type McpCatalogEntry,
  type McpComingSoonEntry,
  type McpInstalledServer,
  type McpTestResult,
} from '@/services/mcpServersService';
import { useToast } from '@/hooks/use-toast';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { useCurrentUserPermissionLevel } from '@/hooks/useUserPermissionLevel';

const ADMIN_LEVELS = new Set(['super_admin', 'admin', 'director']);

const McpServersSection: React.FC<{
  onComingSoon?: (entries: McpComingSoonEntry[]) => void;
}> = ({ onComingSoon }) => {
  const [catalog, setCatalog] = useState<McpCatalogEntry[] | null>(null);
  const [installed, setInstalled] = useState<McpInstalledServer[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Connect dialog state (used for bearer-auth servers).
  const [dialogEntry, setDialogEntry] = useState<McpCatalogEntry | null>(null);
  const [credential, setCredential] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<McpTestResult | null>(null);
  const [installing, setInstalling] = useState(false);

  const { toast } = useToast();
  const { currentCompany } = useMultiCompanyAccess();
  const { permissionLevel } = useCurrentUserPermissionLevel();
  const isAdmin = ADMIN_LEVELS.has(permissionLevel ?? '');

  const refresh = async () => {
    if (!currentCompany?.id) {
      setCatalog([]);
      onComingSoon?.([]);
      return;
    }
    const res = await listMcpServers(currentCompany.id);
    setCatalog(res.catalog);
    setInstalled(res.installed);
    // Lift coming-soon up so the parent can show one unified list.
    onComingSoon?.(res.comingSoon);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCompany?.id]);

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    (catalog ?? []).forEach((e) => m.set(e.id, e.name));
    return m;
  }, [catalog]);

  const installedIds = useMemo(
    () => new Set(installed.map((i) => i.catalog_id)),
    [installed],
  );

  // Servers in the catalog the company hasn't connected yet.
  const available = useMemo(
    () => (catalog ?? []).filter((e) => !installedIds.has(e.id)),
    [catalog, installedIds],
  );

  const startConnect = (entry: McpCatalogEntry) => {
    if (!isAdmin) {
      toast({
        title: 'Not allowed',
        description: 'Only admins / directors can connect MCP servers.',
        variant: 'destructive',
      });
      return;
    }
    if (entry.authType === 'none') {
      void doInstall(entry, undefined);
      return;
    }
    if (entry.authType === 'oauth') {
      void doOAuthConnect(entry);
      return;
    }
    // bearer → open the credential dialog
    setDialogEntry(entry);
    setCredential('');
    setTestResult(null);
  };

  const doOAuthConnect = async (entry: McpCatalogEntry) => {
    if (!currentCompany?.id) return;
    setBusyId(entry.id);
    try {
      const { authorize_url } = await startMcpOAuth(currentCompany.id, entry.id);
      const result = await openMcpOAuthPopup(authorize_url);
      if (result.ok) {
        toast({ title: 'Connected', description: `${entry.name} is now available to the agent.` });
      } else {
        toast({ title: 'Connection failed', description: result.message, variant: 'destructive' });
      }
      await refresh();
    } catch (e) {
      toast({
        title: 'Connection failed',
        description: e instanceof Error ? e.message : String(e),
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const doInstall = async (entry: McpCatalogEntry, cred: string | undefined) => {
    if (!currentCompany?.id) return;
    if (entry.authType === 'none') setBusyId(entry.id);
    else setInstalling(true);
    try {
      await installMcpServer(currentCompany.id, entry.id, cred);
      toast({ title: 'Connected', description: `${entry.name} is now available to the agent.` });
      setDialogEntry(null);
      await refresh();
    } catch (e) {
      toast({
        title: 'Connection failed',
        description: e instanceof Error ? e.message : String(e),
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
      setInstalling(false);
    }
  };

  const doTest = async () => {
    if (!dialogEntry || !currentCompany?.id) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testMcpServer(
        currentCompany.id,
        dialogEntry.id,
        credential || undefined,
      );
      setTestResult(result);
    } catch (e) {
      setTestResult({ ok: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setTesting(false);
    }
  };

  const doDisconnect = async (catalogId: string) => {
    if (!currentCompany?.id) return;
    setBusyId(catalogId);
    try {
      await uninstallMcpServer(currentCompany.id, catalogId);
      toast({ title: 'Disconnected', description: `${nameById.get(catalogId) ?? catalogId} was removed.` });
      await refresh();
    } catch (e) {
      toast({
        title: 'Disconnect failed',
        description: e instanceof Error ? e.message : String(e),
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  if (catalog === null) return null;

  return (
    <div className="mb-8">
      <div className="mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1.5">
          <Plug className="h-3 w-3" /> MCP Servers
        </h3>
        <p className="text-xs text-muted-foreground">
          Connect Model Context Protocol servers to give the agent extra tools.
          Connections are shared with your whole company.
        </p>
      </div>

      {/* Connected MCP servers */}
      {installed.length > 0 && (
        <div className="space-y-2 mb-4">
          {installed.map((row) => (
            <div
              key={row.catalog_id}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-success/10 flex-shrink-0">
                  <Plug className="h-4 w-4 text-success" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium text-foreground truncate">
                      {row.name ?? nameById.get(row.catalog_id) ?? row.catalog_id}
                    </p>
                    <CheckCircle2 className="h-3 w-3 text-success flex-shrink-0" />
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
                      <Users className="h-2.5 w-2.5" /> MCP
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    Connected {formatDistanceToNow(new Date(row.connected_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => doDisconnect(row.catalog_id)}
                disabled={busyId === row.catalog_id || !isAdmin}
                title={!isAdmin ? 'Only admins/directors can disconnect.' : undefined}
              >
                {busyId === row.catalog_id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Disconnect'}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Available MCP servers */}
      {available.length > 0 && (
        <div className="space-y-2">
          {available.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-muted flex-shrink-0">
                  <Plug className="h-4 w-4 text-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground">{entry.name}</p>
                  <p className="text-xs text-muted-foreground">{entry.description}</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => startConnect(entry)}
                disabled={busyId === entry.id || !isAdmin}
                title={!isAdmin ? 'Only admins/directors can connect MCP servers.' : undefined}
              >
                {busyId === entry.id ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> Connecting…
                  </>
                ) : (
                  'Connect'
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {installed.length === 0 && available.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          No MCP servers available yet. More providers are coming soon.
        </p>
      )}

      {/* "Coming soon" is rendered once, unified, by the parent IntegrationsSettings. */}

      {/* Credential dialog for bearer-auth servers */}
      <Dialog open={!!dialogEntry} onOpenChange={(open) => !open && setDialogEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {dialogEntry?.name}</DialogTitle>
            <DialogDescription>{dialogEntry?.authHelp ?? 'Enter your API key to connect.'}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="mcp-credential" className="text-xs">API key</Label>
              <Input
                id="mcp-credential"
                type="password"
                autoComplete="off"
                placeholder="Paste your key…"
                value={credential}
                onChange={(e) => {
                  setCredential(e.target.value);
                  setTestResult(null);
                }}
              />
            </div>

            {testResult && (
              <div
                className={`text-xs rounded-md p-2 ${
                  testResult.ok
                    ? 'bg-success/10 text-success'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {testResult.ok
                  ? `Connected — ${testResult.toolCount ?? 0} tool(s) available.`
                  : `Failed: ${testResult.error}`}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={doTest}
              disabled={testing || installing || !credential}
            >
              {testing ? <><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Testing…</> : 'Test'}
            </Button>
            <Button
              size="sm"
              onClick={() => dialogEntry && doInstall(dialogEntry, credential || undefined)}
              disabled={installing || !credential}
            >
              {installing ? <><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Connecting…</> : 'Connect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default McpServersSection;
