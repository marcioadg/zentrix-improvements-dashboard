import { useMeetingStore } from '@/stores/meetingStore';

export function useStoreMeetingPresence() {
  const participants = useMeetingStore((state) => state.participants);
  return participants;
}
