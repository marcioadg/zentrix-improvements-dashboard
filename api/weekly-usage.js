// /api/weekly-usage.js
const { logError, sendErrorResponse, requireMethod, supabaseWithTimeout } = require('../utils/slack.js')
const { WEEKLY_USAGE_SCHEMAS } = require('../utils/schemas.js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

module.exports = async function handler(req, res) {
  const methodCheck = requireMethod(req, res, 'GET')
  if (methodCheck) return methodCheck

  const product = req.query.product || 'os'

  try {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      return res.json({ data: [], product })
    }

    const schema = WEEKLY_USAGE_SCHEMAS[product]
    if (!schema) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
      return res.json({ data: [], product, note: 'No weekly data for this product yet' })
    }

    const raw = await supabaseWithTimeout(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, `/weekly_usage_snapshots?select=${schema.fields}&order=week_start.asc&limit=16`, '/api/weekly-usage', schema.headers)
    if (!Array.isArray(raw)) {
      return sendErrorResponse(res, 500, 'SUPABASE_HTTP', 'Failed to fetch weekly usage data', { product })
    }

    const data = raw.map(schema.transform)
    res.setHeader('Cache-Control', 'public, max-age=300')
    return res.json({ data, product })

  } catch (err) {
    return sendErrorResponse(res, 500, err.name || 'HANDLER_ERROR', 'Failed to fetch weekly usage data', { message: err.message, product })
  }
}
