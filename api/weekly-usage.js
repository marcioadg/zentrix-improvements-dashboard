// /api/weekly-usage.js
const { logError, sendErrorResponse, setupCORSAndOptions, supabaseWithTimeout } = require('../utils/slack.js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Product-specific schema configuration: fields to select and transform per product
const PRODUCT_SCHEMAS = {
  os: {
    fields: '*',
    headers: {},
    transform: (row) => row
  },
  insights: {
    fields: 'week_start,week_end,total_hours,paid_hours,trial_hours,free_hours,avg_hours_per_user,total_users,paid_users,wow_hours_change_pct,top_users',
    headers: { 'Accept-Profile': 'insights' },
    transform: (row) => ({
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
    })
  },
  crm: {
    fields: 'week_start,week_end,total_hours,paid_hours,trial_hours,free_hours,avg_hours_per_tenant,avg_hours_per_user,total_tenants,paid_tenants,wow_hours_change_pct,top_tenants,low_tenants',
    headers: { 'Accept-Profile': 'crm' },
    transform: (row) => ({
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
    })
  }
}

module.exports = async function handler(req, res) {
  const corsResult = setupCORSAndOptions(req, res, 'GET')
  if (corsResult) return corsResult

  if (req.method !== 'GET') {
    return sendErrorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed')
  }

  const product = req.query.product || 'os'

  try {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      return res.json({ data: [], product })
    }

    const schema = PRODUCT_SCHEMAS[product]
    if (!schema) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      return res.json({ data: [], product, note: 'No weekly data for this product yet' })
    }

    const raw = await supabaseWithTimeout(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, `/weekly_usage_snapshots?select=${schema.fields}&order=week_start.asc&limit=16`, '/api/weekly-usage', schema.headers)
    if (!Array.isArray(raw)) {
      return sendErrorResponse(res, 500, 'SUPABASE_HTTP', 'Failed to fetch weekly usage data', { product })
    }

    const data = raw.map(schema.transform)
    res.setHeader('Cache-Control', 'public, max-age=300')
    return res.json({ data, product })

  } catch (err) {
    return sendErrorResponse(res, 500, err.name || 'HANDLER_ERROR', 'Failed to fetch weekly usage data', { message: err.message, product })
  }
}
