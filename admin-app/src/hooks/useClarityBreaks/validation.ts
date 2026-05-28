
import type { User } from '@supabase/supabase-js';

export interface ValidationContext {
  user: User | null;
  currentCompany: { id: string } | null;
}

export const validateUserAndCompany = (context: ValidationContext): boolean => {
  return !!(context.user && context.currentCompany);
};

export const createValidationGuard = (context: ValidationContext) => {
  return () => {
    if (!validateUserAndCompany(context)) {
      throw new Error('User or company context missing');
    }
  };
};
