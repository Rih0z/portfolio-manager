/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: __tests__/unit/App.test.js
 *
 * 作成者: Koki Riho （https://github.com/Rih0z）
 * 作成日: 2025-03-01 10:00:00
 *
 * 更新履歴:
 * - 2025-03-01 10:00:00 Koki Riho 初回作成
 * - 2025-05-08 11:20:00 Koki Riho ファイルヘッダーを追加
 * - 2026-03-05 Zustand移行: jest→vi, Context→hook mock
 *
 * 説明:
 * App コンポーネントのテストファイル。
 * Appコンポーネントが正常にレンダリングされることを確認する。
 */

import { render, screen } from '@testing-library/react';
import App from '../../src/App';
import * as authHook from '../../src/hooks/useAuth';
import * as portfolioHook from '../../src/hooks/usePortfolioContext';

vi.mock('../../src/hooks/useAuth');
vi.mock('../../src/hooks/usePortfolioContext');

test('renders header title', async () => {
  authHook.useAuth.mockReturnValue({ isAuthenticated: false });
  portfolioHook.usePortfolioContext.mockReturnValue({
    baseCurrency: 'JPY',
    toggleCurrency: vi.fn(),
    refreshMarketPrices: vi.fn(),
    lastUpdated: null,
    isLoading: false,
    currentAssets: []
  });

  render(<App />);
  expect(await screen.findByText('ポートフォリオマネージャー')).toBeInTheDocument();
});
