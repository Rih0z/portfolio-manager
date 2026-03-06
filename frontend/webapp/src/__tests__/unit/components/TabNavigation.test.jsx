import { vi } from "vitest";
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TabNavigation from '../../../components/layout/TabNavigation';

// i18n モック
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const translations = {
        'navigation.dashboard': 'ダッシュボード',
        'navigation.aiPlan': 'AI分析',
        'navigation.simulation': 'シミュレーション',
        'navigation.settings': '設定',
        'navigation.dataImport': 'データ'
      };
      return translations[key] || key;
    },
    i18n: { language: 'ja' }
  })
}));

// usePortfolioContextのモック
vi.mock('../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: vi.fn()
}));

import { usePortfolioContext } from '../../../hooks/usePortfolioContext';

describe('TabNavigation', () => {
  const mockPortfolioContext = {
    currentAssets: [{ ticker: 'AAPL' }],
    targetPortfolio: [{ ticker: 'AAPL', targetPercentage: 100 }],
    additionalBudget: { amount: 10000, currency: 'JPY' }
  };

  beforeEach(() => {
    usePortfolioContext.mockReturnValue(mockPortfolioContext);
    // initialSetupCompleted を設定
    Storage.prototype.getItem = vi.fn(() => 'true');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderWithRouter = (initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <TabNavigation />
      </MemoryRouter>
    );
  };

  it('renders all navigation tabs', () => {
    renderWithRouter();

    expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
    expect(screen.getByText('AI分析')).toBeInTheDocument();
    expect(screen.getByText('シミュレーション')).toBeInTheDocument();
    expect(screen.getByText('設定')).toBeInTheDocument();
    expect(screen.getByText('データ')).toBeInTheDocument();
  });

  it('renders as a nav element', () => {
    renderWithRouter();

    const nav = document.querySelector('nav');
    expect(nav).toBeInTheDocument();
  });

  it('renders SVG icons for each tab', () => {
    renderWithRouter();

    const svgIcons = document.querySelectorAll('svg');
    expect(svgIcons.length).toBeGreaterThanOrEqual(5);
  });

  it('has proper fixed positioning for mobile bottom nav', () => {
    renderWithRouter();

    const nav = document.querySelector('nav');
    expect(nav).toHaveClass('fixed', 'bottom-0');
  });

  it('renders 5 navigation links', () => {
    renderWithRouter();

    const links = document.querySelectorAll('a');
    expect(links.length).toBe(5);
  });

  it('highlights active tab based on route', () => {
    renderWithRouter('/dashboard');

    // ダッシュボードのリンクがアクティブ
    const dashboardLink = screen.getByText('ダッシュボード').closest('a');
    expect(dashboardLink).toHaveClass('text-primary-500');
  });

  it('navigates using NavLink components', () => {
    renderWithRouter();

    const links = document.querySelectorAll('a');
    const hrefs = Array.from(links).map(l => l.getAttribute('href'));

    expect(hrefs).toContain('/dashboard');
    expect(hrefs).toContain('/ai-advisor');
    expect(hrefs).toContain('/simulation');
    expect(hrefs).toContain('/settings');
    expect(hrefs).toContain('/data-import');
  });

  it('renders grid layout for tabs', () => {
    renderWithRouter();

    const grid = document.querySelector('.grid.grid-cols-5');
    expect(grid).toBeInTheDocument();
  });

  it('returns null when no settings and no initial setup', () => {
    usePortfolioContext.mockReturnValue({
      currentAssets: [],
      targetPortfolio: [],
      additionalBudget: { amount: 0, currency: 'JPY' }
    });
    Storage.prototype.getItem = vi.fn(() => null);

    const { container } = render(
      <MemoryRouter>
        <TabNavigation />
      </MemoryRouter>
    );

    // コンポーネントがnullを返す（設定がない場合はタブ非表示）
    expect(container.innerHTML).toBe('');
  });

  it('handles long tab labels without breaking layout', () => {
    renderWithRouter();

    // 全てのラベルが表示されていることを確認
    expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
    expect(screen.getByText('シミュレーション')).toBeInTheDocument();
  });

  it('renders with proper responsive design classes', () => {
    renderWithRouter();

    // max-w制約がある
    const container = document.querySelector('.max-w-sm');
    expect(container).toBeInTheDocument();
  });

  it('includes safe-area for iPhone home indicator', () => {
    renderWithRouter();

    const safeArea = document.querySelector('.h-safe-bottom');
    expect(safeArea).toBeInTheDocument();
  });
});
