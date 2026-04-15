// /api/venture-funnel.js
// Returns conversion funnel metrics: avg time to paid, new trials in period, potential MRR
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bprlchkedecbyoaqlbfz.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ALLOWED_ORIGINS = ['https://zentrix-improvements-dashboard.vercel.app']

// Price per seat per product (monthly)
const PRICE_PER_SEAT = {
  os: 15,
  insights: 29,
  crm: 19,
  agents: 49
}

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

export default async function handler(req, res) {
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const product = req.query.product || 'os'
  const period  = req.query.period  || '7d'
  const pricePerSeat = PRICE_PER_SEAT[product] || 15

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return res.json({ avgTimeToPaid: null, newTrials: 0, potentialMrr: null, product, period })
  }

  const periodStart = getPeriodStart(period)
  const periodStartIso = periodStart.toISOString()

  try {
    // ── 1. Avg time to paid ──────────────────────────────────────────────────
    // Schema: one row per company in company_subscriptions.
    // When a company converts from trial→paid, the SAME ROW is updated:
    //   subscribed flips true, updated_at = conversion timestamp.
    // So: avgTimeToPaid = mean( (updated_at - created_at) in days ) for subscribed=true rows
    //   where the diff is > 0 (i.e. they were on trial before converting)
    let avgTimeToPaid = null
    const paidResp = await fetch(
      `${SUPABASE_URL}/rest/v1/company_subscriptions?select=created_at,updated_at&subscribed=eq.true&limit=500`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )
    if (paidResp.ok) {
      const paidRows = await paidResp.json()
      const diffs = []
      paidRows.forEach(row => {
        if (!row.created_at || !row.updated_at) return
        const diffDays = (new Date(row.updated_at) - new Date(row.created_at)) / 86400000
        // Only count meaningful conversions: > 0 days and < 730 days (2yr sanity cap)
        if (diffDays > 0.5 && diffDays < 730) diffs.push(diffDays)
      })
      if (diffs.length > 0) {
        avgTimeToPaid = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length)
      }
    }

    // ── 2. New signups (trials) in period ───────────────────────────────────
    // Count ALL new company_subscriptions rows created in period.
    // subscribed=false = still on trial; subscribed=true = came in as direct paid.
    // We report total new signups (both) as "new leads" for the period.
    const trialsResp = await fetch(
      `${SUPABASE_URL}/rest/v1/company_subscriptions?select=company_id&created_at=gte.${encodeURIComponent(periodStartIso)}`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact',
          'Range': '0-0'
        }
      }
    )
    let newTrials = 0
    if (trialsResp.ok || trialsResp.status === 206) {
      const contentRange = trialsResp.headers.get('content-range')
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)$/)
        if (match) newTrials = parseInt(match[1], 10)
      }
    }

    // ── 3. Potential MRR ────────────────────────────────────────────────────
    // Fetch all trial (subscribed=false) companies with user_count + base_price_per_user
    // potentialMrr = sum(max(user_count,1) * base_price_per_user) for all trials
    // Frontend adds current MRR to get total potential
    let potentialMrr = null
    let trialCount = 0
    const trialCompResp = await fetch(
      `${SUPABASE_URL}/rest/v1/company_subscriptions?select=user_count,base_price_per_user&subscribed=eq.false&limit=500`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )
    if (trialCompResp.ok) {
      const trialComps = await trialCompResp.json()
      trialCount = trialComps.length
      if (trialComps.length > 0) {
        potentialMrr = trialComps.reduce((sum, c) => {
          const seats = Math.max(c.user_count || 0, 1)
          const price = c.base_price_per_user || pricePerSeat
          return sum + (seats * price)
        }, 0)
      }
    }

    return res.json({
      avgTimeToPaid,
      newTrials,
      potentialMrr,   // trial portion only — frontend adds current MRR
      trialCount,     // total companies currently on trial
      product,
      period
    })

  } catch (err) {
    console.error('venture-funnel error:', err.message)
    return res.json({ avgTimeToPaid: null, newTrials: 0, potentialMrr: null, product, period, error: err.message })
  }
}
