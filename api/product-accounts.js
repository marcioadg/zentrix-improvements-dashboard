// /api/product-accounts.js
// Returns full company list with all columns matching the OS admin panel:
// Company, Status, Score, Plan, 7d Usage, Users, Median Login, Created,
// Device, Source, Medium, Campaign, Content, Term, Adset, Ad, Landing Page, Referral
const { logError, sendErrorResponse, requireMethod, supabaseWithTimeout, getPeriodStartIso } = require('../utils/slack.js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

module.exports = async function handler(req, res) {
  const methodCheck = requireMethod(req, res, 'GET')
  if (methodCheck) return methodCheck

  const product = req.query.product || 'os'

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res.json({ accounts: [], product })
  }

  try {
    if (product !== 'os') {
      // For non-OS products, return basic list for now
      const rows = await supabaseWithTimeout(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, `/companies?select=id,name,created_at,status&order=created_at.desc&limit=100`, '/api/product-accounts')
      if (!rows || rows.length === undefined) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
        return res.status(500).json({ accounts: [], product, error: 'Failed to fetch accounts' })
      }
      res.setHeader('Cache-Control', 'public, max-age=300')
      return res.json({
        accounts: rows.map(c => ({ id: c.id, name: c.name, created_at: c.created_at, status: c.status })),
        product
      })
    }

    // ── Fetch base data in parallel ──────────────────────────────────────────
    const [companies, subscriptions, healthRows, usageRows] = await Promise.all([
      supabaseWithTimeout(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, `/companies?select=id,name,slug,created_at,status&order=created_at.desc&limit=200`, '/api/product-accounts'),
      supabaseWithTimeout(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, `/company_subscriptions?select=company_id,subscribed,subscription_tier,user_count,base_price_per_user,created_at,trial_end&limit=500`, '/api/product-accounts'),
      // customer_success_tracking has subs_status (Expired/Free Trial/Premium) and account_stage
      supabaseWithTimeout(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, `/customer_success_tracking?select=company_id,customer_health,account_stage,subs_status&limit=500`, '/api/product-accounts'),
      // 7d usage: sum total_minutes per company for last 7 days
      supabaseWithTimeout(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, `/company_usage_stats?select=company_id,stat_date,total_minutes&stat_date=gte.${getPeriodStartIso('7d')}&limit=2000`, '/api/product-accounts'),
    ])

    if (!Array.isArray(companies) || !Array.isArray(subscriptions) || !Array.isArray(healthRows) || !Array.isArray(usageRows)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      logError('/api/product-accounts', 'SUPABASE_PARTIAL_FAILURE', 'one or more supabase requests failed', { companies: Array.isArray(companies), subscriptions: Array.isArray(subscriptions), health: Array.isArray(healthRows), usage: Array.isArray(usageRows) })
      return res.status(500).json({ accounts: [], product, error: 'Failed to fetch complete account data' })
    }

    // ── Exclude internal/testing companies (Super Admin "internal / testing" saved filter) ──
    const filterRows = await supabaseWithTimeout(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, `/saved_company_filters?select=name,filter_data&limit=50`, '/api/product-accounts')
    const filterMatch = Array.isArray(filterRows) ? filterRows.find(f => f.name === 'internal / testing') : null
    const excludedIds = new Set(filterMatch?.filter_data?.excludedCompanyIds || [])
    const visibleCompanies = excludedIds.size > 0 ? companies.filter(c => !excludedIds.has(c.id)) : companies

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
    const companyIds = visibleCompanies.slice(0, 100).map(c => c.id)
    const idList = companyIds.map(id => `"${id}"`).join(',')

    const [members, profiles] = await Promise.all([
      supabaseWithTimeout(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, `/company_members?select=user_id,company_id&company_id=in.(${idList})&limit=1000`, '/api/product-accounts'),
      supabaseWithTimeout(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, `/profiles?select=id,last_login_at,first_device_type&limit=2000`, '/api/product-accounts')
    ])

    if (!Array.isArray(members) || !Array.isArray(profiles)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      logError('/api/product-accounts', 'SUPABASE_PARTIAL_FAILURE', 'failed to fetch members or profiles', { members: Array.isArray(members), profiles: Array.isArray(profiles) })
      return res.status(500).json({ accounts: [], product, error: 'Failed to fetch account details' })
    }

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
      const attributions = await supabaseWithTimeout(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, `/user_attributions?select=user_id,utm_source,utm_medium,utm_campaign,utm_adset,utm_ad,utm_content,utm_term,landing_page_url,referral_source&user_id=in.(${userIdList})&limit=200`, '/api/product-accounts')
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
    const accounts = visibleCompanies.map(c => {
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

      // ── Plan: derived purely from company_subscriptions (source of truth) ──────
      // subscription_tier: 'Premium' | 'Trial' | 'Free'
      // trial_end: date when trial expires (null for Free/Premium)
      // cancelled_at: set if explicitly cancelled
      // NOTE: subs_status in customer_success_tracking is manually maintained
      // and stale — do NOT use it for plan display.
      const tier = (sub.subscription_tier || '').trim()
      const subscribed = sub.subscribed ?? false
      const cancelled = sub.cancelled_at
      const trialEndDate = sub.trial_end ? new Date(sub.trial_end) : null
      const now = new Date()
      const trialExpired = trialEndDate ? trialEndDate < now : false

      let plan, planStatus
      if (cancelled) {
        plan = 'Cancelled'; planStatus = 'cancelled'
      } else if (tier === 'Premium') {
        plan = 'Premium'; planStatus = 'paid'
      } else if (tier === 'Free') {
        plan = 'Free'; planStatus = 'free'
      } else if (tier === 'Trial') {
        if (trialExpired) { plan = 'Expired'; planStatus = 'expired' }
        else              { plan = 'Trial';   planStatus = 'trial'   }
      } else {
        // No subscription row or unknown
        plan = 'Unknown'; planStatus = 'unknown'
      }

      // ── Status: derive from account_stage + plan ────────────────────────────
      // account_stage is hand-managed by CS; use it when set, fallback to plan-derived
      const accountStage = health.account_stage || null
      let status
      if (accountStage === 'Active Subscription') status = 'Active'
      else if (accountStage === 'At churn Risk')   status = 'Churn Risk'
      else if (accountStage === 'Onboarding')       status = 'Onboarding'
      else if (accountStage === 'Test Company')     status = 'Test'
      else if (accountStage === 'Internal Company') status = 'Internal'
      else if (accountStage === 'Done')             status = 'Done'
      else if (accountStage === 'Free Trial')       status = planStatus === 'expired' ? 'Expired' : 'Trial'
      // No account_stage set — derive from plan
      else if (planStatus === 'cancelled') status = 'Cancelled'
      else if (planStatus === 'paid')      status = 'Active'
      else if (planStatus === 'trial')     status = 'Trial'
      else if (planStatus === 'expired')   status = 'Expired'
      else if (planStatus === 'free')      status = 'Free'
      else                                 status = null

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

    res.setHeader('Cache-Control', 'public, max-age=300')
    return res.json({ accounts, product })

  } catch (err) {
    if (!res.headersSent) {
      return sendErrorResponse(res, 500, err.name || 'HANDLER_ERROR', 'Failed to fetch accounts', { message: err.message, product })
    }
  }
}

