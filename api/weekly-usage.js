// /api/weekly-usage.js
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bprlchkedecbyoaqlbfz.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ALLOWED_ORIGINS = ['https://zentrix-improvements-dashboard.vercel.app']

export default async function handler(req, res) {
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const product = req.query.product || 'os'  // os | insights | crm | agents

  try {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return res.json({ data: [], product })
    }

    // ── OS (public schema) ────────────────────────────────────────────────────
    if (product === 'os') {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/weekly_usage_snapshots?select=*&order=week_start.asc&limit=16`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      )
      if (!response.ok) {
        const err = await response.text()
        console.error('weekly_usage_snapshots (os) error:', err)
        return res.json({ data: [], product, error: err })
      }
      const data = await response.json()
      return res.json({ data, product })
    }

    // ── Insights schema ───────────────────────────────────────────────────────
    if (product === 'insights') {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/weekly_usage_snapshots?select=week_start,week_end,total_hours,paid_hours,trial_hours,free_hours,avg_hours_per_user,total_users,paid_users,wow_hours_change_pct,top_users&order=week_start.asc&limit=16`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Accept-Profile': 'insights'
          }
        }
      )
      if (!response.ok) {
        const err = await response.text()
        console.error('weekly_usage_snapshots (insights) error:', err)
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
      return res.json({ data, product })
    }

    // ── CRM schema ────────────────────────────────────────────────────────────
    if (product === 'crm') {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/weekly_usage_snapshots?select=week_start,week_end,total_hours,paid_hours,trial_hours,free_hours,avg_hours_per_tenant,avg_hours_per_user,total_tenants,paid_tenants,wow_hours_change_pct,top_tenants,low_tenants&order=week_start.asc&limit=16`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Accept-Profile': 'crm'
          }
        }
      )
      if (!response.ok) {
        const err = await response.text()
        console.error('weekly_usage_snapshots (crm) error:', err)
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
      return res.json({ data, product })
    }

    // ── Agents or other unknown products ─────────────────────────────────────
    return res.json({ data: [], product, note: 'No weekly data for this product yet' })

  } catch (err) {
    console.error('weekly-usage handler error:', err.message)
    return res.json({ data: [], product, error: err.message })
  }
}
