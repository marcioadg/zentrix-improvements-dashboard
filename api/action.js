const SLACK_TOKEN = process.env.SLACK_TOKEN
const API_KEY = process.env.API_KEY
const OPENAI_KEY = process.env.OPENAI_KEY
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

async function generatePlan(repoName, summary, route) {
  if (!OPENAI_KEY) return null
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + OPENAI_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Create a concise implementation plan for this improvement proposal in ${repoName} (route: ${route || 'unknown'}).

Proposal: ${summary}

Reply in this exact format (no markdown headers, plain text):
EFFORT: [XS/S/M/L]
STEPS:
1. [step]
2. [step]
3. [step]
4. [step]
RISK: [low/medium/high] — [one sentence why]`
      }]
    })
  })
  const d = await r.json()
  return d.choices?.[0]?.message?.content || null
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const key = req.headers['x-api-key']
  if (API_KEY && key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' })

  const { action, cardId, repo, repoName, summary, requestedAt, route } = req.body
  if (!action || !cardId) return res.status(400).json({ error: 'Missing action or cardId' })

  const labels = { approve: '✅ Approved', deny: '❌ Denied', plan: '📋 Plan Requested', sec_fix: '🔐 Security Fix Requested' }
  const label = labels[action] || action

  let blocks = [
    { type: 'section', text: { type: 'mrkdwn', text: `${label} — *${repoName || repo}*${route ? ` \`${route}\`` : ''}` } },
    { type: 'section', text: { type: 'mrkdwn', text: `>${summary || '(no summary)'}` } }
  ]

  // Plan generation removed — Ezra will follow up manually

  blocks.push({
    type: 'context',
    elements: [{ type: 'mrkdwn', text: `Card: ${cardId} · ${new Date().toISOString().slice(0,16).replace('T',' ')} UTC` }]
  })

  try {
    const result = await postSlack(`${label} — ${repoName || repo}`, blocks)
    res.json({ ok: result.ok, ts: result.ts })
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
}
