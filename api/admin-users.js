const { requireMethod, supabaseWithTimeout, sendErrorResponse } = require('../utils/slack.js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

module.exports = async function handler(req, res) {
  const methodCheck = requireMethod(req, res, 'GET')
  if (methodCheck) return methodCheck

  const apiKey = process.env.API_KEY || ''
  if (apiKey && req.headers['x-api-key'] !== apiKey) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res.json({ users: [] })
  }

  try {
    const [profiles, memberships, companies] = await Promise.all([
      supabaseWithTimeout(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, '/profiles?select=id,email,full_name,role,created_at,last_login_at&order=created_at.desc&limit=1000', '/api/admin-users'),
      supabaseWithTimeout(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, '/company_members?select=user_id,company_id,permission_level,status,joined_at&limit=3000', '/api/admin-users'),
      supabaseWithTimeout(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, '/companies?select=id,name&limit=1000', '/api/admin-users')
    ])

    if (!Array.isArray(profiles) || !Array.isArray(memberships) || !Array.isArray(companies)) {
      return sendErrorResponse(res, 500, 'SUPABASE_PARTIAL_FAILURE', 'Failed to fetch users')
    }

    const companyById = new Map(companies.map(c => [c.id, c.name]))
    const membershipsByUser = new Map()
    memberships.forEach(m => {
      if (!membershipsByUser.has(m.user_id)) membershipsByUser.set(m.user_id, [])
      membershipsByUser.get(m.user_id).push(m)
    })

    const users = profiles.flatMap(profile => {
      const rows = membershipsByUser.get(profile.id) || [null]
      return rows.map(membership => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        created_at: profile.created_at,
        last_login_at: profile.last_login_at,
        permission_level: membership?.permission_level || profile.role,
        status: membership?.status || null,
        company_id: membership?.company_id || null,
        company_name: membership?.company_id ? companyById.get(membership.company_id) : null,
        joined_at: membership?.joined_at || null
      }))
    })

    res.setHeader('Cache-Control', 'public, max-age=120')
    return res.json({ users })
  } catch (err) {
    return sendErrorResponse(res, 500, err.name || 'HANDLER_ERROR', 'Failed to fetch users', { message: err.message })
  }
}
