/**
 * PWAUpdatePrompt テスト
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// i18n モック
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'pwa.updateAvailable': '新しいバージョンが利用可能です',
        'pwa.updateNow': '今すぐ更新',
        'pwa.later': 'あとで',
      };
      return translations[key] || key;
    },
  }),
}));

const mockUpdateServiceWorker = vi.fn().mockResolvedValue(undefined);
const mockDismissUpdate = vi.fn();
let mockNeedRefresh = true;

vi.mock('../../../../hooks/usePWA', () => ({
  usePWA: () => ({
    needRefresh: mockNeedRefresh,
    updateServiceWorker: mockUpdateServiceWorker,
    dismissUpdate: mockDismissUpdate,
  }),
}));

describe('PWAUpdatePrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNeedRefresh = true;
  });

  it('should render update banner when needRefresh is true', async () => {
    const PWAUpdatePrompt = (await import('../../../../components/pwa/PWAUpdatePrompt')).default;
    render(<PWAUpdatePrompt />);
    expect(screen.getByText('新しいバージョンが利用可能です')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should call updateServiceWorker when clicking update button', async () => {
    const PWAUpdatePrompt = (await import('../../../../components/pwa/PWAUpdatePrompt')).default;
    render(<PWAUpdatePrompt />);
    fireEvent.click(screen.getByText('今すぐ更新'));
    expect(mockUpdateServiceWorker).toHaveBeenCalled();
  });

  it('should call dismissUpdate when clicking later button', async () => {
    const PWAUpdatePrompt = (await import('../../../../components/pwa/PWAUpdatePrompt')).default;
    render(<PWAUpdatePrompt />);
    fireEvent.click(screen.getByText('あとで'));
    expect(mockDismissUpdate).toHaveBeenCalled();
  });

  it('should not render when needRefresh is false', async () => {
    mockNeedRefresh = false;
    const PWAUpdatePrompt = (await import('../../../../components/pwa/PWAUpdatePrompt')).default;
    const { container } = render(<PWAUpdatePrompt />);
    expect(container.firstChild).toBeNull();
  });

  it('should have SVGs with aria-hidden for accessibility', async () => {
    const PWAUpdatePrompt = (await import('../../../../components/pwa/PWAUpdatePrompt')).default;
    render(<PWAUpdatePrompt />);
    const svgs = document.querySelectorAll('svg');
    svgs.forEach(svg => {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
