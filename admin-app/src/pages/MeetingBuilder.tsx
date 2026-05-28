import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, Save, Play, ArrowLeft, Edit2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AgendaItem } from '@/types/meeting';
import { SectionListItem } from '@/components/meeting/CustomMeetingBuilder/SectionListItem';
import { AddSectionModal } from '@/components/meeting/CustomMeetingBuilder/AddSectionModal';
import { SectionEditor } from '@/components/meeting/CustomMeetingBuilder/SectionEditor';
import { SaveTemplateModal } from '@/components/meeting/CustomMeetingBuilder/SaveTemplateModal';
import { SectionTemplate, ensureWrapUpSection } from '@/utils/meetingSectionMapping';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { AudienceSelector } from '@/components/meeting/CustomMeetingBuilder/AudienceSelector';
import { MemberSelectorModal } from '@/components/meeting/CustomMeetingBuilder/MemberSelectorModal';
import { TemplateSelectorButton } from '@/components/meeting/CustomMeetingBuilder/TemplateSelectorButton';
import { TemplateManagerModal } from '@/components/meeting/CustomMeetingBuilder/TemplateManagerModal';
import { CustomMeetingRoleModal } from '@/components/meeting/CustomMeetingRoleModal';
import { SaveDraftPromptModal } from '@/components/meeting/CustomMeetingBuilder/SaveDraftPromptModal';
import { SaveChangesPromptModal } from '@/components/meeting/CustomMeetingBuilder/SaveChangesPromptModal';
import { useSimpleTeams } from '@/hooks/useSimpleTeams';
import { useUserList } from '@/hooks/useUserList';
import { useCustomMeetingTemplates } from '@/hooks/meeting/useCustomMeetingTemplates';
import { useAutosaveText } from '@/hooks/useAutosaveText';
import { useAllActiveMeetings } from '@/hooks/useAllActiveMeetings';
import { logger } from '@/utils/logger';
import { trackFBSQLOnce } from '@/utils/facebookTracking';

export default function MeetingBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('template');
  
  const { currentCompany } = useMultiCompanyAccess();
  const { teams, loading: teamsLoading } = useSimpleTeams();
  const { users } = useUserList();
  const { refetch: refetchTemplates } = useCustomMeetingTemplates();
  const { broadcastMeetingStarted } = useAllActiveMeetings();
  
  const [meetingName, setMeetingName] = useState('Draft Meeting');
  const [templateName, setTemplateName] = useState<string | null>('Draft Template');
  const [isEditingName, setIsEditingName] = useState(false);
  const [sections, setSections] = useState<AgendaItem[]>(
    ensureWrapUpSection([
      { id: '1', title: 'Good News', duration: 5, completed: false, type: 'good_news' }
    ])
  );
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number | null>(null);
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [isMemberSelectorOpen, setIsMemberSelectorOpen] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [loadedTemplateOwnerId, setLoadedTemplateOwnerId] = useState<string | null>(null);
  const [loadedTemplateShared, setLoadedTemplateShared] = useState<boolean>(false);
  const [originalTemplateSections, setOriginalTemplateSections] = useState<AgendaItem[]>([]);
  const [initialDraftSections, setInitialDraftSections] = useState<AgendaItem[]>([]);
  const [initialDraftMeetingName, setInitialDraftMeetingName] = useState('Draft Meeting');
  const loadedTemplateRef = useRef<string | null>(null);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isSaveDraftPromptOpen, setIsSaveDraftPromptOpen] = useState(false);
  const [isSaveChangesPromptOpen, setIsSaveChangesPromptOpen] = useState(false);
  const [pendingActionAfterSave, setPendingActionAfterSave] = useState<'new-draft' | string | null>(null);
  const [modalContext, setModalContext] = useState<'navigation' | 'start-meeting' | null>(null);
  
  // Get current user from auth context
  const { user } = useAuth();
  
  // Audience selection state
  const [audienceType, setAudienceType] = useState<'team' | 'members'>('team');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberTeamName, setMemberTeamName] = useState<string>('');
  
  // Track team created from member selection modal
  const [createdMemberTeamId, setCreatedMemberTeamId] = useState<string | null>(null);
  const [createdMemberTeamName, setCreatedMemberTeamName] = useState<string | null>(null);

  // Auto-select first team when teams load
  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      logger.log('✅ Auto-selecting first team:', teams[0].name, teams[0].id);
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  // Load template if templateId is provided
  useEffect(() => {
    const loadTemplate = async () => {
      if (!templateId) {
        loadedTemplateRef.current = null;
        return;
      }
      
      // Skip if already loaded this template
      if (loadedTemplateRef.current === templateId) {
        return;
      }
      
      setIsLoadingTemplate(true);
      try {
        logger.log('🔍 Loading template:', templateId);
        
        const { data, error } = await supabase
          .from('meeting_templates')
          .select('*')
          .eq('id', templateId)
          .single();

        if (error) throw error;
        
        if (data) {
          logger.log('✅ Template loaded:', data.name);
          setTemplateName(data.name);
          setMeetingName(data.meeting_title || 'Meeting');
          const loadedSections = data.sections || [{ id: '1', title: 'Good News', duration: 5, completed: false, type: 'good_news' }];
          const sectionsWithWrapUp = ensureWrapUpSection(loadedSections);
          setSections(sectionsWithWrapUp);
          setOriginalTemplateSections(sectionsWithWrapUp);
          setLoadedTemplateOwnerId(data.owner_id);
          setLoadedTemplateShared(data.shared || false);
          
          // Only show toast if this is a new template load
          toast.success(`Loaded template: ${data.name}`);
          loadedTemplateRef.current = templateId; // Mark as loaded
        }
      } catch (error) {
        logger.error('❌ Error loading template:', error);
        toast.error('Failed to load template');
      } finally {
        setIsLoadingTemplate(false);
      }
    };

    loadTemplate();
  }, [templateId]);

  const totalDuration = useMemo(() => {
    return sections.reduce((total, section) => total + section.duration, 0);
  }, [sections]);

  // Check if user is the owner of the loaded template
  const isOwner = useMemo(() => {
    return templateId && loadedTemplateOwnerId && user?.id && loadedTemplateOwnerId === user.id;
  }, [templateId, loadedTemplateOwnerId, user?.id]);

  // Check if user can edit (owner OR shared template)
  const canEdit = useMemo(() => {
    if (!templateId) return true; // New drafts can always be edited
    return isOwner || loadedTemplateShared;
  }, [templateId, isOwner, loadedTemplateShared]);

  // Check if there are unsaved changes to existing template
  const hasUnsavedChanges = useMemo(() => {
    if (!canEdit || originalTemplateSections.length === 0) return false;
    return JSON.stringify(sections) !== JSON.stringify(originalTemplateSections);
  }, [sections, originalTemplateSections, canEdit]);

  // Check if there are unsaved changes in new draft
  const hasUnsavedDraftChanges = useMemo(() => {
    if (templateId) return false; // Only for new drafts
    
    const sectionsChanged = JSON.stringify(sections) !== JSON.stringify(initialDraftSections);
    const nameChanged = meetingName !== initialDraftMeetingName;
    
    return sectionsChanged || nameChanged;
  }, [templateId, sections, initialDraftSections, meetingName, initialDraftMeetingName]);

  // Combined check for any unsaved changes
  const hasAnyUnsavedChanges = hasUnsavedChanges || hasUnsavedDraftChanges;

  // Autosave meeting name when it changes
  useAutosaveText(meetingName, {
    delay: 2000,
    enabled: !!templateId && canEdit,
    onSave: async (text) => {
      if (!templateId) return;
      logger.log('🔄 Auto-saving meeting name:', text);
      
      const { error } = await supabase
        .from('meeting_templates')
        .update({ 
          meeting_title: text,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId);

      if (error) {
        logger.error('❌ Failed to auto-save meeting name:', error);
        throw error;
      }
      
      logger.log('✅ Meeting name auto-saved');
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setSections((sections) => {
        const oldIndex = sections.findIndex((s) => s.id === active.id);
        const newIndex = sections.findIndex((s) => s.id === over.id);
        const reordered = arrayMove(sections, oldIndex, newIndex);
        
        // Ensure Wrap Up stays at the end after reordering
        return ensureWrapUpSection(reordered);
      });
    }
  };

  const handleAddSection = (template: SectionTemplate) => {
    const newSection: AgendaItem = {
      id: `section-${Date.now()}`,
      title: template.title,
      duration: template.defaultDuration,
      completed: false,
      type: template.type,
    };
    
    // Add new section before Wrap Up (insert at end, then ensureWrapUpSection will move Wrap Up to the end)
    const updatedSections = ensureWrapUpSection([...sections, newSection]);
    setSections(updatedSections);
    toast.success(`Added ${template.title} section`);
  };

  const handleLoadPreset = (presetSections: SectionTemplate[]) => {
    const newSections: AgendaItem[] = presetSections.map((template, index) => ({
      id: `section-${Date.now()}-${index}`,
      title: template.title,
      duration: template.defaultDuration,
      completed: false,
      type: template.type,
      required: template.required,
    }));
    
    const updatedSections = ensureWrapUpSection(newSections);
    setSections(updatedSections);
    setSelectedSectionIndex(null);
    toast.success('Loaded meeting template sections');
  };

  const handleDeleteSection = (index: number) => {
    const section = sections[index];
    
    // Prevent deletion of required sections
    if (section.required) {
      toast.error('Wrap Up section is required and cannot be deleted');
      return;
    }
    
    if (sections.length === 1) {
      toast.error('Cannot delete the last section');
      return;
    }
    
    setSections(sections.filter((_, i) => i !== index));
    if (selectedSectionIndex === index) {
      setSelectedSectionIndex(null);
    }
    toast.success('Section deleted');
  };

  const handleEditSection = (index: number) => {
    setSelectedSectionIndex(index);
  };

  const handleUpdateSection = (index: number, updates: Partial<AgendaItem>) => {
    const updatedSections = [...sections];
    updatedSections[index] = {
      ...updatedSections[index],
      ...updates,
    };
    setSections(updatedSections);
  };

  const handleQuickSave = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to save');
      return;
    }

    // Case 1: New draft - show modal to get name/description
    if (!templateId) {
      setIsSaveTemplateModalOpen(true);
      return;
    }

    // Case 2: Existing template - direct update (no modal)
    if (!canEdit) {
      toast.error('You can only edit templates you own or that are shared with you');
      return;
    }

    try {
      const { error } = await supabase
        .from('meeting_templates')
        .update({
          meeting_title: meetingName,
          sections: sections,
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId);

      if (error) throw error;

      setOriginalTemplateSections(sections);
      toast.success('Template updated successfully!');
    } catch (error) {
      logger.error('Error updating template:', error);
      toast.error('Failed to update template');
    }
  };

  const handleTemplateSaved = async (newTemplateId: string) => {
    logger.log('✅ Template saved with ID:', newTemplateId);
    
    // Check if there's a pending action (user was switching templates/starting new draft)
    if (pendingActionAfterSave) {
      logger.log('📋 Executing pending action after save:', pendingActionAfterSave);
      
      if (pendingActionAfterSave === 'new-draft') {
        // Start a new draft
        const defaultName = 'Draft Meeting';
        const defaultSections = ensureWrapUpSection([
          { id: '1', title: 'Good News', duration: 5, completed: false, type: 'good_news' }
        ]);
        
        navigate('/meeting/custom/builder');
        setMeetingName(defaultName);
        setSections(defaultSections);
        setTemplateName('Draft Template');
        setLoadedTemplateOwnerId(null);
        setLoadedTemplateShared(false);
        setOriginalTemplateSections([]);
        setInitialDraftSections(defaultSections);
        setInitialDraftMeetingName(defaultName);
        loadedTemplateRef.current = null;
        
        toast.success('Started new draft');
      } else {
        // Load the pending template
        await handleTemplateSelect(pendingActionAfterSave);
      }
      
      setPendingActionAfterSave(null);
      setIsTemplateManagerOpen(false);
      return;
    }
    
    // Normal flow: Update URL to reflect the new template ID
    navigate(`/meeting/custom/builder?template=${newTemplateId}`, { replace: true });
    
    // Update local state to treat this as an existing template now
    setOriginalTemplateSections(sections);
    setLoadedTemplateOwnerId(user?.id ?? null);
    loadedTemplateRef.current = newTemplateId;
    
    // Refresh templates list
    await refetchTemplates();
    
    toast.success('Template created successfully!');
    
    // Check the modal context to determine next action
    if (modalContext === 'start-meeting') {
      // User was trying to start a meeting - proceed to role selection
      logger.log('🎯 Opening role modal after save');
      setIsRoleModalOpen(true);
    } else if (modalContext === 'navigation') {
      // User was trying to navigate away - go to meetings page
      logger.log('📤 Navigating to /meetings after saving template');
      navigate('/meetings');
    }
    
    // Clear the context
    setModalContext(null);
  };

  const handleTemplateSelect = async (selectedTemplateId: string) => {
    logger.log('📋 Template selected:', selectedTemplateId);

    try {
      const { data: templateData, error } = await supabase
        .from('meeting_templates')
        .select('*')
        .eq('id', selectedTemplateId)
        .single();

      if (error) throw error;

      logger.log('✅ Template loaded:', templateData);

      // Update URL with template ID
      navigate(`/meeting/custom/builder?template=${selectedTemplateId}`);
      
      setTemplateName(templateData.name);
      setMeetingName(templateData.meeting_title || 'Meeting');
      setSections(templateData.sections || []);
      setOriginalTemplateSections(templateData.sections || []);
      setLoadedTemplateOwnerId(templateData.owner_id);
      setLoadedTemplateShared(templateData.shared || false);
      loadedTemplateRef.current = selectedTemplateId;

      toast.success('Template loaded successfully');
    } catch (error) {
      logger.error('❌ Error loading template:', error);
      toast.error('Failed to load template');
    }
  };

  const handleStartNewDraft = () => {
    // Reset to fresh state
    navigate('/meeting/custom/builder');
    const defaultName = 'Draft Meeting';
    const defaultSections = ensureWrapUpSection([
      { id: '1', title: 'Good News', duration: 5, completed: false, type: 'good_news' }
    ]);
    
    setMeetingName(defaultName);
    setSections(defaultSections);
    setTemplateName('Draft Template');
    setLoadedTemplateOwnerId(null);
    setLoadedTemplateShared(false);
    setOriginalTemplateSections([]);
    
    loadedTemplateRef.current = null;
    
    toast.success('Started new draft');
  };

  const handleStartMeeting = async () => {
    // Validate audience selection
    if (audienceType === 'team' && !selectedTeamId) {
      toast.error('Please select a team');
      return;
    }
    if (audienceType === 'members' && selectedMemberIds.length === 0) {
      toast.error('Please select at least one member');
      return;
    }

    // Check for existing active meeting for the selected team
    if (audienceType === 'team' && selectedTeamId) {
      try {
        const { data: existingMeeting, error } = await supabase
          .from('meetings_state')
          .select('id')
          .eq('team_id', selectedTeamId)
          .eq('meeting_type', 'custom')
          .eq('status', 'active')
          .limit(1)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          logger.error('Error checking for active meeting:', error);
        }

        if (existingMeeting) {
          toast.error('There is already an active custom meeting for this team. Please select a different team or finalize the existing meeting first.');
          return;
        }
      } catch (error) {
        logger.error('Error checking for active meeting:', error);
      }
    }

    // Set context for modals
    setModalContext('start-meeting');

    // Check if draft is unsaved (no templateId in URL)
    if (!templateId) {
      // Show save draft prompt modal first
      setIsSaveDraftPromptOpen(true);
    } else if (hasUnsavedChanges) {
      // Template exists but has unsaved changes
      setIsSaveChangesPromptOpen(true);
    } else {
      // Template exists and no changes, proceed directly to role selection
      setIsRoleModalOpen(true);
    }
  };

  const handleBackToMeetings = () => {
    logger.log('🔙 Back button clicked - checking for unsaved changes');
    
    // Set context for modals
    setModalContext('navigation');

    // Check if there are any unsaved changes
    if (!templateId && hasUnsavedDraftChanges) {
      // New draft with unsaved changes - show save draft prompt
      logger.log('📋 New draft with unsaved changes - showing save prompt');
      setIsSaveDraftPromptOpen(true);
    } else if (templateId && hasUnsavedChanges) {
      // Existing template with unsaved changes - show save changes prompt
      logger.log('📝 Template with unsaved changes - showing save prompt');
      setIsSaveChangesPromptOpen(true);
    } else {
      // No unsaved changes - navigate directly
      logger.log('✅ No unsaved changes - navigating to /meetings');
      navigate('/meetings');
    }
  };

  const handleSaveDraftBeforeMeeting = () => {
    setIsSaveDraftPromptOpen(false);
    
    if (modalContext === 'navigation') {
      // User is navigating away - save and then navigate
      setIsSaveTemplateModalOpen(true);
      // Note: After saving in SaveTemplateModal, we won't navigate automatically
      // because it's a new template save. User would need to navigate manually.
    } else {
      // User is starting a meeting - save and then proceed to role selection
      setIsSaveTemplateModalOpen(true);
    }
  };

  const handleContinueWithoutSaving = () => {
    setIsSaveDraftPromptOpen(false);
    
    if (modalContext === 'navigation') {
      // Navigate away without saving
      logger.log('📤 Continuing to /meetings without saving');
      navigate('/meetings');
    } else {
      // Proceed to role selection without saving
      setIsRoleModalOpen(true);
    }
    
    setModalContext(null);
  };

  const handleCancelSaveDraft = () => {
    setIsSaveDraftPromptOpen(false);
    setModalContext(null);
  };

  const handleSaveChangesBeforeMeeting = async () => {
    setIsSaveChangesPromptOpen(false);
    await handleQuickSave();
    
    if (modalContext === 'navigation') {
      // Navigate after saving
      logger.log('📤 Navigating to /meetings after saving changes');
      navigate('/meetings');
    } else {
      // After saving, proceed to role selection
      setIsRoleModalOpen(true);
    }
    
    setModalContext(null);
  };

  const handleContinueWithoutSavingChanges = () => {
    setIsSaveChangesPromptOpen(false);
    
    if (modalContext === 'navigation') {
      // Navigate away without saving changes
      logger.log('📤 Continuing to /meetings without saving changes');
      navigate('/meetings');
    } else {
      // Proceed to role selection without saving
      setIsRoleModalOpen(true);
    }
    
    setModalContext(null);
  };

  const handleCancelSaveChanges = () => {
    setIsSaveChangesPromptOpen(false);
    setModalContext(null);
  };

  const handleRoleSelected = async (role: 'scriber' | 'participant') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to start a meeting');
        return;
      }

      // ========== CUSTOM MEMBER MEETING PATH - Use pre-created team ==========
      if (audienceType === 'members') {
        logger.log('📌 Starting custom member meeting with pre-created team');

        // Validate that team was created via modal
        if (!createdMemberTeamId) {
          toast.error('Please select members first');
          setIsMemberSelectorOpen(true);
          return;
        }

        try {
          // Create meeting with pre-created team
          const now = new Date().toISOString();
          const { data: meeting, error } = await supabase
            .from('meetings_state')
            .insert({
              team_id: createdMemberTeamId,
              company_id: currentCompany?.id,
              status: 'active',
              started_at: now,
              started_by: user.id,
              scriber_id: role === 'scriber' ? user.id : null,
              meeting_type: 'custom',
              meeting_title: meetingName,
              current_section: 0,
              section_start_time: now,
              section_durations: {},
              section_accumulated_times: {},
              is_paused: false,
              total_pause_duration: 0,
              role_assignments: { [user.id]: role },
              custom_agenda: ensureWrapUpSection(sections),
              audience_type: 'members',
              selected_members: selectedMemberIds
            })
            .select()
            .single();

          if (error) throw error;
          trackFBSQLOnce({
            userId: user.id,
            meetingId: meeting.id,
            companyId: currentCompany?.id,
            teamId: createdMemberTeamId,
            meetingType: 'custom',
          });

          // Track custom_meeting_started event (non-blocking)
          try {
            const { trackCustomMeetingStarted } = await import('@/lib/statsigAnalytics');
            logger.log('📊 Tracking custom_meeting_started (members):', {
              user_id: user.id,
              company_id: currentCompany?.id,
              meeting_id: meeting.id,
            });
            trackCustomMeetingStarted({
              user_id: user.id,
              company_id: currentCompany?.id,
              meeting_id: meeting.id,
            });
          } catch (e) {
            logger.error('❌ Error tracking custom_meeting_started:', e);
          }

          // HIGH-PERFORMANCE SYNC: Broadcast with full meeting data for instant sync
          if (broadcastMeetingStarted) {
            logger.log('📤 MeetingBuilder: Broadcasting member meeting_started after DB insert');
            broadcastMeetingStarted(createdMemberTeamId, 'custom', {
              id: meeting.id,
              team_id: createdMemberTeamId,
              team_name: createdMemberTeamName || memberTeamName,
              company_name: currentCompany?.name || '',
              meeting_type: 'custom',
              current_section: 0,
              started_at: now,
              status: 'active',
              scriber_id: role === 'scriber' ? user.id : null
            });
          }

          toast.success('Custom member meeting started!');
          
          // Navigate using team ID for consistency
          navigate(`/meeting/${createdMemberTeamId}/custom`, {
            state: { 
              meetingType: 'custom',
              customAgenda: ensureWrapUpSection(sections),
              audienceType: 'members',
              selectedMembers: selectedMemberIds,
              preSelectedRole: role,
              createdTeamId: createdMemberTeamId
            }
          });

          // Reset state
          setMemberTeamName('');
          setCreatedMemberTeamId(null);
          setCreatedMemberTeamName(null);
          
        } catch (error) {
          logger.error('❌ Error starting meeting:', error);
          toast.error('Failed to start meeting');
          return;
        }
      }
      
      // ========== CUSTOM TEAM MEETING PATH (UNCHANGED) ==========
      else if (audienceType === 'team' && selectedTeamId) {
        logger.log('📌 Creating custom team meeting');
        
        // Check for existing active meeting
        const { data: existingMeetings } = await supabase
          .from('meetings_state')
          .select('id, team_id, meeting_title')
          .eq('status', 'active')
          .eq('meeting_type', 'custom')
          .eq('team_id', selectedTeamId)
          .limit(1);

        if (existingMeetings && existingMeetings.length > 0) {
          toast.error('This team already has an active custom meeting');
          navigate(`/meeting/${selectedTeamId}/custom`);
          return;
        }

        // Fetch the company_id from the selected team
        const { data: teamData } = await supabase
          .from('teams')
          .select('company_id')
          .eq('id', selectedTeamId)
          .single();
        
        const now = new Date().toISOString();
        const { data: meeting, error } = await supabase
          .from('meetings_state')
          .insert({
            team_id: selectedTeamId,
            company_id: teamData?.company_id || currentCompany?.id || null,
            status: 'active',
            started_at: now,
            started_by: user.id,
            scriber_id: role === 'scriber' ? user.id : null,
            meeting_type: 'custom',
            meeting_title: meetingName,
            current_section: 0,
            section_start_time: now,
            section_durations: {},
            section_accumulated_times: {},
            is_paused: false,
            total_pause_duration: 0,
            role_assignments: { [user.id]: role },
            custom_agenda: ensureWrapUpSection(sections),
            audience_type: 'team',
            selected_members: null
          })
          .select()
          .single();

        if (error) throw error;
        trackFBSQLOnce({
          userId: user.id,
          meetingId: meeting.id,
          companyId: teamData?.company_id || currentCompany?.id || null,
          teamId: selectedTeamId,
          meetingType: 'custom',
        });

        // Track custom_meeting_started event (non-blocking)
        try {
          const { trackCustomMeetingStarted } = await import('@/lib/statsigAnalytics');
          logger.log('📊 Tracking custom_meeting_started (team):', {
            user_id: user.id,
            company_id: teamData?.company_id || currentCompany?.id,
            meeting_id: meeting.id,
          });
          trackCustomMeetingStarted({
            user_id: user.id,
            company_id: teamData?.company_id || currentCompany?.id,
            meeting_id: meeting.id,
          });
        } catch (e) {
          logger.error('❌ Error tracking custom_meeting_started:', e);
        }

        // HIGH-PERFORMANCE SYNC: Broadcast with full meeting data for instant sync
        if (broadcastMeetingStarted) {
          logger.log('📤 MeetingBuilder: Broadcasting team meeting_started after DB insert');
          broadcastMeetingStarted(selectedTeamId, 'custom', {
            id: meeting.id,
            team_id: selectedTeamId,
            team_name: teams.find(t => t.id === selectedTeamId)?.name || '',
            company_name: currentCompany?.name || '',
            meeting_type: 'custom',
            current_section: 0,
            started_at: now,
            status: 'active',
            scriber_id: role === 'scriber' ? user.id : null
          });
        }

        toast.success('Custom team meeting started!');
        navigate(`/meeting/${selectedTeamId}/custom`, {
          state: { 
            meetingType: 'custom',
            customAgenda: ensureWrapUpSection(sections),
            audienceType: 'team',
            preSelectedRole: role
          }
        });
      }
      
    } catch (error) {
      logger.error('Error starting custom meeting:', error);
      toast.error('Failed to start meeting');
    }
  };

  const selectedSection = selectedSectionIndex !== null ? sections[selectedSectionIndex] : null;

  if (!currentCompany) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Please select a company to continue</p>
      </div>
    );
  }

  if (isLoadingTemplate) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading template...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="shrink-0 sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Back to meetings"
                onClick={handleBackToMeetings}
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              {isEditingName ? (
                <Input
                  value={meetingName}
                  onChange={(e) => setMeetingName(e.target.value)}
                  onBlur={() => setIsEditingName(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditingName(false);
                    }
                  }}
                  className="w-[280px] text-lg font-semibold"
                  placeholder="Enter meeting name"
                  autoFocus
                />
              ) : (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 group">
                    <h1 className="text-lg font-semibold">{meetingName}</h1>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit meeting name"
                      onClick={() => setIsEditingName(true)}
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <TemplateSelectorButton
                      currentTemplateId={templateId || undefined}
                      currentTemplateName={templateName}
                      meetingName={meetingName}
                      onClick={() => setIsTemplateManagerOpen(true)}
                      hasUnsavedChanges={hasUnsavedChanges}
                    />
                  </div>
                  {templateName && (
                    <span className="text-xs text-muted-foreground">
                      Template: {templateName}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <AudienceSelector
              audienceType={audienceType}
              onAudienceTypeChange={(type) => {
                setAudienceType(type);
                // Reset created team when switching away from members mode
                if (type === 'team') {
                  setCreatedMemberTeamId(null);
                  setCreatedMemberTeamName(null);
                }
              }}
              selectedTeamId={selectedTeamId}
              onTeamSelect={setSelectedTeamId}
              teams={teams}
              selectedMemberIds={selectedMemberIds}
              onOpenMemberSelector={() => setIsMemberSelectorOpen(true)}
              teamsLoading={teamsLoading}
            />
            
            <div className="flex items-center gap-2 ml-auto">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Save Changes"
                        onClick={handleQuickSave}
                        disabled={
                          sections.length === 0 ||
                          !user?.id ||
                          (templateId && !canEdit) ||
                          (templateId && !hasUnsavedChanges)
                        }
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {templateId && !canEdit 
                        ? "You can only edit templates you own or that are shared with you"
                        : !user?.id
                        ? "Log in to save"
                        : sections.length === 0
                        ? "Add sections to save" 
                        : templateId && !hasUnsavedChanges
                        ? "No unsaved changes"
                        : templateId
                        ? "Save Changes" 
                        : "Save Changes (will prompt for name)"
                      }
                    </p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Save as new template"
                      onClick={() => setIsSaveTemplateModalOpen(true)}
                      disabled={sections.length === 0}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Save as New Template</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Start meeting"
                        onClick={handleStartMeeting}
                        disabled={
                          sections.length === 0 ||
                          (audienceType === 'team' && !selectedTeamId) ||
                          (audienceType === 'members' && selectedMemberIds.length === 0)
                        }
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Start Meeting</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 h-full px-6 py-6">
          {/* Sidebar - Sections List */}
          <div className="lg:col-span-1 flex flex-col min-h-0 h-full gap-4">
            <div className="flex items-center justify-between shrink-0">
              <h2 className="text-lg font-semibold text-foreground">Agenda Sections</h2>
              <span className="text-sm text-muted-foreground">{totalDuration} min total</span>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2 pr-4">
                    {sections.map((section, index) => (
                      <SectionListItem
                        key={section.id}
                        section={section}
                        index={index}
                        isSelected={selectedSectionIndex === index}
                        onEdit={handleEditSection}
                        onDelete={handleDeleteSection}
                        onUpdate={handleUpdateSection}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </ScrollArea>

            <Button
              onClick={() => setIsAddSectionModalOpen(true)}
              variant="outline"
              className="w-full shrink-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </div>

          {/* Main Area - Section Editor or Preview */}
          <div className="lg:col-span-5 flex flex-col min-h-0 h-full">
            <ScrollArea className="flex-1 min-h-0">
              <div className="h-full pr-4">
                {selectedSection ? (
                  <SectionEditor
                    section={selectedSection}
                    onCancel={() => setSelectedSectionIndex(null)}
                    onUpdate={(updates) => {
                      if (selectedSectionIndex !== null) {
                        handleUpdateSection(selectedSectionIndex, updates);
                      }
                    }}
                    selectedTeamId={selectedTeamId}
                    audienceType={audienceType}
                  />
                ) : (
                  <div className="flex items-center justify-center min-h-[400px] border border-dashed border-border rounded-lg bg-muted/20">
                    <div className="text-center space-y-2">
                      <p className="text-muted-foreground">
                        Select a section to edit or add a new section
                      </p>
                      <Button onClick={() => setIsAddSectionModalOpen(true)} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Add a section
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddSectionModal
        isOpen={isAddSectionModalOpen}
        onClose={() => setIsAddSectionModalOpen(false)}
        onAddSection={handleAddSection}
        onLoadPreset={handleLoadPreset}
      />

      <SaveTemplateModal
        isOpen={isSaveTemplateModalOpen}
        onClose={() => setIsSaveTemplateModalOpen(false)}
        meetingName={meetingName}
        sections={sections}
        companyId={currentCompany?.id}
        onTemplateSaved={handleTemplateSaved}
      />

      <MemberSelectorModal
        open={isMemberSelectorOpen}
        onOpenChange={setIsMemberSelectorOpen}
        members={users}
        selectedMembers={selectedMemberIds}
        onSelectionChange={setSelectedMemberIds}
        currentUserId={user?.id ?? undefined}
        loading={false}
        teamName={memberTeamName}
        onTeamNameChange={setMemberTeamName}
        companyId={currentCompany?.id}
        existingTeamId={createdMemberTeamId}
        existingTeamName={createdMemberTeamName}
        onTeamCreated={(teamId, teamName) => {
          logger.log('✅ Team created from modal:', { teamId, teamName });
          setCreatedMemberTeamId(teamId);
          setCreatedMemberTeamName(teamName);
        }}
        onTeamUpdated={(teamId) => {
          logger.log('✅ Team updated from modal:', teamId);
          // Team ID stays the same, just refresh if needed
        }}
      />

      <TemplateManagerModal
        open={isTemplateManagerOpen}
        onOpenChange={setIsTemplateManagerOpen}
        currentTemplateId={templateId}
        onTemplateSelect={handleTemplateSelect}
        onStartNewDraft={handleStartNewDraft}
        hasUnsavedChanges={hasAnyUnsavedChanges}
        currentUserId={user?.id ?? null}
        onSaveChanges={handleQuickSave}
        isNewDraft={!templateId}
        onOpenSaveTemplateModal={() => setIsSaveTemplateModalOpen(true)}
        onSetPendingAction={setPendingActionAfterSave}
      />

      <SaveDraftPromptModal
        isOpen={isSaveDraftPromptOpen}
        onSave={handleSaveDraftBeforeMeeting}
        onContinue={handleContinueWithoutSaving}
        onCancel={handleCancelSaveDraft}
      />

      <SaveChangesPromptModal
        isOpen={isSaveChangesPromptOpen}
        onSave={handleSaveChangesBeforeMeeting}
        onContinue={handleContinueWithoutSavingChanges}
        onCancel={handleCancelSaveChanges}
      />

      <CustomMeetingRoleModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        onRoleSelected={handleRoleSelected}
        teamName={audienceType === 'team' ? teams.find(t => t.id === selectedTeamId)?.name : undefined}
        audienceType={audienceType}
        memberCount={audienceType === 'members' ? selectedMemberIds.length : undefined}
      />
    </div>
  );
}
