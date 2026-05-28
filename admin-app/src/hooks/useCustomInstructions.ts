
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { 
  loadUserInstructions, 
  saveUserInstructions, 
  deleteUserInstructions,
  formatInstructionsForAI,
  CustomInstructions 
} from '@/services/aiCustomInstructionsService';

export const useCustomInstructions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [instructions, setInstructions] = useState<CustomInstructions | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadInstructions = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const userInstructions = await loadUserInstructions();
      setInstructions(userInstructions);
      logger.log('📝 Custom instructions loaded:', userInstructions ? 'Found' : 'None');
    } catch (error) {
      logger.error('Error loading instructions:', error);
      toast({
        title: "Error",
        description: "Failed to load your custom instructions.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const saveInstructions = useCallback(async (
    instructionsText: string, 
    templateVariables: Record<string, string> = {}
  ) => {
    if (!user) return false;
    
    setSaving(true);
    try {
      const success = await saveUserInstructions(instructionsText, templateVariables);
      if (success) {
        await loadInstructions(); // Reload to get the updated instructions
        toast({
          title: "Success",
          description: "Your AI instructions have been saved successfully.",
          variant: "default"
        });
        return true;
      } else {
        throw new Error('Failed to save instructions');
      }
    } catch (error) {
      logger.error('Error saving instructions:', error);
      toast({
        title: "Error",
        description: "Failed to save your custom instructions. Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [user, toast, loadInstructions]);

  const deleteInstructions = useCallback(async () => {
    if (!user) return false;
    
    setSaving(true);
    try {
      const success = await deleteUserInstructions();
      if (success) {
        setInstructions(null);
        toast({
          title: "Success",
          description: "Your custom instructions have been removed.",
          variant: "default"
        });
        return true;
      } else {
        throw new Error('Failed to delete instructions');
      }
    } catch (error) {
      logger.error('Error deleting instructions:', error);
      toast({
        title: "Error",
        description: "Failed to delete your custom instructions. Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [user, toast]);

  const getFormattedInstructions = useCallback((contextVariables: Record<string, string> = {}) => {
    if (!instructions) return '';
    return formatInstructionsForAI(instructions, contextVariables);
  }, [instructions]);

  const hasInstructions = useCallback(() => {
    return instructions && instructions.instructions.trim().length > 0;
  }, [instructions]);

  // Load instructions on mount
  useEffect(() => {
    loadInstructions();
  }, [loadInstructions]);

  return {
    instructions,
    loading,
    saving,
    loadInstructions,
    saveInstructions,
    deleteInstructions,
    getFormattedInstructions,
    hasInstructions
  };
};
