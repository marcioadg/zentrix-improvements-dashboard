// Shared utilities for Slack integration and request handling

const SLACK_CHANNEL = 'C0ABH17F93L' // #ai-devs-zentrix
const FETCH_TIMEOUT = 8000 // 8 seconds for external API calls
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const RATE_LIMIT_MAX = 10       // max 10 actions per minute per IP
const RATE_LIMIT_MAX_IPS = 10000 // max unique IPs before LRU eviction

const _rateLimitMap = new Map()

function escapeSlackMarkdown(str) {
  return String(str || '').replace(/[*_~`\[\]]/g, '\\$&')
}

function validateActionPayload(body) {
  if (!body || typeof body !== 'object') return { valid: false, error: 'Body must be object' }
  const { action, cardId, repo, repoName, summary, route } = body
  if (typeof action !== 'string' || !action) return { valid: false, error: 'action must be non-empty string' }
  if (typeof cardId !== 'string' || !cardId) return { valid: false, error: 'cardId must be non-empty string' }
  if (action !== 'approve' && action !== 'deny' && action !== 'plan' && action !== 'sec_fix') {
    return { valid: false, error: 'action must be approve|deny|plan|sec_fix' }
  }
  if (repo && typeof repo !== 'string') return { valid: false, error: 'repo must be string' }
  if (repoName && typeof repoName !== 'string') return { valid: false, error: 'repoName must be string' }
  if (summary && typeof summary !== 'string') return { valid: false, error: 'summary must be string' }
  if (route && typeof route !== 'string') return { valid: false, error: 'route must be string' }
  if ((action + cardId + (repo || '') + (repoName || '') + (summary || '') + (route || '')).length > 2000) {
    return { valid: false, error: 'Payload exceeds maximum length' }
  }
  return { valid: true }
}

async function postSlack(slackToken, text, blocks) {
  if (!slackToken) {
    throw new Error('SLACK_TOKEN not configured')
  }
  const body = { channel: SLACK_CHANNEL, text }
  if (blocks) body.blocks = blocks
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    const r = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + slackToken, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    })
    clearTimeout(timeout)
    if (!r.ok) {
      const errorText = await r.text()
      console.error(`[ERROR] Slack API request failed [${r.status}]: ${errorText}`)
      throw new Error(`Slack API error: ${r.status}`)
    }
    const data = await r.json()
    if (!data.ok) {
      console.error(`[ERROR] Slack API response error [${data.error || 'UNKNOWN'}]:`, data)
      throw new Error(`Slack API error: ${data.error || 'unknown'}`)
    }
    return data
  } finally {
    clearTimeout(timeout)
  }
}

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown'
}

function checkRateLimit(ip) {
  const now = Date.now()
  const entry = _rateLimitMap.get(ip)

  if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
    // Reject new IPs at capacity to prevent distributed attacks (botnet style)
    if (!_rateLimitMap.has(ip) && _rateLimitMap.size >= RATE_LIMIT_MAX_IPS) {
      logError('/api/rate-limit', 'DISTRIBUTED_ATTACK_DETECTED', 'rejecting new IP at capacity', { ip, uniqueIPsTracked: _rateLimitMap.size })
      return { allowed: false, error: 'Too many requests — try again in a minute' }
    }
    _rateLimitMap.set(ip, { start: now, count: 1 })
    return { allowed: true }
  }

  entry.count++
  if (entry.count > RATE_LIMIT_MAX) {
    return { allowed: false, error: 'Too many requests — try again in a minute' }
  }
  return { allowed: true }
}

// Prune stale rate-limit entries every 5 minutes
const _rateLimitCleanup = setInterval(() => {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW * 2
  for (const [ip, entry] of _rateLimitMap) {
    if (entry.start < cutoff) _rateLimitMap.delete(ip)
  }
}, 300000)
_rateLimitCleanup.unref()

// Standardized error logging with timestamp, code, route, and context
function logError(route, code, message, context = {}) {
  const timestamp = new Date().toISOString()
  const details = Object.entries(context).map(([k, v]) => {
    if (typeof v === 'object' && v !== null) {
      let serialized = JSON.stringify(v)
      if (serialized.length > 200) {
        serialized = serialized.slice(0, 197) + '...'
      }
      return `${k}=${serialized}`
    }
    return `${k}=${v}`
  }).join(' ')
  console.error(`[${timestamp}] [${code}] ${route}: ${message}${details ? ' ' + details : ''}`)
}

// Graceful shutdown: clear the cleanup interval on process termination
function cleanup() {
  clearInterval(_rateLimitCleanup)
  _rateLimitMap.clear()
}

// Standardized error response: ensures all errors have proper cache headers
function sendErrorResponse(res, statusCode, errorCode, message, context = {}) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  logError('API', errorCode, message, context)
  return res.status(statusCode).json({ error: message })
}

// Setup CORS and OPTIONS handling for API endpoints (Vercel Functions)
function setupCORSAndOptions(req, res, allowedMethods = 'GET') {
  const origin = req.headers.origin
  if (origin && (origin.startsWith('http://localhost:') || origin.endsWith('.vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', `${allowedMethods}, OPTIONS`)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key')
  if (req.method === 'OPTIONS') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res.status(200).end()
  }
  return null
}

async function handleAction(req, res, slackToken) {
  const validation = validateActionPayload(req.body)
  if (!validation.valid) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    logError('/api/action', 'VALIDATION_ERROR', validation.error, { action: req.body?.action })
    return res.status(400).json({ error: validation.error })
  }

  const { action, cardId, repo, repoName, summary, route } = req.body
  const labels = { approve: '✅ Approved', deny: '❌ Denied', plan: '📋 Plan Requested', sec_fix: '🔐 Security Fix Requested' }
  const label = labels[action]

  const blocks = [
    { type: 'section', text: { type: 'mrkdwn', text: `${label} — *${escapeSlackMarkdown(repoName || repo)}*${route ? ` \`${escapeSlackMarkdown(route)}\`` : ''}` } },
    { type: 'section', text: { type: 'mrkdwn', text: `>${escapeSlackMarkdown(summary || '(no summary)')}` } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: `Card: ${escapeSlackMarkdown(cardId)} · ${new Date().toISOString().slice(0,16).replace('T',' ')} UTC` }] }
  ]

  try {
    const result = await postSlack(slackToken, `${label} — ${escapeSlackMarkdown(repoName || repo)}`, blocks)
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res.json({ ok: result.ok, ts: result.ts })
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    logError('/api/action', e.name || 'SLACK_ERROR', 'failed to post Slack action', { action, message: e.message })
    return res.status(500).json({ error: e.message })
  }
}

// ── Shared product and utility constants ────────────────────────────────────
const PRODUCT_NAMES = {
  'prod_UIcJaRWyvLj3hG': 'Zentrix OS',
  'prod_UIXWsz46FekvcE': 'Zentrix CRM',
  'prod_UIF93vwI9NzXpI': 'Zentrix Insights',
  'prod_T85Mmg99NDMaWP': 'Zentrix OS',
  'prod_TU0tjFz2jR0OYg': 'Zentrix Insights',
  'prod_T4vLmff0Cdl34d': 'Zentrix OS'
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

function getPeriodStartMs(period) {
  const d = new Date()
  switch (period) {
    case 'day':  return Date.now() - 86400000
    case '7d':   return Date.now() - 7 * 86400000
    case '14d':  return Date.now() - 14 * 86400000
    case '30d':  return Date.now() - 30 * 86400000
    case 'month':    { d.setDate(1); d.setHours(0, 0, 0, 0); return d.getTime() }
    case 'quarter':  { const q = Math.floor(d.getMonth() / 3); d.setMonth(q * 3, 1); d.setHours(0, 0, 0, 0); return d.getTime() }
    case 'semester': { d.setMonth(d.getMonth() < 6 ? 0 : 6, 1); d.setHours(0, 0, 0, 0); return d.getTime() }
    case 'year':     { d.setMonth(0, 1); d.setHours(0, 0, 0, 0); return d.getTime() }
    default: return null
  }
}

// Wrap fetch with AbortController timeout — consolidates repeated pattern across API handlers
// Returns response or null on error; logs error with context
async function fetchWithTimeout(url, options = {}, context = {}) {
  const { route = 'API', code = 'FETCH_ERROR', message = 'fetch failed' } = context
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeout)
    return response
  } catch (err) {
    const errorCode = err.name === 'AbortError' ? 'TIMEOUT' : err.name || 'ERROR'
    logError(route, `${code}_${errorCode}`, message, { timeout: FETCH_TIMEOUT, message: err.message, ...context })
    return null
  } finally {
    clearTimeout(timeout)
  }
}

// Fetch from Supabase REST API with timeout — consolidates duplicate wrapper logic
// Returns parsed JSON or empty array on error; logs errors with route context
async function supabaseWithTimeout(supabaseUrl, supabaseKey, path, route = 'API', headers = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1${path}`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        ...headers
      },
      signal: controller.signal
    })
    if (!res.ok) {
      logError(route, 'SUPABASE_HTTP', `request failed for ${path}`, { status: res.status })
      return []
    }
    return res.json()
  } catch (err) {
    logError(route, err.name === 'AbortError' ? 'SUPABASE_TIMEOUT' : 'SUPABASE_ERROR', `request failed for ${path}`, { message: err.message })
    return []
  } finally {
    clearTimeout(timeout)
  }
}

module.exports = {
  SLACK_CHANNEL,
  FETCH_TIMEOUT,
  RATE_LIMIT_WINDOW,
  RATE_LIMIT_MAX,
  PRODUCT_NAMES,
  escapeSlackMarkdown,
  validateActionPayload,
  postSlack,
  getClientIP,
  checkRateLimit,
  logError,
  cleanup,
  handleAction,
  sendErrorResponse,
  setupCORSAndOptions,
  calcSubMRR,
  getPeriodStart,
  getPeriodStartMs,
  fetchWithTimeout,
  supabaseWithTimeout
}
