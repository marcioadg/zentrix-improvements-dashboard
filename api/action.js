const SLACK_TOKEN = process.env.SLACK_TOKEN
const API_KEY = process.env.API_KEY
const SLACK_CHANNEL = 'C0ABH17F93L'

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

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const key = req.headers['x-api-key']
  if (API_KEY && key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' })

  const { action, cardId, repo, repoName, summary, requestedAt } = req.body
  if (!action || !cardId) return res.status(400).json({ error: 'Missing action or cardId' })

  const labels = { approve: '✅ Approved', deny: '❌ Denied', plan: '📋 Plan Requested' }
  const label = labels[action] || action
  const text = `${label} — *${repoName || repo}*`
  const blocks = [
    { type: 'section', text: { type: 'mrkdwn', text: `${label} — *${repoName || repo}*` } },
    { type: 'section', text: { type: 'mrkdwn', text: `>${summary || '(no summary)'}` } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: `Card: ${cardId} · ${requestedAt || new Date().toISOString()}` }] }
  ]

  try {
    const result = await postSlack(text, blocks)
    res.json({ ok: result.ok, ts: result.ts })
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
}
