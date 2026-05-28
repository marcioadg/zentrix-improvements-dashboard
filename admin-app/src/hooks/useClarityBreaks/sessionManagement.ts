import { logger } from '@/utils/logger';

interface ClarityBreak {
  id: string;
  user_id: string;
  company_id?: string;
  started_at: string;
  ended_at?: string;
  duration_minutes?: number;
  insights?: string;
  session_prompts?: string[];
  created_at: string;
}

interface ClarityBreakEntry {
  id: string;
  break_id: string;
  user_id: string;
  company_id?: string;
  prompt: string;
  response?: string;
  created_at: string;
}

// Default prompts to use as fallback
const FORCED_PROMPTS = [
  "What is stopping us from 10X the business?",
  "Am I focusing on the most important things?",
  "Do I have the Right People in the Right Seats to grow?"
];

const RANDOMIZABLE_PROMPTS = [
  "What is the one \"people move\" that I must make this quarter?",
  "Is the Vision and Plan for the business/department on track?",
  "How strong is my bench?",
  "If I lose a key player, do I have someone ready to fill the seat?",
  "Are my processes working well?",
  "What seems overly complicated that must be simplified?",
  "Are we focusing on better, more, new, in this order?",
  "Do I understand what my direct reports truly love to do and are great at doing?",
  "Am I leveraging their strengths?",
  "What can I delegate to others in order to use my time more effectively?",
  "What can we do to be more proactive versus being reactive?",
  "What can I do to improve communication?",
  "What's my top priority this week? This month?",
  "What has been taking my attention?",
  "Where should my attention be?",
  "Where do I want to be spending my time?",
  "What seats am I sitting in that I enjoy?",
  "What seats am I sitting in that I don't like?",
  "What are my unique abilities?",
  "How can I coach my team towards growth?",
  "What should I be coaching team members on?",
  "What does my ideal EOS life look like?",
  "What is stopping me from living my ideal EOS life?",
  "What is a major hassle for my team that needs to be resolved?",
  "What is a major hassle for the organization that needs to be resolved?",
  "What is a major hassle for our customers that needs to be resolved?",
  "How can I show appreciation/give praise in more specific ways?",
  "What professional development do I/we need to grow into our future?",
  "VTO: Review your vision, goals, and key milestones to ensure alignment and clarity across the organization.",
  "Accountability Chart: Confirm that every seat has clear ownership and that roles match current and future needs.",
  "Scorecard: Evaluate key metrics to identify where performance is on track and where attention is needed.",
  "Delegate & Elevate: Identify low-value tasks you should delegate so you can focus on your unique abilities.",
  "Notes or key takeaways: Revisit insights from books, webinars, masterminds, or podcasts to spark new ideas and reinforce strategic thinking."
];

// Simple hash function to create deterministic randomness based on session ID
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Deterministic shuffle using session ID as seed
function deterministicShuffle<T>(array: T[], seed: string): T[] {
  const shuffled = [...array];
  const hash = simpleHash(seed);
  
  // Use a simple linear congruential generator for predictable randomness
  let rng = hash;
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff;
    const j = rng % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

// Function to generate 7 random questions from the randomizable pool using session ID as seed
function getRandomizedQuestions(sessionId: string): string[] {
  const shuffled = deterministicShuffle(RANDOMIZABLE_PROMPTS, sessionId);
  return shuffled.slice(0, 7);
}

// Function to generate a complete set of session prompts (for new sessions)
function generateSessionPrompts(): string[] {
  const randomQuestions = [...RANDOMIZABLE_PROMPTS].sort(() => 0.5 - Math.random()).slice(0, 7);
  return [...FORCED_PROMPTS, ...randomQuestions];
}

// Function to generate session prompts deterministically based on session ID
function generateSessionPromptsForSession(sessionId: string): string[] {
  logger.log('🎲 Generating deterministic prompts for session:', sessionId);
  const randomQuestions = getRandomizedQuestions(sessionId);
  const prompts = [...FORCED_PROMPTS, ...randomQuestions];
  logger.log('✅ Generated', prompts.length, 'deterministic prompts');
  return prompts;
}

export const sessionUtils = {
  findIncompleteSession: (sessions: ClarityBreak[]): ClarityBreak | null => {
    return sessions.find(session => !session.ended_at) || null;
  },

  prepareResumeData: (session: ClarityBreak, entries: ClarityBreakEntry[]) => {
    logger.log('🔄 Preparing resume data for session:', session.id);
    logger.log('📋 Session prompts from DB:', session.session_prompts?.length || 0);
    logger.log('📄 Existing entries:', entries.length);
    
    let sessionPrompts = session.session_prompts || [];
    
    // If session prompts are missing or empty, generate deterministic prompts using session ID
    if (!sessionPrompts || sessionPrompts.length === 0) {
      logger.warn('⚠️ Session prompts missing, generating deterministic prompts using session ID');
      sessionPrompts = generateSessionPromptsForSession(session.id);
    }
    
    // Validate that we have exactly 10 prompts
    if (sessionPrompts.length !== 10) {
      logger.warn('⚠️ Invalid number of session prompts:', sessionPrompts.length, 'expected 10, regenerating deterministically');
      sessionPrompts = generateSessionPromptsForSession(session.id);
    }
    
    logger.log('✅ Final session prompts count:', sessionPrompts.length);
    
    return {
      session,
      entries,
      sessionPrompts,
    };
  },

  generateSessionPrompts,
  generateSessionPromptsForSession
};
