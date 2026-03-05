/**
 * uiStore unit tests
 *
 * Tests for UI state management: notifications, loading state, auto-dismiss.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useUIStore } from '../../../stores/uiStore';

// Capture initial state for reset between tests
const initialState = {
  notifications: [],
  isLoading: false,
};

describe('uiStore', () => {
  beforeEach(() => {
    // Reset store state to initial values
    useUIStore.setState(initialState);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should have empty notifications array', () => {
      const state = useUIStore.getState();
      expect(state.notifications).toEqual([]);
    });

    it('should have isLoading set to false', () => {
      const state = useUIStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('addNotification', () => {
    it('should add a notification with default type "info"', () => {
      const id = useUIStore.getState().addNotification('Test message');

      const state = useUIStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0]).toEqual(
        expect.objectContaining({
          id,
          message: 'Test message',
          type: 'info',
        })
      );
    });

    it('should add a notification with specified type', () => {
      const id = useUIStore.getState().addNotification('Error occurred', 'error');

      const state = useUIStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].type).toBe('error');
      expect(state.notifications[0].id).toBe(id);
    });

    it('should add a notification with type "success"', () => {
      useUIStore.getState().addNotification('Operation succeeded', 'success');

      const state = useUIStore.getState();
      expect(state.notifications[0].type).toBe('success');
    });

    it('should add a notification with type "warning"', () => {
      useUIStore.getState().addNotification('Caution', 'warning');

      const state = useUIStore.getState();
      expect(state.notifications[0].type).toBe('warning');
    });

    it('should return a unique id string', () => {
      const id1 = useUIStore.getState().addNotification('First');
      const id2 = useUIStore.getState().addNotification('Second');

      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
      expect(id1).not.toBe(id2);
    });

    it('should accumulate multiple notifications', () => {
      useUIStore.getState().addNotification('First');
      useUIStore.getState().addNotification('Second');
      useUIStore.getState().addNotification('Third');

      const state = useUIStore.getState();
      expect(state.notifications).toHaveLength(3);
      expect(state.notifications[0].message).toBe('First');
      expect(state.notifications[1].message).toBe('Second');
      expect(state.notifications[2].message).toBe('Third');
    });
  });

  describe('removeNotification', () => {
    it('should remove a notification by id', () => {
      const id = useUIStore.getState().addNotification('To remove');
      expect(useUIStore.getState().notifications).toHaveLength(1);

      useUIStore.getState().removeNotification(id);
      expect(useUIStore.getState().notifications).toHaveLength(0);
    });

    it('should only remove the specified notification', () => {
      const id1 = useUIStore.getState().addNotification('Keep');
      const id2 = useUIStore.getState().addNotification('Remove');
      const id3 = useUIStore.getState().addNotification('Keep too');

      useUIStore.getState().removeNotification(id2);

      const state = useUIStore.getState();
      expect(state.notifications).toHaveLength(2);
      expect(state.notifications.find(n => n.id === id1)).toBeDefined();
      expect(state.notifications.find(n => n.id === id2)).toBeUndefined();
      expect(state.notifications.find(n => n.id === id3)).toBeDefined();
    });

    it('should do nothing when removing a non-existent id', () => {
      useUIStore.getState().addNotification('Existing');
      useUIStore.getState().removeNotification('non-existent-id');

      expect(useUIStore.getState().notifications).toHaveLength(1);
    });
  });

  describe('setLoading', () => {
    it('should set isLoading to true', () => {
      useUIStore.getState().setLoading(true);
      expect(useUIStore.getState().isLoading).toBe(true);
    });

    it('should set isLoading to false', () => {
      useUIStore.getState().setLoading(true);
      useUIStore.getState().setLoading(false);
      expect(useUIStore.getState().isLoading).toBe(false);
    });

    it('should handle repeated calls to the same value', () => {
      useUIStore.getState().setLoading(true);
      useUIStore.getState().setLoading(true);
      expect(useUIStore.getState().isLoading).toBe(true);
    });
  });

  describe('auto-dismiss behavior', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should auto-dismiss "info" notifications after 5 seconds', () => {
      useUIStore.getState().addNotification('Auto dismiss me', 'info');
      expect(useUIStore.getState().notifications).toHaveLength(1);

      vi.advanceTimersByTime(4999);
      expect(useUIStore.getState().notifications).toHaveLength(1);

      vi.advanceTimersByTime(1);
      expect(useUIStore.getState().notifications).toHaveLength(0);
    });

    it('should auto-dismiss "success" notifications after 5 seconds', () => {
      useUIStore.getState().addNotification('Success msg', 'success');
      expect(useUIStore.getState().notifications).toHaveLength(1);

      vi.advanceTimersByTime(5000);
      expect(useUIStore.getState().notifications).toHaveLength(0);
    });

    it('should auto-dismiss "warning" notifications after 5 seconds', () => {
      useUIStore.getState().addNotification('Warning msg', 'warning');
      expect(useUIStore.getState().notifications).toHaveLength(1);

      vi.advanceTimersByTime(5000);
      expect(useUIStore.getState().notifications).toHaveLength(0);
    });

    it('should NOT auto-dismiss "error" notifications', () => {
      useUIStore.getState().addNotification('Error msg', 'error');
      expect(useUIStore.getState().notifications).toHaveLength(1);

      vi.advanceTimersByTime(10000);
      expect(useUIStore.getState().notifications).toHaveLength(1);
    });

    it('should auto-dismiss default type (info) notifications', () => {
      useUIStore.getState().addNotification('Default type');
      expect(useUIStore.getState().notifications).toHaveLength(1);

      vi.advanceTimersByTime(5000);
      expect(useUIStore.getState().notifications).toHaveLength(0);
    });

    it('should auto-dismiss each notification independently', () => {
      vi.advanceTimersByTime(0); // reset timer baseline

      useUIStore.getState().addNotification('First', 'info');
      vi.advanceTimersByTime(2000);

      useUIStore.getState().addNotification('Second', 'success');
      expect(useUIStore.getState().notifications).toHaveLength(2);

      // After 3 more seconds (total 5s for first), first should be dismissed
      vi.advanceTimersByTime(3000);
      expect(useUIStore.getState().notifications).toHaveLength(1);
      expect(useUIStore.getState().notifications[0].message).toBe('Second');

      // After 2 more seconds (total 5s for second), second should be dismissed
      vi.advanceTimersByTime(2000);
      expect(useUIStore.getState().notifications).toHaveLength(0);
    });
  });
});
