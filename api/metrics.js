const { logError, FETCH_TIMEOUT, sendErrorResponse, requireMethod, PRODUCT_NAMES, getPeriodStart, calcSubMRR, fetchWithTimeoutDeadline, supabaseWithTimeout } = require('../utils/slack.js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_SECRET_KEY_NEW = process.env.STRIPE_SECRET_KEY_NEW

const ALL_PRODUCTS = ['Zentrix OS', 'Zentrix Insights', 'Zentrix CRM', 'Zentrix Agents']

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

module.exports = async function handler(req, res) {
  const methodCheck = requireMethod(req, res, 'GET')
  if (methodCheck) return methodCheck

  try {
    const GLOBAL_TIMEOUT = 45000 // 45s deadline before returning partial results
    const deadline = Date.now() + GLOBAL_TIMEOUT
    const isDeadlineExceeded = () => Date.now() > deadline

    const period = req.query.period || '7d'
    // Opt-out of the "internal / testing" exclusion (default: exclude). When the UI
    // toggle is on, includeInternal=1 keeps internal/test companies in the OS counts.
    const includeInternal = req.query.includeInternal === '1' || req.query.includeInternal === 'true'
    // OS paid count derived from company_subscriptions (canonical rule), used to
    // override the raw Stripe "active" count which over-counts same-day-lapsed and
    // out-of-sync subscriptions. null = not computed (fall back to Stripe).
    let osCanonicalPaidCount = null
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
    if (SUPABASE_SERVICE_ROLE_KEY && !isDeadlineExceeded()) {
      const response = await fetchWithTimeoutDeadline(
        `${SUPABASE_URL}/rest/v1/platform_analytics_snapshots?select=snapshot_date,total_companies,paid_companies,total_users&order=snapshot_date.desc&limit=1`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          }
        },
        deadline,
        { route: '/api/metrics', code: 'SUPABASE', message: 'platform analytics fetch failed' }
      )
      if (response && response.ok) {
        const data = await response.json()
        const snapshot = data[0]
        if (snapshot) {
          results.totalAccounts = snapshot.total_users
          results.lastUpdated = snapshot.snapshot_date
        }
      }

      // Per-product account counts
      const productAccountCounts = {}
      const productTables = {
        'Zentrix OS': 'company_subscriptions',
        'Zentrix Insights': 'subscribers',
        'Zentrix CRM': 'companies'
      }
      for (const [product, table] of Object.entries(productTables)) {
        if (isDeadlineExceeded()) break
        try {
          const countResp = await fetchWithTimeoutDeadline(
            `${SUPABASE_URL}/rest/v1/${table}?select=id`,
            {
              method: 'HEAD',
              headers: {
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Prefer': 'count=exact'
              }
            },
            deadline,
            { route: '/api/metrics', code: 'SUPABASE', message: `product account count for ${product}` }
          )
          if (countResp && countResp.ok) {
            const contentRange = countResp.headers.get('content-range')
            // content-range format: "0-24/356" — we want the total after "/"
            if (contentRange) {
              const total = parseInt(contentRange.split('/')[1], 10)
              if (!isNaN(total)) productAccountCounts[product] = total
            }
          }
        } catch (e) {
          logError('/api/metrics', e.name || 'SUPABASE_ERROR', `product account count for ${product} failed`, { message: e.message })
        }
      }
      // Apply the Super Admin "internal / testing" exclusion list to the OS account
      // base (the conversion-rate denominator), so it counts only real accounts.
      if (!isDeadlineExceeded() && !includeInternal) {
        try {
          const [filterRows, osRows] = await Promise.all([
            supabaseWithTimeout(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, `/saved_company_filters?select=name,filter_data&limit=50`, '/api/metrics'),
            supabaseWithTimeout(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, `/company_subscriptions?select=company_id&limit=2000`, '/api/metrics')
          ])
          const match = Array.isArray(filterRows) ? filterRows.find(f => f.name === 'internal / testing') : null
          const excludedIds = new Set(match?.filter_data?.excludedCompanyIds || [])
          if (excludedIds.size > 0 && Array.isArray(osRows)) {
            productAccountCounts['Zentrix OS'] = osRows.filter(r => !excludedIds.has(r.company_id)).length
          }
        } catch (e) {
          logError('/api/metrics', e.name || 'SUPABASE_ERROR', 'exclusion filter apply failed', { message: e.message })
        }
      }
      // Count OS paid accounts from company_subscriptions using the canonical rule —
      // Premium + subscribed + active Stripe period + not cancelled + not scheduled to
      // cancel at period end + (not internal/test unless includeInternal). Matches the
      // OS admin dashboard and avoids over-counting subscriptions that are still
      // "active" in Stripe but lapsed, out-of-sync, or on their way out.
      if (!isDeadlineExceeded()) {
        try {
          const nowIso = new Date().toISOString()
          const [paidRows, itRows] = await Promise.all([
            supabaseWithTimeout(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, `/company_subscriptions?select=company_id&subscription_tier=eq.Premium&subscribed=is.true&cancelled_at=is.null&cancel_at_period_end=is.false&stripe_current_period_end=gt.${encodeURIComponent(nowIso)}&limit=2000`, '/api/metrics'),
            includeInternal ? null : supabaseWithTimeout(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, `/customer_success_tracking?select=company_id&account_stage=in.(${encodeURIComponent('"Internal Company","Test Company"')})&limit=2000`, '/api/metrics')
          ])
          if (Array.isArray(paidRows)) {
            const itIds = new Set(Array.isArray(itRows) ? itRows.map(r => r.company_id) : [])
            osCanonicalPaidCount = paidRows.filter(r => !itIds.has(r.company_id)).length
          }
        } catch (e) {
          logError('/api/metrics', e.name || 'SUPABASE_ERROR', 'OS canonical paid count failed', { message: e.message })
        }
      }
      results.productAccountCounts = productAccountCounts
    }
  } catch (err) {
    logError('/api/metrics', err.name || 'SUPABASE_ERROR', 'product accounts fetch failed', { message: err.message })
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
        while (hasMore && !isDeadlineExceeded()) {
          const params = new URLSearchParams({ limit: '100', status: 'all' })
          if (startingAfter) params.append('starting_after', startingAfter)
          const response = await fetchWithTimeoutDeadline(
            `https://api.stripe.com/v1/subscriptions?${params}`,
            { headers: { 'Authorization': `Bearer ${stripeKey}` } },
            deadline,
            { route: '/api/metrics', code: 'STRIPE', message: 'subscriptions fetch failed' }
          )
          if (!response || !response.ok) {
            if (response) logError('/api/metrics', 'STRIPE_HTTP', 'subscriptions fetch failed', { status: response.status })
            break
          }
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
      } catch (err) { logError('/api/metrics', err.name === 'AbortError' ? 'STRIPE_TIMEOUT' : 'STRIPE_ERROR', 'subscriptions request failed', { message: err.message }) }

      // ── New subscriptions in period (for newPayingCustomers) ──
      try {
        let hasMore = true
        let startingAfter = undefined
        while (hasMore && !isDeadlineExceeded()) {
          const params = new URLSearchParams({ limit: '100', status: 'active', 'created[gte]': String(periodStartUnix) })
          if (startingAfter) params.append('starting_after', startingAfter)
          const response = await fetchWithTimeoutDeadline(
            `https://api.stripe.com/v1/subscriptions?${params}`,
            { headers: { 'Authorization': `Bearer ${stripeKey}` } },
            deadline,
            { route: '/api/metrics', code: 'STRIPE', message: 'new subscriptions fetch failed' }
          )
          if (!response || !response.ok) {
            if (response) logError('/api/metrics', 'STRIPE_HTTP', 'new subscriptions fetch failed', { status: response.status })
            break
          }
          const data = await response.json()
          for (const sub of data.data) {
            const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
            if (customerId) newCustomers.add(keyTag + ':' + customerId)
          }
          hasMore = data.has_more
          if (hasMore && data.data.length > 0) startingAfter = data.data[data.data.length - 1].id
          else hasMore = false
        }
      } catch (err) { logError('/api/metrics', err.name === 'AbortError' ? 'STRIPE_TIMEOUT' : 'STRIPE_ERROR', 'new subscriptions request failed', { message: err.message }) }
    }

    // Convert productCustomers Sets → counts
    const productCounts = {}
    for (const [name, set] of Object.entries(productCustomers)) {
      productCounts[name] = set.size
    }
    // Override OS with the canonical company_subscriptions count (see osCanonicalPaidCount).
    const stripeOsPaid = productCustomers['Zentrix OS']?.size || 0
    if (osCanonicalPaidCount != null) productCounts['Zentrix OS'] = osCanonicalPaidCount
    const totalPaidCorrected = osCanonicalPaidCount != null
      ? Math.max(0, paidCustomers.size - stripeOsPaid + osCanonicalPaidCount)
      : paidCustomers.size

    // Build productMRR response
    const productMRR = {}
    // convRate calculated per-product below using productAccountCounts
    const convRate = results.totalAccounts > 0
      ? Math.round((totalPaidCorrected / results.totalAccounts) * 1000) / 10
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

      const productAccounts = results.productAccountCounts?.[p] ?? null
      const productPaidCount = (p === 'Zentrix OS' && osCanonicalPaidCount != null)
        ? osCanonicalPaidCount
        : (productCustomers[p]?.size || 0)
      // Only show conv rate if this product has paying customers OR has a known account count
      // Never fall back to portfolio-level — that would show a misleading % for pre-launch products
      const productConvRate = productAccounts != null && productAccounts > 0
        ? Math.round((productPaidCount / productAccounts) * 1000) / 10
        : (productPaidCount > 0 ? convRate : null)  // null = pre-launch, no conv rate
      productMRR[p] = { mrr: current, growth, churnRate, newCustomers: newCount, convRate: productConvRate }
    }

    results.mrr = Math.round(totalMRR * 100) / 100
    results.totalPaidAccounts = totalPaidCorrected
    results.newPayingCustomers = newCustomers.size
    results.productBreakdown = Object.keys(productCounts).length > 0 ? productCounts : null
    results.productMRR = productMRR
    results.convRate = convRate
    results.source = results.totalAccounts != null ? 'live' : 'partial'
  }

    res.setHeader('Cache-Control', 'public, max-age=300')
    return res.json(results)
  } catch (err) {
    if (!res.headersSent) {
      return sendErrorResponse(res, 500, err.name || 'HANDLER_ERROR', 'Failed to generate metrics', { message: err.message })
    }
  }
}
