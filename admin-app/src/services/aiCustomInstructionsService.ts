
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface CustomInstructions {
  id: string;
  user_id: string;
  instructions: string;
  template_variables: Record<string, string>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const loadUserInstructions = async (): Promise<CustomInstructions | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logger.log('No authenticated user for instructions load');
      return null;
    }

    const { data, error } = await supabase
      .from('ai_user_instructions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      logger.error('Error loading user instructions:', error);
      return null;
    }

    if (!data) return null;

    return {
      ...data,
      template_variables: (data.template_variables as Record<string, string>) || {}
    };
  } catch (error) {
    logger.error('Error loading user instructions:', error);
    return null;
  }
};

export const saveUserInstructions = async (
  instructions: string,
  templateVariables: Record<string, string> = {}
): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logger.log('No authenticated user for instructions save');
      return false;
    }

    // First, deactivate any existing instructions
    await supabase
      .from('ai_user_instructions')
      .update({ is_active: false })
      .eq('user_id', user.id);

    // Insert new instructions
    const { error } = await supabase
      .from('ai_user_instructions')
      .insert({
        user_id: user.id,
        instructions: instructions.trim(),
        template_variables: templateVariables,
        is_active: true
      });

    if (error) {
      logger.error('Error saving user instructions:', error);
      return false;
    }

    logger.log('User instructions saved successfully');
    return true;
  } catch (error) {
    logger.error('Error saving user instructions:', error);
    return false;
  }
};

export const deleteUserInstructions = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logger.log('No authenticated user for instructions delete');
      return false;
    }

    const { error } = await supabase
      .from('ai_user_instructions')
      .update({ is_active: false })
      .eq('user_id', user.id);

    if (error) {
      logger.error('Error deleting user instructions:', error);
      return false;
    }

    logger.log('User instructions deleted successfully');
    return true;
  } catch (error) {
    logger.error('Error deleting user instructions:', error);
    return false;
  }
};

export const formatInstructionsForAI = (
  instructions: CustomInstructions,
  contextVariables: Record<string, string> = {}
): string => {
  if (!instructions?.instructions) return '';

  let formattedInstructions = instructions.instructions;
  
  // Replace template variables
  const allVariables = { ...instructions.template_variables, ...contextVariables };
  
  Object.entries(allVariables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    formattedInstructions = formattedInstructions.replace(new RegExp(placeholder, 'g'), value);
  });

  return formattedInstructions;
};

// Predefined instruction templates
export const INSTRUCTION_TEMPLATES = {
  executive: `You are my strategic advisor and thought partner. I'm in a leadership role, so:
- Focus on high-level strategic insights and executive-level recommendations
- Emphasize ROI, competitive advantage, and long-term growth implications
- Ask challenging questions that help me think bigger and identify blind spots
- Present information in executive summary format when possible`,

  manager: `You are my operational thought partner. As a manager, I need:
- Practical, actionable insights that I can implement with my team
- Focus on team performance, process optimization, and tactical execution
- Help me identify bottlenecks and improve team efficiency
- Balance strategic thinking with day-to-day operational needs`,

  analyst: `You are my analytical partner. I work with data and need:
- Deep dives into metrics, trends, and quantitative insights
- Help interpreting complex data patterns and correlations
- Focus on statistical significance and data-driven recommendations
- Support with forecasting and predictive analysis`,

  entrepreneur: `You are my business advisor for a growing company. I need:
- Focus on scaling challenges, growth opportunities, and market positioning
- Help with resource allocation and priority setting during rapid growth
- Insights on building sustainable systems and processes
- Strategic guidance on funding, partnerships, and expansion decisions`,
};
