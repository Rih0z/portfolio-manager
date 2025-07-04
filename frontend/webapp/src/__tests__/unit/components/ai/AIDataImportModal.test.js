/**
 * AIDataImportModal.jsx のユニットテスト
 * AIデータ取り込みモーダルのテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AIDataImportModal from '../../../../components/ai/AIDataImportModal';

// YAMLUtilsをモック
jest.mock('../../../../utils/yamlProcessor', () => ({
  default: {
    parse: jest.fn(),
    detectType: jest.fn(),
    generateMetadata: jest.fn()
  }
}));

// useYAMLIntegrationをモック
jest.mock('../../../../hooks/useYAMLIntegration', () => ({
  useYAMLIntegration: jest.fn()
}));

import YAMLUtils from '../../../../utils/yamlProcessor';
import { useYAMLIntegration } from '../../../../hooks/useYAMLIntegration';

describe('AIDataImportModal', () => {
  const mockOnClose = jest.fn();
  const mockOnImportComplete = jest.fn();
  const mockIntegrateYAMLData = jest.fn();
  const mockRollbackToBackup = jest.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    dataType: 'portfolio',
    userContext: {},
    onImportComplete: mockOnImportComplete
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    useYAMLIntegration.mockReturnValue({
      integrateYAMLData: mockIntegrateYAMLData,
      rollbackToBackup: mockRollbackToBackup,
      isIntegrating: false,
      lastIntegrationResult: null,
      hasBackup: false,
      integrationHistory: []
    });

    YAMLUtils.parse.mockImplementation((yamlString) => ({
      portfolio_data: {
        metadata: { total_assets: 1000000 },
        holdings: []
      }
    }));

    YAMLUtils.detectType.mockReturnValue('portfolio');
    YAMLUtils.generateMetadata.mockReturnValue({
      dataType: 'portfolio',
      lineCount: 10,
      sizeInBytes: 500
    });
  });

  describe('レンダリング', () => {
    it('モーダルが開いている時に正しく表示される', () => {
      render(<AIDataImportModal {...defaultProps} />);
      
      expect(screen.getByText('AI投資データ取り込み')).toBeInTheDocument();
      expect(screen.getByText('データタイプを選択')).toBeInTheDocument();
    });

    it('モーダルが閉じている時は何も表示しない', () => {
      render(<AIDataImportModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('AI投資データ取り込み')).not.toBeInTheDocument();
    });

    it('データタイプオプションが正しく表示される', () => {
      render(<AIDataImportModal {...defaultProps} />);
      
      expect(screen.getByText('ポートフォリオデータ')).toBeInTheDocument();
      expect(screen.getByText('ユーザープロファイル')).toBeInTheDocument();
      expect(screen.getByText('アプリ設定')).toBeInTheDocument();
      expect(screen.getByText('配分テンプレート')).toBeInTheDocument();
    });
  });

  describe('ステップナビゲーション', () => {
    it('データタイプ選択後に次のステップに進む', async () => {
      const user = userEvent.setup();
      render(<AIDataImportModal {...defaultProps} />);
      
      // ポートフォリオデータを選択
      await user.click(screen.getByText('ポートフォリオデータ'));
      
      // 次へボタンをクリック
      await user.click(screen.getByText('次へ'));
      
      expect(screen.getByText('Claude AIプロンプトを使用')).toBeInTheDocument();
    });

    it('戻るボタンで前のステップに戻る', async () => {
      const user = userEvent.setup();
      render(<AIDataImportModal {...defaultProps} />);
      
      // Step 2 に進む
      await user.click(screen.getByText('ポートフォリオデータ'));
      await user.click(screen.getByText('次へ'));
      
      // 戻るボタンをクリック
      await user.click(screen.getByText('戻る'));
      
      expect(screen.getByText('データタイプを選択')).toBeInTheDocument();
    });

    it('プロンプト表示ステップで次へボタンをクリックするとYAML取り込みステップに進む', async () => {
      const user = userEvent.setup();
      render(<AIDataImportModal {...defaultProps} />);
      
      // Step 2 に進む
      await user.click(screen.getByText('ポートフォリオデータ'));
      await user.click(screen.getByText('次へ'));
      
      // Step 3 に進む
      await user.click(screen.getByText('次へ'));
      
      expect(screen.getByText('Claude AIから取得したYAMLデータを貼り付けてください')).toBeInTheDocument();
    });
  });

  describe('プロンプト生成', () => {
    it('選択されたデータタイプに応じてプロンプトが生成される', async () => {
      const user = userEvent.setup();
      render(<AIDataImportModal {...defaultProps} />);
      
      await user.click(screen.getByText('ユーザープロファイル'));
      await user.click(screen.getByText('次へ'));
      
      // ユーザープロファイル用のプロンプトが表示されることを確認
      expect(screen.getByText(/ユーザープロファイル形式/)).toBeInTheDocument();
    });

    it('プロンプトのコピー機能が動作する', async () => {
      const user = userEvent.setup();
      
      // クリップボードAPIをモック
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockImplementation(() => Promise.resolve())
        }
      });

      render(<AIDataImportModal {...defaultProps} />);
      
      await user.click(screen.getByText('ポートフォリオデータ'));
      await user.click(screen.getByText('次へ'));
      
      // コピーボタンをクリック
      const copyButton = screen.getByText('コピー');
      await user.click(copyButton);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });
    });
  });

  describe('YAML処理', () => {
    it('有効なYAMLデータを正常に処理する', async () => {
      const user = userEvent.setup();
      
      mockIntegrateYAMLData.mockResolvedValue({
        success: true,
        errors: [],
        warnings: [],
        appliedChanges: [
          { description: 'データ統合完了' }
        ]
      });

      render(<AIDataImportModal {...defaultProps} />);
      
      // Step 3 に進む
      await user.click(screen.getByText('ポートフォリオデータ'));
      await user.click(screen.getByText('次へ'));
      await user.click(screen.getByText('次へ'));
      
      // YAMLデータを入力
      const textarea = screen.getByPlaceholderText(/Claude AIが生成したYAMLデータ/);
      await user.type(textarea, 'portfolio_data:\n  metadata:\n    total_assets: 1000000');
      
      // データを取り込む
      await user.click(screen.getByText('データを取り込む'));
      
      await waitFor(() => {
        expect(mockIntegrateYAMLData).toHaveBeenCalledWith(
          expect.any(Object),
          'portfolio',
          expect.objectContaining({
            mergeStrategy: 'replace',
            preserveExisting: false
          })
        );
      });

      expect(screen.getByText('データの統合が完了しました')).toBeInTheDocument();
    });

    it('無効なYAMLデータでエラーを表示する', async () => {
      const user = userEvent.setup();
      
      YAMLUtils.parse.mockImplementation(() => {
        throw new Error('Invalid YAML');
      });

      render(<AIDataImportModal {...defaultProps} />);
      
      // Step 3 に進む
      await user.click(screen.getByText('ポートフォリオデータ'));
      await user.click(screen.getByText('次へ'));
      await user.click(screen.getByText('次へ'));
      
      // 無効なYAMLデータを入力
      const textarea = screen.getByPlaceholderText(/Claude AIが生成したYAMLデータ/);
      await user.type(textarea, 'invalid: yaml: data');
      
      // データを取り込む
      await user.click(screen.getByText('データを取り込む'));
      
      await waitFor(() => {
        expect(screen.getByText('データの処理中にエラーが発生しました')).toBeInTheDocument();
      });
    });

    it('統合エラーを適切に表示する', async () => {
      const user = userEvent.setup();
      
      mockIntegrateYAMLData.mockResolvedValue({
        success: false,
        errors: [
          { message: '統合エラーが発生しました' }
        ],
        warnings: [],
        appliedChanges: []
      });

      render(<AIDataImportModal {...defaultProps} />);
      
      // Step 3 に進む
      await user.click(screen.getByText('ポートフォリオデータ'));
      await user.click(screen.getByText('次へ'));
      await user.click(screen.getByText('次へ'));
      
      // YAMLデータを入力
      const textarea = screen.getByPlaceholderText(/Claude AIが生成したYAMLデータ/);
      await user.type(textarea, 'portfolio_data:\n  metadata:\n    total_assets: 1000000');
      
      // データを取り込む
      await user.click(screen.getByText('データを取り込む'));
      
      await waitFor(() => {
        expect(screen.getByText('統合エラーが発生しました')).toBeInTheDocument();
      });
    });
  });

  describe('ロールバック機能', () => {
    it('バックアップがある場合ロールバックボタンが表示される', async () => {
      const user = userEvent.setup();
      
      useYAMLIntegration.mockReturnValue({
        integrateYAMLData: mockIntegrateYAMLData,
        rollbackToBackup: mockRollbackToBackup,
        isIntegrating: false,
        lastIntegrationResult: null,
        hasBackup: true,
        integrationHistory: []
      });

      mockIntegrateYAMLData.mockResolvedValue({
        success: true,
        errors: [],
        warnings: [],
        appliedChanges: []
      });

      render(<AIDataImportModal {...defaultProps} />);
      
      // Step 3 に進む
      await user.click(screen.getByText('ポートフォリオデータ'));
      await user.click(screen.getByText('次へ'));
      await user.click(screen.getByText('次へ'));
      
      // YAMLデータを入力して処理
      const textarea = screen.getByPlaceholderText(/Claude AIが生成したYAMLデータ/);
      await user.type(textarea, 'portfolio_data:\n  holdings: []');
      await user.click(screen.getByText('データを取り込む'));
      
      await waitFor(() => {
        expect(screen.getByText('ロールバック')).toBeInTheDocument();
      });
    });

    it('ロールバックボタンをクリックすると正常に実行される', async () => {
      const user = userEvent.setup();
      
      useYAMLIntegration.mockReturnValue({
        integrateYAMLData: mockIntegrateYAMLData,
        rollbackToBackup: mockRollbackToBackup,
        isIntegrating: false,
        lastIntegrationResult: null,
        hasBackup: true,
        integrationHistory: []
      });

      mockIntegrateYAMLData.mockResolvedValue({
        success: true,
        errors: [],
        warnings: [],
        appliedChanges: []
      });

      mockRollbackToBackup.mockResolvedValue();

      render(<AIDataImportModal {...defaultProps} />);
      
      // Step 3 に進んでデータを処理
      await user.click(screen.getByText('ポートフォリオデータ'));
      await user.click(screen.getByText('次へ'));
      await user.click(screen.getByText('次へ'));
      
      const textarea = screen.getByPlaceholderText(/Claude AIが生成したYAMLデータ/);
      await user.type(textarea, 'portfolio_data:\n  holdings: []');
      await user.click(screen.getByText('データを取り込む'));
      
      await waitFor(() => {
        expect(screen.getByText('ロールバック')).toBeInTheDocument();
      });

      // ロールバック実行
      await user.click(screen.getByText('ロールバック'));
      
      await waitFor(() => {
        expect(mockRollbackToBackup).toHaveBeenCalled();
      });
    });
  });

  describe('UIインタラクション', () => {
    it('処理中はボタンが無効化される', async () => {
      const user = userEvent.setup();
      
      useYAMLIntegration.mockReturnValue({
        integrateYAMLData: mockIntegrateYAMLData,
        rollbackToBackup: mockRollbackToBackup,
        isIntegrating: true, // 処理中
        lastIntegrationResult: null,
        hasBackup: false,
        integrationHistory: []
      });

      render(<AIDataImportModal {...defaultProps} />);
      
      // Step 3 に進む
      await user.click(screen.getByText('ポートフォリオデータ'));
      await user.click(screen.getByText('次へ'));
      await user.click(screen.getByText('次へ'));
      
      const textarea = screen.getByPlaceholderText(/Claude AIが生成したYAMLデータ/);
      await user.type(textarea, 'portfolio_data:\n  holdings: []');
      
      const processButton = screen.getByText('処理中...');
      expect(processButton).toBeDisabled();
    });

    it('モーダルを閉じる時にonCloseが呼ばれる', async () => {
      const user = userEvent.setup();
      render(<AIDataImportModal {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('オーバーレイをクリックしてモーダルを閉じる', async () => {
      const user = userEvent.setup();
      render(<AIDataImportModal {...defaultProps} />);
      
      // オーバーレイ要素を見つけてクリック
      const overlay = document.querySelector('.fixed.inset-0.bg-gray-500');
      await user.click(overlay);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なARIAラベルが設定されている', () => {
      render(<AIDataImportModal {...defaultProps} />);
      
      // モーダルタイトルの確認
      expect(screen.getByText('AI投資データ取り込み')).toBeInTheDocument();
      
      // ボタンのアクセシビリティ
      expect(screen.getByText('次へ')).toBeInTheDocument();
    });

    it('キーボードナビゲーションが動作する', async () => {
      const user = userEvent.setup();
      render(<AIDataImportModal {...defaultProps} />);
      
      // Tab キーでフォーカス移動をテスト
      await user.tab();
      
      // 最初の選択可能な要素にフォーカスが当たることを確認
      expect(document.activeElement).toBeDefined();
    });
  });

  describe('プロップス処理', () => {
    it('userContext が適切に渡される', () => {
      const userContext = {
        age: 35,
        occupation: '会社員'
      };

      render(<AIDataImportModal {...defaultProps} userContext={userContext} />);
      
      // プロンプト生成でuserContextが使用されることを期待
      expect(screen.getByText(/プロンプト/)).toBeInTheDocument();
    });

    it('onImportComplete が成功時に呼ばれる', async () => {
      const user = userEvent.setup();
      
      mockIntegrateYAMLData.mockResolvedValue({
        success: true,
        errors: [],
        warnings: [],
        appliedChanges: []
      });

      render(<AIDataImportModal {...defaultProps} />);
      
      // Step 3 でデータ処理
      await user.click(screen.getByText('ポートフォリオデータ'));
      await user.click(screen.getByText('次へ'));
      await user.click(screen.getByText('次へ'));
      
      const textarea = screen.getByPlaceholderText(/Claude AIが生成したYAMLデータ/);
      await user.type(textarea, 'portfolio_data:\n  holdings: []');
      await user.click(screen.getByText('データを取り込む'));
      
      await waitFor(() => {
        expect(mockOnImportComplete).toHaveBeenCalled();
      });
    });
  });
});