import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMeetingModalsState } from './useMeetingModalsState';

describe('useMeetingModalsState', () => {
  it('all modals are closed initially', () => {
    const { result } = renderHook(() => useMeetingModalsState());

    expect(result.current.showTaskModal).toBe(false);
    expect(result.current.showGoalModal).toBe(false);
    expect(result.current.showMetricModal).toBe(false);
    expect(result.current.showHeadlineModal).toBe(false);
    expect(result.current.showIssueModal).toBe(false);
  });

  it.each([
    ['openTaskModal', 'showTaskModal'],
    ['openGoalModal', 'showGoalModal'],
    ['openMetricModal', 'showMetricModal'],
    ['openHeadlineModal', 'showHeadlineModal'],
    ['openIssueModal', 'showIssueModal'],
  ] as const)('%s sets %s to true', (opener, flag) => {
    const { result } = renderHook(() => useMeetingModalsState());

    act(() => { (result.current[opener] as () => void)(); });
    expect(result.current[flag]).toBe(true);
  });

  it('closeAllModals closes every modal', () => {
    const { result } = renderHook(() => useMeetingModalsState());

    act(() => {
      result.current.openTaskModal();
      result.current.openGoalModal();
      result.current.openMetricModal();
      result.current.openHeadlineModal();
      result.current.openIssueModal();
    });

    act(() => { result.current.closeAllModals(); });

    expect(result.current.showTaskModal).toBe(false);
    expect(result.current.showGoalModal).toBe(false);
    expect(result.current.showMetricModal).toBe(false);
    expect(result.current.showHeadlineModal).toBe(false);
    expect(result.current.showIssueModal).toBe(false);
  });

  it('setters control individual modals', () => {
    const { result } = renderHook(() => useMeetingModalsState());

    act(() => { result.current.setShowTaskModal(true); });
    expect(result.current.showTaskModal).toBe(true);

    act(() => { result.current.setShowTaskModal(false); });
    expect(result.current.showTaskModal).toBe(false);
  });
});
