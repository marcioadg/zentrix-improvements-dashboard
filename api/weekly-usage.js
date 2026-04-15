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
    // weekly_usage_snapshots exists for OS; for other products return empty for now
    if (product !== 'os') {
      return res.json({ data: [], product, note: 'No weekly data for this product yet' })
    }
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
      console.error('weekly_usage_snapshots error:', err)
      return res.json({ data: [], product, error: err })
    }
    const data = await response.json()
    return res.json({ data, product })
  } catch (err) {
    console.error('weekly-usage handler error:', err.message)
    return res.json({ data: [], product, error: err.message })
  }
}
