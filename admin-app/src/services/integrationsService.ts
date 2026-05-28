// Client-side helpers for third-party OAuth integrations.
//
// Two surfaces:
//   - listConnectedIntegrations: reads user_integrations directly via
//     supabase-js (RLS filters to the current user — both their
//     personal connections and any company-scope connections their
//     active company memberships expose).
//   - startConnect: calls the integrations-oauth-callback edge function
//     with action=start, which returns an authorize URL we open in a popup.
//   - disconnect: deletes the row (RLS gates user-scope to the user's
//     own row; company-scope to admins/directors of the company).
//
// The actual token exchange happens server-side in the callback function
// when the provider redirects back. We listen for a postMessage from the
// popup to know when it's done so the UI refreshes without polling.

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL ?? 'https://bprlchkedecbyoaqlbfz.supabase.co'}/functions/v1`;

export type IntegrationScope = 'user' | 'company';

export type ProviderCategory =
  | 'calendar'
  | 'communication'
  | 'crm'
  | 'finance'
  | 'engineering'
  | 'monitoring'
  | 'docs'
  | 'analytics'
  | 'productivity';

export interface ConnectedIntegration {
  id: string;
  provider: string;
  scope: IntegrationScope;
  company_id: string | null;
  account_email: string | null;
  scopes: string[] | null;
  connected_at: string;
  connected_by_user_id: string | null;
  last_used_at: string | null;
}

/**
 * Static client-side metadata about each provider. The backend's
 * providers.ts is the source of truth for OAuth config; this catalog
 * just powers the Settings → Integrations page. Keep the keys in sync
 * with what the backend exposes.
 */
export interface ProviderDisplay {
  name: string;
  description: string;
  /** Where the integration lands by default when an admin clicks Connect. */
  default_scope: IntegrationScope;
  category: ProviderCategory;
  /** True when both 'user' and 'company' scopes are reasonable choices. */
  allow_scope_choice: boolean;
  /** 'token' providers connect by pasting an API token instead of an OAuth popup. */
  auth_method?: 'oauth' | 'token';
  /** For auth_method 'token': hint shown in the paste-token dialog. */
  token_help?: string;
}

export const PROVIDER_DISPLAY: Record<string, ProviderDisplay> = {
  // Google Calendar is temporarily shown as "Coming soon" (see
  // IntegrationsSettings COMING_SOON): the Google Cloud OAuth app still needs
  // to pass Google's verification before non-test users can connect.
  slack: {
    name: 'Slack',
    description: 'Post messages, alerts, and digests to channels.',
    default_scope: 'company',
    category: 'communication',
    allow_scope_choice: false,
  },
  notion: {
    name: 'Notion',
    description: 'Read and write Notion pages so the agent can update the wiki.',
    default_scope: 'company',
    category: 'docs',
    allow_scope_choice: true,
  },
  linear: {
    name: 'Linear',
    description: 'Read issues & projects to track engineering velocity.',
    default_scope: 'company',
    category: 'engineering',
    allow_scope_choice: false,
  },
  github: {
    name: 'GitHub',
    description: 'Read commits, PRs, and issues across your org.',
    default_scope: 'company',
    category: 'engineering',
    allow_scope_choice: true,
  },
  stripe: {
    name: 'Stripe',
    description: 'Pull revenue, MRR, churn, and new-customer counts into the scorecard.',
    default_scope: 'company',
    category: 'finance',
    allow_scope_choice: false,
  },
  hubspot: {
    name: 'HubSpot',
    description: 'Pull pipeline value, deal counts, and contact growth into the scorecard.',
    default_scope: 'company',
    category: 'crm',
    allow_scope_choice: false,
  },
  sentry: {
    name: 'Sentry',
    description: 'Auto-create issues from new error spikes and unresolved alerts.',
    default_scope: 'company',
    category: 'monitoring',
    allow_scope_choice: false,
  },
  monday: {
    name: 'monday.com',
    description: 'Read boards, items and groups from monday.com.',
    default_scope: 'company',
    category: 'productivity',
    allow_scope_choice: false,
  },
  clickup: {
    name: 'ClickUp',
    description: 'Read spaces, lists and tasks from ClickUp.',
    default_scope: 'company',
    category: 'productivity',
    allow_scope_choice: false,
    auth_method: 'token',
    token_help:
      "In ClickUp: avatar (bottom-left) → Settings → 'API da ClickUp' / ClickUp API → " +
      "copy your personal API Token (starts with 'pk_') and paste it below.",
  },
};

export const listConnectedIntegrations = async (): Promise<ConnectedIntegration[]> => {
  const { data, error } = await supabase
    .from('user_integrations')
    .select('id, provider, scope, company_id, account_email, scopes, connected_at, connected_by_user_id, last_used_at')
    .order('connected_at', { ascending: false });
  if (error) {
    logger.error('listConnectedIntegrations failed:', error);
    return [];
  }
  return (data ?? []) as ConnectedIntegration[];
};

interface StartConnectResponse {
  authorize_url: string;
  state: string;
  expires_in_seconds: number;
  scope: IntegrationScope;
}

export interface StartConnectOptions {
  /** Defaults to the provider's default_scope. */
  scope?: IntegrationScope;
  /** Required when scope is 'company'. */
  company_id?: string;
}

export const startConnect = async (
  provider: string,
  options: StartConnectOptions = {},
): Promise<StartConnectResponse> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const res = await fetch(`${FN_BASE}/integrations-oauth-callback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      action: 'start',
      provider,
      scope: options.scope,
      company_id: options.company_id,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Failed to start connection: ${errText.slice(0, 200)}`);
  }
  return res.json() as Promise<StartConnectResponse>;
};

/**
 * Connect a "token" provider (e.g. ClickUp) by sending the user's pasted API
 * token straight to the backend, which validates + stores it. No OAuth popup.
 */
export const connectWithToken = async (
  provider: string,
  token: string,
  options: StartConnectOptions = {},
): Promise<{ ok: boolean; account_email?: string | null }> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const res = await fetch(`${FN_BASE}/integrations-oauth-callback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      action: 'connect_token',
      provider,
      token,
      scope: options.scope,
      company_id: options.company_id,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Failed to connect with token.');
  }
  return data as { ok: boolean; account_email?: string | null };
};

/**
 * Open the authorize URL in a popup and resolve when the callback
 * page posts back a "connected" message (or rejects on failure/close).
 */
export const openConnectPopup = (authorizeUrl: string): Promise<{ ok: boolean; message: string }> => {
  return new Promise((resolve) => {
    const width = 520;
    const height = 640;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      authorizeUrl,
      'integrations-oauth',
      `width=${width},height=${height},left=${left},top=${top}`,
    );
    if (!popup) {
      resolve({ ok: false, message: 'Popup blocked. Please allow popups for this site.' });
      return;
    }

    const onMessage = (event: MessageEvent) => {
      // The callback edge function sends from a Supabase domain.
      // We don't lock down the origin tightly because providers
      // could redirect via various paths; the message shape itself
      // is the authentication.
      if (!event.data || event.data.type !== 'zentrix:integration-connected') return;
      cleanup();
      resolve(event.data.payload);
    };
    const interval = window.setInterval(() => {
      if (popup.closed) {
        cleanup();
        resolve({ ok: false, message: 'Connection window closed before completing.' });
      }
    }, 500);
    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      window.clearInterval(interval);
    };
    window.addEventListener('message', onMessage);
  });
};

export const disconnectIntegration = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('user_integrations').delete().eq('id', id);
  if (error) {
    logger.error('disconnectIntegration failed:', error);
    return false;
  }
  return true;
};
