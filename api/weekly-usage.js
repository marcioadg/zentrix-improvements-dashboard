// /api/weekly-usage.js
const { logError } = require('../utils/slack.js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const FETCH_TIMEOUT = 8000
const ALLOWED_ORIGINS = ['https://zentrix-improvements-dashboard.vercel.app']

module.exports = async function handler(req, res) {
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res.status(200).end()
  }

  const product = req.query.product || 'os'  // os | insights | crm | agents

  try {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      return res.json({ data: [], product })
    }

    // ── OS (public schema) ────────────────────────────────────────────────────
    if (product === 'os') {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/weekly_usage_snapshots?select=*&order=week_start.asc&limit=16`,
          {
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          }
        )
        if (!response.ok) {
          const err = await response.text()
          logError('/api/weekly-usage', 'SUPABASE_HTTP', 'weekly_usage_snapshots (os) fetch failed', { status: response.status, product: 'os' })
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
          return res.json({ data: [], product, error: err })
        }
        const data = await response.json()
        res.setHeader('Cache-Control', 'public, max-age=300')
        return res.json({ data, product })
      } finally {
        clearTimeout(timeout)
      }
    }

    // ── Insights schema ───────────────────────────────────────────────────────
    if (product === 'insights') {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/weekly_usage_snapshots?select=week_start,week_end,total_hours,paid_hours,trial_hours,free_hours,avg_hours_per_user,total_users,paid_users,wow_hours_change_pct,top_users&order=week_start.asc&limit=16`,
          {
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Accept-Profile': 'insights'
            },
            signal: controller.signal
          }
        )
        if (!response.ok) {
          const err = await response.text()
          logError('/api/weekly-usage', 'SUPABASE_HTTP', 'weekly_usage_snapshots (insights) fetch failed', { status: response.status, product: 'insights' })
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
          return res.json({ data: [], product, error: err })
        }
        const raw = await response.json()
        // Normalize to common format: map total_users (not total_companies)
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
      } finally {
        clearTimeout(timeout)
      }
    }

    // ── CRM schema ────────────────────────────────────────────────────────────
    if (product === 'crm') {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/weekly_usage_snapshots?select=week_start,week_end,total_hours,paid_hours,trial_hours,free_hours,avg_hours_per_tenant,avg_hours_per_user,total_tenants,paid_tenants,wow_hours_change_pct,top_tenants,low_tenants&order=week_start.asc&limit=16`,
          {
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Accept-Profile': 'crm'
            },
            signal: controller.signal
          }
        )
        if (!response.ok) {
          const err = await response.text()
          logError('/api/weekly-usage', 'SUPABASE_HTTP', 'weekly_usage_snapshots (crm) fetch failed', { status: response.status, product: 'crm' })
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
          return res.json({ data: [], product, error: err })
        }
        const raw = await response.json()
        // Normalize to common format: map total_tenants as company equivalent
        const data = raw.map(row => ({
          week_start: row.week_start,
          week_end: row.week_end,
          total_hours: row.total_hours,
          paid_hours: row.paid_hours,
          trial_hours: row.trial_hours,
          free_hours: row.free_hours,
          avg_hours_per_tenant: row.avg_hours_per_tenant,
          avg_hours_per_user: row.avg_hours_per_user,
          total_tenants: row.total_tenants,       // company equivalent
          total_companies: row.total_tenants,     // alias for UI compatibility
          paid_tenants: row.paid_tenants,
          wow_hours_change_pct: row.wow_hours_change_pct,
          top_tenants: row.top_tenants,
          low_tenants: row.low_tenants,
        }))
        res.setHeader('Cache-Control', 'public, max-age=300')
        return res.json({ data, product })
      } finally {
        clearTimeout(timeout)
      }
    }

    // ── Agents or other unknown products ─────────────────────────────────────
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res.json({ data: [], product, note: 'No weekly data for this product yet' })

  } catch (err) {
    if (err.name === 'AbortError') {
      logError('/api/weekly-usage', 'SUPABASE_TIMEOUT', 'supabase request timed out', { timeout: FETCH_TIMEOUT, product })
    } else {
      logError('/api/weekly-usage', err.name || 'HANDLER_ERROR', 'handler error', { message: err.message })
    }
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res.json({ data: [], product, error: err.message })
  }
}
