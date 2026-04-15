// /api/product-accounts.js
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

  const product = req.query.product || 'os'

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return res.json({ accounts: [], product })
  }

  try {
    let accounts = []

    if (product === 'os') {
      // Join companies with company_subscriptions and company_members count
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/companies?select=id,name,created_at,company_subscriptions(subscribed,subscription_tier,stripe_customer_id,user_count,created_at)&order=created_at.desc&limit=100`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      )
      if (resp.ok) {
        const data = await resp.json()
        accounts = data.map(c => ({
          id: c.id,
          name: c.name,
          created_at: c.created_at,
          users: c.company_subscriptions?.[0]?.user_count || 0,
          subscription_tier: c.company_subscriptions?.[0]?.subscription_tier || 'Free',
          subscribed: c.company_subscriptions?.[0]?.subscribed || false,
          teams: null,
          usage_7d: null
        }))
      }
    } else if (product === 'insights') {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/companies?select=id,name,created_at&order=created_at.desc&limit=100`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      )
      if (resp.ok) {
        const data = await resp.json()
        accounts = data.map(c => ({
          id: c.id,
          name: c.name,
          created_at: c.created_at,
          users: null,
          subscription_tier: 'Unknown',
          subscribed: false,
          teams: null,
          usage_7d: null
        }))
      }
    } else if (product === 'crm') {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/companies?select=id,name,created_at,company_status,tier&order=created_at.desc&limit=100`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      )
      if (resp.ok) {
        const data = await resp.json()
        accounts = data.map(c => ({
          id: c.id,
          name: c.name,
          created_at: c.created_at,
          users: null,
          subscription_tier: c.tier || 'Unknown',
          subscribed: false,
          company_status: c.company_status,
          teams: null,
          usage_7d: null
        }))
      }
    }

    return res.json({ accounts, product })
  } catch (err) {
    console.error('product-accounts error:', err.message)
    return res.json({ accounts: [], product, error: err.message })
  }
}
