/**
 * DarkButton.jsx のテストファイル
 * ダークテーマボタンコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DarkButton from '../../../../components/common/DarkButton';

describe('DarkButton', () => {
  describe('基本機能', () => {
    test('子コンテンツを表示する', () => {
      render(<DarkButton>クリック</DarkButton>);
      expect(screen.getByText('クリック')).toBeInTheDocument();
    });

    test('クリックイベントが正しく動作する', () => {
      const mockClick = jest.fn();
      render(<DarkButton onClick={mockClick}>クリック</DarkButton>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(mockClick).toHaveBeenCalledTimes(1);
    });

    test('無効化された場合はクリックイベントが呼ばれない', () => {
      const mockClick = jest.fn();
      render(<DarkButton disabled onClick={mockClick}>クリック</DarkButton>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(mockClick).not.toHaveBeenCalled();
    });

    test('ローディング中はクリックイベントが呼ばれない', () => {
      const mockClick = jest.fn();
      render(<DarkButton loading onClick={mockClick}>クリック</DarkButton>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(mockClick).not.toHaveBeenCalled();
    });
  });

  describe('バリアント', () => {
    test('primaryバリアント（デフォルト）', () => {
      render(<DarkButton>Primary</DarkButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('bg-primary-500');
      expect(button).toHaveClass('text-white');
      expect(button).toHaveClass('border-primary-500');
    });

    test('secondaryバリアント', () => {
      render(<DarkButton variant="secondary">Secondary</DarkButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('bg-dark-300');
      expect(button).toHaveClass('text-gray-300');
      expect(button).toHaveClass('border-dark-400');
    });

    test('successバリアント', () => {
      render(<DarkButton variant="success">Success</DarkButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('bg-success-500');
      expect(button).toHaveClass('text-white');
      expect(button).toHaveClass('border-success-500');
    });

    test('dangerバリアント', () => {
      render(<DarkButton variant="danger">Danger</DarkButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('bg-danger-500');
      expect(button).toHaveClass('text-white');
      expect(button).toHaveClass('border-danger-500');
    });

    test('warningバリアント', () => {
      render(<DarkButton variant="warning">Warning</DarkButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('bg-warning-500');
      expect(button).toHaveClass('text-dark-100');
      expect(button).toHaveClass('border-warning-500');
    });

    test('ghostバリアント', () => {
      render(<DarkButton variant="ghost">Ghost</DarkButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('bg-transparent');
      expect(button).toHaveClass('text-gray-300');
      expect(button).toHaveClass('border-transparent');
    });

    test('outlineバリアント', () => {
      render(<DarkButton variant="outline">Outline</DarkButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('bg-transparent');
      expect(button).toHaveClass('text-primary-400');
      expect(button).toHaveClass('border-primary-500');
    });

    test('不明なバリアントの場合はデフォルト（primary）になる', () => {
      render(<DarkButton variant="unknown">Unknown</DarkButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('bg-primary-500');
      expect(button).toHaveClass('text-white');
      expect(button).toHaveClass('border-primary-500');
    });
  });

  describe('サイズ', () => {
    test('xsサイズ', () => {
      render(<DarkButton size="xs">XS</DarkButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('px-2.5');
      expect(button).toHaveClass('py-1.5');
      expect(button).toHaveClass('text-xs');
      expect(button).toHaveClass('min-h-[32px]');
    });

    test('smサイズ', () => {
      render(<DarkButton size="sm">SM</DarkButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('px-3');
      expect(button).toHaveClass('py-2');
      expect(button).toHaveClass('text-sm');
      expect(button).toHaveClass('min-h-[36px]');
    });

    test('mdサイズ（デフォルト）', () => {
      render(<DarkButton>MD</DarkButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('px-4');
      expect(button).toHaveClass('py-2.5');
      expect(button).toHaveClass('text-sm');
      expect(button).toHaveClass('min-h-[44px]');
    });

    test('lgサイズ', () => {
      render(<DarkButton size="lg">LG</DarkButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('px-6');
      expect(button).toHaveClass('py-3');
      expect(button).toHaveClass('text-base');
      expect(button).toHaveClass('min-h-[48px]');
    });

    test('xlサイズ', () => {
      render(<DarkButton size="xl">XL</DarkButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('px-8');
      expect(button).toHaveClass('py-4');
      expect(button).toHaveClass('text-lg');
      expect(button).toHaveClass('min-h-[56px]');
    });

    test('不明なサイズの場合はデフォルト（md）になる', () => {
      render(<DarkButton size="unknown">Unknown</DarkButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('px-4');
      expect(button).toHaveClass('py-2.5');
      expect(button).toHaveClass('text-sm');
      expect(button).toHaveClass('min-h-[44px]');
    });
  });

  describe('無効化状態', () => {
    test('disabledの場合、適切なスタイルが適用される', () => {
      render(<DarkButton disabled>Disabled</DarkButton>);
      const button = screen.getByRole('button');
      
      expect(button).toBeDisabled();
      expect(button).toHaveClass('bg-dark-400');
      expect(button).toHaveClass('text-gray-500');
      expect(button).toHaveClass('cursor-not-allowed');
      expect(button).toHaveClass('border-dark-500');
    });

    test('disabledの場合、バリアントのスタイルよりも優先される', () => {
      render(<DarkButton disabled variant="primary">Disabled Primary</DarkButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('bg-dark-400');
      expect(button).not.toHaveClass('bg-primary-500');
    });
  });

  describe('ローディング状態', () => {
    test('loadingの場合、スピナーが表示される', () => {
      render(<DarkButton loading>Loading</DarkButton>);
      
      const spinner = screen.getByRole('button').querySelector('svg');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
    });

    test('loadingの場合、ボタンが無効化される', () => {
      render(<DarkButton loading>Loading</DarkButton>);
      const button = screen.getByRole('button');
      
      expect(button).toBeDisabled();
    });

    test('loadingでも子コンテンツは表示される', () => {
      render(<DarkButton loading>読み込み中</DarkButton>);
      
      expect(screen.getByText('読み込み中')).toBeInTheDocument();
    });
  });

  describe('アイコン機能', () => {
    const testIcon = <span data-testid="test-icon">🚀</span>;

    test('アイコンが左側に表示される（デフォルト）', () => {
      render(<DarkButton icon={testIcon}>Launch</DarkButton>);
      
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
      expect(screen.getByText('Launch')).toBeInTheDocument();
      
      // アイコンが左側にあることを確認
      const button = screen.getByRole('button');
      const iconElement = screen.getByTestId('test-icon').parentElement;
      const textElement = screen.getByText('Launch').parentElement;
      
      expect(iconElement).toHaveClass('flex-shrink-0');
      expect(textElement).toHaveClass('ml-2');
    });

    test('iconPositionがleftの場合、アイコンが左側に表示される', () => {
      render(<DarkButton icon={testIcon} iconPosition="left">Launch</DarkButton>);
      
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
      const iconElement = screen.getByTestId('test-icon').parentElement;
      const textElement = screen.getByText('Launch').parentElement;
      
      expect(iconElement).toHaveClass('flex-shrink-0');
      expect(textElement).toHaveClass('ml-2');
    });

    test('iconPositionがrightの場合、アイコンが右側に表示される', () => {
      render(<DarkButton icon={testIcon} iconPosition="right">Launch</DarkButton>);
      
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
      const iconElement = screen.getByTestId('test-icon').parentElement;
      const textElement = screen.getByText('Launch').parentElement;
      
      expect(iconElement).toHaveClass('flex-shrink-0');
      expect(textElement).toHaveClass('mr-2');
    });

    test('アイコンのみでテキストがない場合', () => {
      render(<DarkButton icon={testIcon} />);
      
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
      expect(screen.getByTestId('test-icon').parentElement).toHaveClass('flex-shrink-0');
    });

    test('テキストのみでアイコンがない場合', () => {
      render(<DarkButton>Text Only</DarkButton>);
      
      expect(screen.getByText('Text Only')).toBeInTheDocument();
      expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument();
    });
  });

  describe('カスタムクラス', () => {
    test('カスタムクラスが追加される', () => {
      render(<DarkButton className="custom-class">Custom</DarkButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveClass('custom-class');
      expect(button).toHaveClass('inline-flex'); // デフォルトクラスも保持
    });
  });

  describe('その他のProps', () => {
    test('追加のpropsが正しく渡される', () => {
      render(<DarkButton data-testid="custom-button" type="submit">Submit</DarkButton>);
      const button = screen.getByTestId('custom-button');
      
      expect(button).toHaveAttribute('type', 'submit');
    });

    test('aria属性が正しく設定される', () => {
      render(<DarkButton aria-label="カスタムボタン">Button</DarkButton>);
      const button = screen.getByRole('button');
      
      expect(button).toHaveAttribute('aria-label', 'カスタムボタン');
    });
  });

  describe('コンポーネントの組み合わせ', () => {
    test('loading + icon + text の組み合わせ', () => {
      const testIcon = <span data-testid="test-icon">🚀</span>;
      render(<DarkButton loading icon={testIcon}>Loading</DarkButton>);
      
      // ローディング中はスピナーが表示され、アイコンは無視される
      const spinner = screen.getByRole('button').querySelector('svg');
      expect(spinner).toBeInTheDocument();
      expect(screen.getByText('Loading')).toBeInTheDocument();
      expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument();
    });

    test('disabled + variant + size の組み合わせ', () => {
      render(<DarkButton disabled variant="success" size="lg">Disabled Large Success</DarkButton>);
      const button = screen.getByRole('button');
      
      // disabledが優先されるためsuccessのスタイルは適用されない
      expect(button).toBeDisabled();
      expect(button).toHaveClass('bg-dark-400');
      expect(button).not.toHaveClass('bg-success-500');
      
      // サイズは適用される
      expect(button).toHaveClass('px-6');
      expect(button).toHaveClass('py-3');
      expect(button).toHaveClass('text-base');
    });
  });
});