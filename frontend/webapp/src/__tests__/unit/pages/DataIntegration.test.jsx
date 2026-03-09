import { vi } from "vitest";
import React from 'react';
import { render, screen } from '@testing-library/react';
import DataIntegration from '../../../pages/DataIntegration';

// useAuthのモック
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

import { useAuth } from '../../../hooks/useAuth';

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
  const authenticatedAuth = {
    user: { id: '1', email: 'test@example.com' },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    getAccessToken: vi.fn().mockResolvedValue('mock-token'),
    loading: false
  };

  const unauthenticatedAuth = {
    user: null,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
    getAccessToken: vi.fn(),
    loading: false
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('認証済みユーザー', () => {
    beforeEach(() => {
      useAuth.mockReturnValue(authenticatedAuth);
    });

    it('エクスポート・インポート・Google Drive連携の3セクションを表示する', () => {
      render(<DataIntegration />);

      expect(screen.getByTestId('import-options')).toBeInTheDocument();
      expect(screen.getByTestId('export-options')).toBeInTheDocument();
      expect(screen.getByTestId('google-drive-integration')).toBeInTheDocument();
    });

    it('セクションタイトルが表示される', () => {
      render(<DataIntegration />);

      expect(screen.getByText('データのエクスポート')).toBeInTheDocument();
      expect(screen.getByText('データのインポート')).toBeInTheDocument();
      expect(screen.getByText('Google ドライブ連携')).toBeInTheDocument();
    });

    it('h2見出しが3つ表示される', () => {
      render(<DataIntegration />);

      const headers = document.querySelectorAll('h2');
      expect(headers.length).toBe(3);
    });

    it('data-testid="data-integration-page"コンテナが存在する', () => {
      render(<DataIntegration />);

      expect(screen.getByTestId('data-integration-page')).toBeInTheDocument();
    });
  });

  describe('未認証ユーザー', () => {
    beforeEach(() => {
      useAuth.mockReturnValue(unauthenticatedAuth);
    });

    it('Google Drive連携コンポーネントが表示されない', () => {
      render(<DataIntegration />);

      expect(screen.queryByTestId('google-drive-integration')).not.toBeInTheDocument();
    });

    it('ログイン促進メッセージが表示される', () => {
      render(<DataIntegration />);

      expect(screen.getByText(/ログインすると/)).toBeInTheDocument();
      expect(screen.getByText(/ログインしてください/)).toBeInTheDocument();
    });

    it('エクスポート・インポートは引き続き表示される', () => {
      render(<DataIntegration />);

      expect(screen.getByTestId('import-options')).toBeInTheDocument();
      expect(screen.getByTestId('export-options')).toBeInTheDocument();
    });
  });

  describe('ローディング状態', () => {
    it('ローディング中でもクラッシュしない', () => {
      useAuth.mockReturnValue({
        ...authenticatedAuth,
        loading: true
      });

      render(<DataIntegration />);

      expect(screen.getByTestId('import-options')).toBeInTheDocument();
    });
  });
});
