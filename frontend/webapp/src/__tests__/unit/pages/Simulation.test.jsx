/**
 * Simulation.jsx のユニットテスト
 * シミュレーションページコンポーネントのテスト
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Simulation from '../../../pages/Simulation';

// useContextをモック
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn()
}));

// シミュレーションコンポーネントをモック
jest.mock('../../../components/simulation/BudgetInput', () => {
  return function BudgetInput() {
    return <div data-testid="budget-input">Budget Input</div>;
  };
});

jest.mock('../../../components/simulation/SimulationResult', () => {
  return function SimulationResult({ simulationResults }) {
    return (
      <div data-testid="simulation-result">
        Simulation Result
        {simulationResults && <span data-testid="simulation-data">{JSON.stringify(simulationResults)}</span>}
      </div>
    );
  };
});

jest.mock('../../../components/simulation/AiAnalysisPrompt', () => {
  return function AiAnalysisPrompt() {
    return <div data-testid="ai-analysis-prompt">AI Analysis Prompt</div>;
  };
});

describe('Simulation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // デフォルトのPortfolioContextモック
    React.useContext.mockReturnValue({
      totalAssets: 1000000,
      additionalBudget: {
        amount: 100000,
        currency: 'JPY'
      },
      calculateSimulation: jest.fn(() => ({
        recommendations: [
          { ticker: 'AAPL', shares: 10, amount: 50000 },
          { ticker: 'GOOGL', shares: 5, amount: 50000 }
        ]
      })),
      executeBatchPurchase: jest.fn(),
      baseCurrency: 'JPY'
    });

    // Global methods mock
    global.confirm = jest.fn(() => true);
    global.alert = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
      React.useContext.mockReturnValue({
        totalAssets: 1500000,
        additionalBudget: { amount: 200000, currency: 'JPY' },
        calculateSimulation: jest.fn(() => ({})),
        executeBatchPurchase: jest.fn(),
        baseCurrency: 'JPY'
      });
      
      render(<Simulation />);
      
      expect(screen.getByText('1,500,000 円')).toBeInTheDocument();
      expect(screen.getByText('200,000 円')).toBeInTheDocument();
    });

    it('USD通貨を正しくフォーマットする', () => {
      React.useContext.mockReturnValue({
        totalAssets: 10000.50,
        additionalBudget: { amount: 1500.25, currency: 'USD' },
        calculateSimulation: jest.fn(() => ({})),
        executeBatchPurchase: jest.fn(),
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
      expect(batchPurchaseButton).toHaveClass('bg-green-600', 'hover:bg-green-700');
    });

    it('一括購入ボタンクリック時に確認ダイアログを表示する', () => {
      render(<Simulation />);
      
      const batchPurchaseButton = screen.getByText('一括購入実行');
      fireEvent.click(batchPurchaseButton);
      
      expect(global.confirm).toHaveBeenCalledWith('シミュレーション結果に基づいて購入を実行しますか？');
    });

    it('確認後に一括購入を実行する', () => {
      const mockExecuteBatchPurchase = jest.fn();
      const mockSimulationResults = { recommendations: [] };
      
      React.useContext.mockReturnValue({
        totalAssets: 1000000,
        additionalBudget: { amount: 100000, currency: 'JPY' },
        calculateSimulation: jest.fn(() => mockSimulationResults),
        executeBatchPurchase: mockExecuteBatchPurchase,
        baseCurrency: 'JPY'
      });
      
      render(<Simulation />);
      
      const batchPurchaseButton = screen.getByText('一括購入実行');
      fireEvent.click(batchPurchaseButton);
      
      expect(mockExecuteBatchPurchase).toHaveBeenCalledWith(mockSimulationResults);
      expect(global.alert).toHaveBeenCalledWith('購入処理が完了しました。');
    });

    it('確認をキャンセルした場合は購入を実行しない', () => {
      global.confirm = jest.fn(() => false);
      const mockExecuteBatchPurchase = jest.fn();
      
      React.useContext.mockReturnValue({
        totalAssets: 1000000,
        additionalBudget: { amount: 100000, currency: 'JPY' },
        calculateSimulation: jest.fn(() => ({})),
        executeBatchPurchase: mockExecuteBatchPurchase,
        baseCurrency: 'JPY'
      });
      
      render(<Simulation />);
      
      const batchPurchaseButton = screen.getByText('一括購入実行');
      fireEvent.click(batchPurchaseButton);
      
      expect(mockExecuteBatchPurchase).not.toHaveBeenCalled();
      expect(global.alert).not.toHaveBeenCalled();
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
      const mockCalculateSimulation = jest.fn(() => mockSimulationResults);
      
      React.useContext.mockReturnValue({
        totalAssets: 1000000,
        additionalBudget: { amount: 100000, currency: 'JPY' },
        calculateSimulation: mockCalculateSimulation,
        executeBatchPurchase: jest.fn(),
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
      
      const whiteCards = document.querySelectorAll('.bg-white.rounded-lg.shadow');
      expect(whiteCards.length).toBe(2); // 2つのメインセクション
    });

    it('情報表示セクションが正しくスタイリングされている', () => {
      render(<Simulation />);
      
      const infoSection = document.querySelector('.bg-blue-50.p-4.rounded-md');
      expect(infoSection).toBeInTheDocument();
    });
  });

  describe('エラーハンドリング', () => {
    it('PortfolioContextが未定義でもエラーが発生しない', () => {
      React.useContext.mockReturnValue({});
      
      expect(() => render(<Simulation />)).not.toThrow();
    });

    it('calculateSimulationが未定義でも動作する', () => {
      React.useContext.mockReturnValue({
        totalAssets: 1000000,
        additionalBudget: { amount: 100000, currency: 'JPY' },
        executeBatchPurchase: jest.fn(),
        baseCurrency: 'JPY'
      });
      
      expect(() => render(<Simulation />)).not.toThrow();
    });
  });

  describe('統合テスト', () => {
    it('完全なシミュレーションフローが正常に動作する', () => {
      const mockCalculateSimulation = jest.fn(() => ({
        recommendations: [{ ticker: 'AAPL', shares: 10, amount: 50000 }]
      }));
      const mockExecuteBatchPurchase = jest.fn();
      
      React.useContext.mockReturnValue({
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
      
      // 4. 一括購入フローのテスト
      const batchPurchaseButton = screen.getByText('一括購入実行');
      fireEvent.click(batchPurchaseButton);
      
      expect(global.confirm).toHaveBeenCalled();
      expect(mockExecuteBatchPurchase).toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalledWith('購入処理が完了しました。');
    });
  });
});