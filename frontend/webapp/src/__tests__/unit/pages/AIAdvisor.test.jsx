import { vi } from "vitest";
/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/__tests__/unit/pages/AIAdvisor.test.jsx
 *
 * 作成者: Claude Code
 * 作成日: 2025-01-03
 * 更新日: 2026-03-09
 *
 * 説明:
 * AIAdvisorページのユニットテスト（3ステップ構成対応）
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AIAdvisor from '../../../pages/AIAdvisor';

// usePortfolioContextのモック
vi.mock('../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: vi.fn()
}));

// useIsPremiumのモック
vi.mock('../../../hooks/queries', () => ({
  useIsPremium: vi.fn(() => false),
}));

// useNavigateのモック
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

import { usePortfolioContext } from '../../../hooks/usePortfolioContext';

// テスト用のラッパーコンポーネント
const TestWrapper = ({ children, portfolioValue = {} }) => {
  const defaultAssets = portfolioValue.assets || [];
  const mockPortfolioContext = {
    currentAssets: defaultAssets,
    targetPortfolio: [],
    additionalBudget: { amount: 0, currency: 'JPY' },
    totalAssets: portfolioValue.totalValue || 0,
    baseCurrency: 'JPY',
    exchangeRate: { rate: 150 },
    exportData: vi.fn(() => ({
      currentAssets: defaultAssets,
      targetPortfolio: [],
      baseCurrency: 'JPY',
      ...portfolioValue
    })),
  };

  usePortfolioContext.mockReturnValue(mockPortfolioContext);

  return (
    <MemoryRouter>
      {children}
    </MemoryRouter>
  );
};

// window.open をモック
global.open = vi.fn();

// navigator.clipboard をモック
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe('AIAdvisor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('初期表示', () => {
    test('タイトルと説明が表示される', () => {
      render(
        <TestWrapper>
          <AIAdvisor />
        </TestWrapper>
      );

      expect(screen.getByText(/AIアドバイザー/)).toBeInTheDocument();
      expect(screen.getByText(/あなたの情報を教えてください/)).toBeInTheDocument();
    });

    test('3ステップのプログレスバーが表示される', () => {
      render(
        <TestWrapper>
          <AIAdvisor />
        </TestWrapper>
      );

      expect(screen.getByText('プロフィール')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    test('クイック分析ボタンが表示される', () => {
      render(
        <TestWrapper>
          <AIAdvisor />
        </TestWrapper>
      );

      expect(screen.getByText(/クイック分析（デフォルト値/)).toBeInTheDocument();
    });
  });

  describe('ステップ1: プロフィール', () => {
    test('年齢スライダーが操作できる', () => {
      render(
        <TestWrapper>
          <AIAdvisor />
        </TestWrapper>
      );

      const ageSlider = screen.getByRole('slider');
      fireEvent.change(ageSlider, { target: { value: '40' } });

      expect(screen.getByText('40歳')).toBeInTheDocument();
    });

    test('職業の選択ができる', () => {
      render(
        <TestWrapper>
          <AIAdvisor />
        </TestWrapper>
      );

      const selects = screen.getAllByRole('combobox');
      const occupationSelect = selects[0];
      fireEvent.change(occupationSelect, { target: { value: '会社員' } });

      expect(occupationSelect.value).toBe('会社員');
    });

    test('投資経験の選択ボタンが表示される', () => {
      render(
        <TestWrapper>
          <AIAdvisor />
        </TestWrapper>
      );

      expect(screen.getByText('投資経験')).toBeInTheDocument();
      expect(screen.getByText('初心者（1年未満）')).toBeInTheDocument();
      expect(screen.getByText('初級者（1-3年）')).toBeInTheDocument();
    });

    test('リスク許容度の選択が表示される', () => {
      render(
        <TestWrapper>
          <AIAdvisor />
        </TestWrapper>
      );

      expect(screen.getByText('リスク許容度')).toBeInTheDocument();
      expect(screen.getByText('保守的（リスクを避けたい）')).toBeInTheDocument();
      expect(screen.getByText('バランス型（適度なリスクは取れる）')).toBeInTheDocument();
    });

    test('戻るボタンがステップ1では無効', () => {
      render(
        <TestWrapper>
          <AIAdvisor />
        </TestWrapper>
      );

      const prevButton = screen.getByText('戻る').closest('button');
      expect(prevButton).toBeDisabled();
    });
  });

  describe('ステップ2: 投資方針', () => {
    const goToStep2 = () => {
      fireEvent.click(screen.getByText('次へ'));
    };

    test('次へボタンでステップ2に遷移する', () => {
      render(
        <TestWrapper>
          <AIAdvisor />
        </TestWrapper>
      );

      goToStep2();

      expect(screen.getByText('投資対象市場')).toBeInTheDocument();
    });

    test('市場選択が表示される', () => {
      render(
        <TestWrapper>
          <AIAdvisor />
        </TestWrapper>
      );

      goToStep2();

      expect(screen.getByText('米国市場')).toBeInTheDocument();
      expect(screen.getByText('日本市場')).toBeInTheDocument();
    });

    test('毎月の投資可能額入力フィールドが表示される', () => {
      render(
        <TestWrapper>
          <AIAdvisor />
        </TestWrapper>
      );

      goToStep2();

      expect(screen.getByPlaceholderText('例: 50000')).toBeInTheDocument();
    });

    test('毎月の投資可能額を入力できる', () => {
      render(
        <TestWrapper>
          <AIAdvisor />
        </TestWrapper>
      );

      goToStep2();

      const monthlyInput = screen.getByPlaceholderText('例: 50000');
      fireEvent.change(monthlyInput, { target: { value: '30000' } });

      expect(monthlyInput.value).toBe('30000');
    });

    test('価値観と懸念事項の選択が表示される', () => {
      render(
        <TestWrapper>
          <AIAdvisor />
        </TestWrapper>
      );

      goToStep2();

      expect(screen.getByText('大切にしている価値観（複数選択可）')).toBeInTheDocument();
      expect(screen.getByText('不安に思っていること（複数選択可）')).toBeInTheDocument();
      expect(screen.getByText('安全性重視')).toBeInTheDocument();
      expect(screen.getByText('市場の暴落が心配')).toBeInTheDocument();
    });

    test('戻るボタンでステップ1に戻れる', () => {
      render(
        <TestWrapper>
          <AIAdvisor />
        </TestWrapper>
      );

      goToStep2();
      expect(screen.getByText('投資対象市場')).toBeInTheDocument();

      fireEvent.click(screen.getByText('戻る'));
      expect(screen.getByText('プロフィール')).toBeInTheDocument();
    });

    test('プロンプト生成ボタンが表示される（ステップ2の次へボタン）', () => {
      render(
        <TestWrapper>
          <AIAdvisor />
        </TestWrapper>
      );

      goToStep2();

      expect(screen.getByText('プロンプト生成')).toBeInTheDocument();
    });
  });

  describe('ステップ3: AI分析', () => {
    const goToStep3 = () => {
      fireEvent.click(screen.getByText('次へ')); // step 0 → 1
      fireEvent.click(screen.getByText('プロンプト生成')); // step 1 → 2
    };

    test('プロンプト生成ボタンでステップ3に遷移し、プロンプトが表示される', () => {
      render(
        <TestWrapper>
          <AIAdvisor />
        </TestWrapper>
      );

      goToStep3();

      expect(screen.getByText('生成されたプロンプト')).toBeInTheDocument();
    });

    test('次へボタンがステップ3では無効', () => {
      render(
        <TestWrapper>
          <AIAdvisor />
        </TestWrapper>
      );

      goToStep3();

      const nextButton = screen.getByText('次へ').closest('button');
      expect(nextButton).toBeDisabled();
    });

    test('スクリーンショット分析セクションが存在する', () => {
      render(
        <TestWrapper>
          <AIAdvisor />
        </TestWrapper>
      );

      goToStep3();

      expect(screen.getByText(/スクリーンショット分析プロンプト/)).toBeInTheDocument();
    });
  });

  describe('クイック分析', () => {
    test('クイック分析ボタンでステップ3に直接遷移する', () => {
      render(
        <TestWrapper>
          <AIAdvisor />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText(/クイック分析（デフォルト値/));

      expect(screen.getByText('生成されたプロンプト')).toBeInTheDocument();
    });
  });

  describe('全ステップナビゲーション', () => {
    test('全ステップを正常に遷移できる', () => {
      render(
        <TestWrapper>
          <AIAdvisor />
        </TestWrapper>
      );

      // ステップ1: プロフィール
      const ageSlider = screen.getByRole('slider');
      fireEvent.change(ageSlider, { target: { value: '30' } });
      expect(screen.getByText('30歳')).toBeInTheDocument();

      // ステップ2: 投資方針
      fireEvent.click(screen.getByText('次へ'));
      expect(screen.getByText('投資対象市場')).toBeInTheDocument();

      // ステップ3: AI分析
      fireEvent.click(screen.getByText('プロンプト生成'));
      expect(screen.getByText('生成されたプロンプト')).toBeInTheDocument();
    });
  });
});
