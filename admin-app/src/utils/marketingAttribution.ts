/**
 * Marketing Attribution Capture & Persistence
 * 
 * Captures URL attribution parameters (UTM, click IDs) on first visit,
 * persists them in localStorage, and provides them for attachment on signup.
 */

const STORAGE_KEY = 'zentrix_marketing_attribution';
const EXPIRY_DAYS = 90;

const TRACKED_PARAMS = [
  'gclid',
  'fbclid',
  'li_fat_id',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'utm_adset',
  'utm_ad',
] as const;

export interface MarketingAttribution {
  gclid: string | null;
  fbclid: string | null;
  li_fat_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  utm_adset: string | null;
  utm_ad: string | null;
  landing_page_url: string;
  first_seen_at: string;
  stored_at: string;
}

/**
 * Read existing attribution from localStorage.
 * Returns null if expired or missing.
 */
function readStored(): MarketingAttribution | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data: MarketingAttribution = JSON.parse(raw);

    // Check expiry
    const storedAt = new Date(data.stored_at).getTime();
    const now = Date.now();
    const expiryMs = EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    if (now - storedAt > expiryMs) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return data;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

/**
 * Extract tracked params from the current URL.
 * Returns only params that are explicitly present (non-empty).
 */
function extractUrlParams(): Partial<Record<typeof TRACKED_PARAMS[number], string>> {
  const params = new URLSearchParams(window.location.search);
  const found: Partial<Record<typeof TRACKED_PARAMS[number], string>> = {};

  for (const key of TRACKED_PARAMS) {
    const value = params.get(key);
    if (value !== null && value.trim() !== '') {
      found[key] = value.trim();
    }
  }

  return found;
}

/**
 * Call on app load to capture attribution from the URL.
 * - If no existing data → stores all found params + defaults
 * - If existing data → only overwrites fields where new params are present
 */
export function captureAttribution(): void {
  try {
    const urlParams = extractUrlParams();
    const hasNewParams = Object.keys(urlParams).length > 0;
    const existing = readStored();

    if (existing && !hasNewParams) {
      // Nothing new to capture, existing data is still valid
      return;
    }

    const now = new Date().toISOString();

    if (existing && hasNewParams) {
      // Partial update: only overwrite fields that are explicitly in the URL
      const updated: MarketingAttribution = {
        ...existing,
        ...urlParams,
        // Don't update landing_page_url or first_seen_at on partial updates
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return;
    }

    // Brand new attribution record
    const attribution: MarketingAttribution = {
      gclid: urlParams.gclid ?? null,
      fbclid: urlParams.fbclid ?? null,
      li_fat_id: urlParams.li_fat_id ?? null,
      utm_source: urlParams.utm_source ?? (hasNewParams ? null : 'direct'),
      utm_medium: urlParams.utm_medium ?? (hasNewParams ? null : 'none'),
      utm_campaign: urlParams.utm_campaign ?? null,
      utm_content: urlParams.utm_content ?? null,
      utm_term: urlParams.utm_term ?? null,
      utm_adset: urlParams.utm_adset ?? null,
      utm_ad: urlParams.utm_ad ?? null,
      landing_page_url: window.location.href,
      first_seen_at: now,
      stored_at: now,
    };

    // Apply defaults when no attribution params at all
    if (!hasNewParams) {
      attribution.utm_source = 'direct';
      attribution.utm_medium = 'none';
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // Non-blocking: localStorage might be unavailable (private browsing, etc.)
  }
}

/**
 * Retrieve the stored attribution data for attaching to signup.
 * Returns null if no attribution is stored or it has expired.
 */
export function getAttribution(): MarketingAttribution | null {
  return readStored();
}
