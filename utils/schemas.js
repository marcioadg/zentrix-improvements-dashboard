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

module.exports = {
  PRODUCT_TABLE,
  DEFAULT_PRICE,
  TRIAL_TIERS,
  PAID_TIERS,
  WEEKLY_USAGE_SCHEMAS
}
