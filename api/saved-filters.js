// /api/saved-filters.js
// Returns the list of Super-Admin saved company filters so the Portfolio
// Overview's "Filters" dropdown can show what exclusions exist.
const { logError, sendErrorResponse, requireMethod, supabaseWithTimeout } = require('../utils/slack.js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

module.exports = async function handler(req, res) {
  const methodCheck = requireMethod(req, res, 'GET')
  if (methodCheck) return methodCheck

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    res.setHeader('Cache-Control', 'no-store')
    return res.json({ filters: [] })
  }

  try {
    const rows = await supabaseWithTimeout(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      `/saved_company_filters?select=id,name,filter_data&limit=50`,
      '/api/saved-filters'
    )
    if (!Array.isArray(rows)) {
      logError('/api/saved-filters', 'SUPABASE_PARTIAL_FAILURE', 'saved_company_filters fetch failed', {})
      return sendErrorResponse(res, 500, 'SUPABASE_ERROR', 'Failed to fetch saved filters')
    }
    const filters = rows.map(r => {
      const ids = r.filter_data && Array.isArray(r.filter_data.excludedCompanyIds)
        ? r.filter_data.excludedCompanyIds
        : []
      return { id: r.id, name: r.name, excludedCount: ids.length }
    })
    res.setHeader('Cache-Control', 'public, max-age=300')
    return res.json({ filters })
  } catch (err) {
    if (!res.headersSent) {
      return sendErrorResponse(res, 500, err.name || 'HANDLER_ERROR', 'Failed to fetch saved filters', { message: err.message })
    }
  }
}
