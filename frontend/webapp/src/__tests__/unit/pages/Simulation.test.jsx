import { vi } from "vitest";
/**
 * Simulation.tsx のユニットテスト
 * シミュレーションページコンポーネントのテスト
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Simulation from '../../../pages/Simulation';

// usePortfolioContextをモック
vi.mock('../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: vi.fn()
}));

// uiStoreをモック
vi.mock('../../../stores/uiStore', () => ({
  useUIStore: vi.fn((selector) => {
    const state = { addNotification: vi.fn() };
    return selector ? selector(state) : state;
  }),
}));

import { usePortfolioContext } from '../../../hooks/usePortfolioContext';

// シミュレーションコンポーネントをモック
vi.mock('../../../components/simulation/BudgetInput', () => ({
  default: function BudgetInput() {
    return <div data-testid="budget-input">Budget Input</div>;
  },
}));

vi.mock('../../../components/simulation/SimulationResult', () => ({
  default: function SimulationResult({ simulationResults }) {
    return (
      <div data-testid="simulation-result">
        Simulation Result
        {simulationResults && <span data-testid="simulation-data">{JSON.stringify(simulationResults)}</span>}
      </div>
    );
  },
}));

vi.mock('../../../components/simulation/AiAnalysisPrompt', () => ({
  default: function AiAnalysisPrompt() {
    return <div data-testid="ai-analysis-prompt">AI Analysis Prompt</div>;
  },
}));

describe('Simulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // デフォルトのPortfolioContextモック
    usePortfolioContext.mockReturnValue({
      totalAssets: 1000000,
      additionalBudget: {
        amount: 100000,
        currency: 'JPY'
      },
      calculateSimulation: vi.fn(() => ({
        recommendations: [
          { ticker: 'AAPL', shares: 10, amount: 50000 },
          { ticker: 'GOOGL', shares: 5, amount: 50000 }
        ]
      })),
      executeBatchPurchase: vi.fn(),
      baseCurrency: 'JPY'
    });

    // Global methods mock
    global.confirm = vi.fn(() => true);
    global.alert = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('基本レンダリング', () => {
    it('すべてのシミュレーションコンポーネントを表示する', () => {
      render(<Simulation />);
      
      expect(screen.getByTestId('budget-input')).toBeInTheDocument();
      expect(screen.getByTestId('simulation-result')).toBeInTheDocument();
      expect(screen.getByTestId('ai-analysis-prompt')).toBeInTheDocument();
    });

    it('正しいセクションタイトルを表示する', () => {
      render(<Simulation />);
      
      expect(screen.getByText('追加投資のシミュレーション')).toBeInTheDocument();
      expect(screen.getByText('予算の設定')).toBeInTheDocument();
      expect(screen.getByText('シミュレーション結果')).toBeInTheDocument();
    });

    it('現在の総資産を表示する', () => {
      render(<Simulation />);
      
      expect(screen.getByText('現在の総資産')).toBeInTheDocument();
      expect(screen.getByText('1,000,000 円')).toBeInTheDocument();
    });

    it('追加予算を表示する', () => {
      render(<Simulation />);
      
      expect(screen.getByText('追加予算')).toBeInTheDocument();
      expect(screen.getByText('100,000 円')).toBeInTheDocument();
    });

    it('シミュレーション後の総資産を表示する', () => {
      render(<Simulation />);
      
      expect(screen.getByText('シミュレーション後の総資産')).toBeInTheDocument();
      expect(screen.getByText('1,100,000 円')).toBeInTheDocument();
    });
  });

  describe('通貨フォーマット', () => {
    it('JPY通貨を正しくフォーマットする', () => {
      usePortfolioContext.mockReturnValue({
        totalAssets: 1500000,
        additionalBudget: { amount: 200000, currency: 'JPY' },
        calculateSimulation: vi.fn(() => ({})),
        executeBatchPurchase: vi.fn(),
        baseCurrency: 'JPY'
      });
      
      render(<Simulation />);
      
      expect(screen.getByText('1,500,000 円')).toBeInTheDocument();
      expect(screen.getByText('200,000 円')).toBeInTheDocument();
    });

    it('USD通貨を正しくフォーマットする', () => {
      usePortfolioContext.mockReturnValue({
        totalAssets: 10000.50,
        additionalBudget: { amount: 1500.25, currency: 'USD' },
        calculateSimulation: vi.fn(() => ({})),
        executeBatchPurchase: vi.fn(),
        baseCurrency: 'USD'
      });
      
      render(<Simulation />);
      
      expect(screen.getByText('$10,000.50')).toBeInTheDocument();
      expect(screen.getByText('$1,500.25')).toBeInTheDocument();
    });
  });

  describe('一括購入機能', () => {
    it('一括購入ボタンを表示する', () => {
      render(<Simulation />);
      
      const batchPurchaseButton = screen.getByText('一括購入実行');
      expect(batchPurchaseButton).toBeInTheDocument();
      expect(batchPurchaseButton).toHaveClass('bg-success-500', 'hover:bg-success-600');
    });

    it('一括購入ボタンクリック時にConfirmDialogを表示する', () => {
      render(<Simulation />);

      const batchPurchaseButton = screen.getByText('一括購入実行');
      fireEvent.click(batchPurchaseButton);

      // ConfirmDialog が表示される
      expect(screen.getByText('一括購入の確認')).toBeInTheDocument();
      expect(screen.getByText('シミュレーション結果に基づいて購入を実行しますか？')).toBeInTheDocument();
    });

    it('確認後に一括購入を実行する', () => {
      const mockExecuteBatchPurchase = vi.fn();
      const mockSimulationResults = { recommendations: [] };

      usePortfolioContext.mockReturnValue({
        totalAssets: 1000000,
        additionalBudget: { amount: 100000, currency: 'JPY' },
        calculateSimulation: vi.fn(() => mockSimulationResults),
        executeBatchPurchase: mockExecuteBatchPurchase,
        baseCurrency: 'JPY'
      });

      render(<Simulation />);

      // ボタンクリック → ConfirmDialog表示
      fireEvent.click(screen.getByText('一括購入実行'));
      // ConfirmDialog内の「購入実行」ボタンをクリック
      fireEvent.click(screen.getByText('購入実行'));

      expect(mockExecuteBatchPurchase).toHaveBeenCalledWith(mockSimulationResults);
    });

    it('確認をキャンセルした場合は購入を実行しない', () => {
      const mockExecuteBatchPurchase = vi.fn();

      usePortfolioContext.mockReturnValue({
        totalAssets: 1000000,
        additionalBudget: { amount: 100000, currency: 'JPY' },
        calculateSimulation: vi.fn(() => ({})),
        executeBatchPurchase: mockExecuteBatchPurchase,
        baseCurrency: 'JPY'
      });

      render(<Simulation />);

      // ボタンクリック → ConfirmDialog表示
      fireEvent.click(screen.getByText('一括購入実行'));
      // ConfirmDialog内の「キャンセル」ボタンをクリック
      fireEvent.click(screen.getByText('キャンセル'));

      expect(mockExecuteBatchPurchase).not.toHaveBeenCalled();
    });
  });

  describe('シミュレーション計算', () => {
    it('シミュレーション結果を計算して表示する', () => {
      const mockSimulationResults = {
        recommendations: [
          { ticker: 'AAPL', shares: 10, amount: 50000 },
          { ticker: 'GOOGL', shares: 5, amount: 50000 }
        ]
      };
      const mockCalculateSimulation = vi.fn(() => mockSimulationResults);
      
      usePortfolioContext.mockReturnValue({
        totalAssets: 1000000,
        additionalBudget: { amount: 100000, currency: 'JPY' },
        calculateSimulation: mockCalculateSimulation,
        executeBatchPurchase: vi.fn(),
        baseCurrency: 'JPY'
      });
      
      render(<Simulation />);
      
      expect(mockCalculateSimulation).toHaveBeenCalled();
      expect(screen.getByTestId('simulation-result')).toBeInTheDocument();
    });
  });

  describe('レイアウトとスタイリング', () => {
    it('正しいレイアウトクラスが適用されている', () => {
      render(<Simulation />);
      
      const mainContainer = document.querySelector('.space-y-6');
      expect(mainContainer).toBeInTheDocument();
    });

    it('白背景のカードレイアウトが適用されている', () => {
      render(<Simulation />);
      
      const whiteCards = document.querySelectorAll('.bg-card.rounded-lg.shadow');
      expect(whiteCards.length).toBe(2); // 2つのメインセクション
    });

    it('情報表示セクションが正しくスタイリングされている', () => {
      render(<Simulation />);
      
      const infoSection = document.querySelector('.bg-primary-500\\/10.p-4.rounded-md');
      expect(infoSection).toBeInTheDocument();
    });
  });

  describe('エラーハンドリング', () => {
    it('PortfolioContextが空の場合はcalculateSimulationが未定義でエラーが発生する', () => {
      usePortfolioContext.mockReturnValue({});

      // calculateSimulationが未定義なのでTypeErrorが発生する
      expect(() => render(<Simulation />)).toThrow();
    });

    it('calculateSimulationが未定義の場合はエラーが発生する', () => {
      usePortfolioContext.mockReturnValue({
        totalAssets: 1000000,
        additionalBudget: { amount: 100000, currency: 'JPY' },
        executeBatchPurchase: vi.fn(),
        baseCurrency: 'JPY'
      });

      // calculateSimulationが未定義なのでTypeErrorが発生する
      expect(() => render(<Simulation />)).toThrow();
    });
  });

  describe('統合テスト', () => {
    it('完全なシミュレーションフローが正常に動作する', () => {
      const mockCalculateSimulation = vi.fn(() => ({
        recommendations: [{ ticker: 'AAPL', shares: 10, amount: 50000 }]
      }));
      const mockExecuteBatchPurchase = vi.fn();
      
      usePortfolioContext.mockReturnValue({
        totalAssets: 2000000,
        additionalBudget: { amount: 300000, currency: 'JPY' },
        calculateSimulation: mockCalculateSimulation,
        executeBatchPurchase: mockExecuteBatchPurchase,
        baseCurrency: 'JPY'
      });
      
      render(<Simulation />);
      
      // 1. 基本情報の表示確認
      expect(screen.getByText('2,000,000 円')).toBeInTheDocument(); // 総資産
      expect(screen.getByText('300,000 円')).toBeInTheDocument(); // 追加予算
      expect(screen.getByText('2,300,000 円')).toBeInTheDocument(); // 計算後総資産
      
      // 2. シミュレーション計算の実行確認
      expect(mockCalculateSimulation).toHaveBeenCalled();
      
      // 3. コンポーネントの表示確認
      expect(screen.getByTestId('budget-input')).toBeInTheDocument();
      expect(screen.getByTestId('simulation-result')).toBeInTheDocument();
      expect(screen.getByTestId('ai-analysis-prompt')).toBeInTheDocument();
      
      // 4. 一括購入フローのテスト（ConfirmDialog経由）
      const batchPurchaseButton = screen.getByText('一括購入実行');
      fireEvent.click(batchPurchaseButton);

      // ConfirmDialog が表示される
      expect(screen.getByText('一括購入の確認')).toBeInTheDocument();
      // 「購入実行」をクリック
      fireEvent.click(screen.getByText('購入実行'));

      expect(mockExecuteBatchPurchase).toHaveBeenCalled();
    });
  });
});