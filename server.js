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
  escapeSlackMarkdown,
  validateActionPayload,
  postSlack,
  getClientIP,
  checkRateLimit,
  cleanup: cleanupRateLimit
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

// Load and initialize index.html, CSP hash, and cache (single read operation)
const { _scriptHash, _indexCache } = (() => {
  try {
    const content = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8')
    const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/)
    if (!scriptMatch || !scriptMatch[1]) {
      throw new Error('No inline script found in index.html')
    }
    const scriptContent = scriptMatch[1]
    const scriptHash = 'sha256-' + crypto.createHash('sha256').update(scriptContent).digest('base64')
    const etag = generateETag(content)
    return { _scriptHash: scriptHash, _indexCache: { content, etag } }
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
  res.setHeader('Content-Security-Policy', `default-src 'none'; script-src '${_scriptHash}'; style-src 'sha256-twU6KozwNFRBwq/gjzeoMQjRyMBl+ySRLBUIWiG0Rc0=' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://raw.githubusercontent.com https://api.github.com; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`)
  next()
})
app.use('/data', express.static(path.join(__dirname, 'data'), {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
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
  res.status(401).json({ error: 'Unauthorized' })
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
    return res.status(429).json({ error: check.error })
  }
  next()
}


// ── Response caching (10 min TTL for expensive queries) ──
const _metricsCache = { data: null, etag: null, timestamp: 0 }
const METRICS_CACHE_TTL = 600000 // 10 minutes

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

// ── Routes ───────────────────────────────────────────────────────────────────

// Health check (no auth)
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() })
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
          console.error(`[ERROR] Supabase total_accounts fetch failed [${response.status}]`)
        }
      } finally {
        clearTimeout(timeout)
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('[ERROR] Supabase total_accounts request timed out [AbortError]')
    } else {
      console.error(`[ERROR] Supabase total_accounts request failed [${err.name || 'UNKNOWN'}]:`, err.message)
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
              console.error(`[ERROR] Stripe subscriptions fetch failed [${response.status}]`)
              break
            }

            const data = await response.json()
            const validData = validateStripeSubscriptionsResponse(data)
            if (!validData) {
              console.error('[ERROR] Stripe subscriptions response invalid: missing data array [INVALID_RESPONSE]')
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
          console.error('[ERROR] Stripe subscriptions request timed out [AbortError]')
        } else {
          console.error(`[ERROR] Stripe subscriptions request failed [${err.name || 'UNKNOWN'}]:`, err.message)
        }
      }
    }

    results.mrr = Math.round(totalMRR * 100) / 100
    results.totalPaidAccounts = paidCustomers.size
    results.source = results.totalAccounts != null ? 'live' : 'partial'
  }

  _metricsCache.data = results
  _metricsCache.etag = generateETag(results)
  _metricsCache.timestamp = now

  res.setHeader('Cache-Control', 'public, max-age=600')
  res.setHeader('ETag', _metricsCache.etag)
  res.json(results)
})

// Agents data — read/write
app.get('/api/agents', rateLimit, requireAuth, (req, res) => {
  const filePath = path.join(__dirname, 'data', 'agents.json')
  try {
    const data = fs.readFileSync(filePath, 'utf8')
    const agents = JSON.parse(data)
    res.setHeader('Cache-Control', 'public, max-age=60')
    res.json(agents)
  } catch (e) {
    if (e.code === 'ENOENT') {
      res.status(404).json({ error: 'Agents data not found' })
    } else if (e instanceof SyntaxError) {
      console.error('Invalid agents data format:', e.message)
      res.status(500).json({ error: 'Invalid agents data format' })
    } else {
      console.error(`Failed to read agents data [${e.code || 'UNKNOWN'}]:`, e.message)
      res.status(500).json({ error: 'Failed to read agents data' })
    }
  }
})

app.post('/api/agents', rateLimit, requireAuth, (req, res) => {
  if (!validateAgentsJSON(req.body)) {
    return res.status(400).json({ error: 'Invalid agents data structure' })
  }
  const filePath = path.join(__dirname, 'data', 'agents.json')
  try {
    fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2))
    res.json({ ok: true })
  } catch (e) {
    console.error(`Failed to save agents [${e.code || 'UNKNOWN'}]:`, e.message)
    res.status(500).json({ error: 'Failed to save agents' })
  }
})

// Unified action endpoint — matches the Vercel serverless function (api/action.js)
// The client exclusively calls this route for swipe actions and security fix requests
app.post('/api/action', rateLimit, requireAuth, async (req, res) => {
  const validation = validateActionPayload(req.body)
  if (!validation.valid) return res.status(400).json({ error: validation.error })

  const { action, cardId, repo, repoName, summary, route } = req.body
  const labels = { approve: '✅ Approved', deny: '❌ Denied', plan: '📋 Plan Requested', sec_fix: '🔐 Security Fix Requested' }
  const label = labels[action]

  const blocks = [
    { type: 'section', text: { type: 'mrkdwn', text: `${label} — *${escapeSlackMarkdown(repoName || repo)}*${route ? ` \`${escapeSlackMarkdown(route)}\`` : ''}` } },
    { type: 'section', text: { type: 'mrkdwn', text: `>${escapeSlackMarkdown(summary || '(no summary)')}` } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: `Card: ${escapeSlackMarkdown(cardId)} · ${new Date().toISOString().slice(0,16).replace('T',' ')} UTC` }] }
  ]

  try {
    const result = await postSlack(SLACK_TOKEN, `${label} — ${escapeSlackMarkdown(repoName || repo)}`, blocks)
    res.json({ ok: result.ok, ts: result.ts })
  } catch (e) {
    console.error(`[ERROR] Failed to post Slack action [${e.name || 'UNKNOWN'}]:`, e.message)
    res.status(500).json({ error: e.message })
  }
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
