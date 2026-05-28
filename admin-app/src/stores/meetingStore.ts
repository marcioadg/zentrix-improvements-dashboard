import { create } from 'zustand';

export interface MeetingParticipant {
  userId: string;
  role: string;
  joinedAt: string;
}

export interface MeetingTimer {
  elapsed: number;
  isPaused: boolean;
  pausedAt: number | null;
}

export interface MeetingState {
  meetingId: string | null;
  teamId: string | null;
  status: 'idle' | 'loading' | 'active' | 'ending' | 'ended';
  currentSection: string | null;
  sectionStartTime: number | null;
  timer: MeetingTimer;
  participants: MeetingParticipant[];
  scriberId: string | null;
  wrapUpPhase: boolean;
  error: string | null;
}

export interface MeetingActions {
  setMeeting: (meetingId: string, teamId: string) => void;
  setSection: (section: string | null, startTime: number | null) => void;
  updateTimer: (timer: Partial<MeetingTimer>) => void;
  setParticipants: (participants: MeetingParticipant[]) => void;
  setScriber: (scriberId: string | null) => void;
  enterWrapUp: () => void;
  reset: () => void;
  setError: (error: string | null) => void;
  setStatus: (status: MeetingState['status']) => void;
}

const initialState: MeetingState = {
  meetingId: null,
  teamId: null,
  status: 'idle',
  currentSection: null,
  sectionStartTime: null,
  timer: {
    elapsed: 0,
    isPaused: false,
    pausedAt: null,
  },
  participants: [],
  scriberId: null,
  wrapUpPhase: false,
  error: null,
};

export const useMeetingStore = create<MeetingState & MeetingActions>((set) => ({
  ...initialState,

  setMeeting: (meetingId, teamId) =>
    set({ meetingId, teamId, status: 'active', error: null }),

  setSection: (section, startTime) =>
    set({ currentSection: section, sectionStartTime: startTime }),

  updateTimer: (timerUpdate) =>
    set((state) => ({ timer: { ...state.timer, ...timerUpdate } })),

  setParticipants: (participants) => set({ participants }),

  setScriber: (scriberId) => set({ scriberId }),

  enterWrapUp: () => set({ wrapUpPhase: true }),

  reset: () => set(initialState),

  setError: (error) => set({ error }),

  setStatus: (status) => set({ status }),
}));
