import { vi } from "vitest";
/**
 * ResetSettings.jsx のユニットテスト
 * 設定リセット機能のテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResetSettings from '../../../../components/settings/ResetSettings';

// usePortfolioContextのモック
vi.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: vi.fn()
}));

// loggerモジュールのモック
const { mockLogger } = vi.hoisted(() => ({
  mockLogger: { log: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));
vi.mock('../../../../utils/logger', () => ({ default: mockLogger }));

import { usePortfolioContext } from '../../../../hooks/usePortfolioContext';

// window.location.reload のモック
delete window.location;
window.location = { reload: vi.fn() };

// モックコンテキスト値を作成するヘルパー関数
const createMockContext = (overrides = {}) => ({
  clearLocalStorage: vi.fn(),
  addNotification: vi.fn(),
  currentAssets: [],
  targetPortfolio: [],
  ...overrides
});

describe('ResetSettings', () => {
  // ヘルパー: mockContextを設定してレンダリング
  const renderWithMock = (mockContext) => {
    usePortfolioContext.mockReturnValue(mockContext);
    return render(<ResetSettings />);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.location.reload.mockClear();
  });

  it('データがない場合の基本的なUIを表示する', () => {
    const mockContext = createMockContext();
    renderWithMock(mockContext);

    expect(screen.getByText('設定のリセット')).toBeInTheDocument();
    expect(screen.getByText(/すべての保有資産、目標配分、AI設定をリセットします/)).toBeInTheDocument();
    expect(screen.getByText(/この操作は取り消せません/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '設定をリセット' })).toBeInTheDocument();

    // データがない場合は警告が表示されない
    expect(screen.queryByText(/警告:/)).not.toBeInTheDocument();
  });

  it('データがある場合に警告を表示する', () => {
    const mockContext = createMockContext({
      currentAssets: [
        { id: '1', ticker: 'AAPL', name: 'Apple Inc.' },
        { id: '2', ticker: 'GOOGL', name: 'Alphabet Inc.' }
      ],
      targetPortfolio: [
        { id: '1', ticker: 'AAPL', targetPercentage: 50 },
        { id: '2', ticker: 'GOOGL', targetPercentage: 50 }
      ]
    });
    renderWithMock(mockContext);

    expect(screen.getByText(/警告:/)).toBeInTheDocument();
    expect(screen.getByText('2件の保有資産データ')).toBeInTheDocument();
    expect(screen.getByText('2件の目標配分設定')).toBeInTheDocument();
    expect(screen.getByText('AI分析プロンプト設定')).toBeInTheDocument();
    expect(screen.getByText('その他すべての設定')).toBeInTheDocument();
  });

  it('リセットボタンクリックで確認ダイアログを表示する', () => {
    const mockContext = createMockContext();
    renderWithMock(mockContext);

    // 確認ダイアログが最初は表示されていない
    expect(screen.queryByText('本当にリセットしますか？')).not.toBeInTheDocument();

    // リセットボタンをクリック
    fireEvent.click(screen.getByRole('button', { name: '設定をリセット' }));

    // 確認ダイアログが表示される
    expect(screen.getByText('本当にリセットしますか？')).toBeInTheDocument();
    expect(screen.getByText(/この操作により、すべての設定データが削除されます/)).toBeInTheDocument();
    expect(screen.getByText(/削除されたデータは復元できません/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'リセットする' })).toBeInTheDocument();
  });

  it('確認ダイアログでキャンセルをクリックするとダイアログが閉じる', () => {
    const mockContext = createMockContext();
    renderWithMock(mockContext);

    // リセットボタンをクリックして確認ダイアログを表示
    fireEvent.click(screen.getByRole('button', { name: '設定をリセット' }));
    expect(screen.getByText('本当にリセットしますか？')).toBeInTheDocument();

    // キャンセルボタンをクリック
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));

    // 確認ダイアログが閉じる
    expect(screen.queryByText('本当にリセットしますか？')).not.toBeInTheDocument();
  });

  it('リセット実行で必要な関数が呼ばれる', async () => {
    vi.useFakeTimers();
    const mockContext = createMockContext();
    renderWithMock(mockContext);

    // リセットボタンをクリックして確認ダイアログを表示
    fireEvent.click(screen.getByRole('button', { name: '設定をリセット' }));

    // リセット実行
    fireEvent.click(screen.getByRole('button', { name: 'リセットする' }));

    // ダイアログが閉じる
    expect(screen.queryByText('本当にリセットしますか？')).not.toBeInTheDocument();

    // clearLocalStorage が呼ばれる
    expect(mockContext.clearLocalStorage).toHaveBeenCalledTimes(1);

    // 成功通知が表示される
    expect(mockContext.addNotification).toHaveBeenCalledWith(
      'すべての設定をリセットしました。ページを再読み込みします。',
      'success'
    );

    // 1秒後にページがリロードされる
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });
    expect(window.location.reload).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('リセット中にエラーが発生した場合の処理', async () => {
    vi.useFakeTimers();
    const mockContext = createMockContext({
      clearLocalStorage: vi.fn().mockImplementation(() => {
        throw new Error('ストレージエラー');
      })
    });

    renderWithMock(mockContext);

    // リセットボタンをクリックして確認ダイアログを表示
    fireEvent.click(screen.getByRole('button', { name: '設定をリセット' }));

    // リセット実行
    fireEvent.click(screen.getByRole('button', { name: 'リセットする' }));

    // エラー通知が表示される
    expect(mockContext.addNotification).toHaveBeenCalledWith(
      '設定のリセットに失敗しました',
      'error'
    );

    // logger.error が呼ばれる
    expect(mockLogger.error).toHaveBeenCalledWith(
      '設定のリセットに失敗しました:',
      expect.objectContaining({})
    );

    // タイマーを進めてもページはリロードされない
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });
    expect(window.location.reload).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('リセット中はボタンが無効になる', () => {
    const mockContext = createMockContext();
    renderWithMock(mockContext);

    // リセットボタンをクリックして確認ダイアログを表示
    fireEvent.click(screen.getByRole('button', { name: '設定をリセット' }));

    // リセット実行
    fireEvent.click(screen.getByRole('button', { name: 'リセットする' }));

    // リセットボタンが無効になる
    expect(screen.getByRole('button', { name: '設定をリセット' })).toBeDisabled();
  });

  it('確認ダイアログのスタイルが正しく適用される', () => {
    const mockContext = createMockContext();
    renderWithMock(mockContext);

    // リセットボタンをクリックして確認ダイアログを表示
    fireEvent.click(screen.getByRole('button', { name: '設定をリセット' }));

    // オーバーレイのスタイル確認
    const overlay = screen.getByText('本当にリセットしますか？').closest('.fixed');
    expect(overlay).toHaveClass('fixed', 'inset-0', 'bg-black/50', 'backdrop-blur-sm', 'flex', 'items-center', 'justify-center', 'z-50');

    // ダイアログボックスのスタイル確認
    const dialogBox = screen.getByText('本当にリセットしますか？').closest('.bg-card');
    expect(dialogBox).toHaveClass('bg-card', 'rounded-lg', 'p-6', 'max-w-md', 'w-full', 'mx-4');
  });

  it('警告ボックスのスタイルが正しく適用される', () => {
    const mockContext = createMockContext({
      currentAssets: [{ id: '1', ticker: 'AAPL' }]
    });
    renderWithMock(mockContext);

    const warningBox = screen.getByText(/警告:/).closest('div');
    expect(warningBox).toHaveClass('bg-warning-50', 'border', 'border-warning-200', 'rounded', 'p-3');
  });

  it('保有資産のみがある場合の表示', () => {
    const mockContext = createMockContext({
      currentAssets: [{ id: '1', ticker: 'AAPL' }],
      targetPortfolio: []
    });
    renderWithMock(mockContext);

    expect(screen.getByText('1件の保有資産データ')).toBeInTheDocument();
    expect(screen.queryByText(/件の目標配分設定/)).not.toBeInTheDocument();
  });

  it('目標配分のみがある場合の表示', () => {
    const mockContext = createMockContext({
      currentAssets: [],
      targetPortfolio: [{ id: '1', ticker: 'AAPL', targetPercentage: 100 }]
    });
    renderWithMock(mockContext);

    expect(screen.queryByText(/件の保有資産データ/)).not.toBeInTheDocument();
    expect(screen.getByText('1件の目標配分設定')).toBeInTheDocument();
  });

  it('Cardコンポーネントが正しく使用される', () => {
    const mockContext = createMockContext();
    renderWithMock(mockContext);

    // shadcn/ui Cardが適用される
    const heading = screen.getByText('設定のリセット');
    expect(heading).toBeInTheDocument();
    const card = heading.closest('[class*="rounded"]');
    expect(card).toBeTruthy();
  });

  it('Buttonのvariant="danger"が適用される', () => {
    const mockContext = createMockContext();
    renderWithMock(mockContext);

    const resetButton = screen.getByRole('button', { name: '設定をリセット' });
    // shadcn/ui Button dangerバリアントのクラスを確認
    expect(resetButton).toHaveClass('bg-danger-500');
  });

  it('loadingプロパティが正しく動作する', () => {
    const mockContext = createMockContext();
    renderWithMock(mockContext);

    // リセットボタンをクリックして確認ダイアログを表示
    fireEvent.click(screen.getByRole('button', { name: '設定をリセット' }));

    // リセット実行
    fireEvent.click(screen.getByRole('button', { name: 'リセットする' }));

    // リセット中はメインのリセットボタンが無効になる
    expect(screen.getByRole('button', { name: '設定をリセット' })).toBeDisabled();

    // loadingプロパティにより、ボタンのテキストが切り替わる可能性がある
    const buttons = screen.getAllByRole('button');
    const hasResetButton = buttons.some(btn =>
      btn.textContent?.includes('リセット')
    );
    expect(hasResetButton).toBeTruthy();
  });
});