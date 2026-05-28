import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface OfferSession {
  id: string;
  userId: string;
  companyId?: string;
  teamId?: string;
  offerName?: string;
}

export interface OfferSection {
  id: string;
  sessionId: string;
  sectionType: string;
  sectionData: Record<string, any>;
}

export interface BonusItem {
  id: string;
  sessionId: string;
  name: string;
  description?: string;
  deliveryFormat?: string;
  valueAmount?: number;
  deliveryTiming?: string;
  objectionHandled?: string;
  urgencyType?: string;
  justification?: string;
  displayOrder: number;
}

export interface ObjectionItem {
  id: string;
  sessionId: string;
  objection: string;
  responseBonus?: string;
  salesScript?: string;
  isResolved: boolean;
  displayOrder: number;
}

export const useOfferBuilder = (userId: string | null, companyId: string | null) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<OfferSession | null>(null);
  const [sections, setSections] = useState<OfferSection[]>([]);
  const [bonusItems, setBonusItems] = useState<BonusItem[]>([]);
  const [objections, setObjections] = useState<ObjectionItem[]>([]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    loadOrCreateSession();
  }, [userId, companyId]);

  const loadOrCreateSession = async () => {
    try {
      setLoading(true);
      
      // First, try to find existing session
      const { data: existingSessions, error: sessionError } = await supabase
        .from('offer_builder_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (sessionError) throw sessionError;

      let currentSession = existingSessions?.[0];

      // Create session if none exists
      if (!currentSession) {
        const { data: newSession, error: createError } = await supabase
          .from('offer_builder_sessions')
          .insert({
            user_id: userId,
            company_id: companyId,
          })
          .select()
          .single();

        if (createError) throw createError;
        currentSession = newSession;
      }

      setSession(currentSession);

      // Load existing data for this session
      await Promise.all([
        loadSections(currentSession.id),
        loadBonusItems(currentSession.id),
        loadObjections(currentSession.id)
      ]);
    } catch (error) {
      logger.error('Error loading offer builder session:', error);
      toast({
        title: "Error Loading Session",
        description: "Failed to load your offer builder session.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSections = async (sessionId: string) => {
    const { data, error } = await supabase
      .from('offer_builder_sections')
      .select('*')
      .eq('session_id', sessionId);

    if (error) throw error;
    setSections(data || []);
  };

  const loadBonusItems = async (sessionId: string) => {
    const { data, error } = await supabase
      .from('offer_bonus_items')
      .select('*')
      .eq('session_id', sessionId)
      .order('display_order');

    if (error) throw error;
    setBonusItems(data || []);
  };

  const loadObjections = async (sessionId: string) => {
    const { data, error } = await supabase
      .from('offer_objections')
      .select('*')
      .eq('session_id', sessionId)
      .order('display_order');

    if (error) throw error;
    setObjections(data || []);
  };

  const saveSection = async (sectionType: string, sectionData: Record<string, any>) => {
    if (!session || !userId) return;

    try {
      const payload = {
        session_id: session.id,
        user_id: userId,
        company_id: companyId,
        section_type: sectionType,
        section_data: sectionData,
      };

      const { data, error } = await supabase
        .from('offer_builder_sections')
        .upsert(payload, { onConflict: 'session_id,section_type' })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setSections(prev => {
        const existingIndex = prev.findIndex(s => s.sectionType === sectionType);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = data;
          return updated;
        } else {
          return [...prev, data];
        }
      });
    } catch (error) {
      logger.error('Error saving offer section:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save your offer data.",
        variant: "destructive",
      });
    }
  };

  const saveBonusItem = async (bonusItem: Omit<BonusItem, 'id' | 'sessionId'>) => {
    if (!session || !userId) return;

    try {
      const payload = {
        ...bonusItem,
        session_id: session.id,
        user_id: userId,
        company_id: companyId,
      };

      const { data, error } = await supabase
        .from('offer_bonus_items')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      setBonusItems(prev => [...prev, data]);
      return data;
    } catch (error) {
      logger.error('Error saving bonus item:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save bonus item.",
        variant: "destructive",
      });
    }
  };

  const updateBonusItem = async (id: string, updates: Partial<BonusItem>) => {
    try {
      const { data, error } = await supabase
        .from('offer_bonus_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setBonusItems(prev => prev.map(item => item.id === id ? data : item));
    } catch (error) {
      logger.error('Error updating bonus item:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update bonus item.",
        variant: "destructive",
      });
    }
  };

  const deleteBonusItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('offer_bonus_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBonusItems(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      logger.error('Error deleting bonus item:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete bonus item.",
        variant: "destructive",
      });
    }
  };

  const saveObjection = async (objection: Omit<ObjectionItem, 'id' | 'sessionId'>) => {
    if (!session || !userId) return;

    try {
      const payload = {
        ...objection,
        session_id: session.id,
        user_id: userId,
        company_id: companyId,
      };

      const { data, error } = await supabase
        .from('offer_objections')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      setObjections(prev => [...prev, data]);
      return data;
    } catch (error) {
      logger.error('Error saving objection:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save objection.",
        variant: "destructive",
      });
    }
  };

  const updateObjection = async (id: string, updates: Partial<ObjectionItem>) => {
    try {
      const { data, error } = await supabase
        .from('offer_objections')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setObjections(prev => prev.map(item => item.id === id ? data : item));
    } catch (error) {
      logger.error('Error updating objection:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update objection.",
        variant: "destructive",
      });
    }
  };

  const deleteObjection = async (id: string) => {
    try {
      const { error } = await supabase
        .from('offer_objections')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setObjections(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      logger.error('Error deleting objection:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete objection.",
        variant: "destructive",
      });
    }
  };

  const getSectionData = (sectionType: string) => {
    return sections.find(s => s.sectionType === sectionType)?.sectionData || {};
  };

  const getProgress = () => {
    const valueEquationData = getSectionData('value-equation');
    const grandSlamData = getSectionData('grand-slam');
    const riskReversalData = getSectionData('risk-reversal');
    const scarcityData = getSectionData('scarcity-urgency');
    const pricingData = getSectionData('pricing');

    const sectionsCompleted = [
      Object.keys(valueEquationData).length > 0,
      Object.keys(grandSlamData).length > 0,
      bonusItems.length > 0,
      objections.length > 0,
      Object.keys(riskReversalData).length > 0,
      Object.keys(scarcityData).length > 0,
      Object.keys(pricingData).length > 0,
    ].filter(Boolean).length;

    const fieldsTotal = 22; // Approximate total fields across all sections
    const fieldsCompleted = Math.min(sectionsCompleted * 3, fieldsTotal);

    return {
      sectionsCompleted,
      totalSections: 7,
      fieldsCompleted,
      fieldsTotal,
      valueScore: Math.min(sectionsCompleted * 15, 100), // Value score out of 100
    };
  };

  return {
    loading,
    session,
    sections,
    bonusItems,
    objections,
    saveSection,
    saveBonusItem,
    updateBonusItem,
    deleteBonusItem,
    saveObjection,
    updateObjection,
    deleteObjection,
    getSectionData,
    getProgress,
  };
};