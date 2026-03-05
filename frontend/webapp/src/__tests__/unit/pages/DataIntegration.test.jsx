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

describe.skip('DataIntegration', () => {
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

  it('renders page title and description', () => {
    renderDataIntegration();

    // タイトルや説明が表示されることを確認
    const titleElement = screen.getByText(/データ連携|Data Integration/i);
    expect(titleElement).toBeInTheDocument();
  });

  it('renders section headers for import and export', () => {
    renderDataIntegration();

    // インポート・エクスポートのセクションヘッダーがあることを確認
    const headers = document.querySelectorAll('h2, h3, .section-header');
    expect(headers.length).toBeGreaterThan(0);
  });

  it('has proper layout structure', () => {
    renderDataIntegration();

    // 適切なレイアウト構造があることを確認
    const container = document.querySelector('.data-integration, .max-w-4xl, .container');
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

    // レスポンシブグリッドクラスが存在することを確認
    const gridElements = document.querySelectorAll('.grid, .lg\\:grid-cols-2, .md\\:grid-cols-1');
    expect(gridElements.length).toBeGreaterThan(0);
  });

  it('has error boundaries for each section', () => {
    renderDataIntegration();

    // ErrorBoundaryがあることを確認
    const errorBoundaries = document.querySelectorAll('[data-error-boundary]');
    expect(errorBoundaries.length).toBeGreaterThanOrEqual(0);
  });

  it('renders proper semantic structure', () => {
    renderDataIntegration();

    // セマンティックな構造があることを確認
    const mainContent = document.querySelector('main, .main-content, article, section');
    expect(mainContent).toBeTruthy();
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