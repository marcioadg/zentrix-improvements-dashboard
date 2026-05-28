/**
 * MobileHeaderMenu — center-of-header tappable element that shows the
 * current company name and opens a bottom sheet with:
 *   - Company list + switcher (for users with multiple companies)
 *   - Quick navigation to the mobile-only pages that aren't in the
 *     bottom nav today: Org Chart, Analytics, Meetings
 *
 * Used by MobilePageHeader's search-mode layout (replacing the legacy
 * Building2-icon company switcher + wide search field). Not consumed
 * elsewhere — MobileCompanySwitcher continues to serve AppLayout and
 * MobileSearchBar without modification.
 *
 * Meetings flow (mobile-only): tapping the Meetings row opens an in-sheet
 * picker — first the meeting TYPE (weekly / quarterly / annual), then, if
 * the user belongs to more than one team, a TEAM picker scoped to teams
 * the current user is a member of (useSimpleTeams). With a single team,
 * the team step is skipped. Final destination is the existing
 * /m/meeting/:teamId/:meetingType route — no new routes introduced.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  BarChart3,
  Network,
  Play,
  Check,
  Building2,
  ArrowLeft,
  Calendar,
  CalendarRange,
  CalendarCheck,
  Users,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { useSimpleTeams } from '@/hooks/useSimpleTeams';
import { useAllActiveMeetings } from '@/hooks/useAllActiveMeetings';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type MeetingPickStep = 'menu' | 'type' | 'team';
type MeetingType = 'weekly' | 'quarterly' | 'annual';

const MEETING_TYPE_OPTIONS: ReadonlyArray<{
  type: MeetingType;
  label: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { type: 'weekly', label: 'Weekly', description: 'Level 10 cadence — scorecard, rocks, IDS.', Icon: Calendar },
  { type: 'quarterly', label: 'Quarterly', description: 'Rocks, V/TO pulse, and tools review.', Icon: CalendarRange },
  { type: 'annual', label: 'Annual', description: 'Yearly planning and reflection.', Icon: CalendarCheck },
];

export const MobileHeaderMenu: React.FC = () => {
  const navigate = useNavigate();
  const { companies, currentCompany, switchCompany, hasMultipleCompanies } =
    useMultiCompanyAccess();
  const { teams } = useSimpleTeams();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [step, setStep] = useState<MeetingPickStep>('menu');
  const [pickedType, setPickedType] = useState<MeetingType | null>(null);
  const { toast } = useToast();

  const sortedCompanies = useMemo(() => {
    return [...companies].sort((a, b) => {
      if (a.id === currentCompany?.id) return -1;
      if (b.id === currentCompany?.id) return 1;
      return 0;
    });
  }, [companies, currentCompany?.id]);

  const hasTeams = teams.length > 0;

  const resetPickers = () => {
    setStep('menu');
    setPickedType(null);
  };

  const handleSheetOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) resetPickers();
  };

  const handleCompanySwitch = async (companyId: string) => {
    if (companyId === currentCompany?.id || switching) return;
    setSwitching(true);
    try {
      await switchCompany(companyId);
      setOpen(false);
      resetPickers();
      toast({
        title: 'Company switched',
        description: `Switched to ${companies.find((c) => c.id === companyId)?.name}`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to switch company',
        variant: 'destructive',
      });
    } finally {
      setSwitching(false);
    }
  };

  const go = (path: string) => {
    setOpen(false);
    resetPickers();
    navigate(path);
  };

  // Tapping "Meetings" opens the type picker inside the sheet.
  const handleMeetingsTap = () => {
    if (!hasTeams) return;
    setStep('type');
  };

  // Picking a type: with one team, jump straight to the meeting room. With
  // more than one, advance to the team picker (scoped to the user's teams).
  const handleTypePick = (type: MeetingType) => {
    if (!hasTeams) return;
    if (teams.length === 1) {
      go(`/m/meeting/${teams[0].id}/${type}`);
      return;
    }
    setPickedType(type);
    setStep('team');
  };

  const handleTeamPick = (teamId: string) => {
    if (!pickedType) return;
    go(`/m/meeting/${teamId}/${pickedType}`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open company and shortcuts"
        className={cn(
          'flex-1 min-w-0 inline-flex items-center justify-center gap-1.5',
          'h-9 px-3 rounded-[6px] bg-muted/60 text-foreground',
          'transition-all duration-150 active:scale-[0.98]',
        )}
      >
        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-[13px] font-semibold tracking-tight truncate">
          {currentCompany?.name ?? 'Select company'}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </button>

      <Sheet open={open} onOpenChange={handleSheetOpenChange}>
        <SheetContent
          side="bottom"
          className="z-[101] rounded-t-[22px] max-h-[80vh] p-0 overflow-hidden flex flex-col"
        >
          <SheetHeader className="px-5 pt-4 pb-3 border-b border-border/40">
            {step === 'menu' && (
              <>
                <SheetTitle className="text-[17px] font-bold tracking-[-0.01em] text-left">
                  {currentCompany?.name ?? 'Company'}
                </SheetTitle>
                {hasMultipleCompanies && (
                  <div className="text-[11.5px] text-muted-foreground text-left">
                    Tap another company to switch.
                  </div>
                )}
              </>
            )}
            {step === 'type' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep('menu')}
                  aria-label="Back"
                  className="w-7 h-7 -ml-1 rounded-full flex items-center justify-center active:bg-muted/60"
                >
                  <ArrowLeft className="h-4 w-4 text-foreground" />
                </button>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-[17px] font-bold tracking-[-0.01em] text-left">
                    Pick a meeting type
                  </SheetTitle>
                  <div className="text-[11.5px] text-muted-foreground text-left">
                    {teams.length === 1
                      ? 'Then we’ll drop you straight into the meeting room.'
                      : 'Next, choose which team it’s for.'}
                  </div>
                </div>
              </div>
            )}
            {step === 'team' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep('type')}
                  aria-label="Back"
                  className="w-7 h-7 -ml-1 rounded-full flex items-center justify-center active:bg-muted/60"
                >
                  <ArrowLeft className="h-4 w-4 text-foreground" />
                </button>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-[17px] font-bold tracking-[-0.01em] text-left">
                    Pick a team
                  </SheetTitle>
                  <div className="text-[11.5px] text-muted-foreground text-left">
                    {pickedType
                      ? `For your ${pickedType} meeting.`
                      : 'Choose which team this meeting is for.'}
                  </div>
                </div>
              </div>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-3 pb-[max(env(safe-area-inset-bottom,16px),20px)]">
            {step === 'menu' && (
              <>
                {/* Shortcuts — 3-up square tile grid. */}
                <SectionLabel>Shortcuts</SectionLabel>
                <div className="grid grid-cols-3 gap-2 mt-2 mb-5">
                  <ShortcutTile
                    icon={<Network className="h-5 w-5" />}
                    label="Org chart"
                    onClick={() => go('/m/org-chart')}
                  />
                  <ShortcutTile
                    icon={<BarChart3 className="h-5 w-5" />}
                    label="Analytics"
                    onClick={() => go('/m/analytics')}
                  />
                  <ShortcutTile
                    icon={<Play className="h-5 w-5" />}
                    label="Meetings"
                    disabled={!hasTeams}
                    title={hasTeams ? 'Start or join a meeting' : 'Join a team first to start a meeting'}
                    onClick={handleMeetingsTap}
                  />
                </div>

                {/* Companies — only show when there's more than one. */}
                {hasMultipleCompanies && (
                  <>
                    <SectionLabel>Companies</SectionLabel>
                    <div className="flex flex-col gap-1.5 mt-2">
                      {sortedCompanies.map((company) => {
                        const isActive = company.id === currentCompany?.id;
                        return (
                          <button
                            key={company.id}
                            type="button"
                            onClick={() => handleCompanySwitch(company.id)}
                            disabled={switching}
                            className={cn(
                              'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-[10px] text-left transition-colors',
                              isActive
                                ? 'bg-primary/10 ring-1 ring-primary/30'
                                : 'bg-card border border-border/40 active:bg-muted/60',
                              switching && 'opacity-60 cursor-not-allowed',
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Building2
                                className={cn(
                                  'h-4 w-4 shrink-0',
                                  isActive ? 'text-primary' : 'text-muted-foreground',
                                )}
                              />
                              <span
                                className={cn(
                                  'text-[13px] font-semibold truncate',
                                  isActive ? 'text-primary' : 'text-foreground',
                                )}
                              >
                                {company.name}
                              </span>
                            </div>
                            {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}

            {step === 'type' && (
              <div className="flex flex-col gap-1.5">
                {MEETING_TYPE_OPTIONS.map(({ type, label, description, Icon }) => (
                  <QuickLinkRow
                    key={type}
                    icon={<Icon className="h-4 w-4" />}
                    label={label}
                    description={description}
                    onClick={() => handleTypePick(type)}
                  />
                ))}
              </div>
            )}

            {step === 'team' && pickedType && (
              <MeetingTeamPicker
                teams={teams.map((t) => ({ id: t.id, name: t.name }))}
                meetingType={pickedType}
                onPickTeam={handleTeamPick}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
    {children}
  </div>
);

/**
 * Square shortcut tile — icon stacked over label, 3-up grid. Used only in
 * the menu step's Shortcuts row.
 */
const ShortcutTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  title?: string;
  onClick?: () => void;
}> = ({ icon, label, disabled = false, title, onClick }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    title={title}
    className={cn(
      'aspect-square flex flex-col items-center justify-center gap-2 p-2 rounded-[14px] text-center transition-colors',
      disabled
        ? 'bg-muted/30 text-muted-foreground cursor-not-allowed'
        : 'bg-card border border-border/40 text-foreground active:bg-muted/60',
    )}
  >
    <span
      className={cn(
        'w-10 h-10 rounded-[10px] flex items-center justify-center',
        disabled ? 'bg-muted/40 text-muted-foreground' : 'bg-primary/10 text-primary',
      )}
    >
      {icon}
    </span>
    <span className="text-[11.5px] font-semibold leading-tight truncate w-full px-1">
      {label}
    </span>
  </button>
);

const QuickLinkRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  description?: string;
  disabled?: boolean;
  onClick?: () => void;
}> = ({ icon, label, description, disabled = false, onClick }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={cn(
      'w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-left transition-colors',
      disabled
        ? 'bg-muted/30 text-muted-foreground cursor-not-allowed'
        : 'bg-card border border-border/40 text-foreground active:bg-muted/60',
    )}
  >
    <span
      className={cn(
        'w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0',
        disabled ? 'bg-muted/40 text-muted-foreground' : 'bg-primary/10 text-primary',
      )}
    >
      {icon}
    </span>
    <span className="flex-1 min-w-0">
      <span className="block text-[13px] font-semibold truncate">{label}</span>
      {description && (
        <span className="block text-[11px] text-muted-foreground truncate">
          {description}
        </span>
      )}
    </span>
  </button>
);

/**
 * Team picker for the Meetings flow — mounted only while the sheet is on the
 * "team" step, so the realtime subscription in useAllActiveMeetings doesn't
 * run for every mobile page. Shows a "Live now" badge on teams that already
 * have a meeting of the picked type in progress, plus an End button to
 * finalize it without joining (with a confirm step). Tapping the row joins
 * the existing meeting via the normal /m/meeting route.
 */
interface MeetingTeamPickerProps {
  teams: ReadonlyArray<{ id: string; name: string }>;
  meetingType: MeetingType;
  onPickTeam: (teamId: string) => void;
}

const MeetingTeamPicker: React.FC<MeetingTeamPickerProps> = ({
  teams,
  meetingType,
  onPickTeam,
}) => {
  const { meetings: activeMeetings, finalizeMeeting } = useAllActiveMeetings();
  const { toast } = useToast();
  const [endingMeeting, setEndingMeeting] = useState<{ id: string; teamId: string; teamName: string } | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Map teamId → active meeting id for the picked meeting type. Same status
  // filter the desktop uses (status === 'active').
  const activeByTeam = useMemo(() => {
    const m = new Map<string, string>();
    for (const meeting of activeMeetings || []) {
      if (meeting.meeting_type === meetingType && meeting.status === 'active') {
        m.set(meeting.team_id, meeting.id);
      }
    }
    return m;
  }, [activeMeetings, meetingType]);

  const handleConfirmEnd = async () => {
    if (!endingMeeting) return;
    setIsFinalizing(true);
    try {
      await finalizeMeeting(endingMeeting.id, endingMeeting.teamId);
      toast({ title: 'Meeting ended' });
      setEndingMeeting(null);
    } catch (err) {
      toast({
        title: 'Could not end meeting',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsFinalizing(false);
    }
  };

  if (teams.length === 0) {
    return (
      <div className="text-[12.5px] text-muted-foreground text-center py-6">
        You’re not a member of any team yet.
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        {teams.map((team) => {
          const activeId = activeByTeam.get(team.id);
          return (
            <div
              key={team.id}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-card border border-border/40"
            >
              <button
                type="button"
                onClick={() => onPickTeam(team.id)}
                className="flex-1 flex items-center gap-3 min-w-0 text-left active:opacity-70"
              >
                <span className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                  <Users className="h-4 w-4" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-semibold text-foreground truncate">
                    {team.name}
                  </span>
                  {activeId && (
                    <span className="inline-flex items-center gap-1 mt-0.5 text-[10.5px] font-bold uppercase tracking-wide text-success">
                      <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                      Live now · tap to join
                    </span>
                  )}
                </span>
              </button>
              {activeId && (
                <button
                  type="button"
                  onClick={() =>
                    setEndingMeeting({ id: activeId, teamId: team.id, teamName: team.name })
                  }
                  className="text-[11px] font-semibold text-destructive border border-destructive/40 rounded-md px-2 py-1 shrink-0 active:bg-destructive/10"
                >
                  End
                </button>
              )}
            </div>
          );
        })}
      </div>

      {endingMeeting && (
        <div
          className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center px-5"
          onClick={() => !isFinalizing && setEndingMeeting(null)}
        >
          <div
            className="w-full max-w-[320px] bg-card rounded-2xl p-5 shadow-[0_24px_60px_rgba(0,0,0,0.3)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[15px] font-bold text-foreground tracking-[-0.01em]">
              End this meeting?
            </div>
            <div className="text-[12.5px] text-muted-foreground mt-2 leading-[1.5]">
              This will finalize the live {meetingType} meeting for {endingMeeting.teamName} for
              everyone currently in it.
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                disabled={isFinalizing}
                onClick={() => setEndingMeeting(null)}
                className="flex-1 py-2.5 rounded-[10px] bg-muted text-foreground text-[12.5px] font-semibold disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isFinalizing}
                onClick={handleConfirmEnd}
                className="flex-1 py-2.5 rounded-[10px] bg-destructive text-destructive-foreground text-[12.5px] font-semibold disabled:opacity-60"
              >
                {isFinalizing ? 'Ending…' : 'End meeting'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileHeaderMenu;
