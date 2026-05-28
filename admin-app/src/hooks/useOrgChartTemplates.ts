import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface OrgChartTemplate {
  id: string;
  name: string;
  description: string | null;
  is_global: boolean;
  company_id: string | null;
  template_data: {
    roles: Array<{
      temp_id: string;
      title: string;
      responsibilities: string;
      personality_color: string;
      reports_to_temp_id: string | null;
      position_x: number;
    }>;
  };
}

interface TemplateRole {
  temp_id: string;
  title: string;
  responsibilities: string;
  personality_color: string;
  reports_to_temp_id: string | null;
  position_x: number;
}

export const useOrgChartTemplates = (currentCompanyId: string | null) => {
  const [templates, setTemplates] = useState<OrgChartTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  // Fetch available templates
  const fetchTemplates = async () => {
    if (!currentCompanyId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('org_chart_templates')
        .select('*')
        .or(`is_global.eq.true,company_id.eq.${currentCompanyId}`)
        .order('is_global', { ascending: false })
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      logger.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  // Load a template
  const loadTemplate = async (
    templateId: string,
    mode: 'replace' | 'append',
    onSuccess?: () => void
  ) => {
    if (!currentCompanyId) {
      toast.error('No company selected');
      return;
    }

    setLoadingTemplate(true);
    try {
      // Fetch template
      const { data: template, error: templateError } = await supabase
        .from('org_chart_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;
      if (!template) {
        toast.error('Template not found');
        return;
      }

      const roles: TemplateRole[] = template.template_data.roles;

      // If replace mode, delete existing roles
      if (mode === 'replace') {
        const { error: deleteError } = await supabase
          .from('org_roles')
          .delete()
          .eq('company_id', currentCompanyId);

        if (deleteError) throw deleteError;
        logger.log('✅ Deleted existing roles');
      }

      // Create mapping from temp_id to real id
      const tempIdToRealId = new Map<string, string>();

      // First pass: Create all roles without parent relationships
      logger.log(`🔄 Creating ${roles.length} roles...`);
      for (const roleData of roles) {
        const { data: newRole, error: createError } = await supabase
          .from('org_roles')
          .insert({
            title: roleData.title,
            responsibilities: roleData.responsibilities,
            personality_color: roleData.personality_color,
            company_id: currentCompanyId,
            reports_to_role_id: null,
            position_x: roleData.position_x,
          })
          .select()
          .single();

        if (createError) {
          logger.error('❌ Error creating role:', roleData.title, createError);
          throw createError;
        }

        if (newRole) {
          tempIdToRealId.set(roleData.temp_id, newRole.id);
          logger.log(`✅ Created role: ${roleData.title} (${roleData.temp_id} → ${newRole.id})`);
        } else {
          logger.error('❌ No role returned for:', roleData.title);
          throw new Error(`Failed to create role: ${roleData.title}`);
        }
      }

      // Verify all roles were created
      logger.log(`📊 Mapping complete. Total mappings: ${tempIdToRealId.size}`);
      logger.log('Temp ID to Real ID map:', Object.fromEntries(tempIdToRealId));

      // Second pass: Update parent relationships
      logger.log(`🔗 Updating parent relationships...`);
      const relationshipUpdates = [];
      
      for (const roleData of roles) {
        if (roleData.reports_to_temp_id) {
          const realId = tempIdToRealId.get(roleData.temp_id);
          const parentRealId = tempIdToRealId.get(roleData.reports_to_temp_id);

          logger.log(`🔍 Processing ${roleData.title}:`, {
            temp_id: roleData.temp_id,
            reports_to_temp_id: roleData.reports_to_temp_id,
            realId,
            parentRealId
          });

          if (!realId) {
            logger.error(`❌ Missing real ID for role: ${roleData.title} (${roleData.temp_id})`);
            continue;
          }

          if (!parentRealId) {
            logger.error(`❌ Missing parent real ID for: ${roleData.title} → ${roleData.reports_to_temp_id}`);
            continue;
          }

          relationshipUpdates.push({ realId, parentRealId, title: roleData.title, parentTempId: roleData.reports_to_temp_id });
        }
      }

      // Execute all relationship updates
      logger.log(`🚀 Executing ${relationshipUpdates.length} relationship updates...`);
      for (const update of relationshipUpdates) {
        const { error: updateError } = await supabase
          .from('org_roles')
          .update({ reports_to_role_id: update.parentRealId })
          .eq('id', update.realId);

        if (updateError) {
          logger.error(`❌ Error updating parent relationship for ${update.title}:`, updateError);
          throw updateError;
        }

        logger.log(`✅ Linked ${update.title} → parent (${update.parentTempId})`);
      }

      logger.log(`✨ Template loading complete!`);

      toast.success(`Template "${template.name}" loaded successfully!`);
      onSuccess?.();
    } catch (error) {
      logger.error('Error loading template:', error);
      toast.error('Failed to load template');
    } finally {
      setLoadingTemplate(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [currentCompanyId]);

  return {
    templates,
    loading,
    loadingTemplate,
    fetchTemplates,
    loadTemplate,
  };
};
