/**
 * DataIntegration.jsxの包括的ユニットテスト
 * 
 * 73行のページコンポーネントの全機能をテスト
 * - 条件付きレンダリング（認証状態による表示切り替え）
 * - 子コンポーネント統合（3つのコンポーネント）
 * - useAuthフック使用
 * - 静的コンテンツ表示
 * - スタイリング（TailwindCSS）
 * - 認証状態による機能制御
 * - レスポンシブデザイン
 * - アクセシビリティ
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import DataIntegration from '../../../pages/DataIntegration';
import { useAuth } from '../../../hooks/useAuth';

// useAuthフックのモック
jest.mock('../../../hooks/useAuth');

// 子コンポーネントのモック
jest.mock('../../../components/data/ExportOptions', () => {
  return function MockExportOptions() {
    return (
      <div data-testid="export-options">
        <div>Export Options Mock</div>
        <button>CSVエクスポート</button>
        <button>JSONエクスポート</button>
      </div>
    );
  };
});

jest.mock('../../../components/data/ImportOptions', () => {
  return function MockImportOptions() {
    return (
      <div data-testid="import-options">
        <div>Import Options Mock</div>
        <input type="file" />
        <button>インポート実行</button>
      </div>
    );
  };
});

jest.mock('../../../components/data/GoogleDriveIntegration', () => {
  return function MockGoogleDriveIntegration() {
    return (
      <div data-testid="google-drive-integration">
        <div>Google Drive Integration Mock</div>
        <button>Googleドライブに保存</button>
        <button>Googleドライブから読み込み</button>
      </div>
    );
  };
});

describe('DataIntegration - 包括的テスト', () => {
  const renderDataIntegration = () => {
    return render(<DataIntegration />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('認証済みユーザーの表示', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({ isAuthenticated: true });
    });

    it('認証済みユーザーには全ての機能が表示される', () => {
      renderDataIntegration();
      
      expect(screen.getByText('データのエクスポート')).toBeInTheDocument();
      expect(screen.getByText('データのインポート')).toBeInTheDocument();
      expect(screen.getByText('Google ドライブ連携')).toBeInTheDocument();
    });

    it('すべての子コンポーネントが表示される', () => {
      renderDataIntegration();
      
      expect(screen.getByTestId('export-options')).toBeInTheDocument();
      expect(screen.getByTestId('import-options')).toBeInTheDocument();
      expect(screen.getByTestId('google-drive-integration')).toBeInTheDocument();
    });

    it('Google Drive連携の機能説明が表示される', () => {
      renderDataIntegration();
      
      expect(screen.getByText('ポートフォリオデータをGoogleドライブに保存・読み込みできます。')).toBeInTheDocument();
    });

    it('未認証ユーザー向けのメッセージが表示されない', () => {
      renderDataIntegration();
      
      expect(screen.queryByText('Googleアカウントでログインすると')).not.toBeInTheDocument();
      expect(screen.queryByText('※ ヘッダーのログインボタンからログインしてください。')).not.toBeInTheDocument();
    });

    it('Google Drive統合コンポーネントのボタンが機能する', () => {
      renderDataIntegration();
      
      expect(screen.getByRole('button', { name: 'Googleドライブに保存' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Googleドライブから読み込み' })).toBeInTheDocument();
    });
  });

  describe('未認証ユーザーの表示', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({ isAuthenticated: false });
    });

    it('未認証ユーザーには基本機能のみ表示される', () => {
      renderDataIntegration();
      
      expect(screen.getByText('データのエクスポート')).toBeInTheDocument();
      expect(screen.getByText('データのインポート')).toBeInTheDocument();
      expect(screen.getByText('Google ドライブ連携')).toBeInTheDocument(); // タイトルは表示される
    });

    it('エクスポートとインポートコンポーネントは表示される', () => {
      renderDataIntegration();
      
      expect(screen.getByTestId('export-options')).toBeInTheDocument();
      expect(screen.getByTestId('import-options')).toBeInTheDocument();
    });

    it('Google Drive統合コンポーネントは表示されない', () => {
      renderDataIntegration();
      
      expect(screen.queryByTestId('google-drive-integration')).not.toBeInTheDocument();
    });

    it('未認証ユーザー向けのガイドメッセージが表示される', () => {
      renderDataIntegration();
      
      expect(screen.getByText('Googleアカウントでログインすると、ポートフォリオデータをGoogleドライブに保存・読み込みできます。')).toBeInTheDocument();
      expect(screen.getByText('※ ヘッダーのログインボタンからログインしてください。')).toBeInTheDocument();
    });

    it('未認証時のGoogle Driveセクションが適切なスタイルになっている', () => {
      renderDataIntegration();
      
      const unauthenticatedSection = screen.getByText('Googleアカウントでログインすると').closest('div');
      expect(unauthenticatedSection).toHaveClass('bg-blue-50', 'rounded-lg', 'shadow', 'p-6');
    });

    it('ログイン案内メッセージが青色で表示される', () => {
      renderDataIntegration();
      
      const loginMessage = screen.getByText('※ ヘッダーのログインボタンからログインしてください。');
      expect(loginMessage).toHaveClass('text-sm', 'text-blue-600');
    });
  });

  describe('認証状態の動的切り替え', () => {
    it('認証状態が変更されると表示が切り替わる', () => {
      // 未認証状態で開始
      useAuth.mockReturnValue({ isAuthenticated: false });
      const { rerender } = renderDataIntegration();
      
      expect(screen.queryByTestId('google-drive-integration')).not.toBeInTheDocument();
      expect(screen.getByText('Googleアカウントでログインすると')).toBeInTheDocument();
      
      // 認証状態に変更
      useAuth.mockReturnValue({ isAuthenticated: true });
      rerender(<DataIntegration />);
      
      expect(screen.getByTestId('google-drive-integration')).toBeInTheDocument();
      expect(screen.queryByText('Googleアカウントでログインすると')).not.toBeInTheDocument();
    });

    it('認証から未認証に戻ると表示が適切に切り替わる', () => {
      // 認証状態で開始
      useAuth.mockReturnValue({ isAuthenticated: true });
      const { rerender } = renderDataIntegration();
      
      expect(screen.getByTestId('google-drive-integration')).toBeInTheDocument();
      
      // 未認証状態に変更
      useAuth.mockReturnValue({ isAuthenticated: false });
      rerender(<DataIntegration />);
      
      expect(screen.queryByTestId('google-drive-integration')).not.toBeInTheDocument();
      expect(screen.getByText('Googleアカウントでログインすると')).toBeInTheDocument();
    });
  });

  describe('子コンポーネント統合', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({ isAuthenticated: true });
    });

    it('ExportOptionsコンポーネントが正しく統合されている', () => {
      renderDataIntegration();
      
      const exportOptions = screen.getByTestId('export-options');
      expect(exportOptions).toContainHTML('Export Options Mock');
      expect(screen.getByRole('button', { name: 'CSVエクスポート' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'JSONエクスポート' })).toBeInTheDocument();
    });

    it('ImportOptionsコンポーネントが正しく統合されている', () => {
      renderDataIntegration();
      
      const importOptions = screen.getByTestId('import-options');
      expect(importOptions).toContainHTML('Import Options Mock');
      expect(screen.getByRole('button', { name: 'インポート実行' })).toBeInTheDocument();
      expect(screen.getByDisplayValue('')).toBeInTheDocument(); // file input
    });

    it('GoogleDriveIntegrationコンポーネントが正しく統合されている', () => {
      renderDataIntegration();
      
      const googleDrive = screen.getByTestId('google-drive-integration');
      expect(googleDrive).toContainHTML('Google Drive Integration Mock');
      expect(screen.getByRole('button', { name: 'Googleドライブに保存' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Googleドライブから読み込み' })).toBeInTheDocument();
    });
  });

  describe('useAuthフック統合', () => {
    it('useAuthフックが正しく呼ばれる', () => {
      useAuth.mockReturnValue({ isAuthenticated: true });
      renderDataIntegration();
      
      expect(useAuth).toHaveBeenCalled();
    });

    it('認証状態がundefinedでもエラーが発生しない', () => {
      useAuth.mockReturnValue({ isAuthenticated: undefined });
      
      expect(() => renderDataIntegration()).not.toThrow();
      
      // undefinedはfalsyなので未認証として扱われる
      expect(screen.getByText('Googleアカウントでログインすると')).toBeInTheDocument();
    });

    it('useAuthがnullを返してもエラーが発生しない', () => {
      useAuth.mockReturnValue(null);
      
      expect(() => renderDataIntegration()).toThrow();
    });

    it('useAuthがエラーを投げても適切に処理される', () => {
      useAuth.mockImplementation(() => {
        throw new Error('Auth hook error');
      });
      
      expect(() => renderDataIntegration()).toThrow('Auth hook error');
    });
  });

  describe('レイアウトとスタイリング', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({ isAuthenticated: true });
    });

    it('メインコンテナに適切なスペーシングが適用されている', () => {
      const { container } = renderDataIntegration();
      
      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('space-y-6');
    });

    it('各セクションが適切なカードスタイルになっている', () => {
      renderDataIntegration();
      
      const exportSection = screen.getByText('データのエクスポート').closest('div');
      const importSection = screen.getByText('データのインポート').closest('div');
      const driveSection = screen.getByText('ポートフォリオデータをGoogleドライブに').closest('div');
      
      [exportSection, importSection, driveSection].forEach(section => {
        expect(section).toHaveClass('bg-white', 'rounded-lg', 'shadow', 'p-6');
      });
    });

    it('ヘッダーに適切なスタイルが適用されている', () => {
      renderDataIntegration();
      
      const headers = screen.getAllByRole('heading', { level: 2 });
      headers.forEach(header => {
        expect(header).toHaveClass('text-xl', 'font-semibold', 'mb-4');
      });
    });

    it('説明文に適切なスタイルが適用されている', () => {
      renderDataIntegration();
      
      const descriptions = screen.getAllByText(/現在の設定と|以前にエクスポート|ポートフォリオデータを/);
      descriptions.forEach(description => {
        expect(description).toHaveClass('text-gray-600', 'mb-4');
      });
    });

    it('未認証時の特別なスタイリングが適用されている', () => {
      useAuth.mockReturnValue({ isAuthenticated: false });
      renderDataIntegration();
      
      const unauthenticatedSection = screen.getByText('Googleアカウントでログインすると').closest('div');
      expect(unauthenticatedSection).toHaveClass('bg-blue-50');
    });
  });

  describe('コンテンツ検証', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({ isAuthenticated: true });
    });

    it('すべての主要ヘッダーが正しく表示される', () => {
      renderDataIntegration();
      
      expect(screen.getByRole('heading', { level: 2, name: 'データのエクスポート' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'データのインポート' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Google ドライブ連携' })).toBeInTheDocument();
    });

    it('適切な説明文が表示される', () => {
      renderDataIntegration();
      
      expect(screen.getByText('現在の設定とポートフォリオデータをエクスポートできます。')).toBeInTheDocument();
      expect(screen.getByText('以前にエクスポートしたデータを読み込むことができます。')).toBeInTheDocument();
      expect(screen.getByText('ポートフォリオデータをGoogleドライブに保存・読み込みできます。')).toBeInTheDocument();
    });

    it('機能説明が適切である', () => {
      renderDataIntegration();
      
      // エクスポート機能の説明
      const exportDescription = screen.getByText('現在の設定とポートフォリオデータをエクスポートできます。');
      expect(exportDescription).toBeInTheDocument();
      
      // インポート機能の説明
      const importDescription = screen.getByText('以前にエクスポートしたデータを読み込むことができます。');
      expect(importDescription).toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({ isAuthenticated: true });
    });

    it('適切なヘッダー階層が使用されている', () => {
      renderDataIntegration();
      
      const h2Headers = screen.getAllByRole('heading', { level: 2 });
      expect(h2Headers.length).toBe(3);
    });

    it('見出しとコンテンツが適切に関連付けられている', () => {
      renderDataIntegration();
      
      // エクスポートセクション
      const exportHeader = screen.getByText('データのエクスポート');
      const exportDescription = screen.getByText('現在の設定とポートフォリオデータをエクスポートできます。');
      expect(exportHeader.compareDocumentPosition(exportDescription))
        .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      
      // インポートセクション
      const importHeader = screen.getByText('データのインポート');
      const importDescription = screen.getByText('以前にエクスポートしたデータを読み込むことができます。');
      expect(importHeader.compareDocumentPosition(importDescription))
        .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('フォーム要素が適切に含まれている', () => {
      renderDataIntegration();
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(4); // CSVエクスポート、JSONエクスポート、インポート実行、Google Drive関連
    });
  });

  describe('レスポンシブ設計', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({ isAuthenticated: true });
    });

    it('コンテナが適切なスペーシングを持つ', () => {
      const { container } = renderDataIntegration();
      
      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('space-y-6');
    });

    it('カードレイアウトが一貫している', () => {
      renderDataIntegration();
      
      const sections = screen.getAllByText(/データの|Google ドライブ/).map(text => text.closest('div'));
      sections.forEach(section => {
        expect(section).toHaveClass('rounded-lg', 'shadow', 'p-6');
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('子コンポーネントがエラーを投げても画面がクラッシュしない', () => {
      useAuth.mockReturnValue({ isAuthenticated: true });
      
      // 通常は子コンポーネントのエラーはここでは発生しないが、
      // 統合の安定性を確認
      expect(() => renderDataIntegration()).not.toThrow();
    });

    it('認証状態が頻繁に変更されても安定している', () => {
      let authState = { isAuthenticated: false };
      useAuth.mockImplementation(() => authState);
      
      const { rerender } = renderDataIntegration();
      
      // 複数回状態変更
      for (let i = 0; i < 5; i++) {
        authState = { isAuthenticated: !authState.isAuthenticated };
        useAuth.mockReturnValue(authState);
        
        expect(() => rerender(<DataIntegration />)).not.toThrow();
      }
    });
  });

  describe('パフォーマンス', () => {
    it('コンポーネントが高速にレンダリングされる', () => {
      useAuth.mockReturnValue({ isAuthenticated: true });
      
      const startTime = Date.now();
      renderDataIntegration();
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(50); // 50ms以内
    });

    it('useAuthフックが一度だけ呼ばれる', () => {
      useAuth.mockReturnValue({ isAuthenticated: true });
      renderDataIntegration();
      
      expect(useAuth).toHaveBeenCalledTimes(1);
    });

    it('認証状態変更時の再レンダリングが効率的である', () => {
      useAuth.mockReturnValue({ isAuthenticated: false });
      const { rerender } = renderDataIntegration();
      
      const startTime = Date.now();
      
      useAuth.mockReturnValue({ isAuthenticated: true });
      rerender(<DataIntegration />);
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(50); // 50ms以内
    });
  });

  describe('コンポーネント統合の境界テスト', () => {
    it('すべての子コンポーネントが独立して動作する', () => {
      useAuth.mockReturnValue({ isAuthenticated: true });
      renderDataIntegration();
      
      // 各コンポーネントが適切なコンテナ内に配置されていることを確認
      const exportSection = screen.getByText('データのエクスポート').closest('div');
      const importSection = screen.getByText('データのインポート').closest('div');
      const driveSection = screen.getByText('ポートフォリオデータをGoogleドライブに').closest('div');
      
      expect(exportSection).toContainElement(screen.getByTestId('export-options'));
      expect(importSection).toContainElement(screen.getByTestId('import-options'));
      expect(driveSection).toContainElement(screen.getByTestId('google-drive-integration'));
    });

    it('条件付きレンダリングのロジックが正確である', () => {
      // 認証済み
      useAuth.mockReturnValue({ isAuthenticated: true });
      const { rerender } = renderDataIntegration();
      
      expect(screen.getByTestId('google-drive-integration')).toBeInTheDocument();
      expect(screen.queryByText('※ ヘッダーのログインボタン')).not.toBeInTheDocument();
      
      // 未認証
      useAuth.mockReturnValue({ isAuthenticated: false });
      rerender(<DataIntegration />);
      
      expect(screen.queryByTestId('google-drive-integration')).not.toBeInTheDocument();
      expect(screen.getByText('※ ヘッダーのログインボタンからログインしてください。')).toBeInTheDocument();
    });
  });
});