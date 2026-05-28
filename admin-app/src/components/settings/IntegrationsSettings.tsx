import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Calendar,
  MessageSquare,
  FileText,
  CreditCard,
  Building2,
  ListChecks,
  Github,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Users,
  User as UserIcon,
  Webhook,
  Mail,
  Activity,
  LayoutGrid,
  ListTodo,
  Plug,
  Cloud,
  BarChart3,
  BookOpen,
  Boxes,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  listConnectedIntegrations,
  startConnect,
  openConnectPopup,
  connectWithToken,
  disconnectIntegration,
  PROVIDER_DISPLAY,
  type ConnectedIntegration,
  type IntegrationScope,
  type ProviderCategory,
  type ProviderDisplay,
} from '@/services/integrationsService';
import {
  listMcpServers,
  installMcpServer,
  uninstallMcpServer,
  startMcpOAuth,
  openMcpOAuthPopup,
  testMcpServer,
  type McpCatalogEntry,
  type McpInstalledServer,
  type McpComingSoonEntry,
  type McpTestResult,
} from '@/services/mcpServersService';
import { useToast } from '@/hooks/use-toast';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { useCurrentUserPermissionLevel } from '@/hooks/useUserPermissionLevel';

// Per-provider Lucide icon for native integrations. Keys align with PROVIDER_DISPLAY.
const PROVIDER_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  google_calendar: Calendar,
  slack: MessageSquare,
  notion: FileText,
  linear: ListChecks,
  github: Github,
  stripe: CreditCard,
  hubspot: Building2,
  sentry: ShieldAlert,
  monday: LayoutGrid,
  clickup: ListTodo,
};

// Icon for MCP-backed integrations, by catalog id (falls back to a generic plug).
const MCP_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  deepwiki: BookOpen,
  cloudflare_docs: Cloud,
  cloudflare_bindings: Cloud,
  cloudflare_observability: Activity,
  posthog: BarChart3,
  grafana: Activity,
  atlassian: Boxes,
};

const CATEGORY_LABEL: Record<ProviderCategory, string> = {
  calendar: 'Calendar',
  communication: 'Communication',
  crm: 'CRM',
  finance: 'Finance',
  engineering: 'Engineering',
  monitoring: 'Monitoring',
  docs: 'Docs & Wiki',
  analytics: 'Analytics',
  productivity: 'Productivity',
};

const CATEGORY_ORDER: ProviderCategory[] = [
  'communication',
  'crm',
  'finance',
  'engineering',
  'productivity',
  'monitoring',
  'analytics',
  'docs',
  'calendar',
];

// Map an MCP catalog entry into the unified (native) category taxonomy, so
// MCP-backed integrations sit alongside native ones in the same list.
const MCP_CATEGORY_BY_ID: Record<string, ProviderCategory> = {
  deepwiki: 'engineering',
  cloudflare_docs: 'engineering',
  cloudflare_bindings: 'engineering',
  cloudflare_observability: 'monitoring',
  posthog: 'analytics',
  grafana: 'monitoring',
  atlassian: 'docs',
};
const MCP_CATEGORY_BY_RAW: Record<string, ProviderCategory> = {
  dev: 'engineering',
  finance: 'finance',
  docs: 'docs',
  sales: 'crm',
  productivity: 'productivity',
};
function mcpCategory(entry: McpCatalogEntry): ProviderCategory {
  return MCP_CATEGORY_BY_ID[entry.id] ?? MCP_CATEGORY_BY_RAW[entry.category] ?? 'engineering';
}

const ADMIN_LEVELS = new Set(['super_admin', 'admin', 'director']);

const COMING_SOON = [
  { icon: CreditCard, title: 'Stripe', description: 'Pull revenue, MRR, churn, and subscription data.' },
  { icon: Building2, title: 'HubSpot', description: 'Pull pipeline value, deal counts, and CRM activity.' },
  { icon: Calendar, title: 'Google Calendar', description: 'Let the agent see your meetings & schedule.' },
  { icon: Webhook, title: 'Webhooks', description: 'Real-time event notifications' },
  { icon: Mail, title: 'Microsoft 365 / Outlook', description: 'Calendar + mail for Microsoft accounts' },
  { icon: Activity, title: 'Amplitude / Mixpanel', description: 'Product analytics into the scorecard' },
];

// Native providers shown as "coming soon" until their prod OAuth apps are
// configured — keep them out of the connectable list so users don't hit a
// dead "Connect" (no client credentials wired up for these yet).
const NATIVE_COMING_SOON = new Set<string>(['stripe', 'hubspot']);

// One row in the unified list — either a native integration or an MCP-backed one.
type UnifiedItem =
  | { source: 'native'; key: string; display: ProviderDisplay; category: ProviderCategory }
  | { source: 'mcp'; entry: McpCatalogEntry; category: ProviderCategory };

const IntegrationsSettings: React.FC = () => {
  const [connected, setConnected] = useState<ConnectedIntegration[] | null>(null);
  const [connectingKey, setConnectingKey] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  // Native paste-token dialog (auth_method 'token' providers like ClickUp).
  const [tokenDialogKey, setTokenDialogKey] = useState<string | null>(null);
  const [tokenValue, setTokenValue] = useState('');
  const [tokenBusy, setTokenBusy] = useState(false);
  // MCP state.
  const [mcpCatalog, setMcpCatalog] = useState<McpCatalogEntry[]>([]);
  const [mcpInstalled, setMcpInstalled] = useState<McpInstalledServer[]>([]);
  const [mcpComingSoon, setMcpComingSoon] = useState<McpComingSoonEntry[]>([]);
  const [mcpBusyId, setMcpBusyId] = useState<string | null>(null);
  // MCP bearer (API-key) dialog.
  const [mcpDialogEntry, setMcpDialogEntry] = useState<McpCatalogEntry | null>(null);
  const [mcpCredential, setMcpCredential] = useState('');
  const [mcpTesting, setMcpTesting] = useState(false);
  const [mcpTestResult, setMcpTestResult] = useState<McpTestResult | null>(null);
  const [mcpInstalling, setMcpInstalling] = useState(false);

  const { toast } = useToast();
  const { currentCompany } = useMultiCompanyAccess();
  const { permissionLevel } = useCurrentUserPermissionLevel();
  const isAdmin = ADMIN_LEVELS.has(permissionLevel ?? '');
  // Beta gate: integrations are connectable only for allowlisted companies.
  // When off, every provider renders as "Coming soon" with no connect action.
  const integrationsEnabled = !!currentCompany?.ai_agent_enabled;

  const refresh = async () => {
    const rows = await listConnectedIntegrations();
    setConnected(rows);
    if (currentCompany?.id) {
      const mcp = await listMcpServers(currentCompany.id);
      setMcpCatalog(mcp.catalog);
      setMcpInstalled(mcp.installed);
      setMcpComingSoon(mcp.comingSoon);
    } else {
      setMcpCatalog([]);
      setMcpInstalled([]);
      setMcpComingSoon([]);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCompany?.id]);

  // ─── Native connect / disconnect ──────────────────────────────────────
  const handleConnect = async (providerKey: string, scope: IntegrationScope) => {
    if (scope === 'company' && !currentCompany?.id) {
      toast({
        title: 'Pick a company first',
        description: 'Switch to a company before connecting a company-wide integration.',
        variant: 'destructive',
      });
      return;
    }
    const key = `${providerKey}:${scope}`;
    setConnectingKey(key);
    try {
      const { authorize_url } = await startConnect(providerKey, {
        scope,
        company_id: scope === 'company' ? currentCompany!.id : undefined,
      });
      const result = await openConnectPopup(authorize_url);
      if (result.ok) {
        toast({ title: 'Connected', description: result.message });
        await refresh();
      } else {
        toast({ title: 'Connection failed', description: result.message, variant: 'destructive' });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'Connection failed', description: msg, variant: 'destructive' });
    } finally {
      setConnectingKey(null);
    }
  };

  const handleTokenConnect = async () => {
    if (!tokenDialogKey) return;
    const display = PROVIDER_DISPLAY[tokenDialogKey];
    const scope = display.default_scope;
    if (scope === 'company' && !currentCompany?.id) {
      toast({
        title: 'Pick a company first',
        description: 'Switch to a company before connecting a company-wide integration.',
        variant: 'destructive',
      });
      return;
    }
    if (!tokenValue.trim()) {
      toast({ title: 'Token required', description: 'Paste your API token.', variant: 'destructive' });
      return;
    }
    setTokenBusy(true);
    try {
      const result = await connectWithToken(tokenDialogKey, tokenValue.trim(), {
        scope,
        company_id: scope === 'company' ? currentCompany!.id : undefined,
      });
      toast({
        title: 'Connected',
        description: `${display.name}${result.account_email ? ` (${result.account_email})` : ''} is now connected.`,
      });
      setTokenDialogKey(null);
      setTokenValue('');
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'Connection failed', description: msg, variant: 'destructive' });
    } finally {
      setTokenBusy(false);
    }
  };

  const handleDisconnect = async (row: ConnectedIntegration) => {
    setDisconnectingId(row.id);
    try {
      const ok = await disconnectIntegration(row.id);
      if (ok) {
        toast({
          title: 'Disconnected',
          description: `${PROVIDER_DISPLAY[row.provider]?.name ?? row.provider} was disconnected.`,
        });
        await refresh();
      } else {
        toast({
          title: 'Disconnect failed',
          description: 'You may not have permission to disconnect this. Ask an admin.',
          variant: 'destructive',
        });
      }
    } finally {
      setDisconnectingId(null);
    }
  };

  // ─── MCP connect / disconnect (same endpoints as before, just here now) ─
  const mcpStartConnect = (entry: McpCatalogEntry) => {
    if (!isAdmin) {
      toast({ title: 'Not allowed', description: 'Only admins / directors can connect this.', variant: 'destructive' });
      return;
    }
    if (entry.authType === 'none') {
      void mcpDoInstall(entry, undefined);
      return;
    }
    if (entry.authType === 'oauth') {
      void mcpDoOAuthConnect(entry);
      return;
    }
    // bearer → open the credential dialog
    setMcpCredential('');
    setMcpTestResult(null);
    setMcpDialogEntry(entry);
  };

  const mcpDoOAuthConnect = async (entry: McpCatalogEntry) => {
    if (!currentCompany?.id) return;
    setMcpBusyId(entry.id);
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
      toast({ title: 'Connection failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setMcpBusyId(null);
    }
  };

  const mcpDoInstall = async (entry: McpCatalogEntry, cred: string | undefined) => {
    if (!currentCompany?.id) return;
    if (entry.authType === 'none') setMcpBusyId(entry.id);
    else setMcpInstalling(true);
    try {
      await installMcpServer(currentCompany.id, entry.id, cred);
      toast({ title: 'Connected', description: `${entry.name} is now available to the agent.` });
      setMcpDialogEntry(null);
      await refresh();
    } catch (e) {
      toast({ title: 'Connection failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setMcpBusyId(null);
      setMcpInstalling(false);
    }
  };

  const mcpDoTest = async () => {
    if (!mcpDialogEntry || !currentCompany?.id) return;
    setMcpTesting(true);
    setMcpTestResult(null);
    try {
      const result = await testMcpServer(currentCompany.id, mcpDialogEntry.id, mcpCredential || undefined);
      setMcpTestResult(result);
    } catch (e) {
      setMcpTestResult({ ok: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setMcpTesting(false);
    }
  };

  const mcpDoDisconnect = async (entry: McpCatalogEntry) => {
    if (!currentCompany?.id) return;
    setMcpBusyId(entry.id);
    try {
      await uninstallMcpServer(currentCompany.id, entry.id);
      toast({ title: 'Disconnected', description: `${entry.name} was removed.` });
      await refresh();
    } catch (e) {
      toast({ title: 'Disconnect failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setMcpBusyId(null);
    }
  };

  // ─── Build the unified, category-grouped list ─────────────────────────
  const grouped = useMemo(() => {
    const items: UnifiedItem[] = [];
    for (const [key, display] of Object.entries(PROVIDER_DISPLAY)) {
      if (NATIVE_COMING_SOON.has(key)) continue;
      items.push({ source: 'native', key, display, category: display.category });
    }
    for (const entry of mcpCatalog) {
      items.push({ source: 'mcp', entry, category: mcpCategory(entry) });
    }
    const out = new Map<ProviderCategory, UnifiedItem[]>();
    for (const item of items) {
      const list = out.get(item.category) ?? [];
      list.push(item);
      out.set(item.category, list);
    }
    return out;
  }, [mcpCatalog]);

  if (connected === null) {
    return (
      <div className="max-w-2xl space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const cardShell = (
    key: string,
    icon: React.ComponentType<{ className?: string }>,
    isConnected: boolean,
    title: React.ReactNode,
    subtitle: React.ReactNode,
    actions: React.ReactNode,
  ) => {
    const Icon = icon;
    return (
      <div
        key={key}
        className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isConnected ? 'bg-success/10' : 'bg-muted'}`}>
            <Icon className={`h-4 w-4 ${isConnected ? 'text-success' : 'text-foreground'}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">{title}</div>
            {subtitle}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">{actions}</div>
      </div>
    );
  };

  // Gated presentation: a non-connectable "Coming soon" card, used for every
  // provider when the company isn't on the integrations allowlist.
  const comingSoonCard = (
    key: string,
    icon: React.ComponentType<{ className?: string }>,
    name: string,
    description: string,
  ) =>
    cardShell(
      key,
      icon,
      false,
      <p className="text-[13px] font-medium text-muted-foreground truncate">{name}</p>,
      <p className="text-xs text-muted-foreground/70">{description}</p>,
      <Badge variant="secondary" className="shrink-0">Coming Soon</Badge>,
    );

  // Native integration card (connect/disconnect inline, supports company + personal).
  const renderNativeCard = (key: string, display: ProviderDisplay) => {
    const Icon = PROVIDER_ICON[key] ?? Calendar;
    if (!integrationsEnabled) {
      return comingSoonCard(`native:${key}`, Icon, display.name, display.description);
    }
    // Company-scope connections are per-company: only count the one that
    // belongs to the company currently in context, otherwise a connection
    // from one of the user's other companies would show as connected here
    // (and its Disconnect button would tear down that other company's link).
    const companyRow = connected.find(
      (r) => r.provider === key && r.scope === 'company' && r.company_id === currentCompany?.id,
    );
    const personalRow = connected.find((r) => r.provider === key && r.scope === 'user');
    const primary = companyRow ?? personalRow;
    const isToken = display.auth_method === 'token';
    const showCompany = display.default_scope === 'company' || display.allow_scope_choice;
    const showPersonal = display.default_scope === 'user' || display.allow_scope_choice;
    const isConnectingCompany = connectingKey === `${key}:company`;
    const isConnectingUser = connectingKey === `${key}:user`;

    const disconnectBtn = (row: ConnectedIntegration) => {
      const canDisconnect = row.scope === 'user' || isAdmin;
      return (
        <Button
          key={`disc-${row.id}`}
          variant="outline"
          size="sm"
          onClick={() => handleDisconnect(row)}
          disabled={disconnectingId === row.id || !canDisconnect}
          title={!canDisconnect ? 'Only admins/directors can disconnect a company-wide integration.' : undefined}
        >
          {disconnectingId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Disconnect'}
        </Button>
      );
    };

    const title = (
      <>
        <p className="text-[13px] font-medium text-foreground truncate">{display.name}</p>
        {primary && <CheckCircle2 className="h-3 w-3 text-success flex-shrink-0" />}
        {companyRow && (
          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
            <Users className="h-2.5 w-2.5" /> Company
          </Badge>
        )}
        {personalRow && (
          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
            <UserIcon className="h-2.5 w-2.5" /> Personal
          </Badge>
        )}
      </>
    );
    const subtitle = primary ? (
      <p className="text-xs text-muted-foreground truncate">
        {primary.account_email ?? '—'} · Connected{' '}
        {formatDistanceToNow(new Date(primary.connected_at), { addSuffix: true })}
      </p>
    ) : (
      <p className="text-xs text-muted-foreground">{display.description}</p>
    );
    const actions = isToken ? (
      companyRow ? disconnectBtn(companyRow) : (
        <Button
          size="sm"
          onClick={() => { setTokenValue(''); setTokenDialogKey(key); }}
          disabled={display.default_scope === 'company' && !isAdmin}
          title={display.default_scope === 'company' && !isAdmin ? 'Only admins/directors can connect a company-wide integration.' : undefined}
        >
          Connect with token
        </Button>
      )
    ) : (
      <>
        {showCompany && (companyRow ? disconnectBtn(companyRow) : (
          <Button
            size="sm"
            variant={display.default_scope === 'company' ? 'default' : 'outline'}
            onClick={() => handleConnect(key, 'company')}
            disabled={isConnectingCompany || !isAdmin}
            title={!isAdmin ? 'Only admins/directors can connect a company-wide integration.' : undefined}
          >
            {isConnectingCompany ? (
              <><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Connecting…</>
            ) : showPersonal ? (
              <><Users className="h-3 w-3 mr-1.5" />Company</>
            ) : ('Connect')}
          </Button>
        ))}
        {showPersonal && (personalRow ? disconnectBtn(personalRow) : (
          <Button
            size="sm"
            variant={display.default_scope === 'user' ? 'default' : 'outline'}
            onClick={() => handleConnect(key, 'user')}
            disabled={isConnectingUser}
          >
            {isConnectingUser ? (
              <><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Connecting…</>
            ) : showCompany ? (
              <><UserIcon className="h-3 w-3 mr-1.5" />Personal</>
            ) : ('Connect')}
          </Button>
        ))}
      </>
    );
    return cardShell(`native:${key}`, Icon, !!primary, title, subtitle, actions);
  };

  // MCP integration card (company-wide; connect via none/bearer/oauth).
  const renderMcpCard = (entry: McpCatalogEntry) => {
    const Icon = MCP_ICON[entry.id] ?? Plug;
    if (!integrationsEnabled) {
      return comingSoonCard(`mcp:${entry.id}`, Icon, entry.name, entry.description);
    }
    const installedRow = mcpInstalled.find((i) => i.catalog_id === entry.id);
    const busy = mcpBusyId === entry.id;
    const title = (
      <>
        <p className="text-[13px] font-medium text-foreground truncate">{entry.name}</p>
        {installedRow && <CheckCircle2 className="h-3 w-3 text-success flex-shrink-0" />}
        {installedRow && (
          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 flex items-center gap-1">
            <Users className="h-2.5 w-2.5" /> Company
          </Badge>
        )}
      </>
    );
    const subtitle = installedRow ? (
      <p className="text-xs text-muted-foreground truncate">
        Connected {formatDistanceToNow(new Date(installedRow.connected_at), { addSuffix: true })}
      </p>
    ) : (
      <p className="text-xs text-muted-foreground">{entry.description}</p>
    );
    const actions = installedRow ? (
      <Button
        variant="outline"
        size="sm"
        onClick={() => mcpDoDisconnect(entry)}
        disabled={busy || !isAdmin}
        title={!isAdmin ? 'Only admins/directors can disconnect this.' : undefined}
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Disconnect'}
      </Button>
    ) : (
      <Button
        size="sm"
        onClick={() => mcpStartConnect(entry)}
        disabled={busy || !isAdmin}
        title={!isAdmin ? 'Only admins/directors can connect this.' : undefined}
      >
        {busy ? <><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Connecting…</> : 'Connect'}
      </Button>
    );
    return cardShell(`mcp:${entry.id}`, Icon, !!installedRow, title, subtitle, actions);
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-[16px] font-semibold text-foreground mb-1">Integrations</h2>
        <p className="text-muted-foreground text-sm">
          Connect third-party services so the agent can reach beyond Zentrix.
          {' '}
          <span className="text-foreground">Company</span>-scope connections are shared
          with everyone in your company; <span className="text-foreground">personal</span>{' '}
          ones are visible only to you.
        </p>
      </div>

      {/* One unified, category-grouped list (native + MCP-backed integrations). */}
      <div className="mb-8 space-y-6">
        {CATEGORY_ORDER.map((category) => {
          const items = grouped.get(category) ?? [];
          if (items.length === 0) return null;
          return (
            <div key={category}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {CATEGORY_LABEL[category]}
              </h3>
              <div className="space-y-2">
                {items.map((item) =>
                  item.source === 'native'
                    ? renderNativeCard(item.key, item.display)
                    : renderMcpCard(item.entry)
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Coming soon — one unified list (native placeholders + MCP roadmap). */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Coming soon
        </h3>
        <div className="space-y-0">
          {[
            ...COMING_SOON.map((it) => ({
              key: it.title,
              Icon: it.icon,
              title: it.title,
              description: it.description,
            })),
            ...mcpComingSoon.map((e) => ({
              key: `mcp:${e.id}`,
              Icon: Plug,
              title: e.name,
              description: e.description,
            })),
          ].map((item, idx, arr) => {
            const Icon = item.Icon;
            const isLast = idx === arr.length - 1;
            return (
              <div
                key={item.key}
                className={`flex items-center justify-between py-3 opacity-60 ${
                  !isLast ? 'border-b border-border/40' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-muted-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground/70 mt-0.5">{item.description}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="ml-2 shrink-0">
                  Coming Soon
                </Badge>
              </div>
            );
          })}
        </div>
      </div>

      {/* Paste-token dialog for native token-auth providers (e.g. ClickUp). */}
      <Dialog open={tokenDialogKey !== null} onOpenChange={(o) => { if (!o) { setTokenDialogKey(null); setTokenValue(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Connect {tokenDialogKey ? PROVIDER_DISPLAY[tokenDialogKey]?.name : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="api-token">API token</Label>
            <Input
              id="api-token"
              type="password"
              autoComplete="off"
              placeholder="Paste your API token"
              value={tokenValue}
              onChange={(e) => setTokenValue(e.target.value)}
            />
            {tokenDialogKey && PROVIDER_DISPLAY[tokenDialogKey]?.token_help && (
              <p className="text-xs text-muted-foreground">
                {PROVIDER_DISPLAY[tokenDialogKey]?.token_help}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTokenDialogKey(null); setTokenValue(''); }} disabled={tokenBusy}>
              Cancel
            </Button>
            <Button onClick={handleTokenConnect} disabled={tokenBusy || !tokenValue.trim()}>
              {tokenBusy ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : null}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API-key dialog for MCP bearer-auth servers. */}
      <Dialog open={mcpDialogEntry !== null} onOpenChange={(o) => { if (!o) { setMcpDialogEntry(null); setMcpCredential(''); setMcpTestResult(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect {mcpDialogEntry?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="mcp-credential">API key</Label>
            <Input
              id="mcp-credential"
              type="password"
              autoComplete="off"
              placeholder="Paste your API key"
              value={mcpCredential}
              onChange={(e) => { setMcpCredential(e.target.value); setMcpTestResult(null); }}
            />
            {mcpDialogEntry?.authHelp && (
              <p className="text-xs text-muted-foreground">{mcpDialogEntry.authHelp}</p>
            )}
            {mcpTestResult && (
              <p className={`text-xs ${mcpTestResult.ok ? 'text-success' : 'text-destructive'}`}>
                {mcpTestResult.ok
                  ? `Looks good — ${mcpTestResult.toolCount ?? 0} tool(s) available.`
                  : `Test failed: ${mcpTestResult.error ?? 'unknown error'}`}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => mcpDoTest()} disabled={mcpTesting || mcpInstalling || !mcpCredential.trim()}>
              {mcpTesting ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : null}
              Test
            </Button>
            <Button
              onClick={() => mcpDialogEntry && mcpDoInstall(mcpDialogEntry, mcpCredential.trim() || undefined)}
              disabled={mcpInstalling || !mcpCredential.trim()}
            >
              {mcpInstalling ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : null}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntegrationsSettings;
