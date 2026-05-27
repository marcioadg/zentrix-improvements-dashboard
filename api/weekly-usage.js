// /api/weekly-usage.js
const { logError, sendErrorResponse, setupCORSAndOptions, supabaseWithTimeout } = require('../utils/slack.js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

module.exports = async function handler(req, res) {
  const corsResult = setupCORSAndOptions(req, res, 'GET')
  if (corsResult) return corsResult

  if (req.method !== 'GET') {
    return sendErrorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed')
  }

  const product = req.query.product || 'os'  // os | insights | crm | agents

  try {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      return res.json({ data: [], product })
    }

    // ── OS (public schema) ────────────────────────────────────────────────────
    if (product === 'os') {
      const raw = await supabaseWithTimeout(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, `/weekly_usage_snapshots?select=*&order=week_start.asc&limit=16`, '/api/weekly-usage')
      if (!Array.isArray(raw)) {
        return sendErrorResponse(res, 500, 'SUPABASE_HTTP', 'Failed to fetch weekly usage data', { product: 'os' })
      }
      res.setHeader('Cache-Control', 'public, max-age=300')
      return res.json({ data: raw, product })
    }

    // ── Insights schema ───────────────────────────────────────────────────────
    if (product === 'insights') {
      const raw = await supabaseWithTimeout(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, `/weekly_usage_snapshots?select=week_start,week_end,total_hours,paid_hours,trial_hours,free_hours,avg_hours_per_user,total_users,paid_users,wow_hours_change_pct,top_users&order=week_start.asc&limit=16`, '/api/weekly-usage', { 'Accept-Profile': 'insights' })
      if (!Array.isArray(raw)) {
        return sendErrorResponse(res, 500, 'SUPABASE_HTTP', 'Failed to fetch weekly usage data', { product: 'insights' })
      }
      const data = raw.map(row => ({
        week_start: row.week_start,
        week_end: row.week_end,
        total_hours: row.total_hours,
        paid_hours: row.paid_hours,
        trial_hours: row.trial_hours,
        free_hours: row.free_hours,
        avg_hours_per_user: row.avg_hours_per_user,
        total_users: row.total_users,
        paid_users: row.paid_users,
        wow_hours_change_pct: row.wow_hours_change_pct,
        top_users: row.top_users,
      }))
      res.setHeader('Cache-Control', 'public, max-age=300')
      return res.json({ data, product })
    }

    // ── CRM schema ────────────────────────────────────────────────────────────
    if (product === 'crm') {
      const raw = await supabaseWithTimeout(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, `/weekly_usage_snapshots?select=week_start,week_end,total_hours,paid_hours,trial_hours,free_hours,avg_hours_per_tenant,avg_hours_per_user,total_tenants,paid_tenants,wow_hours_change_pct,top_tenants,low_tenants&order=week_start.asc&limit=16`, '/api/weekly-usage', { 'Accept-Profile': 'crm' })
      if (!Array.isArray(raw)) {
        return sendErrorResponse(res, 500, 'SUPABASE_HTTP', 'Failed to fetch weekly usage data', { product: 'crm' })
      }
      const data = raw.map(row => ({
        week_start: row.week_start,
        week_end: row.week_end,
        total_hours: row.total_hours,
        paid_hours: row.paid_hours,
        trial_hours: row.trial_hours,
        free_hours: row.free_hours,
        avg_hours_per_tenant: row.avg_hours_per_tenant,
        avg_hours_per_user: row.avg_hours_per_user,
        total_tenants: row.total_tenants,
        total_companies: row.total_tenants,
        paid_tenants: row.paid_tenants,
        wow_hours_change_pct: row.wow_hours_change_pct,
        top_tenants: row.top_tenants,
        low_tenants: row.low_tenants,
      }))
      res.setHeader('Cache-Control', 'public, max-age=300')
      return res.json({ data, product })
    }

    // ── Agents or other unknown products ─────────────────────────────────────
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res.json({ data: [], product, note: 'No weekly data for this product yet' })

  } catch (err) {
    return sendErrorResponse(res, 500, err.name || 'HANDLER_ERROR', 'Failed to fetch weekly usage data', { message: err.message, product })
  }
}
