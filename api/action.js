import {
  escapeSlackMarkdown,
  validateActionPayload,
  postSlack,
  getClientIP,
  checkRateLimit
} from '../utils/slack.js'

const SLACK_TOKEN = process.env.SLACK_TOKEN
const API_KEY = process.env.API_KEY

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
  const ip = getClientIP(req)
  const check = checkRateLimit(ip)
  if (!check.allowed) {
    return res.status(429).json({ error: check.error })
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
    const result = await postSlack(SLACK_TOKEN, `${label} — ${escapeSlackMarkdown(repoName || repo)}`, blocks)
    res.json({ ok: result.ok, ts: result.ts })
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
}
