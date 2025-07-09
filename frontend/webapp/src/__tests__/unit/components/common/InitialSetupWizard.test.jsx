/**
 * InitialSetupWizard.jsx のテストファイル
 * 初期設定ウィザードコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import InitialSetupWizard from '../../../../components/common/InitialSetupWizard';
import { PortfolioContext } from '../../../../context/PortfolioContext';

// ModernButtonのモック
jest.mock('../../../../components/common/ModernButton', () => {
  return function ModernButton({ children, variant, onClick, ...props }) {
    return (
      <button 
        data-testid="modern-button"
        data-variant={variant}
        onClick={onClick}
        {...props}
      >
        {children}
      </button>
    );
  };
});

// ModernCardのモック
jest.mock('../../../../components/common/ModernCard', () => {
  return function ModernCard({ children, className }) {
    return (
      <div data-testid="modern-card" className={className}>
        {children}
      </div>
    );
  };
});

// ModernInputのモック
jest.mock('../../../../components/common/ModernInput', () => {
  return function ModernInput({ type, value, onChange, placeholder, className, ...props }) {
    return (
      <input
        data-testid="modern-input"
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
        {...props}
      />
    );
  };
});

// MarketSelectionWizardのモック
jest.mock('../../../../components/settings/MarketSelectionWizard', () => {
  return function MarketSelectionWizard({ 
    selectedMarkets, 
    onMarketsChange, 
    showTitle, 
    showPopularCombinations 
  }) {
    return (
      <div data-testid="market-selection-wizard">
        <div data-testid="show-title">{showTitle ? 'true' : 'false'}</div>
        <div data-testid="show-popular-combinations">{showPopularCombinations ? 'true' : 'false'}</div>
        <div data-testid="selected-markets">{selectedMarkets.join(',')}</div>
        <button 
          data-testid="mock-market-select"
          onClick={() => onMarketsChange(['US', 'JAPAN'])}
        >
          Select US + Japan
        </button>
      </div>
    );
  };
});

describe('InitialSetupWizard', () => {
  const mockPortfolioContext = {
    setBaseCurrency: jest.fn(),
    setAdditionalBudget: jest.fn(),
    addNotification: jest.fn()
  };

  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithContext = (component) => {
    return render(
      <PortfolioContext.Provider value={mockPortfolioContext}>
        {component}
      </PortfolioContext.Provider>
    );
  };

  describe('基本レンダリング', () => {
    test('ウィザードが正しく表示される', () => {
      renderWithContext(<InitialSetupWizard onComplete={mockOnComplete} />);

      expect(screen.getByText('Portfolio Wiseへようこそ！')).toBeInTheDocument();
      expect(screen.getByText('まず、基本的な設定から始めましょう。')).toBeInTheDocument();
    });

    test('プログレスバーが表示される', () => {
      renderWithContext(<InitialSetupWizard onComplete={mockOnComplete} />);

      expect(screen.getByText('基本設定')).toBeInTheDocument();
      expect(screen.getByText('投資予算')).toBeInTheDocument();
      expect(screen.getByText('投資対象')).toBeInTheDocument();
    });

    test('モーダル背景が表示される', () => {
      const { container } = renderWithContext(<InitialSetupWizard onComplete={mockOnComplete} />);

      const modal = container.firstChild;
      expect(modal).toHaveClass('fixed', 'inset-0', 'bg-black', 'bg-opacity-50');
    });

    test('ModernCardが正しく配置される', () => {
      renderWithContext(<InitialSetupWizard onComplete={mockOnComplete} />);

      const card = screen.getByTestId('modern-card');
      expect(card).toHaveClass('max-w-2xl', 'w-full', 'mx-4', 'max-h-[90vh]', 'overflow-y-auto');
    });
  });

  describe('ステップ1: 基本設定', () => {
    test('通貨選択ボタンが表示される', () => {
      renderWithContext(<InitialSetupWizard onComplete={mockOnComplete} />);

      expect(screen.getByText('¥ 日本円')).toBeInTheDocument();
      expect(screen.getByText('JPY')).toBeInTheDocument();
      expect(screen.getByText('$ 米ドル')).toBeInTheDocument();
      expect(screen.getByText('USD')).toBeInTheDocument();
    });

    test('JPYがデフォルトで選択されている', () => {
      const { container } = renderWithContext(<InitialSetupWizard onComplete={mockOnComplete} />);

      const jpyButton = screen.getByText('¥ 日本円').closest('button');
      expect(jpyButton).toHaveClass('border-blue-500', 'bg-blue-50');
    });

    test('USD選択が動作する', () => {
      renderWithContext(<InitialSetupWizard onComplete={mockOnComplete} />);

      const usdButton = screen.getByText('$ 米ドル').closest('button');
      fireEvent.click(usdButton);

      expect(usdButton).toHaveClass('border-blue-500', 'bg-blue-50');
    });

    test('次へボタンでステップ2に進む', () => {
      renderWithContext(<InitialSetupWizard onComplete={mockOnComplete} />);

      const nextButton = screen.getByText('次へ');
      fireEvent.click(nextButton);

      expect(screen.getByText('投資予算の設定')).toBeInTheDocument();
      expect(mockPortfolioContext.setBaseCurrency).toHaveBeenCalledWith('JPY');
    });

    test('USD選択後に次へボタンでUSDが設定される', () => {
      renderWithContext(<InitialSetupWizard onComplete={mockOnComplete} />);

      const usdButton = screen.getByText('$ 米ドル').closest('button');
      fireEvent.click(usdButton);
      
      const nextButton = screen.getByText('次へ');
      fireEvent.click(nextButton);

      expect(mockPortfolioContext.setBaseCurrency).toHaveBeenCalledWith('USD');
    });

    test('戻るボタンがステップ1では表示されない', () => {
      renderWithContext(<InitialSetupWizard onComplete={mockOnComplete} />);

      expect(screen.queryByText('戻る')).not.toBeInTheDocument();
    });
  });

  describe('ステップ2: 投資予算', () => {
    beforeEach(() => {
      renderWithContext(<InitialSetupWizard onComplete={mockOnComplete} />);
      const nextButton = screen.getByText('次へ');
      fireEvent.click(nextButton); // ステップ2に進む
    });

    test('投資予算入力画面が表示される', () => {
      expect(screen.getByText('投資予算の設定')).toBeInTheDocument();
      expect(screen.getByText('今回の投資に使用する予算を入力してください。')).toBeInTheDocument();
    });

    test('通貨記号が正しく表示される', () => {
      expect(screen.getByText('¥')).toBeInTheDocument(); // JPYがデフォルト
    });

    test('予算入力フィールドが表示される', () => {
      const input = screen.getByTestId('modern-input');
      expect(input).toHaveAttribute('type', 'number');
      expect(input).toHaveAttribute('placeholder', '300000');
    });

    test('予算を入力して次へボタンが動作する', async () => {
      const input = screen.getByTestId('modern-input');
      fireEvent.change(input, { target: { value: '500000' } });

      const nextButton = screen.getByText('次へ');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(mockPortfolioContext.setAdditionalBudget).toHaveBeenCalledWith(500000, 'JPY');
        expect(screen.getByText('投資対象の選択')).toBeInTheDocument();
      });
    });

    test('予算が空の場合は警告が表示される', async () => {
      const nextButton = screen.getByText('次へ');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(mockPortfolioContext.addNotification).toHaveBeenCalledWith(
          '投資予算を入力してください',
          'warning'
        );
      });
    });

    test('予算が0以下の場合は警告が表示される', async () => {
      const input = screen.getByTestId('modern-input');
      fireEvent.change(input, { target: { value: '0' } });

      const nextButton = screen.getByText('次へ');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(mockPortfolioContext.addNotification).toHaveBeenCalledWith(
          '投資予算を入力してください',
          'warning'
        );
      });
    });

    test('負の値の場合は警告が表示される', async () => {
      const input = screen.getByTestId('modern-input');
      fireEvent.change(input, { target: { value: '-1000' } });

      const nextButton = screen.getByText('次へ');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(mockPortfolioContext.addNotification).toHaveBeenCalledWith(
          '投資予算を入力してください',
          'warning'
        );
      });
    });

    test('戻るボタンでステップ1に戻る', () => {
      const backButton = screen.getByText('戻る');
      fireEvent.click(backButton);

      expect(screen.getByText('Portfolio Wiseへようこそ！')).toBeInTheDocument();
    });
  });

  describe('ステップ3: 投資対象選択', () => {
    beforeEach(async () => {
      renderWithContext(<InitialSetupWizard onComplete={mockOnComplete} />);
      
      // ステップ2に進む
      const nextButton1 = screen.getByText('次へ');
      fireEvent.click(nextButton1);

      // 予算を入力
      const input = screen.getByTestId('modern-input');
      fireEvent.change(input, { target: { value: '500000' } });

      // ステップ3に進む
      const nextButton2 = screen.getByText('次へ');
      fireEvent.click(nextButton2);

      await waitFor(() => {
        expect(screen.getByText('投資対象の選択')).toBeInTheDocument();
      });
    });

    test('投資対象選択画面が表示される', () => {
      expect(screen.getByText('投資対象の選択')).toBeInTheDocument();
      expect(screen.getByText('どの市場に投資したいですか？複数選択可能です。')).toBeInTheDocument();
    });

    test('MarketSelectionWizardが正しい設定で表示される', () => {
      const wizard = screen.getByTestId('market-selection-wizard');
      expect(wizard).toBeInTheDocument();

      expect(screen.getByTestId('show-title')).toHaveTextContent('false');
      expect(screen.getByTestId('show-popular-combinations')).toHaveTextContent('true');
    });

    test('市場選択が動作する', () => {
      const selectButton = screen.getByTestId('mock-market-select');
      fireEvent.click(selectButton);

      expect(screen.getByTestId('selected-markets')).toHaveTextContent('US,JAPAN');
    });

    test('市場を選択して設定完了する', async () => {
      const selectButton = screen.getByTestId('mock-market-select');
      fireEvent.click(selectButton);

      const completeButton = screen.getByText('設定を完了');
      fireEvent.click(completeButton);

      await waitFor(() => {
        expect(mockPortfolioContext.addNotification).toHaveBeenCalledWith(
          '初期設定が完了しました',
          'success'
        );
        expect(mockOnComplete).toHaveBeenCalled();
      });
    });

    test('市場を選択しないで完了ボタンを押すと警告が表示される', async () => {
      const completeButton = screen.getByText('設定を完了');
      fireEvent.click(completeButton);

      await waitFor(() => {
        expect(mockPortfolioContext.addNotification).toHaveBeenCalledWith(
          '投資対象を選択してください',
          'warning'
        );
        expect(mockOnComplete).not.toHaveBeenCalled();
      });
    });

    test('戻るボタンでステップ2に戻る', () => {
      const backButton = screen.getByText('戻る');
      fireEvent.click(backButton);

      expect(screen.getByText('投資予算の設定')).toBeInTheDocument();
    });
  });

  describe('プログレスバー', () => {
    test('ステップ1でプログレスバーが33%', () => {
      const { container } = renderWithContext(<InitialSetupWizard onComplete={mockOnComplete} />);
      
      const progressBar = container.querySelector('.bg-blue-600');
      expect(progressBar).toHaveAttribute('style', expect.stringContaining('width: 33.33'));
    });

    test('ステップ2でプログレスバーが66%', () => {
      const { container } = renderWithContext(<InitialSetupWizard onComplete={mockOnComplete} />);
      
      const nextButton = screen.getByText('次へ');
      fireEvent.click(nextButton);

      const progressBar = container.querySelector('.bg-blue-600');
      expect(progressBar).toHaveAttribute('style', expect.stringContaining('width: 66.66'));
    });

    test('ステップ3でプログレスバーが100%', async () => {
      const { container } = renderWithContext(<InitialSetupWizard onComplete={mockOnComplete} />);
      
      // ステップ2に進む
      const nextButton1 = screen.getByText('次へ');
      fireEvent.click(nextButton1);

      // 予算を入力
      const input = screen.getByTestId('modern-input');
      fireEvent.change(input, { target: { value: '500000' } });

      // ステップ3に進む
      const nextButton2 = screen.getByText('次へ');
      fireEvent.click(nextButton2);

      await waitFor(() => {
        const progressBar = container.querySelector('.bg-blue-600');
        expect(progressBar).toHaveAttribute('style', expect.stringContaining('width: 100'));
      });
    });
  });

  describe('USD通貨での動作', () => {
    test('USD選択時の予算入力プレースホルダー', () => {
      renderWithContext(<InitialSetupWizard onComplete={mockOnComplete} />);

      // USD選択
      const usdButton = screen.getByText('$ 米ドル').closest('button');
      fireEvent.click(usdButton);

      // ステップ2に進む
      const nextButton = screen.getByText('次へ');
      fireEvent.click(nextButton);

      // USD用のプレースホルダーと通貨記号を確認
      expect(screen.getByText('$')).toBeInTheDocument();
      const input = screen.getByTestId('modern-input');
      expect(input).toHaveAttribute('placeholder', '2000');
    });

    test('USD選択時の予算設定', async () => {
      renderWithContext(<InitialSetupWizard onComplete={mockOnComplete} />);

      // USD選択
      const usdButton = screen.getByText('$ 米ドル').closest('button');
      fireEvent.click(usdButton);

      // ステップ2に進む
      const nextButton1 = screen.getByText('次へ');
      fireEvent.click(nextButton1);

      // 予算を入力
      const input = screen.getByTestId('modern-input');
      fireEvent.change(input, { target: { value: '3000' } });

      // ステップ3に進む
      const nextButton2 = screen.getByText('次へ');
      fireEvent.click(nextButton2);

      await waitFor(() => {
        expect(mockPortfolioContext.setAdditionalBudget).toHaveBeenCalledWith(3000, 'USD');
      });
    });
  });

  describe('エラーハンドリング', () => {
    test('無効な予算入力の処理', async () => {
      renderWithContext(<InitialSetupWizard onComplete={mockOnComplete} />);
      
      // ステップ2に進む
      const nextButton1 = screen.getByText('次へ');
      fireEvent.click(nextButton1);

      // 無効な値を入力
      const input = screen.getByTestId('modern-input');
      fireEvent.change(input, { target: { value: 'invalid' } });

      const nextButton2 = screen.getByText('次へ');
      fireEvent.click(nextButton2);

      await waitFor(() => {
        expect(mockPortfolioContext.addNotification).toHaveBeenCalledWith(
          '投資予算を入力してください',
          'warning'
        );
      });
    });

    test('PortfolioContextが存在しない場合のエラーハンドリング', () => {
      // コンテキストなしでレンダリングするとエラーをconsole.errorに出力される
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<InitialSetupWizard onComplete={mockOnComplete} />);
      }).not.toThrow();
      
      consoleSpy.mockRestore();
    });
  });

  describe('ボタンの状態管理', () => {
    test('各ステップでボタンテキストが正しい', async () => {
      renderWithContext(<InitialSetupWizard onComplete={mockOnComplete} />);

      // ステップ1
      expect(screen.getByText('次へ')).toBeInTheDocument();

      // ステップ2に進む
      fireEvent.click(screen.getByText('次へ'));
      expect(screen.getByText('次へ')).toBeInTheDocument();
      expect(screen.getByText('戻る')).toBeInTheDocument();

      // ステップ3に進む
      const input = screen.getByTestId('modern-input');
      fireEvent.change(input, { target: { value: '500000' } });
      fireEvent.click(screen.getByText('次へ'));

      await waitFor(() => {
        expect(screen.getByText('設定を完了')).toBeInTheDocument();
        expect(screen.getByText('戻る')).toBeInTheDocument();
      });
    });

    test('ModernButtonに正しいvariantが設定される', () => {
      renderWithContext(<InitialSetupWizard onComplete={mockOnComplete} />);

      const buttons = screen.getAllByTestId('modern-button');
      const nextButton = buttons.find(btn => btn.textContent === '次へ');
      expect(nextButton).toHaveAttribute('data-variant', 'primary');
    });
  });
});