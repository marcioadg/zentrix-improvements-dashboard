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
    // Evict oldest entry if map exceeds max size (prevent memory exhaustion DoS)
    if (!_rateLimitMap.has(ip) && _rateLimitMap.size >= RATE_LIMIT_MAX_IPS) {
      const oldest = _rateLimitMap.entries().next().value
      if (oldest) _rateLimitMap.delete(oldest[0])
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
  const details = Object.entries(context).map(([k, v]) => `${k}=${v}`).join(' ')
  console.error(`[${timestamp}] [${code}] ${route}: ${message}${details ? ' ' + details : ''}`)
}

// Graceful shutdown: clear the cleanup interval on process termination
function cleanup() {
  clearInterval(_rateLimitCleanup)
  _rateLimitMap.clear()
}

module.exports = {
  SLACK_CHANNEL,
  FETCH_TIMEOUT,
  RATE_LIMIT_WINDOW,
  RATE_LIMIT_MAX,
  escapeSlackMarkdown,
  validateActionPayload,
  postSlack,
  getClientIP,
  checkRateLimit,
  logError,
  cleanup
}
