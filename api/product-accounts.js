// /api/product-accounts.js
// Returns full company list with all columns matching the OS admin panel:
// Company, Status, Score, Plan, 7d Usage, Users, Median Login, Created,
// Device, Source, Medium, Campaign, Content, Term, Adset, Ad, Landing Page, Referral
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bprlchkedecbyoaqlbfz.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ALLOWED_ORIGINS = ['https://zentrix-improvements-dashboard.vercel.app']

async function supabase(path, headers = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...headers
    }
  })
  if (!res.ok) {
    const err = await res.text()
    console.error(`Supabase error for ${path}:`, err)
    return []
  }
  return res.json()
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

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return res.json({ accounts: [], product })
  }

  try {
    if (product !== 'os') {
      // For non-OS products, return basic list for now
      const rows = await supabase(`/companies?select=id,name,created_at,status&order=created_at.desc&limit=100`)
      return res.json({
        accounts: rows.map(c => ({ id: c.id, name: c.name, created_at: c.created_at, status: c.status })),
        product
      })
    }

    // ── Fetch base data in parallel ──────────────────────────────────────────
    const [companies, subscriptions, healthRows, usageRows] = await Promise.all([
      supabase(`/companies?select=id,name,slug,created_at,status&order=created_at.desc&limit=200`),
      supabase(`/company_subscriptions?select=company_id,subscribed,subscription_tier,user_count,base_price_per_user,created_at,trial_end&limit=500`),
      // customer_success_tracking has subs_status (Expired/Free Trial/Premium) and account_stage
      supabase(`/customer_success_tracking?select=company_id,customer_health,account_stage,subs_status&limit=500`),
      // 7d usage: sum total_minutes per company for last 7 days
      supabase(`/company_usage_stats?select=company_id,stat_date,total_minutes&stat_date=gte.${sevenDaysAgo()}&limit=2000`),
    ])

    // ── Build lookup maps ────────────────────────────────────────────────────
    const subMap = {}
    subscriptions.forEach(s => { subMap[s.company_id] = s })

    const healthMap = {}
    healthRows.forEach(h => { healthMap[h.company_id] = h })

    // 7d usage: sum per company
    const usageMap = {}
    usageRows.forEach(u => {
      if (!usageMap[u.company_id]) usageMap[u.company_id] = 0
      usageMap[u.company_id] += (u.total_minutes || 0)
    })

    // ── For attribution: need company → user mapping (company_members) ───────
    // Fetch company_members for all companies (batch by company ids)
    const companyIds = companies.slice(0, 100).map(c => c.id)
    const idList = companyIds.map(id => `"${id}"`).join(',')

    const [members, profiles] = await Promise.all([
      supabase(`/company_members?select=user_id,company_id&company_id=in.(${idList})&limit=1000`),
      supabase(`/profiles?select=id,last_login_at,first_device_type&limit=2000`)
    ])

    // company → user_ids
    const companyUsersMap = {}
    members.forEach(m => {
      if (!companyUsersMap[m.company_id]) companyUsersMap[m.company_id] = []
      companyUsersMap[m.company_id].push(m.user_id)
    })

    // user_id → profile
    const profileMap = {}
    profiles.forEach(p => { profileMap[p.id] = p })

    // Fetch attributions for known user_ids (take first user per company as representative)
    const representativeUserIds = companyIds
      .map(cid => (companyUsersMap[cid] || [])[0])
      .filter(Boolean)

    let attributionMap = {}
    if (representativeUserIds.length > 0) {
      const userIdList = representativeUserIds.slice(0, 100).map(id => `"${id}"`).join(',')
      const attributions = await supabase(`/user_attributions?select=user_id,utm_source,utm_medium,utm_campaign,utm_adset,utm_ad,utm_content,utm_term,landing_page_url,referral_source&user_id=in.(${userIdList})&limit=200`)
      // Map attribution by user_id
      const attrByUser = {}
      attributions.forEach(a => { attrByUser[a.user_id] = a })
      // Map to company
      companyIds.forEach(cid => {
        const uid = (companyUsersMap[cid] || [])[0]
        if (uid && attrByUser[uid]) attributionMap[cid] = attrByUser[uid]
      })
    }

    // ── Build final account rows ─────────────────────────────────────────────
    const accounts = companies.map(c => {
      const sub = subMap[c.id] || {}
      const health = healthMap[c.id] || {}
      const usageMinutes = usageMap[c.id] || 0
      const usageHours = +(usageMinutes / 60).toFixed(1)
      const attr = attributionMap[c.id] || {}

      // Median login: take login dates for all users in company, find median
      const userIds = companyUsersMap[c.id] || []
      const loginDates = userIds
        .map(uid => profileMap[uid]?.last_login_at)
        .filter(Boolean)
        .sort()
      const medianLogin = loginDates.length > 0
        ? loginDates[Math.floor(loginDates.length / 2)]
        : null

      // Device: first_device_type of first user
      const firstUserId = userIds[0]
      const device = firstUserId ? profileMap[firstUserId]?.first_device_type || null : null

      // ── Plan: derive from subs_status + subscription_tier + subscribed ──────
      // subs_status from customer_success_tracking is the most accurate billing state:
      //   'Premium' = active paid, 'Free Trial' = active trial, 'Expired' = expired trial/cancelled
      // subscription_tier gives the tier name (Premium, Trial, Free)
      // subscribed=true means manually granted access (not necessarily Stripe paid)
      const subsStatus = health.subs_status   // 'Premium' | 'Free Trial' | 'Expired' | null
      const tier = sub.subscription_tier || null
      const subscribed = sub.subscribed ?? false
      const trialExpired = sub.trial_end ? new Date(sub.trial_end) < new Date() : false

      let plan, planStatus
      if (subsStatus === 'Premium' || tier === 'Premium') {
        plan = 'Premium'; planStatus = 'paid'
      } else if (subsStatus === 'Expired' || (subsStatus === null && trialExpired && !subscribed)) {
        plan = 'Expired'; planStatus = 'expired'
      } else if (subsStatus === 'Free Trial' || tier === 'Trial') {
        plan = trialExpired ? 'Expired' : 'Trial'; planStatus = trialExpired ? 'expired' : 'trial'
      } else if (tier === 'Free') {
        plan = 'Free'; planStatus = 'free'
      } else {
        plan = tier || 'Unknown'; planStatus = 'unknown'
      }

      // ── Status: use account_stage (meaningful CS status), not companies.status ──
      // account_stage: 'Active Subscription', 'Free Trial', 'At churn Risk',
      //   'Onboarding', 'Test Company', 'Internal Company', 'Done', null
      const accountStage = health.account_stage || null
      // Derive a clean status label
      let status
      if (accountStage === 'Active Subscription') status = 'Active'
      else if (accountStage === 'At churn Risk')   status = 'Churn Risk'
      else if (accountStage === 'Free Trial')       status = 'Trial'
      else if (accountStage === 'Onboarding')       status = 'Onboarding'
      else if (accountStage === 'Test Company')     status = 'Test'
      else if (accountStage === 'Internal Company') status = 'Internal'
      else if (accountStage === 'Done')             status = 'Done'
      else if (planStatus === 'expired')            status = 'Expired'
      else if (planStatus === 'paid')               status = 'Active'
      else if (planStatus === 'trial')              status = 'Trial'
      else                                          status = null

      // ── Score: customer_health ────────────────────────────────────────────
      const score = health.customer_health || null

      return {
        id: c.id,
        name: c.name,
        status,
        score,
        plan,
        planStatus,
        subscribed,
        usage_7d_hrs: usageHours,
        users: sub.user_count ?? null,
        median_login: medianLogin,
        created_at: c.created_at,
        device,
        utm_source: attr.utm_source || null,
        utm_medium: attr.utm_medium || null,
        utm_campaign: attr.utm_campaign || null,
        utm_content: attr.utm_content || null,
        utm_term: attr.utm_term || null,
        utm_adset: attr.utm_adset || null,
        utm_ad: attr.utm_ad || null,
        landing_page: attr.landing_page_url || null,
        referral: attr.referral_source || null
      }
    })

    return res.json({ accounts, product })

  } catch (err) {
    console.error('product-accounts error:', err.message)
    return res.json({ accounts: [], product, error: err.message })
  }
}

function sevenDaysAgo() {
  return new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
}
