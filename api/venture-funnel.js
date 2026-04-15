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
    // Fetch ALL paid company_subscriptions (subscribed=true) with created_at
    // We treat company_subscriptions.created_at as when the company first joined (trial start)
    // and we find the first time subscribed flipped to true via subscription_updated_at or
    // simply the row's created_at for paid rows vs the company's earliest subscription row.
    // Best available: fetch companies that have BOTH a trial row (oldest) and a paid row,
    // compute diff between company created_at and subscription created_at where subscribed=true.
    let avgTimeToPaid = null
    const paidResp = await fetch(
      `${SUPABASE_URL}/rest/v1/company_subscriptions?select=company_id,created_at,subscribed,subscription_updated_at&subscribed=eq.true&order=created_at.asc&limit=500`,
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
      if (paidRows.length > 0) {
        // Also fetch company created_at to get trial start date
        const companyIds = paidRows.map(r => r.company_id).filter(Boolean)
        // Fetch in one shot using 'in' filter (up to 100 IDs)
        const idList = companyIds.slice(0, 100).map(id => `"${id}"`).join(',')
        const coResp = await fetch(
          `${SUPABASE_URL}/rest/v1/companies?select=id,created_at&id=in.(${idList})`,
          {
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        )
        if (coResp.ok) {
          const companies = await coResp.json()
          const companyMap = {}
          companies.forEach(c => { companyMap[c.id] = c.created_at })

          const diffs = []
          paidRows.forEach(row => {
            const trialStart = companyMap[row.company_id]
            // Use subscription_updated_at (when they converted) if available, else row created_at
            const paidAt = row.subscription_updated_at || row.created_at
            if (trialStart && paidAt) {
              const diffDays = (new Date(paidAt) - new Date(trialStart)) / 86400000
              if (diffDays >= 0 && diffDays < 3650) diffs.push(diffDays) // sanity cap 10yr
            }
          })
          if (diffs.length > 0) {
            avgTimeToPaid = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length)
          }
        }
      }
    }

    // ── 2. New trials in period ──────────────────────────────────────────────
    // Count company_subscriptions where created_at >= periodStart (regardless of subscribed status)
    // This represents companies that signed up / started trial in the selected window
    const trialsResp = await fetch(
      `${SUPABASE_URL}/rest/v1/company_subscriptions?select=company_id&created_at=gte.${encodeURIComponent(periodStartIso)}&limit=1000`,
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact'
        }
      }
    )
    let newTrials = 0
    if (trialsResp.ok) {
      const contentRange = trialsResp.headers.get('content-range')
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)$/)
        if (match) newTrials = parseInt(match[1], 10)
      } else {
        const rows = await trialsResp.json()
        newTrials = Array.isArray(rows) ? rows.length : 0
      }
    }

    // ── 3. Potential MRR ────────────────────────────────────────────────────
    // Fetch all trial companies (subscribed=false) with their user_count
    // potentialMrr = sum(user_count * pricePerSeat) for all trials + current MRR
    let potentialMrr = null
    const trialCompResp = await fetch(
      `${SUPABASE_URL}/rest/v1/company_subscriptions?select=user_count,subscribed&subscribed=eq.false&limit=500`,
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
      if (trialComps.length > 0) {
        const trialRevPotential = trialComps.reduce((sum, c) => {
          const seats = c.user_count || 1
          return sum + (seats * pricePerSeat)
        }, 0)
        potentialMrr = trialRevPotential // caller will add current MRR
      }
    }

    return res.json({
      avgTimeToPaid,
      newTrials,
      potentialMrr,  // just the trial portion; add to current MRR on frontend
      product,
      period
    })

  } catch (err) {
    console.error('venture-funnel error:', err.message)
    return res.json({ avgTimeToPaid: null, newTrials: 0, potentialMrr: null, product, period, error: err.message })
  }
}
