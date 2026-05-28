import { useMeetingStore } from '@/stores/meetingStore';

export function useStoreMeetingTimer() {
  const timer = useMeetingStore((state) => state.timer);
  return timer;
}
