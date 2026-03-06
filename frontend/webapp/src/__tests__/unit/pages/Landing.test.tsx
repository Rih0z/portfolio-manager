import { vi, describe, it, expect, beforeEach } from 'vitest';

/**
 * Landing.tsx のユニットテスト
 * ランディングページの表示確認・認証済みリダイレクト・SEOメタタグ
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

// --- Mocks ---
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock('../../../stores/authStore', () => ({
  useAuthStore: vi.fn((selector: any) => {
    if (typeof selector === 'function') {
      return selector({ isAuthenticated: false });
    }
    return false;
  }),
}));

vi.mock('../../../utils/analytics', () => ({
  trackEvent: vi.fn(),
  AnalyticsEvents: { LANDING_VIEW: 'landing_view' },
}));

vi.mock('../../../components/auth/OAuthLoginButton', () => ({
  default: function OAuthLoginButton() {
    return <button data-testid="oauth-login-btn">Login</button>;
  },
}));

vi.mock('../../../components/seo/SEOHead', () => ({
  default: function SEOHead() {
    return <meta data-testid="seo-head" />;
  },
}));

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: any) => <div data-testid="helmet">{children}</div>,
  HelmetProvider: ({ children }: any) => <>{children}</>,
}));

import Landing from '../../../pages/Landing';
import { useAuthStore } from '../../../stores/authStore';
import { trackEvent } from '../../../utils/analytics';

describe('Landing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthStore as any).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({ isAuthenticated: false });
      }
      return false;
    });
  });

  it('ランディングページが表示される', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Landing />
      </MemoryRouter>
    );

    expect(screen.getByTestId('landing-page')).toBeInTheDocument();
  });

  it('ヒーローセクションのタイトルが表示される', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Landing />
      </MemoryRouter>
    );

    expect(screen.getByText('資産の全体像が、')).toBeInTheDocument();
    expect(screen.getByText('1分でわかる')).toBeInTheDocument();
  });

  it('CTA（OAuthLoginButton）が表示される', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Landing />
      </MemoryRouter>
    );

    const loginButtons = screen.getAllByTestId('oauth-login-btn');
    expect(loginButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('LANDING_VIEW イベントを送信する', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Landing />
      </MemoryRouter>
    );

    expect(trackEvent).toHaveBeenCalledWith('landing_view');
  });

  it('SEOHead が表示される', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Landing />
      </MemoryRouter>
    );

    expect(screen.getByTestId('seo-head')).toBeInTheDocument();
  });

  it('認証済みユーザーは /dashboard へリダイレクトされる', () => {
    (useAuthStore as any).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({ isAuthenticated: true });
      }
      return true;
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Landing />
      </MemoryRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('FAQ セクションが表示される', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Landing />
      </MemoryRouter>
    );

    expect(screen.getByText('よくある質問')).toBeInTheDocument();
  });

  it('料金セクションが表示される', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Landing />
      </MemoryRouter>
    );

    expect(screen.getByText('シンプルな料金体系')).toBeInTheDocument();
    expect(screen.getByText('料金プランを詳しく見る')).toBeInTheDocument();
  });
});
