import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AddMemberModal } from '@/components/modals/AddMemberModal';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useOptimizedUserTeams } from '@/hooks/useOptimizedUserTeams';
import { createTeamWithMembers } from '@/services/teamOperationsService';
import { SECTION_LIBRARY } from '@/utils/meetingSectionMapping';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { trackFBSQLOnce } from '@/utils/facebookTracking';
import {
  Users,
  Calendar,
  Clock,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Plus,
  UserPlus,
  X,
} from 'lucide-react';

interface MeetingWizardOnboardingProps {
  onComplete: () => void;
  onDismiss: () => void;
}

type WizardStep = 'choose-type' | 'configure' | 'success';

const L10_AGENDA = [
  { title: 'Good News', duration: 5 },
  { title: 'Metrics', duration: 5 },
  { title: 'Goals', duration: 5 },
  { title: 'Headlines', duration: 5 },
  { title: 'Tasks', duration: 5 },
  { title: 'Issues', duration: 60 },
  { title: 'Wrap Up', duration: 5 },
];

// Build custom sections from the real SECTION_LIBRARY, excluding 'custom_section'
// Wrap Up is always included (required), all others default to enabled
const CUSTOM_SECTIONS = SECTION_LIBRARY
  .filter(s => s.type !== 'custom_section')
  .map(s => ({
    id: s.id,
    title: s.title,
    duration: s.defaultDuration,
    type: s.type,
    enabled: true,
    required: s.type === 'wrap_up',
  }));

export const MeetingWizardOnboarding: React.FC<MeetingWizardOnboardingProps> = ({
  onComplete,
  onDismiss,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const { teams, refetch: refetchTeams } = useOptimizedUserTeams();

  const [step, setStep] = useState<WizardStep>('choose-type');
  const [selectedType, setSelectedType] = useState<'l10' | 'custom' | null>(null);
  const [customSections, setCustomSections] = useState(CUSTOM_SECTIONS);
  const [loading, setLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const totalDuration = selectedType === 'l10'
    ? L10_AGENDA.reduce((sum, s) => sum + s.duration, 0)
    : customSections.filter(s => s.enabled).reduce((sum, s) => sum + s.duration, 0);

  const toggleSection = (id: string) => {
    setCustomSections(prev =>
      prev.map(s => s.id === id && !s.required ? { ...s, enabled: !s.enabled } : s)
    );
  };

  const handleSelectType = (type: 'l10' | 'custom') => {
    setSelectedType(type);
    setStep('configure');
  };

  const handleConfirmAgenda = () => {
    // Just advance to success screen — no meeting created yet
    setStep('success');
  };

  const handleCreateAndOpenMeeting = async () => {
    if (!user || !currentCompany) return;
    setLoading(true);

    try {
      // Step 1: Ensure a team exists — create "Leadership Team" if none
      let teamId: string;

      if (teams.length > 0) {
        teamId = teams[0].id;
      } else {
        logger.log('MeetingWizard: No teams found, creating Leadership Team');
        const newTeam = await createTeamWithMembers(
          'Leadership Team',
          currentCompany.id,
          user.id,
          'Auto-created during onboarding',
          [],
          true // isLeadership
        );
        teamId = newTeam.id;
        await refetchTeams();
      }

      // Step 2: Create the meeting
      const now = new Date().toISOString();
      const meetingType = selectedType === 'l10' ? 'weekly' : 'custom';

      const insertData: Record<string, any> = {
        team_id: teamId,
        status: 'active',
        started_at: now,
        started_by: user.id,
        scriber_id: user.id,
        meeting_type: meetingType,
        current_section: 0,
        section_start_time: now,
        section_durations: {},
        section_accumulated_times: {},
        is_paused: false,
        total_pause_duration: 0,
        role_assignments: { [user.id]: 'scriber' },
        audience_type: 'team',
        selected_members: null,
      };

      // For custom meetings, attach the agenda with real section types
      if (selectedType === 'custom') {
        const enabledSections = customSections.filter(s => s.enabled);
        insertData.custom_agenda = enabledSections.map((s, i) => ({
          id: String(i + 1),
          title: s.title,
          duration: s.duration,
          type: s.type,
          completed: false,
        }));
        insertData.meeting_title = 'Custom Meeting';
      }

      const { data: meeting, error } = await supabase
        .from('meetings_state')
        .insert(insertData)
        .select('id')
        .single();

      if (error) {
        logger.error('MeetingWizard: Failed to create meeting', error);
        throw error;
      }
      if (meeting?.id) {
        trackFBSQLOnce({
          userId: user.id,
          meetingId: meeting.id,
          teamId,
          meetingType,
        });
      }

      // Dispatch optimistic event for the floating widget
      window.dispatchEvent(new CustomEvent('optimistic-meeting-creation'));

      // Mark onboarding as complete
      await supabase
        .from('profiles')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', user.id);

      // Navigate to the live meeting
      navigate(`/meeting/${teamId}/${meetingType}`);
      onComplete();
    } catch (err) {
      logger.error('MeetingWizard: Error during meeting creation', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteTeam = () => {
    setShowInviteModal(true);
  };

  const handleMemberAdded = () => {
    // Just trigger a refresh — modal stays open for more invites,
    // user returns to the wizard success screen when they close it
  };

  const handleGoToDashboard = () => {
    // Mark onboarding as complete without creating a meeting
    if (user) {
      supabase
        .from('profiles')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', user.id);
    }
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onDismiss} />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
      >
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pt-6 pb-2">
          {['choose-type', 'configure', 'success'].map((s, i) => {
            const stepIndex = ['choose-type', 'configure', 'success'].indexOf(step);
            return (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === stepIndex ? 'w-8 bg-primary' : i < stepIndex ? 'w-2 bg-primary/60' : 'w-2 bg-muted'
                }`}
              />
            );
          })}
        </div>

        <div className="p-6 pt-4">
          <AnimatePresence mode="wait">
            {/* Step 1: Choose Meeting Type */}
            {step === 'choose-type' && (
              <motion.div
                key="choose-type"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    Set up your first meeting
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Choose a meeting type to get started with your team
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* L10 Card */}
                  <button
                    onClick={() => handleSelectType('l10')}
                    className="group p-4 rounded-lg border-2 border-border hover:border-primary bg-card hover:bg-primary/5 transition-all text-left"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">L10 Meeting</h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      The EOS Level 10 weekly meeting with a proven 90-minute agenda
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>90 min</span>
                    </div>
                  </button>

                  {/* Custom Card */}
                  <button
                    onClick={() => handleSelectType('custom')}
                    className="group p-4 rounded-lg border-2 border-border hover:border-primary bg-card hover:bg-primary/5 transition-all text-left"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Plus className="h-4 w-4 text-blue-500" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">Custom Meeting</h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      Build your own agenda with the sections you need
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Flexible</span>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Configure Agenda */}
            {step === 'configure' && (
              <motion.div
                key="configure"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-foreground mb-1">
                    {selectedType === 'l10' ? 'L10 Meeting Agenda' : 'Configure Your Agenda'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedType === 'l10'
                      ? 'The proven 90-minute EOS agenda — ready to go'
                      : 'Toggle sections on or off to customize'}
                  </p>
                </div>

                <div className="space-y-1.5 mb-4 max-h-[280px] overflow-y-auto">
                  {selectedType === 'l10' ? (
                    L10_AGENDA.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/50"
                      >
                        <span className="text-sm font-medium text-foreground">{item.title}</span>
                        <span className="text-xs text-muted-foreground">{item.duration} min</span>
                      </div>
                    ))
                  ) : (
                    customSections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => toggleSection(section.id)}
                        disabled={section.required}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
                          section.required
                            ? 'bg-muted/50 border border-border cursor-default'
                            : section.enabled
                              ? 'bg-primary/5 border border-primary/20'
                              : 'bg-muted/30 border border-transparent opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                              section.enabled ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                            }`}
                          >
                            {section.enabled && <CheckCircle2 className="h-3 w-3 text-white" />}
                          </div>
                          <span className="text-sm font-medium text-foreground">{section.title}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{section.duration} min</span>
                      </button>
                    ))
                  )}
                </div>

                <div className="flex items-center justify-between px-1 mb-4">
                  <span className="text-xs text-muted-foreground">Total duration</span>
                  <span className="text-sm font-semibold text-foreground">{totalDuration} min</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep('choose-type')}
                    className="h-10"
                  >
                    Back
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConfirmAgenda}
                    disabled={selectedType === 'custom' && customSections.filter(s => s.enabled).length === 0}
                    className="flex-1 h-10"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Ready to go */}
            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                    className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4"
                  >
                    <Sparkles className="h-8 w-8 text-green-500" />
                  </motion.div>
                  <h2 className="text-xl font-bold text-foreground mb-2">You're all set!</h2>
                  <p className="text-sm text-muted-foreground">
                    Ready to start your first meeting? You can also invite your team first.
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-4 mb-6 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Meeting</span>
                    <span className="font-medium text-foreground">
                      {selectedType === 'l10' ? 'Weekly Meeting (L10)' : 'Custom Meeting'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium text-foreground">
                      {selectedType === 'l10' ? 'Level 10' : 'Custom'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium text-foreground">{totalDuration} min</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button onClick={handleCreateAndOpenMeeting} disabled={loading} className="w-full h-10">
                    {loading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Creating meeting...
                      </>
                    ) : (
                      <>
                        Open My Meeting
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleInviteTeam} className="w-full h-10">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Team Member
                  </Button>
                  <Button variant="ghost" onClick={handleGoToDashboard} className="w-full h-10 text-muted-foreground">
                    Go to Dashboard
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Invite Team Member Modal */}
      <AddMemberModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        onMemberAdded={handleMemberAdded}
      />
    </div>
  );
};
