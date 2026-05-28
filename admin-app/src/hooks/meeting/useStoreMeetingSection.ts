import { useMeetingStore } from '@/stores/meetingStore';

export function useStoreMeetingSection() {
  const currentSection = useMeetingStore((state) => state.currentSection);
  const sectionStartTime = useMeetingStore((state) => state.sectionStartTime);
  return { currentSection, sectionStartTime };
}
