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

// Lucide React アイコンモック
vi.mock('lucide-react', () => ({
  TrendingUp: function TrendingUp(props: any) { return <svg data-testid="icon-trending-up" {...props} />; },
  Upload: function Upload(props: any) { return <svg data-testid="icon-upload" {...props} />; },
  Brain: function Brain(props: any) { return <svg data-testid="icon-brain" {...props} />; },
  BarChart3: function BarChart3(props: any) { return <svg data-testid="icon-bar-chart3" {...props} />; },
  ShieldCheck: function ShieldCheck(props: any) { return <svg data-testid="icon-shield-check" {...props} />; },
  Check: function Check(props: any) { return <svg data-testid="icon-check" {...props} />; },
  ClipboardList: function ClipboardList(props: any) { return <svg data-testid="icon-clipboard-list" {...props} />; },
  HelpCircle: function HelpCircle(props: any) { return <svg data-testid="icon-help-circle" {...props} />; },
  LayoutGrid: function LayoutGrid(props: any) { return <svg data-testid="icon-layout-grid" {...props} />; },
  Cloud: function Cloud(props: any) { return <svg data-testid="icon-cloud" {...props} />; },
  CircleDollarSign: function CircleDollarSign(props: any) { return <svg data-testid="icon-circle-dollar" {...props} />; },
  CreditCard: function CreditCard(props: any) { return <svg data-testid="icon-credit-card" {...props} />; },
  Server: function Server(props: any) { return <svg data-testid="icon-server" {...props} />; },
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

vi.mock('../../../components/referral/ReferralBanner', () => ({
  default: function ReferralBanner() {
    return <div data-testid="referral-banner" />;
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

    expect(screen.getByText('分散投資の全体像が、')).toBeInTheDocument();
    expect(screen.getByText('ひとつの画面で完結')).toBeInTheDocument();
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

  it('Lucideアイコンが各セクションに表示される', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Landing />
      </MemoryRouter>
    );

    // Pain セクションのアイコン
    expect(screen.getByTestId('icon-clipboard-list')).toBeInTheDocument();
    expect(screen.getByTestId('icon-help-circle')).toBeInTheDocument();
    expect(screen.getByTestId('icon-layout-grid')).toBeInTheDocument();

    // Trust セクションのアイコン
    expect(screen.getByTestId('icon-shield-check')).toBeInTheDocument();
    expect(screen.getByTestId('icon-credit-card')).toBeInTheDocument();
    expect(screen.getByTestId('icon-server')).toBeInTheDocument();
  });

  it('ペインセクションの課題カードが表示される', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Landing />
      </MemoryRouter>
    );

    expect(screen.getByText('口座ごとにバラバラで把握できない')).toBeInTheDocument();
    expect(screen.getByText('リバランスの計算が面倒')).toBeInTheDocument();
    expect(screen.getByText('既存ツールは使いにくい')).toBeInTheDocument();
  });

  it('ソリューションセクションの3ステップが表示される', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Landing />
      </MemoryRouter>
    );

    expect(screen.getByText('STEP 1')).toBeInTheDocument();
    expect(screen.getByText('STEP 2')).toBeInTheDocument();
    expect(screen.getByText('STEP 3')).toBeInTheDocument();
    expect(screen.getByText('CSVインポート')).toBeInTheDocument();
    expect(screen.getByText('損益ダッシュボード')).toBeInTheDocument();
    expect(screen.getByText('AIで分析')).toBeInTheDocument();
  });

  it('セキュリティセクションが表示される', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Landing />
      </MemoryRouter>
    );

    expect(screen.getByText('安心のセキュリティ')).toBeInTheDocument();
    expect(screen.getByText('Google OAuth 認証')).toBeInTheDocument();
    expect(screen.getByText('Stripe 決済')).toBeInTheDocument();
    expect(screen.getByText('AWS インフラ')).toBeInTheDocument();
  });

  it('料金プランの詳細が表示される', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Landing />
      </MemoryRouter>
    );

    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Standard')).toBeInTheDocument();
    expect(screen.getByText('¥0')).toBeInTheDocument();
    expect(screen.getByText('¥700')).toBeInTheDocument();
    expect(screen.getByText('おすすめ')).toBeInTheDocument();
  });
});
