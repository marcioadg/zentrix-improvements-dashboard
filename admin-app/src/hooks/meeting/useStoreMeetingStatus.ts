import { useMeetingStore } from '@/stores/meetingStore';

export function useStoreMeetingStatus() {
  const status = useMeetingStore((state) => state.status);
  const wrapUpPhase = useMeetingStore((state) => state.wrapUpPhase);
  const error = useMeetingStore((state) => state.error);
  return { status, wrapUpPhase, error };
}
