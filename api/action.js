const SLACK_TOKEN = process.env.SLACK_TOKEN
const API_KEY = process.env.API_KEY
const SLACK_CHANNEL = 'C0ABH17F93L'

// In-memory rate limiting (per-IP, resets on cold start — acceptable for serverless)
const _rateLimitMap = new Map()
const RATE_LIMIT_WINDOW = 60000
const RATE_LIMIT_MAX = 10

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

async function postSlack(text, blocks) {
  const body = { channel: SLACK_CHANNEL, text }
  if (blocks) body.blocks = blocks
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const r = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + SLACK_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    })
    clearTimeout(timeout)
    if (!r.ok) {
      const errorText = await r.text()
      console.error(`[ERROR] Slack API returned ${r.status}: ${errorText}`)
      throw new Error(`Slack API error: ${r.status}`)
    }
    const data = await r.json()
    if (!data.ok) {
      console.error(`[ERROR] Slack API error: ${data.error || 'unknown'}`)
      throw new Error(`Slack API error: ${data.error || 'unknown'}`)
    }
    return data
  } finally {
    clearTimeout(timeout)
  }
}

const ALLOWED_ORIGINS = [
  'https://zentrix-improvements-dashboard.vercel.app'
]

export default async function handler(req, res) {
  const origin = req.headers.origin
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Validate critical env vars early
  if (!SLACK_TOKEN) return res.status(500).json({ error: 'SLACK_TOKEN not configured' })
  if (!API_KEY) return res.status(500).json({ error: 'API_KEY not configured' })

  // Rate limiting
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  const now = Date.now()
  const entry = _rateLimitMap.get(ip)
  if (entry && now - entry.start <= RATE_LIMIT_WINDOW) {
    entry.count++
    if (entry.count > RATE_LIMIT_MAX) {
      return res.status(429).json({ error: 'Too many requests — try again in a minute' })
    }
  } else {
    _rateLimitMap.set(ip, { start: now, count: 1 })
  }

  const key = req.headers['x-api-key']
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' })

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
    const result = await postSlack(`${label} — ${repoName || repo}`, blocks)
    res.json({ ok: result.ok, ts: result.ts })
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
}
