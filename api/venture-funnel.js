// /api/venture-funnel.js
// Returns per-product conversion funnel metrics: avg time to paid, new signups, potential MRR
//
// Product → Supabase table mapping:
//   os       → company_subscriptions  (subscription_tier: Free/Trial/Premium)
//   insights → subscribers            (subscription_tier: Free/Trial/Enterprise/null)
//   crm      → no data yet (pre-launch)
//   agents   → no data yet (pre-launch)

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bprlchkedecbyoaqlbfz.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ALLOWED_ORIGINS = ['https://zentrix-improvements-dashboard.vercel.app']

// Default price per seat when base_price_per_user not in DB
const DEFAULT_PRICE = { os: 5, insights: 29, crm: 19, agents: 49 }

// Which Supabase table holds subscriber rows per product
const PRODUCT_TABLE = {
  os:       'company_subscriptions',
  insights: 'subscribers',
  crm:      null,
  agents:   null
}

// Which tier values count as "trial" vs "paid" per table
const TRIAL_TIERS  = { os: ['Trial'], insights: ['Trial'] }
const PAID_TIERS   = { os: ['Premium'], insights: ['Enterprise', 'Premium', 'Pro'] }

function getPeriodStart(period) {
  const now = new Date()
  switch (period) {
    case 'day':      return new Date(now - 86400000)
    case '7d':       return new Date(now - 7 * 86400000)
    case '14d':      return new Date(now - 14 * 86400000)
    case '30d':      return new Date(now - 30 * 86400000)
    case 'month':    return new Date(now.getFullYear(), now.getMonth(), 1)
    case 'quarter':  return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    case 'semester': return new Date(now.getFullYear(), now.getMonth() >= 6 ? 6 : 0, 1)
    case 'year':     return new Date(now.getFullYear(), 0, 1)
    default:         return new Date(now - 7 * 86400000)
  }
}

async function sbFetch(path, headers = {}) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...headers
    }
  })
  if (!resp.ok && resp.status !== 206) return { rows: [], count: 0, ok: false }
  const contentRange = resp.headers.get('content-range')
  const count = contentRange ? parseInt((contentRange.match(/\/(\d+)$/) || [])[1] || '0', 10) : 0
  let rows = []
  try { rows = await resp.json() } catch (_) {}
  return { rows, count, ok: true }
}

export default async function handler(req, res) {
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const product = (req.query.product || 'os').toLowerCase()
  const period  = req.query.period  || '7d'
  const table   = PRODUCT_TABLE[product]
  const defaultPrice = DEFAULT_PRICE[product] || 15

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return res.json({ avgTimeToPaid: null, newSignups: 0, potentialMrr: null, trialCount: 0, product, period })
  }

  // Pre-launch products — no data yet
  if (!table) {
    return res.json({ avgTimeToPaid: null, newSignups: 0, potentialMrr: null, trialCount: 0, product, period, prelaunch: true })
  }

  const periodStart    = getPeriodStart(period)
  const periodStartIso = periodStart.toISOString()
  const trialTiers     = TRIAL_TIERS[product] || ['Trial']
  const paidTiers      = PAID_TIERS[product]  || ['Premium']

  // Build tier filter strings for Supabase "in" operator
  const trialFilter = `subscription_tier=in.(${trialTiers.join(',')})`
  const paidFilter  = `subscription_tier=in.(${paidTiers.join(',')})`

  try {
    // ── 1. Avg time to paid ─────────────────────────────────────────────────
    // For rows where they converted (paid tier), measure updated_at - created_at
    const { rows: paidRows } = await sbFetch(
      `/${table}?select=created_at,updated_at&${paidFilter}&limit=500`
    )
    let avgTimeToPaid = null
    const diffs = []
    paidRows.forEach(row => {
      if (!row.created_at || !row.updated_at) return
      const diffDays = (new Date(row.updated_at) - new Date(row.created_at)) / 86400000
      if (diffDays > 0.5 && diffDays < 730) diffs.push(diffDays)
    })
    if (diffs.length > 0) {
      avgTimeToPaid = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length)
    }

    // ── 2. New signups in period ────────────────────────────────────────────
    // Count ALL new rows in this product's table created within the period
    const { count: newSignups } = await sbFetch(
      `/${table}?select=id&created_at=gte.${encodeURIComponent(periodStartIso)}`,
      { 'Prefer': 'count=exact', 'Range': '0-0' }
    )

    // ── 3. Active trial count + potential MRR ──────────────────────────────
    // Trials = rows with trial tier; for OS include base_price_per_user
    const trialSelect = table === 'company_subscriptions'
      ? `${trialFilter}&select=user_count,base_price_per_user&subscribed=eq.false&limit=500`
      : `${trialFilter}&select=id&limit=500`

    const { rows: trialRows } = await sbFetch(`/${table}?${trialSelect}`)
    const trialCount = trialRows.length
    let potentialMrr = null
    if (trialCount > 0) {
      if (table === 'company_subscriptions') {
        potentialMrr = trialRows.reduce((sum, c) => {
          const seats = Math.max(c.user_count || 0, 1)
          const price = c.base_price_per_user || defaultPrice
          return sum + (seats * price)
        }, 0)
      } else {
        // For other products, estimate: trialCount × 1 seat × defaultPrice
        potentialMrr = trialCount * defaultPrice
      }
    }

    return res.json({
      avgTimeToPaid,
      newSignups,
      potentialMrr,
      trialCount,
      product,
      period
    })

  } catch (err) {
    console.error('venture-funnel error:', err.message)
    return res.json({ avgTimeToPaid: null, newSignups: 0, potentialMrr: null, trialCount: 0, product, period, error: err.message })
  }
}
