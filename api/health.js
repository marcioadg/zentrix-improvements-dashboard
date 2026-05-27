const { sendErrorResponse, setupCORSAndOptions } = require('../utils/slack.js')

module.exports = async function handler(req, res) {
  const corsResult = setupCORSAndOptions(req, res, 'GET')
  if (corsResult) return corsResult

  if (req.method !== 'GET') {
    return sendErrorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed')
  }
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  return res.json({ ok: true, ts: new Date().toISOString() })
}
