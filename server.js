require('dotenv').config()
const express = require('express')
const compression = require('compression')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const { validateCSPHashes } = require('./csp-validator.js')
const {
  SLACK_CHANNEL,
  FETCH_TIMEOUT,
  getClientIP,
  checkRateLimit,
  logError,
  cleanup: cleanupRateLimit,
  handleAction
} = require('./utils/slack.js')

const app = express()
const PORT = process.env.PORT || 3847

// ── Config ──────────────────────────────────────────────────────────────────
const SLACK_TOKEN = process.env.SLACK_TOKEN || ''
const API_KEY = process.env.API_KEY || ''

// Warn on startup if critical env vars are missing
if (!SLACK_TOKEN) {
  console.warn('[WARN] SLACK_TOKEN not set — Slack posting will fail')
}
if (!API_KEY) {
  console.warn('[WARN] API_KEY not set — Protected endpoints will be inaccessible')
}

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(compression())
app.use(cors({
  origin: function(origin, callback) {
    // Allow same-origin requests (no Origin header)
    if (!origin) return callback(null, true)
    // Allow localhost for development
    if (origin.startsWith('http://localhost:')) return callback(null, true)
    // Allow any Vercel preview/production domain
    if (origin.endsWith('.vercel.app')) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  }
}))
app.use(express.json({ limit: '1mb' }))

// Validate Content-Type for request methods that expect JSON
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type']
    if (!contentType || !contentType.includes('application/json')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      return res.status(415).json({ error: 'Content-Type must be application/json' })
    }
  }
  next()
})

// Load and initialize index.html, CSP hashes, and cache (single read operation)
const { _scriptHashes, _styleHash, _indexCache } = (() => {
  try {
    const content = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8')

    // Compute all script hashes (multiple inline scripts supported)
    const scriptMatches = content.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || []
    if (scriptMatches.length === 0) {
      throw new Error('No inline scripts found in index.html')
    }
    const scriptHashes = scriptMatches.map(script => {
      const scriptContent = script.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]
      return 'sha256-' + crypto.createHash('sha256').update(scriptContent).digest('base64')
    }).join("' '")

    // Compute CSS hash
    const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/)
    if (!styleMatch || !styleMatch[1]) {
      throw new Error('No inline style found in index.html')
    }
    const styleHash = 'sha256-' + crypto.createHash('sha256').update(styleMatch[1]).digest('base64')

    const etag = generateETag(content)
    return { _scriptHashes: scriptHashes, _styleHash: styleHash, _indexCache: { content, etag } }
  } catch (e) {
    console.error('[ERROR] Failed to initialize index.html:', e.message)
    process.exit(1)
  }
})()

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('X-XSS-Protection', '0')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  res.setHeader('Content-Security-Policy', `default-src 'none'; script-src '${_scriptHashes}'; style-src '${_styleHash}' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://raw.githubusercontent.com https://api.github.com; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`)
  next()
})
// ── CORS & HTTP method validation middleware ────────────────────────────────
// Rate limit CORS preflight OPTIONS to prevent DoS via preflight spam
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin
  if (origin && (origin.startsWith('http://localhost:') || origin.endsWith('.vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key')
  if (req.method === 'OPTIONS') {
    // Apply rate limiting to OPTIONS requests to prevent preflight DoS
    const ip = getClientIP(req)
    const check = checkRateLimit(ip)
    if (!check.allowed) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      return res.status(429).json({ error: check.error })
    }
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res.status(200).end()
  }
  next()
})

// Serve data files with ETag validation for 304 responses (avoid re-downloading unchanged files)
app.use('/data', express.static(path.join(__dirname, 'data'), {
  setHeaders: (res, filePath) => {
    // Generate ETag from file mtime to allow 304 revalidation without body transmission
    const stat = fs.statSync(filePath)
    const etag = generateETag(stat.mtime.getTime().toString())
    res.setHeader('ETag', etag)
    // Allow validation but prevent stale cache on file updates (must revalidate after 24h)
    res.setHeader('Cache-Control', 'public, must-revalidate, max-age=86400')
  }
}))

app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300')
  res.setHeader('ETag', _indexCache.etag)
  if (req.headers['if-none-match'] === _indexCache.etag) {
    return res.status(304).end()
  }
  return res.send(_indexCache.content)
})

// ── Auth middleware ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.key
  if (API_KEY && key === API_KEY) return next()
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  return res.status(401).json({ error: 'Unauthorized' })
}

// ── Validation helpers ──────────────────────────────────────────────────────
function validateAgentsJSON(data) {
  if (!data || typeof data !== 'object') return false
  if (!Array.isArray(data.companies)) return false
  return data.companies.every(c => {
    if (typeof c !== 'object' || !c.id || !c.name) return false
    if (typeof c.id !== 'string' || typeof c.name !== 'string') return false
    if (!Array.isArray(c.agents)) return false
    return c.agents.every(a => {
      if (typeof a !== 'object' || !a.id || !a.name || !a.role) return false
      if (typeof a.id !== 'string' || typeof a.name !== 'string' || typeof a.role !== 'string') return false
      return Array.isArray(a.channels)
    })
  })
}

// ── Rate limiting middleware ──────────────────────────────────────────────
function rateLimit(req, res, next) {
  const ip = getClientIP(req)
  const check = checkRateLimit(ip)
  if (!check.allowed) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res.status(429).json({ error: check.error })
  }
  next()
}


// ── Response caching (10 min TTL for expensive queries) ──
const _metricsCache = { data: null, etag: null, timestamp: 0 }
const METRICS_CACHE_TTL = 600000 // 10 minutes
let _metricsInFlight = null // Deduplicate concurrent requests
const _entriesCache = { data: null, etag: null, timestamp: 0 }
const ENTRIES_CACHE_TTL = 300000 // 5 minutes
const _agentsCache = { data: null, etag: null, timestamp: 0 }
const AGENTS_CACHE_TTL = 60000 // 1 minute

function generateETag(obj) {
  return 'W/"' + crypto.createHash('md5').update(JSON.stringify(obj)).digest('hex') + '"'
}

// Validate Supabase analytics response structure
function validateSupabaseSnapshot(data) {
  if (!Array.isArray(data) || data.length === 0) return null
  const snapshot = data[0]
  if (typeof snapshot !== 'object' || snapshot.total_users == null || !snapshot.snapshot_date) return null
  return snapshot
}

// Validate Stripe subscriptions response structure
function validateStripeSubscriptionsResponse(data) {
  if (typeof data !== 'object' || !Array.isArray(data.data)) return null
  return data
}

// Validate entries array structure for data integrity
function validateEntriesArray(data) {
  if (!Array.isArray(data)) return false
  if (data.length === 0) return true
  return data.every(e => {
    if (typeof e !== 'object' || e === null) return false
    if (typeof e.date !== 'string' || typeof e.repo !== 'string') return false
    if (typeof e.category !== 'string' || typeof e.summary !== 'string') return false
    if (e.score !== undefined && (typeof e.score !== 'number' || e.score < 0 || e.score > 100)) return false
    return true
  })
}

// ── Routes ───────────────────────────────────────────────────────────────────

// Health check (not rate-limited: critical system endpoint for load balancers/monitors)
app.get('/api/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  return res.json({ ok: true, ts: new Date().toISOString() })
})

// ── Metrics endpoint ──────────────────────────────────────────────────────────
app.get('/api/metrics', rateLimit, async (req, res) => {

  const now = Date.now()
  const isCacheValid = _metricsCache.data && (now - _metricsCache.timestamp) < METRICS_CACHE_TTL

  if (isCacheValid) {
    res.setHeader('Cache-Control', 'public, max-age=600')
    res.setHeader('ETag', _metricsCache.etag)
    if (req.headers['if-none-match'] === _metricsCache.etag) {
      return res.status(304).end()
    }
    return res.json(_metricsCache.data)
  }

  // If a fetch is already in flight, wait for it instead of triggering another
  if (_metricsInFlight) {
    try {
      const data = await _metricsInFlight
      res.setHeader('Cache-Control', 'public, max-age=600')
      res.setHeader('ETag', _metricsCache.etag)
      return res.json(data)
    } catch (e) {
      logError('/api/metrics', 'WAIT_ERROR', 'error while waiting for in-flight metrics fetch', { message: e.message })
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      _metricsInFlight = null
      return res.status(500).json({ error: 'Metrics fetch failed — please retry' })
    }
  }

  // Start a new fetch and store the promise so other requests can wait for it
  // Wrap in Promise.race to guarantee timeout even if deadline checks fail
  const METRICS_TIMEOUT = 48000 // 48s: slightly longer than GLOBAL_TIMEOUT (45s) for graceful completion
  const metricsPromise = (async () => {
    const GLOBAL_TIMEOUT = 45000
    const deadline = Date.now() + GLOBAL_TIMEOUT
    const isDeadlineExceeded = () => Date.now() > deadline

    const results = {
      totalAccounts: null,
      totalPaidAccounts: null,
      mrr: null,
      ventureCount: 3,
      ventures: ['Business OS', 'Insights', 'CRM'],
      source: 'partial',
      lastUpdated: null
    }

  // ── Supabase: Total Accounts ──
  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (supabaseUrl && supabaseServiceKey && !isDeadlineExceeded()) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), Math.min(FETCH_TIMEOUT, deadline - Date.now()))
      try {
        const response = await fetch(
          `${supabaseUrl}/rest/v1/platform_analytics_snapshots?select=snapshot_date,total_companies,paid_companies,total_users&order=snapshot_date.desc&limit=1`,
          {
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          }
        )
        if (response.ok) {
          const data = await response.json()
          const snapshot = validateSupabaseSnapshot(data)
          if (snapshot) {
            results.totalAccounts = snapshot.total_users
            results.lastUpdated = snapshot.snapshot_date
          }
        } else {
          logError('/api/metrics', 'SUPABASE_HTTP', `total_accounts fetch failed`, { status: response.status })
        }
      } finally {
        clearTimeout(timeout)
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      logError('/api/metrics', 'SUPABASE_TIMEOUT', 'total_accounts request timed out', { timeout: FETCH_TIMEOUT })
    } else {
      logError('/api/metrics', err.name || 'SUPABASE_ERROR', 'total_accounts request failed', { message: err.message })
    }
  }

  // ── Stripe: MRR + Paid Accounts ──
  const stripeKeys = [
    process.env.STRIPE_SECRET_KEY,
    process.env.STRIPE_SECRET_KEY_NEW
  ].filter(Boolean)

  if (stripeKeys.length > 0 && !isDeadlineExceeded()) {
    let totalMRR = 0
    const paidCustomers = new Set()

    for (const stripeKey of stripeKeys) {
      if (isDeadlineExceeded()) break
      try {
        let hasMore = true
        let startingAfter = undefined

        while (hasMore && !isDeadlineExceeded()) {
          const params = new URLSearchParams({ limit: '100', status: 'active' })
          if (startingAfter) params.append('starting_after', startingAfter)

          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), Math.min(FETCH_TIMEOUT, deadline - Date.now()))
          try {
            const response = await fetch(`https://api.stripe.com/v1/subscriptions?${params}`, {
              headers: {
                'Authorization': `Bearer ${stripeKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              signal: controller.signal
            })

            if (!response.ok) {
              logError('/api/metrics', 'STRIPE_HTTP', 'subscriptions fetch failed', { status: response.status })
              break
            }

            const data = await response.json()
            const validData = validateStripeSubscriptionsResponse(data)
            if (!validData) {
              logError('/api/metrics', 'STRIPE_INVALID', 'subscriptions response missing data array', { status: response.status })
              break
            }

            for (const sub of validData.data) {
              // Track unique paid customers
              const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
              if (customerId) paidCustomers.add(stripeKey + ':' + customerId)

              // Sum MRR
              for (const item of sub.items.data) {
                const price = item.price
                if (!price || !price.unit_amount) continue
                const quantity = item.quantity || 1
                const amount = (price.unit_amount / 100) * quantity
                const interval = price.recurring?.interval
                if (interval === 'month') {
                  totalMRR += amount
                } else if (interval === 'year') {
                  totalMRR += amount / 12
                } else if (interval === 'week') {
                  totalMRR += amount * 4.33
                }
              }
            }

            hasMore = validData.has_more || false
            if (hasMore && validData.data.length > 0) {
              startingAfter = validData.data[validData.data.length - 1].id
            } else {
              hasMore = false
            }
          } finally {
            clearTimeout(timeout)
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          logError('/api/metrics', 'STRIPE_TIMEOUT', 'subscriptions request timed out', { timeout: FETCH_TIMEOUT })
        } else {
          logError('/api/metrics', err.name || 'STRIPE_ERROR', 'subscriptions request failed', { message: err.message })
        }
      }
    }

    results.mrr = Math.round(totalMRR * 100) / 100
    results.totalPaidAccounts = paidCustomers.size
    results.source = results.totalAccounts != null ? 'live' : 'partial'
  }

  // Log data source degradation for monitoring
  if (results.source === 'partial') {
    const missingSource = results.totalAccounts == null ? 'Supabase' : 'Stripe'
    logError('/api/metrics', 'PARTIAL_DATA', `falling back to partial metrics — ${missingSource} data unavailable`, {
      totalAccounts: results.totalAccounts,
      mrr: results.mrr,
      paidAccounts: results.totalPaidAccounts
    })
  }

    _metricsCache.data = results
    _metricsCache.etag = generateETag(results)
    _metricsCache.timestamp = now
    return results
  })()

  _metricsInFlight = Promise.race([
    metricsPromise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Metrics fetch timed out after 48s')), METRICS_TIMEOUT)
    )
  ])

  try {
    const data = await _metricsInFlight
    res.setHeader('Cache-Control', 'public, max-age=600')
    res.setHeader('ETag', _metricsCache.etag)
    return res.json(data)
  } catch (e) {
    logError('/api/metrics', 'FETCH_ERROR', 'error during metrics fetch', { message: e.message })
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res.status(500).json({ error: 'Metrics fetch failed — please retry' })
  } finally {
    _metricsInFlight = null
  }
})

// Agents data — read/write
app.get('/api/agents', rateLimit, requireAuth, (req, res) => {

  const now = Date.now()
  const isCacheValid = _agentsCache.data && (now - _agentsCache.timestamp) < AGENTS_CACHE_TTL

  if (isCacheValid) {
    res.setHeader('Cache-Control', 'public, max-age=60')
    res.setHeader('ETag', _agentsCache.etag)
    if (req.headers['if-none-match'] === _agentsCache.etag) {
      return res.status(304).end()
    }
    return res.json(_agentsCache.data)
  }

  const filePath = path.join(__dirname, 'data', 'agents.json')
  try {
    const data = fs.readFileSync(filePath, 'utf8')
    const agents = JSON.parse(data)
    _agentsCache.data = agents
    _agentsCache.etag = generateETag(agents)
    _agentsCache.timestamp = now
    res.setHeader('Cache-Control', 'public, max-age=60')
    res.setHeader('ETag', _agentsCache.etag)
    return res.json(agents)
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    if (e.code === 'ENOENT') {
      logError('/api/agents', 'FILE_NOT_FOUND', 'agents.json not found', { file: 'agents.json' })
      return res.status(404).json({ error: 'Agents data not found' })
    } else if (e instanceof SyntaxError) {
      logError('/api/agents', 'JSON_PARSE_ERROR', 'invalid agents data format', { message: e.message })
      return res.status(500).json({ error: 'Invalid agents data format' })
    } else {
      logError('/api/agents', e.code || 'READ_ERROR', 'failed to read agents data', { message: e.message })
      return res.status(500).json({ error: 'Failed to read agents data' })
    }
  }
})

app.post('/api/agents', rateLimit, requireAuth, (req, res) => {

  if (!validateAgentsJSON(req.body)) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    logError('/api/agents', 'VALIDATION_ERROR', 'invalid agents data structure', { bodySize: JSON.stringify(req.body).length })
    return res.status(400).json({ error: 'Invalid agents data structure' })
  }
  const filePath = path.join(__dirname, 'data', 'agents.json')
  try {
    fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2))
    _agentsCache.data = null
    _agentsCache.timestamp = 0
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res.json({ ok: true })
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    logError('/api/agents', e.code || 'WRITE_ERROR', 'failed to save agents', { message: e.message })
    return res.status(500).json({ error: 'Failed to save agents' })
  }
})

// Unified action endpoint — matches the Vercel serverless function (api/action.js)
// The client exclusively calls this route for swipe actions and security fix requests
app.post('/api/action', rateLimit, requireAuth, async (req, res) => {

  const ACTION_TIMEOUT = 12000 // 12s: guarantee response even if Slack API hangs
  const actionPromise = handleAction(req, res, SLACK_TOKEN)

  try {
    await Promise.race([
      actionPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Action handler timed out after 12s')), ACTION_TIMEOUT)
      )
    ])
    return
  } catch (err) {
    logError('/api/action', err.name || 'UNHANDLED_ERROR', 'unhandled error in action handler', { message: err.message })
    if (!res.headersSent) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
})

// MRR history endpoint — Stripe subscription history for trailing 12 months
app.get('/api/mrr-history', rateLimit, async (req, res) => {

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

  const stripeKeys = [STRIPE_SECRET_KEY, STRIPE_SECRET_KEY_NEW].filter(Boolean)

  if (stripeKeys.length === 0) {
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

  const allSubs = []
  for (const key of stripeKeys) {
    try {
      const subs = await fetchAllSubscriptions(key)
      allSubs.push(...subs)
    } catch (err) {
      logError('/api/mrr-history', err.name || 'STRIPE_ERROR', 'failed to fetch subscriptions', { message: err.message })
    }
  }

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
})

// Data validation endpoint — allows frontend to verify entries array structure
app.get('/api/validate-entries', rateLimit, (req, res) => {

  const now = Date.now()
  const isCacheValid = _entriesCache.data && (now - _entriesCache.timestamp) < ENTRIES_CACHE_TTL

  if (isCacheValid) {
    const statusCode = _entriesCache.data.ok ? 200 : 400
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.setHeader('ETag', _entriesCache.etag)
    if (req.headers['if-none-match'] === _entriesCache.etag) {
      return res.status(304).end()
    }
    return res.status(statusCode).json(_entriesCache.data)
  }

  const filePath = path.join(__dirname, 'data', 'entries.json')
  try {
    const data = fs.readFileSync(filePath, 'utf8')
    const entries = JSON.parse(data)
    const isValid = validateEntriesArray(entries)
    const cacheData = { ok: isValid, count: entries.length }
    if (!isValid) {
      cacheData.error = 'Entries array contains invalid entries'
    }
    _entriesCache.data = cacheData
    _entriesCache.etag = generateETag(cacheData)
    _entriesCache.timestamp = now
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.setHeader('ETag', _entriesCache.etag)
    const statusCode = isValid ? 200 : 400
    if (!isValid) {
      logError('/api/validate-entries', 'VALIDATION_FAILED', 'entries array structure validation failed', { count: entries.length })
    }
    return res.status(statusCode).json(cacheData)
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    logError('/api/validate-entries', e.code || 'VALIDATION_ERROR', 'failed to validate entries', { message: e.message })
    return res.status(500).json({ ok: false, error: 'Failed to validate entries' })
  }
})

// Weekly usage endpoint — mirrors Vercel Function for local dev testing
app.get('/api/weekly-usage', rateLimit, async (req, res) => {

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const product = req.query.product || 'os'

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
          logError('/api/weekly-usage', 'SUPABASE_HTTP', 'weekly_usage_snapshots (os) fetch failed', { status: response.status, product: 'os' })
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
          return res.json({ data: [], product })
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
          logError('/api/weekly-usage', 'SUPABASE_HTTP', 'weekly_usage_snapshots (insights) fetch failed', { status: response.status, product: 'insights' })
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
          return res.json({ data: [], product })
        }
        const raw = await response.json()
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
          logError('/api/weekly-usage', 'SUPABASE_HTTP', 'weekly_usage_snapshots (crm) fetch failed', { status: response.status, product: 'crm' })
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
          return res.json({ data: [], product })
        }
        const raw = await response.json()
        const data = raw.map(row => ({
          week_start: row.week_start,
          week_end: row.week_end,
          total_hours: row.total_hours,
          paid_hours: row.paid_hours,
          trial_hours: row.trial_hours,
          free_hours: row.free_hours,
          avg_hours_per_tenant: row.avg_hours_per_tenant,
          avg_hours_per_user: row.avg_hours_per_user,
          total_tenants: row.total_tenants,
          total_companies: row.total_tenants,
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
})

// Product accounts endpoint — mirrors Vercel Function for local dev testing
app.get('/api/product-accounts', rateLimit, async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300')

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const product = req.query.product || 'os'

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return res.json({ accounts: [], product })
  }

  const helper = async (path, headers = {}) => {
    const FETCH_TIMEOUT = 8000
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
        headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', ...headers },
        signal: controller.signal
      })
      return r.ok ? r.json() : []
    } catch (e) {
      logError('/api/product-accounts', e.name === 'AbortError' ? 'SUPABASE_TIMEOUT' : 'SUPABASE_ERROR', `request failed for ${path}`, { message: e.message })
      return []
    } finally { clearTimeout(timeout) }
  }

  try {
    if (product !== 'os') {
      const rows = await helper(`/companies?select=id,name,created_at,status&order=created_at.desc&limit=100`)
      return res.json({ accounts: rows.map(c => ({ id: c.id, name: c.name, created_at: c.created_at, status: c.status })), product })
    }

    const [companies, subscriptions, healthRows, usageRows] = await Promise.all([
      helper(`/companies?select=id,name,slug,created_at,status&order=created_at.desc&limit=200`),
      helper(`/company_subscriptions?select=company_id,subscribed,subscription_tier,user_count,base_price_per_user,created_at,trial_end&limit=500`),
      helper(`/customer_success_tracking?select=company_id,customer_health,account_stage,subs_status&limit=500`),
      helper(`/company_usage_stats?select=company_id,stat_date,total_minutes&stat_date=gte.${new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)}&limit=2000`),
    ])

    const subMap = {}, healthMap = {}, usageMap = {}
    subscriptions.forEach(s => { subMap[s.company_id] = s })
    healthRows.forEach(h => { healthMap[h.company_id] = h })
    usageRows.forEach(u => { usageMap[u.company_id] = (usageMap[u.company_id] || 0) + (u.total_minutes || 0) })

    const companyIds = companies.slice(0, 100).map(c => c.id)
    const idList = companyIds.map(id => `"${id}"`).join(',')

    const [members, profiles] = await Promise.all([
      helper(`/company_members?select=user_id,company_id&company_id=in.(${idList})&limit=1000`),
      helper(`/profiles?select=id,last_login_at,first_device_type&limit=2000`)
    ])

    const companyUsersMap = {}, profileMap = {}
    members.forEach(m => { if (!companyUsersMap[m.company_id]) companyUsersMap[m.company_id] = []; companyUsersMap[m.company_id].push(m.user_id) })
    profiles.forEach(p => { profileMap[p.id] = p })

    const representativeUserIds = companyIds.map(cid => (companyUsersMap[cid] || [])[0]).filter(Boolean)
    let attributionMap = {}
    if (representativeUserIds.length > 0) {
      const userIdList = representativeUserIds.slice(0, 100).map(id => `"${id}"`).join(',')
      const attributions = await helper(`/user_attributions?select=user_id,utm_source,utm_medium,utm_campaign,utm_adset,utm_ad,utm_content,utm_term,landing_page_url,referral_source&user_id=in.(${userIdList})&limit=200`)
      const attrByUser = {}
      attributions.forEach(a => { attrByUser[a.user_id] = a })
      companyIds.forEach(cid => { const uid = (companyUsersMap[cid] || [])[0]; if (uid && attrByUser[uid]) attributionMap[cid] = attrByUser[uid] })
    }

    const accounts = companies.map(c => {
      const sub = subMap[c.id] || {}, health = healthMap[c.id] || {}, usageMinutes = usageMap[c.id] || 0, usageHours = +(usageMinutes / 60).toFixed(1), attr = attributionMap[c.id] || {}
      const userIds = companyUsersMap[c.id] || []
      const loginDates = userIds.map(uid => profileMap[uid]?.last_login_at).filter(Boolean).sort()
      const medianLogin = loginDates.length > 0 ? loginDates[Math.floor(loginDates.length / 2)] : null
      const firstUserId = userIds[0], device = firstUserId ? profileMap[firstUserId]?.first_device_type || null : null
      const tier = (sub.subscription_tier || '').trim(), subscribed = sub.subscribed ?? false, cancelled = sub.cancelled_at
      const trialEndDate = sub.trial_end ? new Date(sub.trial_end) : null, now = new Date(), trialExpired = trialEndDate ? trialEndDate < now : false
      let plan, planStatus
      if (cancelled) { plan = 'Cancelled'; planStatus = 'cancelled' }
      else if (tier === 'Premium') { plan = 'Premium'; planStatus = 'paid' }
      else if (tier === 'Free') { plan = 'Free'; planStatus = 'free' }
      else if (tier === 'Trial') { plan = trialExpired ? 'Expired' : 'Trial'; planStatus = trialExpired ? 'expired' : 'trial' }
      else { plan = 'Unknown'; planStatus = 'unknown' }
      const accountStage = health.account_stage || null
      let status
      if (accountStage === 'Active Subscription') status = 'Active'
      else if (accountStage === 'At churn Risk') status = 'Churn Risk'
      else if (accountStage === 'Onboarding') status = 'Onboarding'
      else if (accountStage === 'Test Company') status = 'Test'
      else if (accountStage === 'Internal Company') status = 'Internal'
      else if (accountStage === 'Done') status = 'Done'
      else if (accountStage === 'Free Trial') status = planStatus === 'expired' ? 'Expired' : 'Trial'
      else if (planStatus === 'cancelled') status = 'Cancelled'
      else if (planStatus === 'paid') status = 'Active'
      else if (planStatus === 'trial') status = 'Trial'
      else if (planStatus === 'expired') status = 'Expired'
      else if (planStatus === 'free') status = 'Free'
      else status = null
      return { id: c.id, name: c.name, status, score: health.customer_health || null, plan, planStatus, subscribed, usage_7d_hrs: usageHours, users: sub.user_count ?? null, median_login: medianLogin, created_at: c.created_at, device, utm_source: attr.utm_source || null, utm_medium: attr.utm_medium || null, utm_campaign: attr.utm_campaign || null, utm_content: attr.utm_content || null, utm_term: attr.utm_term || null, utm_adset: attr.utm_adset || null, utm_ad: attr.utm_ad || null, landing_page: attr.landing_page_url || null, referral: attr.referral_source || null }
    })
    return res.json({ accounts, product })
  } catch (e) {
    logError('/api/product-accounts', e.name || 'HANDLER_ERROR', 'handler error', { message: e.message, product })
    return res.json({ accounts: [], product, error: e.message })
  }
})

// Venture funnel endpoint — mirrors Vercel Function for local dev testing
app.get('/api/venture-funnel', rateLimit, async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300')

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const DEFAULT_PRICE = { os: 5, insights: 29, crm: 19, agents: 49 }
  const PRODUCT_TABLE = { os: 'company_subscriptions', insights: 'subscribers', crm: null, agents: null }
  const TRIAL_TIERS = { os: ['Trial'], insights: ['Trial'] }
  const PAID_TIERS = { os: ['Premium'], insights: ['Enterprise', 'Premium', 'Pro'] }

  const product = (req.query.product || 'os').toLowerCase()
  const period = req.query.period || '7d'
  const table = PRODUCT_TABLE[product]
  const defaultPrice = DEFAULT_PRICE[product] || 15

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return res.json({ avgTimeToPaid: null, newSignups: 0, potentialMrr: null, trialCount: 0, product, period })
  }

  if (!table) {
    return res.json({ avgTimeToPaid: null, newSignups: 0, potentialMrr: null, trialCount: 0, product, period, prelaunch: true })
  }

  const getPeriodStart = (p) => {
    const now = new Date()
    switch (p) {
      case 'day': return new Date(now - 86400000)
      case '7d': return new Date(now - 7 * 86400000)
      case '14d': return new Date(now - 14 * 86400000)
      case '30d': return new Date(now - 30 * 86400000)
      case 'month': return new Date(now.getFullYear(), now.getMonth(), 1)
      case 'quarter': return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      case 'semester': return new Date(now.getFullYear(), now.getMonth() >= 6 ? 6 : 0, 1)
      case 'year': return new Date(now.getFullYear(), 0, 1)
      default: return new Date(now - 7 * 86400000)
    }
  }

  const sbFetch = async (path, headers = {}) => {
    const FETCH_TIMEOUT = 8000
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1${path}`, { headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', ...headers }, signal: controller.signal })
      if (!resp.ok && resp.status !== 206) return { rows: [], count: 0, ok: false }
      const contentRange = resp.headers.get('content-range')
      const count = contentRange ? parseInt((contentRange.match(/\/(\d+)$/) || [])[1] || '0', 10) : 0
      let rows = []
      try { rows = await resp.json() } catch (_) {}
      return { rows, count, ok: true }
    } catch (err) {
      if (err.name === 'AbortError') { logError('/api/venture-funnel', 'SUPABASE_TIMEOUT', `request timed out for ${path}`, { timeout: FETCH_TIMEOUT }) }
      else { logError('/api/venture-funnel', err.name || 'SUPABASE_ERROR', `request failed for ${path}`, { message: err.message }) }
      return { rows: [], count: 0, ok: false }
    } finally { clearTimeout(timeout) }
  }

  try {
    const periodStart = getPeriodStart(period)
    const periodStartIso = periodStart.toISOString()
    const trialTiers = TRIAL_TIERS[product] || ['Trial']
    const paidTiers = PAID_TIERS[product] || ['Premium']
    const trialFilter = `subscription_tier=in.(${trialTiers.join(',')})`
    const paidFilter = `subscription_tier=in.(${paidTiers.join(',')})`

    const { rows: paidRows } = await sbFetch(`/${table}?select=created_at,updated_at&${paidFilter}&limit=500`)
    let avgTimeToPaid = null
    const diffs = []
    paidRows.forEach(row => {
      if (!row || typeof row !== 'object' || !row.created_at || !row.updated_at) return
      const diffDays = (new Date(row.updated_at) - new Date(row.created_at)) / 86400000
      if (diffDays > 0.5 && diffDays < 730) diffs.push(diffDays)
    })
    if (diffs.length > 0) { avgTimeToPaid = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length) }

    const { count: newSignups } = await sbFetch(`/${table}?select=id&created_at=gte.${encodeURIComponent(periodStartIso)}`, { 'Prefer': 'count=exact', 'Range': '0-0' })

    const trialSelect = table === 'company_subscriptions' ? `${trialFilter}&select=user_count,base_price_per_user&subscribed=eq.false&limit=500` : `${trialFilter}&select=id&limit=500`
    const { rows: trialRows } = await sbFetch(`/${table}?${trialSelect}`)
    const trialCount = trialRows.length
    let potentialMrr = null
    if (trialCount > 0) {
      if (table === 'company_subscriptions') {
        potentialMrr = trialRows.reduce((sum, c) => { if (!c || typeof c !== 'object') return sum; const seats = Math.max(c.user_count || 0, 1); const price = c.base_price_per_user || defaultPrice; return sum + (seats * price) }, 0)
      } else { potentialMrr = trialCount * defaultPrice }
    }

    return res.json({ avgTimeToPaid, newSignups, potentialMrr, trialCount, product, period })
  } catch (err) {
    logError('/api/venture-funnel', err.name || 'HANDLER_ERROR', 'handler error', { message: err.message, product })
    return res.json({ avgTimeToPaid: null, newSignups: 0, potentialMrr: null, trialCount: 0, product, period, error: err.message })
  }
})

// ── Global 404 handler ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  logError(req.path, 'NOT_FOUND', `${req.method} request to undefined route`)
  return res.status(404).json({ error: 'Not found' })
})

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  logError(req.path, 'UNHANDLED_ERROR', 'error in request handler', { method: req.method, message: err.message })
  return res.status(500).json({ error: 'Internal server error' })
})

validateCSPHashes()

const server = app.listen(PORT, () => console.log(`Dashboard API running on :${PORT}`))

// Graceful shutdown: close HTTP server on process termination
function gracefulShutdown(signal) {
  console.log(`[${signal}] Shutting down gracefully...`)
  cleanupRateLimit()
  server.close(() => {
    console.log('HTTP server closed')
    process.exit(0)
  })
  // Force exit if shutdown takes too long (30s)
  setTimeout(() => {
    console.error('[ERROR] Forced shutdown after 30s timeout')
    process.exit(1)
  }, 30000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  const message = reason instanceof Error ? reason.message : String(reason)
  logError('process', 'UNHANDLED_REJECTION', 'unhandled promise rejection', { message })
})

// Handle uncaught exceptions (last resort before crash)
process.on('uncaughtException', (error) => {
  logError('process', 'UNCAUGHT_EXCEPTION', 'uncaught exception — forcing shutdown', { message: error.message })
  console.error(error.stack)
  process.exit(1)
})
