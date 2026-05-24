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
  res.setHeader('Content-Security-Policy', `default-src 'none'; script-src '${_scriptHashes}'; style-src '${_styleHash}' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://raw.githubusercontent.com https://api.github.com; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`)
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
  res.send(_indexCache.content)
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
  try {
    return await handleAction(req, res, SLACK_TOKEN)
  } catch (err) {
    logError('/api/action', err.name || 'UNHANDLED_ERROR', 'unhandled error in action handler', { message: err.message })
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
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
