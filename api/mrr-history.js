const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_SECRET_KEY_NEW = process.env.STRIPE_SECRET_KEY_NEW

const ALLOWED_ORIGINS = ['https://zentrix-improvements-dashboard.vercel.app']

async function fetchAllSubscriptions(stripeKey) {
  const subs = []
  let hasMore = true
  let startingAfter = undefined

  while (hasMore) {
    const params = new URLSearchParams({ limit: '100', status: 'all' })
    if (startingAfter) params.append('starting_after', startingAfter)

    const response = await fetch(`https://api.stripe.com/v1/subscriptions?${params}`, {
      headers: { 'Authorization': `Bearer ${stripeKey}` }
    })

    if (!response.ok) {
      console.error('Stripe fetch error:', await response.text())
      break
    }

    const data = await response.json()
    subs.push(...data.data)
    hasMore = data.has_more
    if (hasMore && data.data.length > 0) {
      startingAfter = data.data[data.data.length - 1].id
    } else {
      hasMore = false
    }
  }

  return subs
}

function calcMonthMRR(subscriptions, monthStart, monthEnd) {
  let mrr = 0
  for (const sub of subscriptions) {
    const subStart = sub.created
    const subEnd = sub.canceled_at || sub.ended_at || Number.MAX_SAFE_INTEGER

    // Was this subscription active at any point during the month?
    if (subStart > monthEnd || subEnd < monthStart) continue

    for (const item of sub.items.data) {
      const price = item.price
      if (!price || !price.unit_amount) continue
      const quantity = item.quantity || 1
      const amount = (price.unit_amount / 100) * quantity
      const interval = price.recurring?.interval
      if (interval === 'month') mrr += amount
      else if (interval === 'year') mrr += amount / 12
      else if (interval === 'week') mrr += amount * 4.33
    }
  }
  return Math.round(mrr * 100) / 100
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

  const stripeKeys = [STRIPE_SECRET_KEY, STRIPE_SECRET_KEY_NEW].filter(Boolean)

  if (stripeKeys.length === 0) {
    // Return placeholder data
    const now = new Date()
    const history = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      history.push({
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        year: d.getFullYear(),
        date: d.toISOString().substring(0, 7),
        mrr: null
      })
    }
    return res.json({ history, source: 'placeholder' })
  }

  // Fetch all subscriptions from all Stripe accounts
  const allSubs = []
  for (const key of stripeKeys) {
    try {
      const subs = await fetchAllSubscriptions(key)
      allSubs.push(...subs)
    } catch (err) {
      console.error('Error fetching from Stripe:', err.message)
    }
  }

  // Calculate MRR for trailing 12 months
  const now = new Date()
  const history = []

  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStart = Math.floor(monthDate.getTime() / 1000)
    const monthEnd = Math.floor(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59).getTime() / 1000)

    const mrr = calcMonthMRR(allSubs, monthStart, monthEnd)

    history.push({
      month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
      year: monthDate.getFullYear(),
      date: monthDate.toISOString().substring(0, 7),
      mrr
    })
  }

  res.json({ history, source: 'live' })
}
