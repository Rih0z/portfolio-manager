import { vi } from "vitest";
/**
 * PortfolioYamlConverter コンポーネントのテスト
 * Settings画面のYAML変換機能のテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PortfolioYamlConverter from '../../../../components/settings/PortfolioYamlConverter';

// usePortfolioContextのモック
vi.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: vi.fn()
}));

import { usePortfolioContext, type PortfolioContextValue } from '../../../../hooks/usePortfolioContext';

// react-i18nextのモック
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ja' }
  })
}));

// Navigator.clipboard のモック
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

describe('PortfolioYamlConverter', () => {
  const mockContextValue = {
    currentAssets: [
      {
        ticker: 'VTI',
        name: 'Vanguard Total Stock Market',
        holdings: 50,
        price: 220,
        percentage: 40,
        fundType: 'ETF (US)'
      },
      {
        ticker: '1475.T',
        name: 'iShares TOPIX',
        holdings: 100,
        price: 2500,
        percentage: 20,
        fundType: 'ETF (US)'
      }
    ],
    targetPortfolio: [
      { ticker: 'VTI', name: 'Vanguard Total Stock Market', targetPercentage: 40, type: 'etf' },
      { ticker: '1475.T', name: 'iShares TOPIX', targetPercentage: 20, type: 'etf' }
    ],
    importData: vi.fn(() => ({ success: true, message: 'データをインポートしました' })),
    totalAssets: 1000000,
    baseCurrency: 'JPY'
  };

  const renderWithContext = (contextValue = mockContextValue) => {
    vi.mocked(usePortfolioContext).mockReturnValue(contextValue as unknown as PortfolioContextValue);
    return render(
      <PortfolioYamlConverter />
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('コンポーネントの基本表示', () => {
    test('コンポーネントが正常にレンダリングされる', () => {
      renderWithContext();

      expect(screen.getByText('AI分析用YAMLプロンプト生成')).toBeInTheDocument();
      expect(screen.getByText('AI分析結果（YAML）の取り込み')).toBeInTheDocument();
    });

    test('使い方セクションが表示される', () => {
      renderWithContext();

      expect(screen.getByText('使用方法')).toBeInTheDocument();
      expect(screen.getByText('YAMLプロンプトを生成してコピー')).toBeInTheDocument();
    });

    test('説明文が表示される', () => {
      renderWithContext();

      expect(screen.getByText('現在のポートフォリオをYAML形式で出力し、AIに分析を依頼できます。')).toBeInTheDocument();
      expect(screen.getByText('AIから返却されたYAML形式のデータを貼り付けて取り込みます。')).toBeInTheDocument();
    });
  });

  describe('YAML生成機能', () => {
    test('YAML生成ボタンをクリックするとYAMLが表示される', () => {
      renderWithContext();

      const generateButton = screen.getByText('YAMLプロンプトを生成');
      fireEvent.click(generateButton);

      // YAMLが生成されてテキストエリアに表示される
      const readOnlyTextarea = document.querySelector('textarea[readonly]') as HTMLTextAreaElement | null;
      expect(readOnlyTextarea).toBeInTheDocument();
      expect(readOnlyTextarea!.value).toContain('ポートフォリオデータ');
    });

    test('生成されたYAMLにポートフォリオデータが含まれる', () => {
      renderWithContext();

      const generateButton = screen.getByText('YAMLプロンプトを生成');
      fireEvent.click(generateButton);

      const readOnlyTextarea = document.querySelector('textarea[readonly]') as HTMLTextAreaElement | null;
      expect((readOnlyTextarea as HTMLTextAreaElement).value).toContain('VTI');
      expect((readOnlyTextarea as HTMLTextAreaElement).value).toContain('1475.T');
    });

    test('生成されたYAMLに目標配分が含まれる', () => {
      renderWithContext();

      const generateButton = screen.getByText('YAMLプロンプトを生成');
      fireEvent.click(generateButton);

      const readOnlyTextarea = document.querySelector('textarea[readonly]') as HTMLTextAreaElement | null;
      expect((readOnlyTextarea as HTMLTextAreaElement).value).toContain('理想的な配分');
      expect((readOnlyTextarea as HTMLTextAreaElement).value).toContain('40%');
    });

    test('YAML生成時に自動的にクリップボードにコピーされる', async () => {
      renderWithContext();

      const generateButton = screen.getByText('YAMLプロンプトを生成');
      fireEvent.click(generateButton);

      // 生成と同時にクリップボードにコピーされる
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });
    });

    test('生成後にコピー確認メッセージが表示される', async () => {
      renderWithContext();

      const generateButton = screen.getByText('YAMLプロンプトを生成');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('✓ コピーしました')).toBeInTheDocument();
      });
    });
  });

  describe('YAML取り込み機能', () => {
    test('テキストエリアに入力できる', () => {
      renderWithContext();

      const textarea = screen.getByPlaceholderText('AIから返却されたYAMLデータをここに貼り付けてください...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'test yaml data' } });

      expect(textarea.value).toBe('test yaml data');
    });

    test('入力がない場合はインポートボタンが無効', () => {
      renderWithContext();

      const importButton = screen.getByText('YAMLデータを取り込む');
      expect(importButton).toBeDisabled();
    });

    test('入力がある場合はインポートボタンが有効', () => {
      renderWithContext();

      const textarea = screen.getByPlaceholderText('AIから返却されたYAMLデータをここに貼り付けてください...');
      fireEvent.change(textarea, { target: { value: 'test yaml data' } });

      const importButton = screen.getByText('YAMLデータを取り込む');
      expect(importButton).not.toBeDisabled();
    });

    test('有効なYAMLデータをインポートできる', () => {
      renderWithContext();

      const yamlData = `portfolio:
  現在の保有資産:
    - ティッカー: AAPL
      銘柄名: "Apple Inc."
      保有数: 10
      現在価格: 180
      配分率: 50%
  理想的な配分:
    - ティッカー: AAPL
      目標配分率: 60%`;

      const textarea = screen.getByPlaceholderText('AIから返却されたYAMLデータをここに貼り付けてください...');
      fireEvent.change(textarea, { target: { value: yamlData } });

      const importButton = screen.getByText('YAMLデータを取り込む');
      fireEvent.click(importButton);

      // importDataが呼ばれることを確認
      expect(mockContextValue.importData).toHaveBeenCalledWith(
        expect.objectContaining({
          currentAssets: expect.arrayContaining([
            expect.objectContaining({
              ticker: 'AAPL',
              name: 'Apple Inc.'
            })
          ])
        })
      );
    });

    test('インポート成功後にメッセージが表示される', () => {
      renderWithContext();

      const yamlData = `portfolio:
  現在の保有資産:
    - ティッカー: AAPL
      銘柄名: "Apple"
      保有数: 10
      現在価格: 180`;

      const textarea = screen.getByPlaceholderText('AIから返却されたYAMLデータをここに貼り付けてください...');
      fireEvent.change(textarea, { target: { value: yamlData } });

      const importButton = screen.getByText('YAMLデータを取り込む');
      fireEvent.click(importButton);

      // 成功メッセージが表示される
      expect(screen.getByText(/件の資産を取り込みました/)).toBeInTheDocument();
    });

    test('無効なYAMLデータの場合はエラーメッセージが表示される', () => {
      renderWithContext();

      const textarea = screen.getByPlaceholderText('AIから返却されたYAMLデータをここに貼り付けてください...');
      fireEvent.change(textarea, { target: { value: 'invalid yaml without proper structure' } });

      const importButton = screen.getByText('YAMLデータを取り込む');
      fireEvent.click(importButton);

      // エラーメッセージが表示される
      expect(screen.getByText('YAMLの解析に失敗しました')).toBeInTheDocument();
    });

    test('インポート成功後にテキストエリアがクリアされる', () => {
      renderWithContext();

      const yamlData = `portfolio:
  現在の保有資産:
    - ティッカー: AAPL
      銘柄名: "Apple"
      保有数: 10
      現在価格: 180`;

      const textarea = screen.getByPlaceholderText('AIから返却されたYAMLデータをここに貼り付けてください...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: yamlData } });

      const importButton = screen.getByText('YAMLデータを取り込む');
      fireEvent.click(importButton);

      expect(textarea.value).toBe('');
    });
  });

  describe('空ポートフォリオの処理', () => {
    test('空のポートフォリオでもエラーが発生しない', () => {
      const emptyContext = {
        currentAssets: [] as { ticker: string; name: string; holdings: number; price: number; percentage: number; fundType: string }[],
        targetPortfolio: [] as { ticker: string; name: string; targetPercentage: number; type: string }[],
        importData: vi.fn(() => ({ success: true, message: 'データをインポートしました' })),
        totalAssets: 0,
        baseCurrency: 'JPY'
      };

      renderWithContext(emptyContext);

      expect(screen.getByText('AI分析用YAMLプロンプト生成')).toBeInTheDocument();
    });

    test('空のポートフォリオでもYAML生成が動作する', () => {
      const emptyContext = {
        currentAssets: [] as { ticker: string; name: string; holdings: number; price: number; percentage: number; fundType: string }[],
        targetPortfolio: [] as { ticker: string; name: string; targetPercentage: number; type: string }[],
        importData: vi.fn(() => ({ success: true, message: 'データをインポートしました' })),
        totalAssets: 0,
        baseCurrency: 'JPY'
      };

      renderWithContext(emptyContext);

      const generateButton = screen.getByText('YAMLプロンプトを生成');
      fireEvent.click(generateButton);

      const readOnlyTextarea = document.querySelector('textarea[readonly]');
      expect(readOnlyTextarea).toBeInTheDocument();
    });
  });

  describe('使用方法の手順', () => {
    test('4つの手順が表示される', () => {
      renderWithContext();

      expect(screen.getByText('YAMLプロンプトを生成してコピー')).toBeInTheDocument();
      expect(screen.getByText('Claude、ChatGPT等のAIに貼り付けて分析を依頼')).toBeInTheDocument();
      expect(screen.getByText('AIから返却された改善案（YAML形式）を取り込み')).toBeInTheDocument();
      expect(screen.getByText('ポートフォリオが自動的に更新されます')).toBeInTheDocument();
    });
  });
});
