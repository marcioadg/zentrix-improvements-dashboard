const {
  getClientIP,
  checkRateLimit,
  handleAction
} = require('../utils/slack.js')

const SLACK_TOKEN = process.env.SLACK_TOKEN
const API_KEY = process.env.API_KEY

module.exports = async function handler(req, res) {
  const origin = req.headers.origin
  // Allow localhost for development and any Vercel domain for preview/production
  if (origin && (origin.startsWith('http://localhost:') || origin.endsWith('.vercel.app'))) {
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

  await handleAction(req, res, SLACK_TOKEN)
}

