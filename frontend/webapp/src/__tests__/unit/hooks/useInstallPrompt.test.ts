/**
 * useInstallPrompt テスト
 *
 * vitest.setup.ts で localStorage はモック化されている。
 * getItem/setItem は vi.fn() なのでモック返値で制御する。
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useInstallPrompt } from '../../../hooks/useInstallPrompt';

describe('useInstallPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: not in standalone mode
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
    // localStorage.getItem returns null by default (no dismiss stored)
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with canInstall false', () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canInstall).toBe(false);
    expect(result.current.isInstalled).toBe(false);
  });

  it('should detect standalone mode as installed', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isInstalled).toBe(true);
  });

  it('should set canInstall when beforeinstallprompt fires', () => {
    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      const event = new Event('beforeinstallprompt');
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
      window.dispatchEvent(event);
    });

    expect(result.current.canInstall).toBe(true);
  });

  it('should not set canInstall when dismissed within 7 days', () => {
    // Mock localStorage to return a recent timestamp
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(Date.now().toString());

    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      const event = new Event('beforeinstallprompt');
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
      window.dispatchEvent(event);
    });

    expect(result.current.canInstall).toBe(false);
  });

  it('should set canInstall when dismiss expired (older than 7 days)', () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(eightDaysAgo.toString());

    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      const event = new Event('beforeinstallprompt');
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
      window.dispatchEvent(event);
    });

    expect(result.current.canInstall).toBe(true);
  });

  it('should handle appinstalled event', () => {
    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(result.current.isInstalled).toBe(true);
    expect(result.current.canInstall).toBe(false);
  });

  it('should dismiss and call localStorage.setItem', () => {
    const { result } = renderHook(() => useInstallPrompt());

    // Trigger beforeinstallprompt to enable canInstall
    act(() => {
      const event = new Event('beforeinstallprompt');
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
      window.dispatchEvent(event);
    });

    expect(result.current.canInstall).toBe(true);

    act(() => {
      result.current.dismissInstall();
    });

    expect(result.current.canInstall).toBe(false);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'pwa-install-dismissed',
      expect.any(String)
    );
  });

  it('should call prompt on promptInstall', async () => {
    const mockPrompt = vi.fn().mockResolvedValue(undefined);
    const mockUserChoice = Promise.resolve({ outcome: 'accepted' as const, platform: 'web' });

    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      const event = new Event('beforeinstallprompt') as any;
      event.preventDefault = vi.fn();
      event.prompt = mockPrompt;
      event.userChoice = mockUserChoice;
      window.dispatchEvent(event);
    });

    await act(async () => {
      await result.current.promptInstall();
    });

    expect(mockPrompt).toHaveBeenCalled();
    expect(result.current.canInstall).toBe(false);
  });
});
