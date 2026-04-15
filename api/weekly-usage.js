// /api/weekly-usage.js
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bprlchkedecbyoaqlbfz.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ALLOWED_ORIGINS = ['https://zentrix-improvements-dashboard.vercel.app']

async function fetchWeeklySnapshots(product) {
  const baseHeaders = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  }

  if (product === 'os') {
    // OS uses the public schema (default)
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/weekly_usage_snapshots?select=*&order=week_start.asc&limit=16`,
      { headers: baseHeaders }
    )
    if (!response.ok) {
      const err = await response.text()
      throw new Error(`OS weekly_usage_snapshots error: ${err}`)
    }
    return response.json()
  }

  if (product === 'insights') {
    // Insights uses the insights schema via Accept-Profile header
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/weekly_usage_snapshots?select=*&order=week_start.asc&limit=16`,
      {
        headers: {
          ...baseHeaders,
          'Accept-Profile': 'insights'
        }
      }
    )
    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Insights weekly_usage_snapshots error: ${err}`)
    }
    return response.json()
  }

  if (product === 'crm') {
    // CRM uses the crm schema via Accept-Profile header
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/weekly_usage_snapshots?select=*&order=week_start.asc&limit=16`,
      {
        headers: {
          ...baseHeaders,
          'Accept-Profile': 'crm'
        }
      }
    )
    if (!response.ok) {
      const err = await response.text()
      throw new Error(`CRM weekly_usage_snapshots error: ${err}`)
    }
    return response.json()
  }

  // agents or other products — not yet implemented
  return []
}

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

    const data = await fetchWeeklySnapshots(product)
    return res.json({ data, product })
  } catch (err) {
    console.error('weekly-usage handler error:', err.message)
    return res.json({ data: [], product, error: err.message })
  }
}
