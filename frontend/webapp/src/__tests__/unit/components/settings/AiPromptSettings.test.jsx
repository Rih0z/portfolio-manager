/**
 * AiPromptSettings.jsx のテストファイル
 * AI分析プロンプト設定コンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AiPromptSettings from '../../../../components/settings/AiPromptSettings';

// usePortfolioContextのモック
const mockUpdateAiPromptTemplate = jest.fn();
jest.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: () => ({
    aiPromptTemplate: undefined,
    updateAiPromptTemplate: mockUpdateAiPromptTemplate
  })
}));

// タイマーのモック
jest.useFakeTimers();

describe('AiPromptSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  describe('基本表示', () => {
    test('タイトルと説明が表示される', () => {
      render(<AiPromptSettings />);
      
      expect(screen.getByText('AI分析プロンプト設定')).toBeInTheDocument();
      expect(screen.getByText(/シミュレーションタブで使用するAI分析プロンプト/)).toBeInTheDocument();
    });

    test('プレースホルダーのリストが表示される', () => {
      render(<AiPromptSettings />);
      
      expect(screen.getByText('{totalAssets}')).toBeInTheDocument();
      expect(screen.getByText('{baseCurrency}')).toBeInTheDocument();
      expect(screen.getByText('{monthlyBudget}')).toBeInTheDocument();
      expect(screen.getByText('{budgetCurrency}')).toBeInTheDocument();
      expect(screen.getByText('{currentAllocation}')).toBeInTheDocument();
      expect(screen.getByText('{targetAllocation}')).toBeInTheDocument();
    });

    test('説明文にプレースホルダーの説明が含まれている', () => {
      render(<AiPromptSettings />);
      
      expect(screen.getByText('総資産額')).toBeInTheDocument();
      expect(screen.getByText('基本通貨')).toBeInTheDocument();
      expect(screen.getByText('毎月の投資予定額')).toBeInTheDocument();
      expect(screen.getByText('予算通貨')).toBeInTheDocument();
      expect(screen.getByText('現在のポートフォリオ配分')).toBeInTheDocument();
      expect(screen.getByText('目標ポートフォリオ配分')).toBeInTheDocument();
    });

    test('保存とデフォルトに戻すボタンが表示される', () => {
      render(<AiPromptSettings />);
      
      expect(screen.getByText('保存')).toBeInTheDocument();
      expect(screen.getByText('デフォルトに戻す')).toBeInTheDocument();
    });

    test('AI分析プロンプトについての説明セクションが表示される', () => {
      render(<AiPromptSettings />);
      
      expect(screen.getByText('AI分析プロンプトについて')).toBeInTheDocument();
      expect(screen.getByText(/このテンプレートは、シミュレーションタブの/)).toBeInTheDocument();
    });
  });

  describe('テンプレート表示', () => {
    test('デフォルトテンプレートが表示される', () => {
      render(<AiPromptSettings />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(expect.stringContaining('あなたは投資分析に特化した AI アシスタントです。'));
      expect(textarea).toHaveValue(expect.stringContaining('現在の総資産額: {totalAssets}'));
    });

    test('テキストエリアが適切な属性を持っている', () => {
      render(<AiPromptSettings />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('spellCheck', 'false');
      expect(textarea).toHaveClass('font-mono');
    });
  });

  describe('テンプレート編集', () => {
    test('テンプレートを編集できる', () => {
      render(<AiPromptSettings />);
      
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'カスタムプロンプト' } });
      
      expect(textarea).toHaveValue('カスタムプロンプト');
    });

    test('空の値も設定できる', () => {
      render(<AiPromptSettings />);
      
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: '' } });
      
      expect(textarea).toHaveValue('');
    });
  });

  describe('保存機能', () => {
    test('保存ボタンをクリックするとupdateAiPromptTemplateが呼ばれる', () => {
      render(<AiPromptSettings />);
      
      const textarea = screen.getByRole('textbox');
      const saveButton = screen.getByText('保存');
      
      fireEvent.change(textarea, { target: { value: 'テスト用プロンプト' } });
      fireEvent.click(saveButton);
      
      expect(mockUpdateAiPromptTemplate).toHaveBeenCalledWith('テスト用プロンプト');
    });

    test('保存後に成功メッセージが表示される', () => {
      render(<AiPromptSettings />);
      
      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);
      
      expect(screen.getByText('保存しました')).toBeInTheDocument();
    });

    test('成功メッセージは3秒後に消える', async () => {
      render(<AiPromptSettings />);
      
      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);
      
      expect(screen.getByText('保存しました')).toBeInTheDocument();
      
      // 3秒進める
      jest.advanceTimersByTime(3000);
      
      await waitFor(() => {
        expect(screen.queryByText('保存しました')).not.toBeInTheDocument();
      });
    });

    test('空のテンプレートは保存されない', () => {
      render(<AiPromptSettings />);
      
      const textarea = screen.getByRole('textbox');
      const saveButton = screen.getByText('保存');
      
      fireEvent.change(textarea, { target: { value: '' } });
      fireEvent.click(saveButton);
      
      expect(mockUpdateAiPromptTemplate).not.toHaveBeenCalled();
    });
  });

  describe('リセット機能', () => {
    test('デフォルトに戻すボタンでテンプレートがリセットされる', () => {
      render(<AiPromptSettings />);
      
      const textarea = screen.getByRole('textbox');
      const resetButton = screen.getByText('デフォルトに戻す');
      
      // テンプレートを変更
      fireEvent.change(textarea, { target: { value: 'カスタム内容' } });
      expect(textarea).toHaveValue('カスタム内容');
      
      // リセット
      fireEvent.click(resetButton);
      expect(textarea).toHaveValue(expect.stringContaining('あなたは投資分析に特化した AI アシスタントです。'));
    });
  });

  describe('コンテキストからのテンプレート読み込み', () => {
    test('aiPromptTemplateが設定されている場合はそれを使用する', () => {
      const customTemplate = 'カスタムテンプレート内容';
      
      jest.doMock('../../../../hooks/usePortfolioContext', () => ({
        usePortfolioContext: () => ({
          aiPromptTemplate: customTemplate,
          updateAiPromptTemplate: mockUpdateAiPromptTemplate
        })
      }));
      
      // モジュールを再インポート
      const AiPromptSettingsReimport = require('../../../../components/settings/AiPromptSettings').default;
      render(<AiPromptSettingsReimport />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(customTemplate);
    });
  });

  describe('UI要素のスタイリング', () => {
    test('保存ボタンが適切なスタイルクラスを持っている', () => {
      render(<AiPromptSettings />);
      
      const saveButton = screen.getByText('保存');
      expect(saveButton).toHaveClass('bg-blue-500', 'text-white', 'hover:bg-blue-600');
    });

    test('デフォルトに戻すボタンが適切なスタイルクラスを持っている', () => {
      render(<AiPromptSettings />);
      
      const resetButton = screen.getByText('デフォルトに戻す');
      expect(resetButton).toHaveClass('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
    });

    test('成功メッセージが適切なスタイルとアイコンを持っている', () => {
      render(<AiPromptSettings />);
      
      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);
      
      const successMessage = screen.getByText('保存しました');
      expect(successMessage).toHaveClass('text-green-600');
      
      // チェックマークアイコンが表示されることを確認
      const icon = successMessage.parentElement.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    test('情報セクションが適切なスタイルを持っている', () => {
      render(<AiPromptSettings />);
      
      const infoSection = screen.getByText('AI分析プロンプトについて').parentElement;
      expect(infoSection).toHaveClass('bg-blue-50', 'rounded-lg');
    });
  });

  describe('アクセシビリティ', () => {
    test('テキストエリアにラベルが関連付けられている', () => {
      render(<AiPromptSettings />);
      
      // テキストエリアがあることを確認（role属性で特定）
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
    });

    test('ボタンにtype属性が適切に設定されている', () => {
      render(<AiPromptSettings />);
      
      const saveButton = screen.getByText('保存');
      const resetButton = screen.getByText('デフォルトに戻す');
      
      // デフォルトでは button type は "button"
      expect(saveButton).toHaveAttribute('type', 'button');
      expect(resetButton).toHaveAttribute('type', 'button');
    });
  });

  describe('エッジケース', () => {
    test('非常に長いテンプレートでも正常に動作する', () => {
      render(<AiPromptSettings />);
      
      const longTemplate = 'a'.repeat(10000);
      const textarea = screen.getByRole('textbox');
      const saveButton = screen.getByText('保存');
      
      fireEvent.change(textarea, { target: { value: longTemplate } });
      fireEvent.click(saveButton);
      
      expect(mockUpdateAiPromptTemplate).toHaveBeenCalledWith(longTemplate);
    });

    test('特殊文字を含むテンプレートでも正常に動作する', () => {
      render(<AiPromptSettings />);
      
      const specialTemplate = '特殊文字: {}[]()<>/@#$%^&*+=|\\~`';
      const textarea = screen.getByRole('textbox');
      const saveButton = screen.getByText('保存');
      
      fireEvent.change(textarea, { target: { value: specialTemplate } });
      fireEvent.click(saveButton);
      
      expect(mockUpdateAiPromptTemplate).toHaveBeenCalledWith(specialTemplate);
    });
  });
});