require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3847

// ── Config ──────────────────────────────────────────────────────────────────
const SLACK_TOKEN = process.env.SLACK_TOKEN || ''
const API_KEY = process.env.API_KEY || ''
const SLACK_CHANNEL = 'C0ABH17F93L' // #ai-devs-zentrix

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }))
app.use(express.json())

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('X-XSS-Protection', '0')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  next()
})
app.use('/data', express.static(path.join(__dirname, 'data')))
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')))

// ── Auth middleware ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.key
  if (!API_KEY || key === API_KEY) return next()
  res.status(401).json({ error: 'Unauthorized' })
}

// ── Slack post helper ────────────────────────────────────────────────────────
async function postSlack(text, blocks) {
  const body = { channel: SLACK_CHANNEL, text }
  if (blocks) body.blocks = blocks
  const r = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + SLACK_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return r.json()
}

// ── Routes ───────────────────────────────────────────────────────────────────

// Health check (no auth)
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() })
})

// Unified action endpoint — matches the Vercel serverless function (api/action.js)
// The client exclusively calls this route for swipe actions and security fix requests
app.post('/api/action', requireAuth, async (req, res) => {
  const { action, cardId, repo, repoName, summary, route } = req.body
  if (!action || !cardId) return res.status(400).json({ error: 'Missing action or cardId' })

  const labels = { approve: '✅ Approved', deny: '❌ Denied', plan: '📋 Plan Requested', sec_fix: '🔐 Security Fix Requested' }
  const label = labels[action] || action

  const blocks = [
    { type: 'section', text: { type: 'mrkdwn', text: `${label} — *${repoName || repo}*${route ? ` \`${route}\`` : ''}` } },
    { type: 'section', text: { type: 'mrkdwn', text: `>${summary || '(no summary)'}` } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: `Card: ${cardId} · ${new Date().toISOString().slice(0,16).replace('T',' ')} UTC` }] }
  ]

  try {
    const result = await postSlack(`${label} — ${repoName || repo}`, blocks)
    res.json({ ok: result.ok, ts: result.ts })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.listen(PORT, () => console.log(`Dashboard API running on :${PORT}`))
