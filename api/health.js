const { sendErrorResponse, requireMethod } = require('../utils/slack.js')

module.exports = async function handler(req, res) {
  const methodCheck = requireMethod(req, res, 'GET')
  if (methodCheck) return methodCheck
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  return res.json({ ok: true, ts: new Date().toISOString() })
}
