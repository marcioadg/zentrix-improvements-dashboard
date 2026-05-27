// /api/paid-customers.js
// Returns the list of currently-paying customers (active Stripe subscriptions),
// enriched with company / owner / status data from Supabase. Driven by Stripe so
// the count matches the "Total Paid Accounts" card on the dashboard.
const { logError, FETCH_TIMEOUT, sendErrorResponse, setupCORSAndOptions } = require('../utils/slack.js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_SECRET_KEY_NEW = process.env.STRIPE_SECRET_KEY_NEW

const PRODUCT_NAMES = {
  'prod_UIcJaRWyvLj3hG': 'Zentrix OS',
  'prod_UIXWsz46FekvcE': 'Zentrix CRM',
  'prod_UIF93vwI9NzXpI': 'Zentrix Insights',
  'prod_T85Mmg99NDMaWP': 'Zentrix OS',
  'prod_TU0tjFz2jR0OYg': 'Zentrix Insights',
  'prod_T4vLmff0Cdl34d': 'Zentrix OS'
}

function calcSubMRR(sub) {
  let mrr = 0
  for (const item of sub.items?.data || []) {
    const price = item.price
    if (!price?.unit_amount) continue
    const qty = item.quantity || 1
    const amount = (price.unit_amount / 100) * qty
    const interval = price.recurring?.interval
    if (interval === 'month') mrr += amount
    else if (interval === 'year') mrr += amount / 12
    else if (interval === 'week') mrr += amount * 4.33
  }
  return mrr
}

function getSubProductNames(sub) {
  const names = new Set()
  for (const item of sub.items?.data || []) {
    const pid = item.price?.product
    const pidStr = typeof pid === 'string' ? pid : pid?.id
    if (pidStr && PRODUCT_NAMES[pidStr]) names.add(PRODUCT_NAMES[pidStr])
  }
  return names
}

async function supabase(path) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    })
    if (!res.ok) {
      logError('/api/paid-customers', 'SUPABASE_HTTP', `request failed for ${path}`, { status: res.status })
      return []
    }
    return res.json()
  } catch (err) {
    logError('/api/paid-customers', err.name === 'AbortError' ? 'SUPABASE_TIMEOUT' : 'SUPABASE_ERROR', `request failed for ${path}`, { message: err.message })
    return []
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchActiveSubs(key) {
  const out = []
  let hasMore = true
  let startingAfter
  let guard = 0
  while (hasMore && guard++ < 20) {
    const params = new URLSearchParams({ limit: '100', status: 'active' })
    params.append('expand[]', 'data.customer')
    if (startingAfter) params.append('starting_after', startingAfter)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
    try {
      const r = await fetch(`https://api.stripe.com/v1/subscriptions?${params}`, {
        headers: { 'Authorization': `Bearer ${key}` },
        signal: controller.signal
      })
      if (!r.ok) {
        logError('/api/paid-customers', 'STRIPE_HTTP', 'subscriptions fetch failed', { status: r.status })
        break
      }
      const data = await r.json()
      if (!Array.isArray(data.data)) break
      out.push(...data.data)
      hasMore = !!data.has_more
      startingAfter = data.data.length ? data.data[data.data.length - 1].id : undefined
      if (!startingAfter) hasMore = false
    } catch (e) {
      logError('/api/paid-customers', e.name === 'AbortError' ? 'STRIPE_TIMEOUT' : 'STRIPE_ERROR', 'subscriptions fetch failed', { message: e.message })
      break
    } finally {
      clearTimeout(timeout)
    }
  }
  return out
}

function periodStartMs(period) {
  const d = new Date()
  switch (period) {
    case 'day':  return Date.now() - 86400000
    case '7d':   return Date.now() - 7 * 86400000
    case '14d':  return Date.now() - 14 * 86400000
    case '30d':  return Date.now() - 30 * 86400000
    case 'month':    { d.setDate(1); d.setHours(0, 0, 0, 0); return d.getTime() }
    case 'quarter':  { const q = Math.floor(d.getMonth() / 3); d.setMonth(q * 3, 1); d.setHours(0, 0, 0, 0); return d.getTime() }
    case 'semester': { d.setMonth(d.getMonth() < 6 ? 0 : 6, 1); d.setHours(0, 0, 0, 0); return d.getTime() }
    case 'year':     { d.setMonth(0, 1); d.setHours(0, 0, 0, 0); return d.getTime() }
    default: return null
  }
}

module.exports = async function handler(req, res) {
  const corsResult = setupCORSAndOptions(req, res, 'GET')
  if (corsResult) return corsResult

  if (req.method !== 'GET') {
    return sendErrorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed')
  }

  const stripeKeys = [STRIPE_SECRET_KEY, STRIPE_SECRET_KEY_NEW].filter(Boolean)
  if (stripeKeys.length === 0) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res.json({ customers: [], count: 0 })
  }

  try {
    // 1) Active subscriptions across all Stripe accounts, aggregated per customer
    const byCustomer = new Map()
    for (const key of stripeKeys) {
      const subs = await fetchActiveSubs(key)
      for (const sub of subs) {
        const cust = sub.customer
        const custId = typeof cust === 'string' ? cust : cust?.id
        if (!custId) continue
        const custObj = (cust && typeof cust === 'object') ? cust : null
        const mrr = calcSubMRR(sub)
        const created = sub.created ? sub.created * 1000 : null
        let entry = byCustomer.get(custId)
        if (!entry) {
          entry = { stripeCustomerId: custId, email: null, name: null, mrr: 0, products: new Set(), since: created }
          byCustomer.set(custId, entry)
        }
        entry.mrr += mrr
        if (custObj && custObj.email && !entry.email) entry.email = custObj.email
        if (custObj && custObj.name && !entry.name) entry.name = custObj.name
        for (const p of getSubProductNames(sub)) entry.products.add(p)
        if (created && (!entry.since || created < entry.since)) entry.since = created
      }
    }

    let customerIds = [...byCustomer.keys()]
    // Optional ?period= filter: keep only customers whose first active sub
    // started within the period (i.e. "new paying customers in period").
    const period = typeof req.query.period === 'string' ? req.query.period : null
    const startMs = period ? periodStartMs(period) : null
    if (startMs) {
      customerIds = customerIds.filter(cid => { const e = byCustomer.get(cid); return e && e.since && e.since >= startMs })
    }
    if (customerIds.length === 0) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      return res.json({ customers: [], count: 0 })
    }

    // 2) Best-effort Supabase enrichment
    let subRows = [], companyRows = [], csRows = [], memberRows = [], profileRows = []
    if (SUPABASE_SERVICE_ROLE_KEY) {
      const inIds = customerIds.map(id => `"${id}"`).join(',')
      subRows = await supabase(`/company_subscriptions?stripe_customer_id=in.(${inIds})&select=company_id,company_name,subscription_tier,user_count,quantity,period_amount_charged,subscribed_at,stripe_customer_id`)
      subRows = Array.isArray(subRows) ? subRows : []
      const companyIds = [...new Set(subRows.map(s => s.company_id).filter(Boolean))]
      if (companyIds.length) {
        const inC = companyIds.map(id => `"${id}"`).join(',')
        const results = await Promise.all([
          supabase(`/companies?id=in.(${inC})&select=id,name,status,created_at,billing_email,country`),
          supabase(`/customer_success_tracking?company_id=in.(${inC})&select=company_id,customer_health,account_stage`),
          supabase(`/company_members?company_id=in.(${inC})&select=company_id,user_id,email,permission_level&limit=2000`)
        ])
        companyRows = Array.isArray(results[0]) ? results[0] : []
        csRows = Array.isArray(results[1]) ? results[1] : []
        memberRows = Array.isArray(results[2]) ? results[2] : []
        const ownerUserIds = [...new Set(memberRows.map(m => m.user_id).filter(Boolean))]
        if (ownerUserIds.length) {
          const inU = ownerUserIds.slice(0, 300).map(id => `"${id}"`).join(',')
          profileRows = await supabase(`/profiles?id=in.(${inU})&select=id,full_name,email`)
          profileRows = Array.isArray(profileRows) ? profileRows : []
        }
      }
    }

    const subByCust = {}
    subRows.forEach(s => { subByCust[s.stripe_customer_id] = s })
    const companyById = {}
    companyRows.forEach(c => { companyById[c.id] = c })
    const csByCompany = {}
    csRows.forEach(c => { csByCompany[c.company_id] = c })
    const profileById = {}
    profileRows.forEach(p => { profileById[p.id] = p })

    /* pick the owner per company: prefer owner > admin > anyone */
    const ownerByCompany = {}
    const rank = (lvl) => lvl === 'owner' ? 0 : lvl === 'admin' ? 1 : 2
    memberRows.forEach(m => {
      const cur = ownerByCompany[m.company_id]
      if (!cur || rank(m.permission_level) < rank(cur.permission_level)) ownerByCompany[m.company_id] = m
    })

    // 3) Merge into customer rows
    const customers = customerIds.map(cid => {
      const e = byCustomer.get(cid)
      const sub = subByCust[cid] || {}
      const company = companyById[sub.company_id] || {}
      const cs = csByCompany[sub.company_id] || {}
      const ownerMember = ownerByCompany[sub.company_id] || null
      const ownerProfile = ownerMember ? profileById[ownerMember.user_id] : null
      const ownerEmail = (ownerMember && ownerMember.email) || (ownerProfile && ownerProfile.email) || e.email || company.billing_email || null
      const ownerName = (ownerProfile && ownerProfile.full_name) || (ownerEmail ? ownerEmail.split('@')[0] : null)
      return {
        company: company.name || sub.company_name || e.name || e.email || '—',
        ownerName: ownerName || null,
        ownerEmail: ownerEmail || null,
        status: company.status || cs.account_stage || null,
        health: cs.customer_health || null,
        plan: sub.subscription_tier || null,
        seats: sub.user_count || sub.quantity || null,
        mrr: Math.round(e.mrr),
        products: [...e.products],
        createdAt: company.created_at || sub.subscribed_at || (e.since ? new Date(e.since).toISOString() : null),
        country: company.country || null,
        stripeCustomerId: cid,
        email: e.email || null
      }
    })

    customers.sort((a, b) => (b.mrr || 0) - (a.mrr || 0))

    res.setHeader('Cache-Control', 'public, max-age=120')
    return res.json({ customers, count: customers.length })
  } catch (err) {
    return sendErrorResponse(res, 500, err.name || 'HANDLER_ERROR', 'Failed to load paid customers', { message: err.message })
  }
}
