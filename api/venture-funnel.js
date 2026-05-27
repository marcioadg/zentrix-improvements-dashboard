// /api/venture-funnel.js
// Returns per-product conversion funnel metrics: avg time to paid, new signups, potential MRR
//
// Product → Supabase table mapping:
//   os       → company_subscriptions  (subscription_tier: Free/Trial/Premium)
//   insights → subscribers            (subscription_tier: Free/Trial/Enterprise/null)
//   crm      → no data yet (pre-launch)
//   agents   → no data yet (pre-launch)

const { logError, sendErrorResponse, requireMethod, getPeriodStart, supabaseWithPagination, supabaseWithTimeout } = require('../utils/slack.js')
const { DEFAULT_PRICE, PRODUCT_TABLE, TRIAL_TIERS, PAID_TIERS } = require('../utils/schemas.js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

module.exports = async function handler(req, res) {
  const methodCheck = requireMethod(req, res, 'GET')
  if (methodCheck) return methodCheck

  const product = (req.query.product || 'os').toLowerCase()
  const period  = req.query.period  || '7d'
  const table   = PRODUCT_TABLE[product]
  const defaultPrice = DEFAULT_PRICE[product] || 15

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res.json({ avgTimeToPaid: null, newSignups: 0, potentialMrr: null, trialCount: 0, product, period })
  }

  // Pre-launch products — no data yet
  if (!table) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
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
    // ── OS only: exclude internal/testing companies ─────────────────────────
    // Same Super Admin "internal / testing" saved filter used by the OS account
    // base in /api/metrics, so the funnel counts the same real companies.
    const includeInternal = req.query.includeInternal === '1' || req.query.includeInternal === 'true'
    let excludedIds = new Set()
    if (table === 'company_subscriptions' && !includeInternal) {
      const filterRows = await supabaseWithTimeout(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, `/saved_company_filters?select=name,filter_data&limit=50`, '/api/venture-funnel')
      const filterMatch = Array.isArray(filterRows) ? filterRows.find(f => f.name === 'internal / testing') : null
      excludedIds = new Set(filterMatch?.filter_data?.excludedCompanyIds || [])
    }
    const isExcluded = row => row && excludedIds.has(row.company_id)
    const idCol = table === 'company_subscriptions' ? ',company_id' : ''

    // ── 1. Avg time to paid ─────────────────────────────────────────────────
    // For rows where they converted (paid tier), measure updated_at - created_at
    const { rows: paidRows } = await supabaseWithPagination(
      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
      `/${table}?select=created_at,updated_at${idCol}&${paidFilter}&limit=500`,
      '/api/venture-funnel'
    )
    let avgTimeToPaid = null
    const diffs = []
    paidRows.forEach(row => {
      if (!row || typeof row !== 'object' || !row.created_at || !row.updated_at || isExcluded(row)) return
      const diffDays = (new Date(row.updated_at) - new Date(row.created_at)) / 86400000
      if (diffDays > 0.5 && diffDays < 730) diffs.push(diffDays)
    })
    if (diffs.length > 0) {
      avgTimeToPaid = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length)
    }

    // ── 2. New signups in period ────────────────────────────────────────────
    // Count new rows in this product's table created within the period.
    // For OS, fetch company_ids and count in JS so excluded companies drop out;
    // other products keep the cheaper DB count=exact.
    let newSignups
    if (table === 'company_subscriptions') {
      const { rows: signupRows } = await supabaseWithPagination(
        SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
        `/${table}?select=company_id&created_at=gte.${encodeURIComponent(periodStartIso)}&limit=2000`,
        '/api/venture-funnel'
      )
      newSignups = signupRows.filter(r => !isExcluded(r)).length
    } else {
      const { count } = await supabaseWithPagination(
        SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
        `/${table}?select=id&created_at=gte.${encodeURIComponent(periodStartIso)}`,
        '/api/venture-funnel',
        { 'Prefer': 'count=exact', 'Range': '0-0' }
      )
      newSignups = count
    }

    // ── 3. Active trial count + potential MRR ──────────────────────────────
    // Trials = rows with trial tier; for OS include base_price_per_user
    const trialSelect = table === 'company_subscriptions'
      ? `${trialFilter}&select=user_count,base_price_per_user,company_id&subscribed=eq.false&limit=500`
      : `${trialFilter}&select=id&limit=500`

    const { rows: trialRows } = await supabaseWithPagination(
      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
      `/${table}?${trialSelect}`,
      '/api/venture-funnel'
    )
    const visibleTrialRows = trialRows.filter(r => !isExcluded(r))
    const trialCount = visibleTrialRows.length
    let potentialMrr = null
    if (trialCount > 0) {
      if (table === 'company_subscriptions') {
        potentialMrr = visibleTrialRows.reduce((sum, c) => {
          if (!c || typeof c !== 'object') return sum
          const seats = Math.max(c.user_count || 0, 1)
          const price = c.base_price_per_user || defaultPrice
          return sum + (seats * price)
        }, 0)
      } else {
        potentialMrr = trialCount * defaultPrice
      }
    }

    res.setHeader('Cache-Control', 'public, max-age=300')
    return res.json({
      avgTimeToPaid,
      newSignups,
      potentialMrr,
      trialCount,
      product,
      period
    })

  } catch (err) {
    return sendErrorResponse(res, 500, err.name || 'HANDLER_ERROR', 'handler error', { message: err.message, product })
  }
}
