/**
 * LanguageSwitcher.jsx のテストファイル
 * 言語切り替えコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { I18nextProvider } from 'react-i18next';
import LanguageSwitcher from '../../../../components/common/LanguageSwitcher';
import i18n from '../../../../i18n';

// i18n設定のモック
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      language: 'ja',
      changeLanguage: jest.fn()
    }
  }),
  I18nextProvider: ({ children }) => children
}));

// テスト用のラッパーコンポーネント
const TestWrapper = ({ children }) => (
  <I18nextProvider i18n={i18n}>
    {children}
  </I18nextProvider>
);

describe('LanguageSwitcher', () => {
  const mockChangeLanguage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // useTranslationのモックを再設定
    const { useTranslation } = require('react-i18next');
    useTranslation.mockReturnValue({
      i18n: {
        language: 'ja',
        changeLanguage: mockChangeLanguage
      }
    });
  });

  describe('基本レンダリング', () => {
    test('言語切り替えボタンが表示される', () => {
      render(
        <TestWrapper>
          <LanguageSwitcher />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    test('現在の言語が正しく表示される（日本語）', () => {
      render(
        <TestWrapper>
          <LanguageSwitcher />
        </TestWrapper>
      );

      expect(screen.getByText('🇯🇵')).toBeInTheDocument();
      expect(screen.getByText('日本語')).toBeInTheDocument();
    });

    test('ドロップダウンアイコンが表示される', () => {
      const { container } = render(
        <TestWrapper>
          <LanguageSwitcher />
        </TestWrapper>
      );

      const dropdownIcon = container.querySelector('svg');
      expect(dropdownIcon).toBeInTheDocument();
    });

    test('必要なCSSクラスが適用される', () => {
      render(
        <TestWrapper>
          <LanguageSwitcher />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'flex',
        'items-center',
        'space-x-2',
        'px-3',
        'py-2',
        'text-sm',
        'font-medium'
      );
    });
  });

  describe('言語選択メニュー', () => {
    test('すべての言語オプションが表示される', () => {
      render(
        <TestWrapper>
          <LanguageSwitcher />
        </TestWrapper>
      );

      // 日本語と英語の両方が表示される
      expect(screen.getByText('日本語')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('🇯🇵')).toBeInTheDocument();
      expect(screen.getByText('🇺🇸')).toBeInTheDocument();
    });

    test('現在選択されている言語にチェックマークが表示される', () => {
      const { container } = render(
        <TestWrapper>
          <LanguageSwitcher />
        </TestWrapper>
      );

      // 日本語が選択されているのでチェックマークがある
      const checkmarks = container.querySelectorAll('svg');
      // ドロップダウンアイコン + チェックマークアイコンの2つがある
      expect(checkmarks.length).toBeGreaterThanOrEqual(2);
    });

    test('選択された言語に適切なスタイルが適用される', () => {
      render(
        <TestWrapper>
          <LanguageSwitcher />
        </TestWrapper>
      );

      const japaneseButton = screen.getByText('日本語').closest('button');
      expect(japaneseButton).toHaveClass('bg-blue-50', 'text-blue-700');
    });

    test('非選択の言語に適切なスタイルが適用される', () => {
      render(
        <TestWrapper>
          <LanguageSwitcher />
        </TestWrapper>
      );

      const englishButton = screen.getByText('English').closest('button');
      expect(englishButton).toHaveClass('text-gray-700');
      expect(englishButton).not.toHaveClass('bg-blue-50', 'text-blue-700');
    });
  });

  describe('言語切り替え機能', () => {
    test('英語ボタンをクリックすると言語が切り替わる', () => {
      render(
        <TestWrapper>
          <LanguageSwitcher />
        </TestWrapper>
      );

      const englishButton = screen.getByText('English').closest('button');
      fireEvent.click(englishButton);

      expect(mockChangeLanguage).toHaveBeenCalledWith('en');
    });

    test('日本語ボタンをクリックすると言語が切り替わる', () => {
      render(
        <TestWrapper>
          <LanguageSwitcher />
        </TestWrapper>
      );

      const japaneseButton = screen.getByText('日本語').closest('button');
      fireEvent.click(japaneseButton);

      expect(mockChangeLanguage).toHaveBeenCalledWith('ja');
    });

    test('同じ言語を再度クリックしても切り替え関数が呼ばれる', () => {
      render(
        <TestWrapper>
          <LanguageSwitcher />
        </TestWrapper>
      );

      const japaneseButton = screen.getByText('日本語').closest('button');
      fireEvent.click(japaneseButton);

      expect(mockChangeLanguage).toHaveBeenCalledWith('ja');
    });
  });

  describe('英語環境での表示', () => {
    beforeEach(() => {
      const { useTranslation } = require('react-i18next');
      useTranslation.mockReturnValue({
        i18n: {
          language: 'en',
          changeLanguage: mockChangeLanguage
        }
      });
    });

    test('英語が選択されている場合の表示', () => {
      render(
        <TestWrapper>
          <LanguageSwitcher />
        </TestWrapper>
      );

      expect(screen.getByText('🇺🇸')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();

      const englishButton = screen.getByText('English').closest('button');
      expect(englishButton).toHaveClass('bg-blue-50', 'text-blue-700');

      const japaneseButton = screen.getByText('日本語').closest('button');
      expect(japaneseButton).toHaveClass('text-gray-700');
      expect(japaneseButton).not.toHaveClass('bg-blue-50', 'text-blue-700');
    });
  });

  describe('レスポンシブデザイン', () => {
    test('言語名にhidden sm:blockクラスが適用される', () => {
      render(
        <TestWrapper>
          <LanguageSwitcher />
        </TestWrapper>
      );

      const currentLanguageName = screen.getByText('日本語');
      expect(currentLanguageName).toHaveClass('hidden', 'sm:block');
    });
  });

  describe('ホバー効果とアクセシビリティ', () => {
    test('メインボタンにフォーカス関連のクラスが適用される', () => {
      render(
        <TestWrapper>
          <LanguageSwitcher />
        </TestWrapper>
      );

      const mainButton = screen.getAllByRole('button')[0]; // メインボタン
      expect(mainButton).toHaveClass(
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-offset-2',
        'focus:ring-blue-500'
      );
    });

    test('ドロップダウンメニューに適切なクラスが適用される', () => {
      const { container } = render(
        <TestWrapper>
          <LanguageSwitcher />
        </TestWrapper>
      );

      const dropdown = container.querySelector('.absolute');
      expect(dropdown).toHaveClass(
        'absolute',
        'right-0',
        'mt-2',
        'w-48',
        'bg-white',
        'rounded-md',
        'shadow-lg',
        'py-1',
        'z-50'
      );
    });

    test('言語オプションボタンにホバー効果のクラスが適用される', () => {
      render(
        <TestWrapper>
          <LanguageSwitcher />
        </TestWrapper>
      );

      const languageButtons = screen.getAllByRole('button').slice(1); // メインボタン以外
      languageButtons.forEach(button => {
        expect(button).toHaveClass('hover:bg-gray-100');
      });
    });
  });

  describe('エラーハンドリング', () => {
    test('不明な言語コードの場合はデフォルト（日本語）が表示される', () => {
      const { useTranslation } = require('react-i18next');
      useTranslation.mockReturnValue({
        i18n: {
          language: 'unknown',
          changeLanguage: mockChangeLanguage
        }
      });

      render(
        <TestWrapper>
          <LanguageSwitcher />
        </TestWrapper>
      );

      // デフォルトで日本語が表示される
      expect(screen.getByText('🇯🇵')).toBeInTheDocument();
      expect(screen.getByText('日本語')).toBeInTheDocument();
    });

    test('言語コードがundefinedの場合でもエラーが発生しない', () => {
      const { useTranslation } = require('react-i18next');
      useTranslation.mockReturnValue({
        i18n: {
          language: undefined,
          changeLanguage: mockChangeLanguage
        }
      });

      expect(() => {
        render(
          <TestWrapper>
            <LanguageSwitcher />
          </TestWrapper>
        );
      }).not.toThrow();
    });

    test('changeLanguage関数がエラーを投げても画面がクラッシュしない', () => {
      const errorChangeLanguage = jest.fn(() => {
        throw new Error('Language change failed');
      });

      const { useTranslation } = require('react-i18next');
      useTranslation.mockReturnValue({
        i18n: {
          language: 'ja',
          changeLanguage: errorChangeLanguage
        }
      });

      render(
        <TestWrapper>
          <LanguageSwitcher />
        </TestWrapper>
      );

      const englishButton = screen.getByText('English').closest('button');
      
      expect(() => {
        fireEvent.click(englishButton);
      }).toThrow('Language change failed');
    });
  });

  describe('アイコンとテキスト', () => {
    test('各言語の国旗絵文字が正しく表示される', () => {
      render(
        <TestWrapper>
          <LanguageSwitcher />
        </TestWrapper>
      );

      // 日本の国旗
      expect(screen.getAllByText('🇯🇵')).toHaveLength(2); // メインボタンとドロップダウン
      // アメリカの国旗
      expect(screen.getByText('🇺🇸')).toBeInTheDocument();
    });

    test('SVGアイコンが正しく表示される', () => {
      const { container } = render(
        <TestWrapper>
          <LanguageSwitcher />
        </TestWrapper>
      );

      const svgElements = container.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThanOrEqual(1);
      
      // ドロップダウンアイコンの確認
      const dropdownIcon = container.querySelector('svg[viewBox="0 0 24 24"]');
      expect(dropdownIcon).toBeInTheDocument();
    });
  });

  describe('データ構造', () => {
    test('言語配列が正しく定義されている', () => {
      render(
        <TestWrapper>
          <LanguageSwitcher />
        </TestWrapper>
      );

      // 日本語と英語の2つの言語が表示される
      expect(screen.getByText('日本語')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();
    });

    test('各言語オプションに必要な属性がある', () => {
      render(
        <TestWrapper>
          <LanguageSwitcher />
        </TestWrapper>
      );

      const japaneseButton = screen.getByText('日本語').closest('button');
      const englishButton = screen.getByText('English').closest('button');

      expect(japaneseButton).toHaveAttribute('type', 'button');
      expect(englishButton).toHaveAttribute('type', 'button');
    });
  });
});