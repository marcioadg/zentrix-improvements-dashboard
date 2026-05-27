const {
  getClientIP,
  checkRateLimit,
  handleAction,
  logError,
  sendErrorResponse,
  setupCORSAndOptions
} = require('../utils/slack.js')

const SLACK_TOKEN = process.env.SLACK_TOKEN
const API_KEY = process.env.API_KEY

module.exports = async function handler(req, res) {
  const corsResult = setupCORSAndOptions(req, res, 'POST')
  if (corsResult) return corsResult

  if (req.method !== 'POST') {
    return sendErrorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed')
  }

  // Validate critical env vars early
  if (!SLACK_TOKEN) {
    return sendErrorResponse(res, 500, 'SLACK_TOKEN_MISSING', 'SLACK_TOKEN not configured')
  }
  if (!API_KEY) {
    return sendErrorResponse(res, 500, 'API_KEY_MISSING', 'API_KEY not configured')
  }

  // Rate limiting
  const ip = getClientIP(req)
  const check = checkRateLimit(ip)
  if (!check.allowed) {
    return sendErrorResponse(res, 429, 'RATE_LIMIT_EXCEEDED', check.error)
  }

  const key = req.headers['x-api-key']
  if (key !== API_KEY) {
    return sendErrorResponse(res, 401, 'UNAUTHORIZED', 'Unauthorized')
  }

  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    await handleAction(req, res, SLACK_TOKEN)
  } catch (err) {
    if (!res.headersSent) {
      return sendErrorResponse(res, 500, err.name || 'UNHANDLED_ERROR', 'Internal server error', { message: err.message })
    }
  }
}

