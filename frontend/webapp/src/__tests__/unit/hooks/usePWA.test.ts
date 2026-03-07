/**
 * usePWA テスト
 *
 * SW登録・更新検知・エラー処理・オフライン準備完了通知のテスト。
 * virtual:pwa-register/react は vitest alias でモック化されている。
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockAddNotification = vi.fn().mockReturnValue('mock-id');

vi.mock('../../../stores/uiStore', () => ({
  useUIStore: (selector: (state: any) => any) =>
    selector({ addNotification: mockAddNotification }),
}));

// useRegisterSW の返り値を制御するモック
let mockNeedRefresh = false;
let mockSetNeedRefresh = vi.fn();
let mockOfflineReady = false;
let mockSetOfflineReady = vi.fn();
const mockUpdateServiceWorker = vi.fn().mockResolvedValue(undefined);
let capturedOnRegisteredSW: ((swUrl: string, registration?: any) => void) | undefined;
let capturedOnRegisterError: ((error: any) => void) | undefined;

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (options: any) => {
    capturedOnRegisteredSW = options?.onRegisteredSW;
    capturedOnRegisterError = options?.onRegisterError;
    return {
      needRefresh: [mockNeedRefresh, mockSetNeedRefresh],
      offlineReady: [mockOfflineReady, mockSetOfflineReady],
      updateServiceWorker: mockUpdateServiceWorker,
    };
  },
}));

describe('usePWA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockNeedRefresh = false;
    mockSetNeedRefresh = vi.fn();
    mockOfflineReady = false;
    mockSetOfflineReady = vi.fn();
    capturedOnRegisteredSW = undefined;
    capturedOnRegisterError = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return needRefresh, updateServiceWorker, and dismissUpdate', async () => {
    const { usePWA } = await import('../../../hooks/usePWA');
    const { result } = renderHook(() => usePWA());
    expect(result.current).toHaveProperty('needRefresh');
    expect(result.current).toHaveProperty('updateServiceWorker');
    expect(result.current).toHaveProperty('dismissUpdate');
  });

  it('should call setNeedRefresh(false) on dismissUpdate', async () => {
    const { usePWA } = await import('../../../hooks/usePWA');
    const { result } = renderHook(() => usePWA());

    act(() => {
      result.current.dismissUpdate();
    });

    expect(mockSetNeedRefresh).toHaveBeenCalledWith(false);
  });

  it('should call updateServiceWorker(true) on updateServiceWorker', async () => {
    const { usePWA } = await import('../../../hooks/usePWA');
    const { result } = renderHook(() => usePWA());

    await act(async () => {
      await result.current.updateServiceWorker();
    });

    expect(mockUpdateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('should schedule SW update checks with jitter when registration is available', async () => {
    const mockRegistration = { update: vi.fn() };
    const { usePWA } = await import('../../../hooks/usePWA');
    renderHook(() => usePWA());

    expect(capturedOnRegisteredSW).toBeDefined();
    capturedOnRegisteredSW!('sw.js', mockRegistration);

    // Advance time past the base interval + max jitter (65 minutes)
    act(() => {
      vi.advanceTimersByTime(65 * 60 * 1000);
    });

    expect(mockRegistration.update).toHaveBeenCalled();
  });

  it('should not schedule checks when registration is undefined', async () => {
    const { usePWA } = await import('../../../hooks/usePWA');
    renderHook(() => usePWA());

    expect(capturedOnRegisteredSW).toBeDefined();
    // Should not throw when called without registration
    expect(() => capturedOnRegisteredSW!('sw.js', undefined)).not.toThrow();
  });

  it('should notify via uiStore when SW registration fails', async () => {
    const { usePWA } = await import('../../../hooks/usePWA');
    renderHook(() => usePWA());

    expect(capturedOnRegisterError).toBeDefined();
    const testError = new Error('Network failure');
    capturedOnRegisterError!(testError);

    expect(mockAddNotification).toHaveBeenCalledWith(
      'Service Workerの登録に失敗しました: Network failure',
      'error'
    );
  });

  it('should notify via uiStore with string error when registration fails', async () => {
    const { usePWA } = await import('../../../hooks/usePWA');
    renderHook(() => usePWA());

    capturedOnRegisterError!('string error');

    expect(mockAddNotification).toHaveBeenCalledWith(
      'Service Workerの登録に失敗しました: string error',
      'error'
    );
  });

  it('should notify when offlineReady becomes true', async () => {
    mockOfflineReady = true;
    const { usePWA } = await import('../../../hooks/usePWA');
    renderHook(() => usePWA());

    expect(mockAddNotification).toHaveBeenCalledWith(
      'アプリがオフラインで利用可能になりました',
      'success'
    );
  });

  it('should not notify offlineReady more than once', async () => {
    mockOfflineReady = true;
    const { usePWA } = await import('../../../hooks/usePWA');
    const { rerender } = renderHook(() => usePWA());

    const offlineReadyCallCount = mockAddNotification.mock.calls.filter(
      (call: any[]) => call[0] === 'アプリがオフラインで利用可能になりました'
    ).length;
    expect(offlineReadyCallCount).toBe(1);

    rerender();
    const afterRerenderCount = mockAddNotification.mock.calls.filter(
      (call: any[]) => call[0] === 'アプリがオフラインで利用可能になりました'
    ).length;
    expect(afterRerenderCount).toBe(1);
  });
});
