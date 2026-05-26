const { logError, FETCH_TIMEOUT } = require('../utils/slack.js')

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_SECRET_KEY_NEW = process.env.STRIPE_SECRET_KEY_NEW

function validateStripeResponse(data) {
  return data && typeof data === 'object' && Array.isArray(data.data) && typeof data.has_more === 'boolean'
}

async function fetchAllSubscriptions(stripeKey) {
  const subs = []
  let hasMore = true
  let startingAfter = undefined

  while (hasMore) {
    const params = new URLSearchParams({ limit: '100', status: 'all' })
    if (startingAfter) params.append('starting_after', startingAfter)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
    try {
      const response = await fetch(`https://api.stripe.com/v1/subscriptions?${params}`, {
        headers: { 'Authorization': `Bearer ${stripeKey}` },
        signal: controller.signal
      })

      if (!response.ok) {
        logError('/api/mrr-history', 'STRIPE_HTTP', 'subscriptions fetch failed', { status: response.status })
        break
      }

      const data = await response.json()
      if (!validateStripeResponse(data)) {
        logError('/api/mrr-history', 'STRIPE_INVALID', 'subscriptions response validation failed')
        break
      }

      for (const sub of data.data) {
        if (sub && typeof sub === 'object' && Array.isArray(sub.items?.data)) {
          subs.push(sub)
        }
      }

      hasMore = data.has_more
      if (hasMore && data.data.length > 0) {
        startingAfter = data.data[data.data.length - 1].id
      } else {
        hasMore = false
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        logError('/api/mrr-history', 'STRIPE_TIMEOUT', 'subscriptions request timed out', { timeout: FETCH_TIMEOUT })
      } else {
        logError('/api/mrr-history', err.name || 'STRIPE_ERROR', 'subscriptions request failed', { message: err.message })
      }
      break
    } finally {
      clearTimeout(timeout)
    }
  }

  return subs
}

function calcMonthMRR(subscriptions, monthStart, monthEnd) {
  let mrr = 0
  for (const sub of subscriptions) {
    if (!sub || typeof sub !== 'object') continue
    const subStart = sub.created || 0
    const subEnd = sub.canceled_at || sub.ended_at || Number.MAX_SAFE_INTEGER

    if (subStart > monthEnd || subEnd < monthStart) continue

    const items = sub.items?.data || []
    for (const item of items) {
      if (!item || typeof item !== 'object') continue
      const price = item.price
      if (!price || typeof price !== 'object' || !price.unit_amount) continue
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

module.exports = async function handler(req, res) {
  const origin = req.headers.origin
  if (origin && (origin.startsWith('http://localhost:') || origin.endsWith('.vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res.status(200).end()
  }
  if (req.method !== 'GET') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res.status(405).json({ error: 'Method not allowed' })
  }

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
    res.setHeader('Cache-Control', 'public, max-age=300')
    return res.json({ history, source: 'placeholder' })
  }

  // Fetch all subscriptions from all Stripe accounts
  const allSubs = []
  for (const key of stripeKeys) {
    try {
      const subs = await fetchAllSubscriptions(key)
      allSubs.push(...subs)
    } catch (err) {
      logError('/api/mrr-history', err.name || 'STRIPE_ERROR', 'failed to fetch subscriptions', { message: err.message })
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

  res.setHeader('Cache-Control', 'public, max-age=300')
  return res.json({ history, source: 'live' })
}
