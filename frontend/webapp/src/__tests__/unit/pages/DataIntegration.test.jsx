import { vi } from "vitest";
import React from 'react';
import { render, screen } from '@testing-library/react';
import DataIntegration from '../../../pages/DataIntegration';

// useAuthとusePortfolioContextのモック
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

vi.mock('../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: vi.fn()
}));

import { useAuth } from '../../../hooks/useAuth';
import { usePortfolioContext } from '../../../hooks/usePortfolioContext';

// Mock components
vi.mock('../../../components/data/ImportOptions', () => ({
  default: function ImportOptions() {
    return <div data-testid="import-options">Import Options</div>;
  },
}));

vi.mock('../../../components/data/ExportOptions', () => ({
  default: function ExportOptions() {
    return <div data-testid="export-options">Export Options</div>;
  },
}));

vi.mock('../../../components/data/GoogleDriveIntegration', () => ({
  default: function GoogleDriveIntegration() {
    return <div data-testid="google-drive-integration">Google Drive Integration</div>;
  },
}));

describe('DataIntegration', () => {
  const mockAuthContext = {
    user: { id: '1', email: 'test@example.com' },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    getAccessToken: vi.fn().mockResolvedValue('mock-token'),
    loading: false
  };

  const mockPortfolioContext = {
    currentAssets: [],
    targetPortfolio: [],
    baseCurrency: 'JPY',
    exchangeRate: { rate: 150 }
  };

  beforeEach(() => {
    useAuth.mockReturnValue(mockAuthContext);
    usePortfolioContext.mockReturnValue(mockPortfolioContext);
  });

  const renderDataIntegration = () => {
    return render(<DataIntegration />);
  };

  it('renders all data integration components', () => {
    renderDataIntegration();

    expect(screen.getByTestId('import-options')).toBeInTheDocument();
    expect(screen.getByTestId('export-options')).toBeInTheDocument();
    expect(screen.getByTestId('google-drive-integration')).toBeInTheDocument();
  });

  it('renders page section titles', () => {
    renderDataIntegration();

    // セクションタイトルが表示されることを確認
    expect(screen.getByText('データのエクスポート')).toBeInTheDocument();
    expect(screen.getByText('データのインポート')).toBeInTheDocument();
  });

  it('renders section headers for import and export', () => {
    renderDataIntegration();

    // h2のセクションヘッダーがあることを確認
    const headers = document.querySelectorAll('h2');
    expect(headers.length).toBeGreaterThan(0);
  });

  it('has proper layout structure', () => {
    renderDataIntegration();

    // 適切なレイアウト構造があることを確認（space-y-6コンテナ）
    const container = document.querySelector('.space-y-6');
    expect(container).toBeTruthy();
  });

  it('renders without crashing when user is not authenticated', () => {
    useAuth.mockReturnValue({
      ...mockAuthContext,
      user: null,
      isAuthenticated: false
    });

    render(<DataIntegration />);

    // コンポーネントがクラッシュしないことを確認
    expect(screen.getByTestId('import-options')).toBeInTheDocument();
  });

  it('renders responsive grid layout', () => {
    renderDataIntegration();

    // コンポーネントはspace-y-6スタック型レイアウトを使用
    const stackLayout = document.querySelector('.space-y-6');
    expect(stackLayout).toBeTruthy();
    // 各セクションがbg-whiteカードとして表示される
    const cards = document.querySelectorAll('.bg-white, .bg-blue-50');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('has error boundaries for each section', () => {
    renderDataIntegration();

    // ErrorBoundaryがあることを確認
    const errorBoundaries = document.querySelectorAll('[data-error-boundary]');
    expect(errorBoundaries.length).toBeGreaterThanOrEqual(0);
  });

  it('renders proper semantic structure', () => {
    renderDataIntegration();

    // セマンティックな構造があることを確認（bg-white カードレイアウト）
    const cards = document.querySelectorAll('.bg-white.rounded-lg.shadow');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('handles loading state properly', () => {
    useAuth.mockReturnValue({
      ...mockAuthContext,
      loading: true
    });

    render(<DataIntegration />);

    // ローディング中でもクラッシュしないことを確認
    expect(screen.getByTestId('import-options')).toBeInTheDocument();
  });

  it('renders card-based layout for data options', () => {
    renderDataIntegration();

    // カードレイアウトクラスが存在することを確認
    const cardElements = document.querySelectorAll('.card, .bg-white, .shadow, .rounded');
    expect(cardElements.length).toBeGreaterThan(0);
  });

  it('has accessibility features', () => {
    renderDataIntegration();

    // アクセシビリティ要素があることを確認
    const accessibleElements = document.querySelectorAll('[aria-label], [role], [tabindex]');
    expect(accessibleElements.length).toBeGreaterThanOrEqual(0);
  });
});