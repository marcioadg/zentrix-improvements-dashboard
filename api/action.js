const {
  getClientIP,
  checkRateLimit,
  handleAction,
  logError
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
  if (req.method === 'OPTIONS') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res.status(200).end()
  }
  if (req.method !== 'POST') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Validate critical env vars early
  if (!SLACK_TOKEN) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res.status(500).json({ error: 'SLACK_TOKEN not configured' })
  }
  if (!API_KEY) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res.status(500).json({ error: 'API_KEY not configured' })
  }

  // Rate limiting
  const ip = getClientIP(req)
  const check = checkRateLimit(ip)
  if (!check.allowed) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res.status(429).json({ error: check.error })
  }

  const key = req.headers['x-api-key']
  if (key !== API_KEY) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    await handleAction(req, res, SLACK_TOKEN)
  } catch (err) {
    logError('/api/action', err.name || 'UNHANDLED_ERROR', 'unhandled error in action handler', { message: err.message })
    if (!res.headersSent) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}

