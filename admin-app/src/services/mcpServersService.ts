// Client helpers for the MCP servers feature (Settings → Integrations).
//
// Talks to the mcp-servers-manage edge function. Unlike the OAuth
// integrations service (which reads user_integrations directly via RLS),
// everything here goes through the edge function: installations live in a
// table whose credentials are service-role-only, so the client never
// queries them directly.

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL ?? 'https://bprlchkedecbyoaqlbfz.supabase.co'}/functions/v1`;

export type McpAuthType = 'none' | 'bearer' | 'oauth';

export interface McpCatalogEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  authType: McpAuthType;
  authHelp: string | null;
}

export interface McpInstalledServer {
  catalog_id: string;
  /** Display name resolved server-side (falls back to catalog_id). */
  name?: string;
  enabled: boolean;
  connected_at: string;
  connected_by_user_id: string | null;
  has_credential: boolean;
}

export interface McpComingSoonEntry {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface McpListResult {
  catalog: McpCatalogEntry[];
  comingSoon: McpComingSoonEntry[];
  installed: McpInstalledServer[];
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');
  const res = await fetch(`${FN_BASE}/mcp-servers-manage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return json as T;
}

export const listMcpServers = async (companyId: string): Promise<McpListResult> => {
  try {
    const res = await call<McpListResult>({ action: 'list', company_id: companyId });
    return { catalog: res.catalog ?? [], comingSoon: res.comingSoon ?? [], installed: res.installed ?? [] };
  } catch (e) {
    logger.error('listMcpServers failed:', e);
    return { catalog: [], comingSoon: [], installed: [] };
  }
};

export interface McpTestResult {
  ok: boolean;
  toolCount?: number;
  toolNames?: string[];
  error?: string;
}

export const testMcpServer = (
  companyId: string,
  catalogId: string,
  credential?: string,
): Promise<McpTestResult> =>
  call<McpTestResult>({
    action: 'test',
    company_id: companyId,
    catalog_id: catalogId,
    credential,
  });

export const installMcpServer = (
  companyId: string,
  catalogId: string,
  credential?: string,
): Promise<{ ok: boolean }> =>
  call<{ ok: boolean }>({
    action: 'install',
    company_id: companyId,
    catalog_id: catalogId,
    credential,
  });

export const uninstallMcpServer = (
  companyId: string,
  catalogId: string,
): Promise<{ ok: boolean }> =>
  call<{ ok: boolean }>({
    action: 'uninstall',
    company_id: companyId,
    catalog_id: catalogId,
  });

export const setMcpServerEnabled = (
  companyId: string,
  catalogId: string,
  enabled: boolean,
): Promise<{ ok: boolean }> =>
  call<{ ok: boolean }>({
    action: 'set_enabled',
    company_id: companyId,
    catalog_id: catalogId,
    enabled,
  });

// ─── OAuth connect (auto-register / DCR) ──────────────────────────────
// Calls the mcp-oauth-connect function to start the flow, then opens the
// provider's consent screen in a popup.

export const startMcpOAuth = async (
  companyId: string,
  catalogId: string,
): Promise<{ authorize_url: string }> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');
  const res = await fetch(`${FN_BASE}/mcp-oauth-connect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ company_id: companyId, catalog_id: catalogId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Failed (${res.status})`);
  return json as { authorize_url: string };
};

export const openMcpOAuthPopup = (
  authorizeUrl: string,
): Promise<{ ok: boolean; message: string }> => {
  return new Promise((resolve) => {
    const w = 520, h = 680;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const popup = window.open(authorizeUrl, 'mcp-oauth', `width=${w},height=${h},left=${left},top=${top}`);
    if (!popup) {
      resolve({ ok: false, message: 'Popup blocked. Please allow popups for this site.' });
      return;
    }
    let settled = false;
    const onMessage = (event: MessageEvent) => {
      if (!event.data || event.data.type !== 'zentrix:mcp-connected') return;
      settled = true;
      cleanup();
      resolve(event.data.payload ?? { ok: true, message: '' });
    };
    const interval = window.setInterval(() => {
      if (popup.closed) {
        cleanup();
        // If we never got a message (e.g. HTML mangled), treat close as
        // "done, go refresh" — the list reload reveals the real outcome.
        if (!settled) resolve({ ok: true, message: '' });
      }
    }, 500);
    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      window.clearInterval(interval);
    };
    window.addEventListener('message', onMessage);
  });
};
