/**
 * InstallPrompt テスト
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import InstallPrompt from '../../../../components/pwa/InstallPrompt';

// i18n モック
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'pwa.installTitle': 'PortfolioWise をインストール',
        'pwa.installDescription': 'ホーム画面に追加して、より快適にご利用いただけます',
        'pwa.install': 'インストール',
        'pwa.later': 'あとで',
      };
      return translations[key] || key;
    },
  }),
}));

const mockPromptInstall = vi.fn();
const mockDismissInstall = vi.fn();
let mockCanInstall = true;
let mockIsInstalled = false;

vi.mock('../../../../hooks/useInstallPrompt', () => ({
  useInstallPrompt: () => ({
    canInstall: mockCanInstall,
    isInstalled: mockIsInstalled,
    promptInstall: mockPromptInstall,
    dismissInstall: mockDismissInstall,
  }),
}));

describe('InstallPrompt', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockCanInstall = true;
    mockIsInstalled = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not render immediately (30s delay)', () => {
    const { container } = render(<InstallPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it('should render after 30 seconds when canInstall is true', () => {
    render(<InstallPrompt />);

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(screen.getByText('PortfolioWise をインストール')).toBeInTheDocument();
    expect(screen.getByText('ホーム画面に追加して、より快適にご利用いただけます')).toBeInTheDocument();
  });

  it('should not render when canInstall is false', () => {
    mockCanInstall = false;
    const { container } = render(<InstallPrompt />);

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(container.firstChild).toBeNull();
  });

  it('should not render when already installed', () => {
    mockIsInstalled = true;
    const { container } = render(<InstallPrompt />);

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(container.firstChild).toBeNull();
  });

  it('should call promptInstall when clicking install button', () => {
    render(<InstallPrompt />);

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    fireEvent.click(screen.getByText('インストール'));
    expect(mockPromptInstall).toHaveBeenCalled();
  });

  it('should call dismissInstall and hide when clicking later button', () => {
    render(<InstallPrompt />);

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    fireEvent.click(screen.getByText('あとで'));
    expect(mockDismissInstall).toHaveBeenCalled();
  });
});
