const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bprlchkedecbyoaqlbfz.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_SECRET_KEY_NEW = process.env.STRIPE_SECRET_KEY_NEW

const ALLOWED_ORIGINS = ['https://zentrix-improvements-dashboard.vercel.app']

const PRODUCT_NAMES = {
  // New Stripe account
  'prod_UIcJaRWyvLj3hG': 'Zentrix OS',
  'prod_UIXWsz46FekvcE': 'Zentrix CRM',
  'prod_UIF93vwI9NzXpI': 'Zentrix Insights',
  // Old Stripe account
  'prod_T85Mmg99NDMaWP': 'Zentrix OS',
  'prod_TU0tjFz2jR0OYg': 'Zentrix Insights',
  'prod_T4vLmff0Cdl34d': 'Zentrix OS'
}

const ALL_PRODUCTS = ['Zentrix OS', 'Zentrix Insights', 'Zentrix CRM', 'Zentrix Agents']

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
    default: return new Date(now - 7*24*60*60*1000)
  }
}

function calcSubMRR(sub) {
  let mrr = 0
  for (const item of sub.items?.data || []) {
    const price = item.price
    if (!price?.unit_amount) continue
    const qty = item.quantity || 1
    const amount = (price.unit_amount / 100) * qty
    const interval = price.recurring?.interval
    if (interval === 'month') mrr += amount
    else if (interval === 'year') mrr += amount / 12
    else if (interval === 'week') mrr += amount * 4.33
  }
  return mrr
}

function getSubProducts(sub) {
  const names = new Set()
  for (const item of sub.items?.data || []) {
    const productId = item.price?.product
    if (productId && PRODUCT_NAMES[productId]) {
      names.add(PRODUCT_NAMES[productId])
    }
  }
  return names
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
    productBreakdown: null,
    productMRR: null,
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
      }
    }
  } catch (err) {
    console.error('Supabase metrics error:', err.message)
  }

  // ── Stripe ──
  const stripeKeys = [STRIPE_SECRET_KEY, STRIPE_SECRET_KEY_NEW].filter(Boolean)

  if (stripeKeys.length > 0) {
    let totalMRR = 0
    const paidCustomers = new Set()
    const newCustomers = new Set()
    const productCustomers = {}

    // Per-product MRR: current and at period start
    const productCurrentMRR = {}
    const productStartMRR = {}
    // Per-product churn and new customers (for period)
    const productChurnedCustomers = {}  // customers who cancelled within period
    const productStartCustomers = {}    // customers active at period start (denominator for churn)
    const productNewCustomers = {}      // new paying customers in period
    for (const p of ALL_PRODUCTS) {
      productCurrentMRR[p] = 0
      productStartMRR[p] = 0
      productChurnedCustomers[p] = new Set()
      productStartCustomers[p] = new Set()
      productNewCustomers[p] = new Set()
    }

    for (const stripeKey of stripeKeys) {
      const keyTag = stripeKey.slice(-8)

      // ── Fetch ALL subscriptions (status=all) for full MRR picture ──
      try {
        let hasMore = true
        let startingAfter = undefined
        while (hasMore) {
          const params = new URLSearchParams({ limit: '100', status: 'all' })
          if (startingAfter) params.append('starting_after', startingAfter)
          const response = await fetch(`https://api.stripe.com/v1/subscriptions?${params}`, {
            headers: { 'Authorization': `Bearer ${stripeKey}` }
          })
          if (!response.ok) { console.error('Stripe error:', await response.text()); break }
          const data = await response.json()

          for (const sub of data.data) {
            const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
            const createdAt = sub.created || 0
            const canceledAt = sub.canceled_at || null
            const endedAt = sub.ended_at || null
            const subProducts = getSubProducts(sub)
            const subMRR = calcSubMRR(sub)

            // Is this sub currently active?
            const isCurrentlyActive = sub.status === 'active'

            // Was this sub active at period start?
            const wasActiveAtStart =
              createdAt < periodStartUnix &&
              (canceledAt === null || canceledAt > periodStartUnix) &&
              (endedAt === null || endedAt > periodStartUnix)

            // Was this sub created during the period (new customer)?
            const isNewInPeriod = createdAt >= periodStartUnix && isCurrentlyActive

            // Did this sub churn during the period?
            const churnedInPeriod =
              canceledAt !== null &&
              canceledAt >= periodStartUnix

            if (isCurrentlyActive) {
              totalMRR += subMRR
              if (customerId) paidCustomers.add(keyTag + ':' + customerId)
              for (const name of subProducts) {
                const share = subProducts.size > 0 ? subMRR / subProducts.size : 0
                productCurrentMRR[name] = (productCurrentMRR[name] || 0) + share
              }
              for (const name of subProducts) {
                if (!productCustomers[name]) productCustomers[name] = new Set()
                if (customerId) productCustomers[name].add(keyTag + ':' + customerId)
              }
            }

            if (wasActiveAtStart) {
              for (const name of subProducts) {
                const share = subProducts.size > 0 ? subMRR / subProducts.size : 0
                productStartMRR[name] = (productStartMRR[name] || 0) + share
                if (customerId) productStartCustomers[name].add(keyTag + ':' + customerId)
              }
            }

            if (isNewInPeriod) {
              for (const name of subProducts) {
                if (customerId) productNewCustomers[name].add(keyTag + ':' + customerId)
              }
            }

            if (churnedInPeriod) {
              for (const name of subProducts) {
                if (customerId) productChurnedCustomers[name].add(keyTag + ':' + customerId)
              }
            }
          }

          hasMore = data.has_more
          if (hasMore && data.data.length > 0) startingAfter = data.data[data.data.length - 1].id
          else hasMore = false
        }
      } catch (err) { console.error('Stripe all-subs error:', err.message) }

      // ── New subscriptions in period (for newPayingCustomers) ──
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

    // Convert productCustomers Sets → counts
    const productCounts = {}
    for (const [name, set] of Object.entries(productCustomers)) {
      productCounts[name] = set.size
    }

    // Build productMRR response
    const productMRR = {}
    const convRate = results.totalAccounts > 0
      ? Math.round((paidCustomers.size / results.totalAccounts) * 1000) / 10  // e.g. 3.9
      : null

    for (const p of ALL_PRODUCTS) {
      const current = Math.round((productCurrentMRR[p] || 0) * 100) / 100
      const start = productStartMRR[p] || 0
      let growth = null
      if (start > 0) {
        growth = Math.round(((current - start) / start) * 100 * 10) / 10
      }

      // Churn rate = churned in period / active at period start
      const churned = productChurnedCustomers[p].size
      const startCount = productStartCustomers[p].size
      const churnRate = startCount > 0
        ? Math.round((churned / startCount) * 1000) / 10  // e.g. 2.5 = 2.5%
        : null

      const newCount = productNewCustomers[p].size

      productMRR[p] = { mrr: current, growth, churnRate, newCustomers: newCount, convRate }
    }

    results.mrr = Math.round(totalMRR * 100) / 100
    results.totalPaidAccounts = paidCustomers.size
    results.newPayingCustomers = newCustomers.size
    results.productBreakdown = Object.keys(productCounts).length > 0 ? productCounts : null
    results.productMRR = productMRR
    results.convRate = convRate
    results.source = results.totalAccounts != null ? 'live' : 'partial'
  }

  res.json(results)
}
