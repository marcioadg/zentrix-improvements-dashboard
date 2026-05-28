export type StrategyMode = 'pre-revenue' | 'scaling' | 'plateaued';

export interface StrategyModeData {
  title: string;
  subtitle: string;
  questions: string[];
}

export const strategyModes: Record<StrategyMode, StrategyModeData> = {
  'pre-revenue': {
    title: 'Pre-Revenue Startup',
    subtitle: 'Find truth, not comfort. Validate before you scale.',
    questions: [
      'What urgent problem are we solving — and for whom?',
      'Why is now the right time for this solution?',
      'Have we validated the pain with actual customers (not friends)?',
      'What\'s the minimum version of this that delivers a real win?',
      'Why will early adopters switch from status quo?',
      'What existing behaviors are we piggybacking on?',
      'What do we believe that others don\'t?',
      'What\'s our unfair advantage or wedge into the market?',
      'How will we acquire first 100 users with zero ad spend?',
      'What will break first if this works?'
    ]
  },
  'scaling': {
    title: 'Scaling Company',
    subtitle: 'Systematize, simplify, and amplify what\'s already working.',
    questions: [
      'What core product or segment is driving 80% of growth?',
      'What\'s the bottleneck stopping us from 3X\'ing revenue?',
      'Which roles/processes are cracking under scale?',
      'What can only we do — and what must we stop doing?',
      'Where is CAC creeping up, and how do we fix it?',
      'Is our pricing model aligned with customer value?',
      'What would a world-class version of our customer experience look like?',
      'Where are we still founder-reliant?',
      'What\'s our plan to attract, onboard, and retain A-players?',
      'Are our KPIs leading or lagging — and who owns them?'
    ]
  },
  'plateaued': {
    title: 'Plateaued Business',
    subtitle: 'Diagnose, refocus, reinvent, or exit.',
    questions: [
      'Have we stopped talking to customers weekly?',
      'Which parts of our offering are still loved? Which are irrelevant?',
      'Are we in a crowded market pretending we\'re differentiated?',
      'Is our team solving $10K problems or $10/hour tasks?',
      'What would we do differently if we started this business today?',
      'What strategic bets did we avoid that now cost us?',
      'What sacred cows need killing (products, people, habits)?',
      'Where are we coasting on legacy rather than performance?',
      'Are we chasing growth — or just staying busy?',
      'What would it take to sell this company for 10X more?'
    ]
  }
};