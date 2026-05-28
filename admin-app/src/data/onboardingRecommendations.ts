// Recommendation data for the /ad2 onboarding flow.
//
// Each industry maps 1:1 to a fixed set of 4 metrics + 4 goal templates
// chosen to match the KPI vocabulary the user actually uses day-to-day.
// `$X` placeholders in goal text are auto-filled from team size; literal
// `[region]`, `[city]`, `[regulatory]` placeholders are left for the user
// to complete.

export type TeamSizeKey = '1–10' | '11–50' | '51–200' | '201–500' | '500+';

export interface RecMetric {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  /** The metric name persisted to the DB. */
  defaultName: string;
  /** '$' | '%' | 'count' | 'hours' */
  defaultUnit: string;
  /** 'total' | 'average' */
  defaultCalculation: string;
  /** Returns the default target value (as a string) for the given team size. */
  defaultTarget: (size: TeamSizeKey) => string;
}

export interface RecGoal {
  text: (size: TeamSizeKey) => string;
}

interface Recommendation {
  metrics: RecMetric[];
  goals: RecGoal[];
}

// ── Team-size scales for $X auto-fill ─────────────────────────────────────────
const REVENUE_BY_SIZE: Record<TeamSizeKey, number> = {
  '1–10':    25_000,
  '11–50':   250_000,
  '51–200':  1_000_000,
  '201–500': 5_000_000,
  '500+':    20_000_000,
};

const formatMoney = (n: number): string => {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m.toFixed(m >= 10 ? 0 : 1)}M`.replace('.0', '');
  }
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
};

const money = (s: TeamSizeKey): string => `$${formatMoney(REVENUE_BY_SIZE[s])}`;

// ── Recommendations per industry ──────────────────────────────────────────────

const RECOMMENDATIONS: Record<string, Recommendation> = {
  'SaaS / Software': {
    metrics: [
      {
        id: 'mrr',
        badge: 'MRR',
        title: 'Monthly Recurring Revenue',
        subtitle: 'Track Q-target progress weekly',
        defaultName: 'Monthly Recurring Revenue',
        defaultUnit: '$',
        defaultCalculation: 'total',
        defaultTarget: (s) => String(REVENUE_BY_SIZE[s]),
      },
      {
        id: 'nrr',
        badge: 'NRR',
        title: 'Net Revenue Retention',
        subtitle: 'Expansion vs. churn',
        defaultName: 'Net Revenue Retention',
        defaultUnit: '%',
        defaultCalculation: 'average',
        defaultTarget: () => '110',
      },
      {
        id: 'churn',
        badge: 'CHURN',
        title: 'Monthly churn rate',
        subtitle: 'Customers lost each month',
        defaultName: 'Monthly churn rate',
        defaultUnit: '%',
        defaultCalculation: 'average',
        defaultTarget: () => '2',
      },
      {
        id: 'cac',
        badge: 'CAC',
        title: 'Customer Acquisition Cost',
        subtitle: 'Sales + marketing per new logo',
        defaultName: 'Customer Acquisition Cost',
        defaultUnit: '$',
        defaultCalculation: 'average',
        defaultTarget: () => '500',
      },
    ],
    goals: [
      { text: (s) => `Reach ${money(s)} MRR by end of quarter` },
      { text: () => 'Reduce churn below 2% / month' },
      { text: () => 'Launch enterprise pricing tier' },
      { text: () => 'Hit 120% Net Revenue Retention' },
    ],
  },

  'E-commerce / Retail': {
    metrics: [
      {
        id: 'gmv',
        badge: 'GMV',
        title: 'Gross Merchandise Value',
        subtitle: 'Total order value sold',
        defaultName: 'Gross Merchandise Value',
        defaultUnit: '$',
        defaultCalculation: 'total',
        defaultTarget: (s) => String(REVENUE_BY_SIZE[s]),
      },
      {
        id: 'aov',
        badge: 'AOV',
        title: 'Average Order Value',
        subtitle: 'Revenue per checkout',
        defaultName: 'Average Order Value',
        defaultUnit: '$',
        defaultCalculation: 'average',
        defaultTarget: () => '85',
      },
      {
        id: 'cvr',
        badge: 'CVR',
        title: 'Conversion rate',
        subtitle: 'Visitors who buy',
        defaultName: 'Conversion rate',
        defaultUnit: '%',
        defaultCalculation: 'average',
        defaultTarget: () => '3',
      },
      {
        id: 'roas',
        badge: 'ROAS',
        title: 'Return on Ad Spend',
        subtitle: 'Revenue ÷ ad spend',
        defaultName: 'Return on Ad Spend',
        defaultUnit: 'count',
        defaultCalculation: 'average',
        defaultTarget: () => '4',
      },
    ],
    goals: [
      { text: (s) => `Hit ${money(s)} in monthly GMV` },
      { text: () => 'Increase conversion rate to 3.5%' },
      { text: () => 'Launch new product category' },
      { text: () => 'Reduce CAC payback to under 60 days' },
    ],
  },

  'Marketplace': {
    metrics: [
      {
        id: 'gmv',
        badge: 'GMV',
        title: 'Gross Merchandise Value',
        subtitle: 'Total transacted volume',
        defaultName: 'Gross Merchandise Value',
        defaultUnit: '$',
        defaultCalculation: 'total',
        defaultTarget: (s) => String(REVENUE_BY_SIZE[s]),
      },
      {
        id: 'take',
        badge: 'TAKE',
        title: 'Take rate',
        subtitle: 'Platform fee % of GMV',
        defaultName: 'Take rate',
        defaultUnit: '%',
        defaultCalculation: 'average',
        defaultTarget: () => '15',
      },
      {
        id: 'liq',
        badge: 'LIQ',
        title: 'Liquidity',
        subtitle: '% of supply that gets matched',
        defaultName: 'Liquidity',
        defaultUnit: '%',
        defaultCalculation: 'average',
        defaultTarget: () => '70',
      },
      {
        id: 'repeat',
        badge: 'REPEAT',
        title: 'Repeat buyer rate',
        subtitle: 'Buyers who come back',
        defaultName: 'Repeat buyer rate',
        defaultUnit: '%',
        defaultCalculation: 'average',
        defaultTarget: () => '40',
      },
    ],
    goals: [
      { text: (s) => `Reach ${money(s)} GMV by end of quarter` },
      { text: () => 'Onboard 500 new sellers' },
      { text: () => 'Improve match rate to 80%' },
      { text: () => 'Launch in 2 new cities/categories' },
    ],
  },

  'Fintech / Financial Services': {
    metrics: [
      {
        id: 'tpv',
        badge: 'TPV',
        title: 'Total Payment Volume',
        subtitle: 'Money moved through the platform',
        defaultName: 'Total Payment Volume',
        defaultUnit: '$',
        defaultCalculation: 'total',
        defaultTarget: (s) => String(REVENUE_BY_SIZE[s] * 10),
      },
      {
        id: 'aum',
        badge: 'AUM',
        title: 'Assets Under Management',
        subtitle: 'Total client capital',
        defaultName: 'Assets Under Management',
        defaultUnit: '$',
        defaultCalculation: 'total',
        defaultTarget: (s) => String(REVENUE_BY_SIZE[s] * 10),
      },
      {
        id: 'arpu',
        badge: 'ARPU',
        title: 'Average Revenue Per User',
        subtitle: 'Revenue ÷ active users',
        defaultName: 'Average Revenue Per User',
        defaultUnit: '$',
        defaultCalculation: 'average',
        defaultTarget: () => '50',
      },
      {
        id: 'default',
        badge: 'DEFAULT',
        title: 'Default / fraud rate',
        subtitle: 'Lower is better',
        defaultName: 'Default / fraud rate',
        defaultUnit: '%',
        defaultCalculation: 'average',
        defaultTarget: () => '0.5',
      },
    ],
    goals: [
      { text: (s) => `Reach ${money(s)} TPV monthly` },
      { text: () => 'Obtain regulatory license in [region]' },
      { text: () => 'Reduce fraud rate below 0.5%' },
      { text: () => 'Launch new financial product (card, credit, etc.)' },
    ],
  },

  'Agency / Consulting': {
    metrics: [
      {
        id: 'mrr',
        badge: 'MRR',
        title: 'Retainer revenue',
        subtitle: 'Recurring monthly retainers',
        defaultName: 'Retainer revenue',
        defaultUnit: '$',
        defaultCalculation: 'total',
        defaultTarget: (s) => String(REVENUE_BY_SIZE[s]),
      },
      {
        id: 'util',
        badge: 'UTIL',
        title: 'Team utilization',
        subtitle: 'Billable hours ÷ capacity',
        defaultName: 'Team utilization',
        defaultUnit: '%',
        defaultCalculation: 'average',
        defaultTarget: () => '75',
      },
      {
        id: 'margin',
        badge: 'MARGIN',
        title: 'Project margin',
        subtitle: 'Profit per engagement',
        defaultName: 'Project margin',
        defaultUnit: '%',
        defaultCalculation: 'average',
        defaultTarget: () => '40',
      },
      {
        id: 'pipe',
        badge: 'PIPE',
        title: 'Pipeline value',
        subtitle: 'Open opportunities',
        defaultName: 'Pipeline value',
        defaultUnit: '$',
        defaultCalculation: 'total',
        defaultTarget: (s) => String(REVENUE_BY_SIZE[s] * 2),
      },
    ],
    goals: [
      { text: (s) => `Close ${money(s)} in new retainers` },
      { text: () => 'Hit 75% billable utilization' },
      { text: () => 'Sign 3 enterprise clients' },
      { text: () => 'Reduce project delivery time by 20%' },
    ],
  },

  'Media / Content': {
    metrics: [
      {
        id: 'mau',
        badge: 'MAU',
        title: 'Monthly Active Users',
        subtitle: 'Readers / viewers / listeners',
        defaultName: 'Monthly Active Users',
        defaultUnit: 'count',
        defaultCalculation: 'total',
        defaultTarget: () => '100000',
      },
      {
        id: 'subs',
        badge: 'SUBS',
        title: 'Paid subscribers',
        subtitle: 'Active paying audience',
        defaultName: 'Paid subscribers',
        defaultUnit: 'count',
        defaultCalculation: 'total',
        defaultTarget: () => '5000',
      },
      {
        id: 'eng',
        badge: 'ENG',
        title: 'Engagement rate',
        subtitle: 'Reads / opens / completions',
        defaultName: 'Engagement rate',
        defaultUnit: '%',
        defaultCalculation: 'average',
        defaultTarget: () => '35',
      },
      {
        id: 'rpm',
        badge: 'RPM',
        title: 'Revenue per mille',
        subtitle: 'Revenue per 1,000 impressions',
        defaultName: 'Revenue per mille',
        defaultUnit: '$',
        defaultCalculation: 'average',
        defaultTarget: () => '15',
      },
    ],
    goals: [
      { text: () => 'Reach X paid subscribers' },
      { text: () => 'Hit X million monthly readers/viewers' },
      { text: () => 'Launch new content vertical' },
      { text: () => 'Grow newsletter to X subscribers' },
    ],
  },

  'Education / EdTech': {
    metrics: [
      {
        id: 'enroll',
        badge: 'ENROLL',
        title: 'New enrollments',
        subtitle: 'Students added this period',
        defaultName: 'New enrollments',
        defaultUnit: 'count',
        defaultCalculation: 'total',
        defaultTarget: () => '300',
      },
      {
        id: 'compl',
        badge: 'COMPL',
        title: 'Completion rate',
        subtitle: '% who finish the course',
        defaultName: 'Completion rate',
        defaultUnit: '%',
        defaultCalculation: 'average',
        defaultTarget: () => '70',
      },
      {
        id: 'nps',
        badge: 'NPS',
        title: 'Student NPS',
        subtitle: 'Would-recommend score',
        defaultName: 'Student NPS',
        defaultUnit: 'count',
        defaultCalculation: 'average',
        defaultTarget: () => '50',
      },
      {
        id: 'ltv',
        badge: 'LTV',
        title: 'Student lifetime value',
        subtitle: 'Total revenue per student',
        defaultName: 'Student lifetime value',
        defaultUnit: '$',
        defaultCalculation: 'average',
        defaultTarget: () => '1200',
      },
    ],
    goals: [
      { text: () => 'Enroll X new students this quarter' },
      { text: () => 'Hit 70% course completion rate' },
      { text: () => 'Launch certification program' },
      { text: () => 'Expand to X new institutions/B2B accounts' },
    ],
  },

  'Healthcare / HealthTech': {
    metrics: [
      {
        id: 'patients',
        badge: 'PATIENTS',
        title: 'Active patients / users',
        subtitle: 'Currently in care',
        defaultName: 'Active patients',
        defaultUnit: 'count',
        defaultCalculation: 'total',
        defaultTarget: () => '1000',
      },
      {
        id: 'retention',
        badge: 'RETENTION',
        title: 'Patient retention',
        subtitle: 'Patients who stay engaged',
        defaultName: 'Patient retention',
        defaultUnit: '%',
        defaultCalculation: 'average',
        defaultTarget: () => '85',
      },
      {
        id: 'adherence',
        badge: 'ADHERENCE',
        title: 'Treatment adherence rate',
        subtitle: 'Care plans followed correctly',
        defaultName: 'Treatment adherence rate',
        defaultUnit: '%',
        defaultCalculation: 'average',
        defaultTarget: () => '80',
      },
      {
        id: 'reimb',
        badge: 'REIMB',
        title: 'Reimbursement rate',
        subtitle: 'Claims paid on first submission',
        defaultName: 'Reimbursement rate',
        defaultUnit: '%',
        defaultCalculation: 'average',
        defaultTarget: () => '90',
      },
    ],
    goals: [
      { text: () => 'Onboard X new clinics/providers' },
      { text: () => 'Achieve [regulatory] certification' },
      { text: () => 'Reduce patient no-show rate below 10%' },
      { text: () => 'Launch telehealth feature' },
    ],
  },

  'Manufacturing / Industrial': {
    metrics: [
      {
        id: 'oee',
        badge: 'OEE',
        title: 'Overall Equipment Effectiveness',
        subtitle: 'Availability × performance × quality',
        defaultName: 'Overall Equipment Effectiveness',
        defaultUnit: '%',
        defaultCalculation: 'average',
        defaultTarget: () => '85',
      },
      {
        id: 'otd',
        badge: 'OTD',
        title: 'On-time delivery',
        subtitle: 'Delivered when promised',
        defaultName: 'On-time delivery',
        defaultUnit: '%',
        defaultCalculation: 'average',
        defaultTarget: () => '95',
      },
      {
        id: 'defect',
        badge: 'DEFECT',
        title: 'Defect rate',
        subtitle: 'Lower is better',
        defaultName: 'Defect rate',
        defaultUnit: '%',
        defaultCalculation: 'average',
        defaultTarget: () => '1',
      },
      {
        id: 'margin',
        badge: 'MARGIN',
        title: 'Gross margin per unit',
        subtitle: 'Profit per unit shipped',
        defaultName: 'Gross margin per unit',
        defaultUnit: '%',
        defaultCalculation: 'average',
        defaultTarget: () => '35',
      },
    ],
    goals: [
      { text: () => 'Hit 85% OEE across plants' },
      { text: () => 'Reduce defect rate below 1%' },
      { text: () => 'Launch new product line' },
      { text: () => 'Cut lead time by 30%' },
    ],
  },

  'Real Estate / PropTech': {
    metrics: [
      {
        id: 'listings',
        badge: 'LISTINGS',
        title: 'Active listings',
        subtitle: 'Inventory on the market',
        defaultName: 'Active listings',
        defaultUnit: 'count',
        defaultCalculation: 'total',
        defaultTarget: () => '100',
      },
      {
        id: 'dtc',
        badge: 'DTC',
        title: 'Days to close',
        subtitle: 'Listing → signed contract',
        defaultName: 'Days to close',
        defaultUnit: 'count',
        defaultCalculation: 'average',
        defaultTarget: () => '45',
      },
      {
        id: 'occ',
        badge: 'OCC',
        title: 'Occupancy rate',
        subtitle: 'Units occupied vs. total',
        defaultName: 'Occupancy rate',
        defaultUnit: '%',
        defaultCalculation: 'average',
        defaultTarget: () => '95',
      },
      {
        id: 'gtv',
        badge: 'GTV',
        title: 'Gross transaction value',
        subtitle: 'Total value of closed deals',
        defaultName: 'Gross transaction value',
        defaultUnit: '$',
        defaultCalculation: 'total',
        defaultTarget: (s) => String(REVENUE_BY_SIZE[s] * 10),
      },
    ],
    goals: [
      { text: (s) => `Close ${money(s)} in transaction volume` },
      { text: () => 'Reach 95% occupancy across portfolio' },
      { text: () => 'Reduce average days-to-close to 30' },
      { text: () => 'Launch in X new markets' },
    ],
  },

  'Logistics / Supply Chain': {
    metrics: [
      {
        id: 'otd',
        badge: 'OTD',
        title: 'On-time delivery rate',
        subtitle: 'Shipments on schedule',
        defaultName: 'On-time delivery rate',
        defaultUnit: '%',
        defaultCalculation: 'average',
        defaultTarget: () => '98',
      },
      {
        id: 'cost_ship',
        badge: 'COST/SHIP',
        title: 'Cost per shipment',
        subtitle: 'Total cost ÷ shipments',
        defaultName: 'Cost per shipment',
        defaultUnit: '$',
        defaultCalculation: 'average',
        defaultTarget: () => '12',
      },
      {
        id: 'util',
        badge: 'UTIL',
        title: 'Fleet utilization',
        subtitle: 'Hours in service vs. capacity',
        defaultName: 'Fleet utilization',
        defaultUnit: '%',
        defaultCalculation: 'average',
        defaultTarget: () => '80',
      },
      {
        id: 'sla',
        badge: 'SLA',
        title: 'SLA compliance',
        subtitle: 'Service-level commitments met',
        defaultName: 'SLA compliance',
        defaultUnit: '%',
        defaultCalculation: 'average',
        defaultTarget: () => '99',
      },
    ],
    goals: [
      { text: () => 'Hit 98% on-time delivery' },
      { text: () => 'Reduce cost per shipment by 15%' },
      { text: () => 'Expand to X new lanes/regions' },
      { text: () => 'Launch same-day delivery in [city]' },
    ],
  },

  'Hospitality / Food & Beverage': {
    metrics: [
      {
        id: 'revpar',
        badge: 'REVPAR',
        title: 'Revenue per available room / cover',
        subtitle: 'RevPAR (hotels) · SPC (F&B)',
        defaultName: 'Revenue per available room / cover',
        defaultUnit: '$',
        defaultCalculation: 'average',
        defaultTarget: () => '120',
      },
      {
        id: 'occ',
        badge: 'OCC',
        title: 'Occupancy / table turnover',
        subtitle: 'Capacity actually used',
        defaultName: 'Occupancy / table turnover',
        defaultUnit: '%',
        defaultCalculation: 'average',
        defaultTarget: () => '85',
      },
      {
        id: 'nps',
        badge: 'NPS',
        title: 'Guest NPS',
        subtitle: 'Would-recommend score',
        defaultName: 'Guest NPS',
        defaultUnit: 'count',
        defaultCalculation: 'average',
        defaultTarget: () => '60',
      },
      {
        id: 'repeat',
        badge: 'REPEAT',
        title: 'Repeat guest rate',
        subtitle: 'Guests who come back',
        defaultName: 'Repeat guest rate',
        defaultUnit: '%',
        defaultCalculation: 'average',
        defaultTarget: () => '30',
      },
    ],
    goals: [
      { text: (s) => `Hit ${money(s)} RevPAR / monthly revenue` },
      { text: () => 'Achieve 85% occupancy' },
      { text: () => 'Launch loyalty program' },
      { text: () => 'Open X new locations' },
    ],
  },

  'Non-profit': {
    metrics: [
      {
        id: 'raised',
        badge: 'RAISED',
        title: 'Funds raised',
        subtitle: 'Total contributions this period',
        defaultName: 'Funds raised',
        defaultUnit: '$',
        defaultCalculation: 'total',
        defaultTarget: (s) => String(REVENUE_BY_SIZE[s]),
      },
      {
        id: 'donors',
        badge: 'DONORS',
        title: 'Active donors',
        subtitle: 'Donors giving this quarter',
        defaultName: 'Active donors',
        defaultUnit: 'count',
        defaultCalculation: 'total',
        defaultTarget: () => '500',
      },
      {
        id: 'impact',
        badge: 'IMPACT',
        title: 'Beneficiaries served',
        subtitle: 'People reached by programs',
        defaultName: 'Beneficiaries served',
        defaultUnit: 'count',
        defaultCalculation: 'total',
        defaultTarget: () => '1000',
      },
      {
        id: 'retention',
        badge: 'RETENTION',
        title: 'Donor retention rate',
        subtitle: 'Donors who give again',
        defaultName: 'Donor retention rate',
        defaultUnit: '%',
        defaultCalculation: 'average',
        defaultTarget: () => '60',
      },
    ],
    goals: [
      { text: (s) => `Raise ${money(s)} by end of quarter` },
      { text: () => 'Grow recurring donor base to X' },
      { text: () => 'Serve X beneficiaries' },
      { text: () => 'Launch new program/initiative' },
    ],
  },

  // Universal fallback for "Other" or unknown industries.
  'Other': {
    metrics: [
      {
        id: 'revenue',
        badge: 'REV',
        title: 'Weekly revenue',
        subtitle: 'Top-line momentum',
        defaultName: 'Weekly revenue',
        defaultUnit: '$',
        defaultCalculation: 'total',
        defaultTarget: (s) => String(Math.round(REVENUE_BY_SIZE[s] / 4)),
      },
      {
        id: 'new_customers',
        badge: 'NEW',
        title: 'New customers',
        subtitle: 'Growth velocity',
        defaultName: 'New customers',
        defaultUnit: 'count',
        defaultCalculation: 'total',
        defaultTarget: () => '20',
      },
      {
        id: 'csat',
        badge: 'CSAT',
        title: 'Customer satisfaction',
        subtitle: 'Average rating /5',
        defaultName: 'Customer satisfaction',
        defaultUnit: 'count',
        defaultCalculation: 'average',
        defaultTarget: () => '4.7',
      },
      {
        id: 'margin',
        badge: 'MARGIN',
        title: 'Profit margin',
        subtitle: 'Operational efficiency',
        defaultName: 'Profit margin',
        defaultUnit: '%',
        defaultCalculation: 'average',
        defaultTarget: () => '20',
      },
    ],
    goals: [
      { text: (s) => `Hit ${money(s)} in quarterly revenue` },
      { text: () => 'Acquire X new customers' },
      { text: () => 'Improve profit margin by 5 points' },
      { text: () => 'Launch one new product or service' },
    ],
  },
};

const VALID_TEAM_SIZES: TeamSizeKey[] = ['1–10', '11–50', '51–200', '201–500', '500+'];

const normalizeTeamSize = (size: string): TeamSizeKey => {
  return (VALID_TEAM_SIZES as string[]).includes(size) ? (size as TeamSizeKey) : '11–50';
};

const recommendationFor = (industry: string): Recommendation => {
  return RECOMMENDATIONS[industry] || RECOMMENDATIONS['Other'];
};

export const getRecommendedMetrics = (industry: string): RecMetric[] => {
  return recommendationFor(industry).metrics;
};

export const getRecommendedGoalTexts = (industry: string, teamSize: string): string[] => {
  const size = normalizeTeamSize(teamSize);
  return recommendationFor(industry).goals.map(g => g.text(size));
};

export const getDefaultMetricTarget = (metric: RecMetric, teamSize: string): string => {
  return metric.defaultTarget(normalizeTeamSize(teamSize));
};

/** Friendly label of the industry, used to render headings like "Suggested for SaaS". */
export const getIndustryDisplayLabel = (industry: string): string => {
  if (!industry) return 'your team';
  // Trim long labels for header use ("SaaS / Software" → "SaaS").
  const trimmed = industry.split(' / ')[0];
  return trimmed;
};
