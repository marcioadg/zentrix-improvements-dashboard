const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bprlchkedecbyoaqlbfz.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_SECRET_KEY_NEW = process.env.STRIPE_SECRET_KEY_NEW

const ALLOWED_ORIGINS = [
  'https://zentrix-improvements-dashboard.vercel.app'
]

function getPeriodStart(period) {
  const now = new Date()
  switch (period) {
    case 'day':      return new Date(now - 24*60*60*1000)
    case '7d':       return new Date(now - 7*24*60*60*1000)
    case '14d':      return new Date(now - 14*24*60*60*1000)
    case '30d':      return new Date(now - 30*24*60*60*1000)
    case 'month': {
      const d = new Date(now); d.setDate(1); d.setHours(0,0,0,0); return d
    }
    case 'quarter': {
      const d = new Date(now)
      const q = Math.floor(d.getMonth() / 3)
      d.setMonth(q * 3, 1); d.setHours(0,0,0,0); return d
    }
    case 'semester': {
      const d = new Date(now)
      d.setMonth(d.getMonth() < 6 ? 0 : 6, 1); d.setHours(0,0,0,0); return d
    }
    case 'year': {
      const d = new Date(now); d.setMonth(0, 1); d.setHours(0,0,0,0); return d
    }
    default:         return new Date(now - 7*24*60*60*1000)
  }
}

export default async function handler(req, res) {
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const period = req.query.period || '7d'
  const periodStart = getPeriodStart(period)
  const periodStartUnix = Math.floor(periodStart.getTime() / 1000)

  const results = {
    totalAccounts: null,
    totalPaidAccounts: null,
    newPayingCustomers: null,
    mrr: null,
    ventureCount: 3,
    ventures: ['Business OS', 'Insights', 'CRM'],
    period,
    source: 'partial',
    lastUpdated: null
  }

  // ── Supabase: Total Accounts ──
  try {
    if (SUPABASE_SERVICE_ROLE_KEY) {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/platform_analytics_snapshots?select=snapshot_date,total_companies,paid_companies,total_users&order=snapshot_date.desc&limit=1`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      )
      if (response.ok) {
        const data = await response.json()
        const snapshot = data[0]
        if (snapshot) {
          results.totalAccounts = snapshot.total_users
          results.lastUpdated = snapshot.snapshot_date
        }
      } else {
        console.error('Supabase metrics error:', await response.text())
      }
    }
  } catch (err) {
    console.error('Supabase metrics error:', err.message)
  }

  // ── Stripe: MRR + Paid Accounts + New Paying Customers ──
  const stripeKeys = [STRIPE_SECRET_KEY, STRIPE_SECRET_KEY_NEW].filter(Boolean)

  if (stripeKeys.length > 0) {
    let totalMRR = 0
    const paidCustomers = new Set()
    const newCustomers = new Set()

    for (const stripeKey of stripeKeys) {
      const keyTag = stripeKey.slice(-8)

      // ── All active subscriptions (for MRR + total paid) ──
      try {
        let hasMore = true
        let startingAfter = undefined
        while (hasMore) {
          const params = new URLSearchParams({ limit: '100', status: 'active' })
          if (startingAfter) params.append('starting_after', startingAfter)
          const response = await fetch(`https://api.stripe.com/v1/subscriptions?${params}`, {
            headers: { 'Authorization': `Bearer ${stripeKey}` }
          })
          if (!response.ok) { console.error('Stripe error:', await response.text()); break }
          const data = await response.json()
          for (const sub of data.data) {
            const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
            if (customerId) paidCustomers.add(keyTag + ':' + customerId)
            for (const item of sub.items.data) {
              const price = item.price
              if (!price || !price.unit_amount) continue
              const quantity = item.quantity || 1
              const amount = (price.unit_amount / 100) * quantity
              const interval = price.recurring?.interval
              if (interval === 'month') totalMRR += amount
              else if (interval === 'year') totalMRR += amount / 12
              else if (interval === 'week') totalMRR += amount * 4.33
            }
          }
          hasMore = data.has_more
          if (hasMore && data.data.length > 0) startingAfter = data.data[data.data.length - 1].id
          else hasMore = false
        }
      } catch (err) { console.error('Stripe MRR error:', err.message) }

      // ── New subscriptions in period ──
      try {
        let hasMore = true
        let startingAfter = undefined
        while (hasMore) {
          const params = new URLSearchParams({ limit: '100', status: 'active', 'created[gte]': String(periodStartUnix) })
          if (startingAfter) params.append('starting_after', startingAfter)
          const response = await fetch(`https://api.stripe.com/v1/subscriptions?${params}`, {
            headers: { 'Authorization': `Bearer ${stripeKey}` }
          })
          if (!response.ok) { console.error('Stripe new subs error:', await response.text()); break }
          const data = await response.json()
          for (const sub of data.data) {
            const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
            if (customerId) newCustomers.add(keyTag + ':' + customerId)
          }
          hasMore = data.has_more
          if (hasMore && data.data.length > 0) startingAfter = data.data[data.data.length - 1].id
          else hasMore = false
        }
      } catch (err) { console.error('Stripe new customers error:', err.message) }
    }

    results.mrr = Math.round(totalMRR * 100) / 100
    results.totalPaidAccounts = paidCustomers.size
    results.newPayingCustomers = newCustomers.size
    results.source = results.totalAccounts != null ? 'live' : 'partial'
  }

  res.json(results)
}
