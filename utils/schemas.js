// Shared product schemas and configuration
// Consolidated to eliminate duplication between server.js and api/ functions

// Product-to-Supabase table mapping
const PRODUCT_TABLE = {
  os: 'company_subscriptions',
  insights: 'subscribers',
  crm: null,
  agents: null
}

// Default price per seat when base_price_per_user not in DB
const DEFAULT_PRICE = {
  os: 5,
  insights: 29,
  crm: 19,
  agents: 49
}

// Subscription tier categorization per product
const TRIAL_TIERS = {
  os: ['Trial'],
  insights: ['Trial']
}

const PAID_TIERS = {
  os: ['Premium'],
  insights: ['Enterprise', 'Premium', 'Pro']
}

// Weekly usage snapshot schema configuration per product
const WEEKLY_USAGE_SCHEMAS = {
  os: {
    fields: '*',
    headers: {},
    transform: (row) => row
  },
  insights: {
    fields: 'week_start,week_end,total_hours,paid_hours,trial_hours,free_hours,avg_hours_per_user,total_users,paid_users,wow_hours_change_pct,top_users',
    headers: { 'Accept-Profile': 'insights' },
    transform: (row) => ({
      week_start: row.week_start,
      week_end: row.week_end,
      total_hours: row.total_hours,
      paid_hours: row.paid_hours,
      trial_hours: row.trial_hours,
      free_hours: row.free_hours,
      avg_hours_per_user: row.avg_hours_per_user,
      total_users: row.total_users,
      paid_users: row.paid_users,
      wow_hours_change_pct: row.wow_hours_change_pct,
      top_users: row.top_users
    })
  },
  crm: {
    fields: 'week_start,week_end,total_hours,paid_hours,trial_hours,free_hours,avg_hours_per_tenant,avg_hours_per_user,total_tenants,paid_tenants,wow_hours_change_pct,top_tenants,low_tenants',
    headers: { 'Accept-Profile': 'crm' },
    transform: (row) => ({
      week_start: row.week_start,
      week_end: row.week_end,
      total_hours: row.total_hours,
      paid_hours: row.paid_hours,
      trial_hours: row.trial_hours,
      free_hours: row.free_hours,
      avg_hours_per_tenant: row.avg_hours_per_tenant,
      avg_hours_per_user: row.avg_hours_per_user,
      total_tenants: row.total_tenants,
      total_companies: row.total_tenants,
      paid_tenants: row.paid_tenants,
      wow_hours_change_pct: row.wow_hours_change_pct,
      top_tenants: row.top_tenants,
      low_tenants: row.low_tenants
    })
  }
}

// Validate weekly usage response array structure to prevent silent data corruption
function validateWeeklyUsageResponse(data) {
  if (!Array.isArray(data)) return false
  return data.every(row => {
    if (!row || typeof row !== 'object') return false
    if (typeof row.week_start !== 'string' || typeof row.week_end !== 'string') return false
    if (row.total_hours !== null && row.total_hours !== undefined && typeof row.total_hours !== 'number') return false
    if (row.total_users !== null && row.total_users !== undefined && typeof row.total_users !== 'number') return false
    return true
  })
}

// Validate Supabase analytics response structure
function validateSupabaseSnapshot(data) {
  if (!Array.isArray(data) || data.length === 0) return null
  const snapshot = data[0]
  if (typeof snapshot !== 'object' || snapshot.total_users == null || !snapshot.snapshot_date) return null
  return snapshot
}

// Validate Stripe subscriptions response structure
function validateStripeSubscriptionsResponse(data) {
  if (typeof data !== 'object' || !Array.isArray(data.data)) return null
  return data
}

// Validate entries array structure for data integrity
function validateEntriesArray(data) {
  if (!Array.isArray(data)) return false
  if (data.length === 0) return true
  return data.every(e => {
    if (typeof e !== 'object' || e === null) return false
    if (typeof e.date !== 'string' || typeof e.repo !== 'string') return false
    if (typeof e.category !== 'string' || typeof e.summary !== 'string') return false
    if (e.score !== undefined && (typeof e.score !== 'number' || e.score < 0 || e.score > 100)) return false
    return true
  })
}

// Validate metrics response structure to prevent silent data corruption
function validateMetricsResponse(data) {
  if (!data || typeof data !== 'object') return false
  if (typeof data.ventureCount !== 'number' || data.ventureCount < 0) return false
  if (!Array.isArray(data.ventures) || !data.ventures.every(v => typeof v === 'string')) return false
  if (typeof data.source !== 'string' || !['live', 'partial'].includes(data.source)) return false
  if (data.totalAccounts !== null && typeof data.totalAccounts !== 'number') return false
  if (data.totalPaidAccounts !== null && typeof data.totalPaidAccounts !== 'number') return false
  if (data.mrr !== null && typeof data.mrr !== 'number') return false
  if (data.lastUpdated !== null && typeof data.lastUpdated !== 'string') return false
  return true
}

module.exports = {
  PRODUCT_TABLE,
  DEFAULT_PRICE,
  TRIAL_TIERS,
  PAID_TIERS,
  WEEKLY_USAGE_SCHEMAS,
  validateWeeklyUsageResponse,
  validateSupabaseSnapshot,
  validateStripeSubscriptionsResponse,
  validateEntriesArray,
  validateMetricsResponse
}
