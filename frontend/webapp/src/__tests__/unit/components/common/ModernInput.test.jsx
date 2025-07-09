/**
 * ModernInputコンポーネントのユニットテスト
 * 
 * テスト対象:
 * - 基本的な入力機能とref転送
 * - ラベル、エラー、ヒントの表示
 * - 3種類のvariant（default, filled, underline）
 * - 3種類のサイズ（sm, md, lg）
 * - アイコン機能（left/right位置）
 * - エラー状態とバリデーション表示
 * - フォーカス、hover状態
 * - disabled状態
 * - アクセシビリティ
 */

import React, { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ModernInput from '../../../../components/common/ModernInput';

describe('ModernInput', () => {
  describe('基本的なレンダリング', () => {
    test('基本的な入力フィールドがレンダリングされる', () => {
      render(<ModernInput placeholder="テスト入力" />);
      
      const input = screen.getByPlaceholderText('テスト入力');
      expect(input).toBeInTheDocument();
      expect(input.tagName).toBe('INPUT');
    });

    test('defaultクラスが適用される', () => {
      render(<ModernInput data-testid="input" />);
      
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('w-full', 'border', 'transition-all', 'duration-200');
      expect(input).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-offset-0');
      expect(input).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
      expect(input).toHaveClass('placeholder:text-secondary-400');
    });

    test('追加のpropsが正しく渡される', () => {
      render(
        <ModernInput 
          data-testid="test-input"
          type="email"
          required
          autoComplete="email"
        />
      );
      
      const input = screen.getByTestId('test-input');
      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveAttribute('required');
      expect(input).toHaveAttribute('autoComplete', 'email');
    });

    test('カスタムクラス名が追加される', () => {
      render(<ModernInput className="custom-class" data-testid="input" />);
      
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('custom-class');
    });

    test('コンテナのカスタムクラス名が適用される', () => {
      const { container } = render(
        <ModernInput containerClassName="custom-container" />
      );
      
      expect(container.firstChild).toHaveClass('custom-container');
    });
  });

  describe('ref転送', () => {
    test('refが正しく転送される', () => {
      const inputRef = createRef();
      render(<ModernInput ref={inputRef} />);
      
      expect(inputRef.current).toBeInstanceOf(HTMLInputElement);
    });

    test('refを使ってフォーカスできる', () => {
      const inputRef = createRef();
      render(<ModernInput ref={inputRef} />);
      
      inputRef.current.focus();
      expect(inputRef.current).toHaveFocus();
    });

    test('displayNameが設定されている', () => {
      expect(ModernInput.displayName).toBe('ModernInput');
    });
  });

  describe('ラベル機能', () => {
    test('ラベルが表示される', () => {
      render(<ModernInput label="ユーザー名" />);
      
      const label = screen.getByText('ユーザー名');
      expect(label).toBeInTheDocument();
      expect(label.tagName).toBe('LABEL');
      expect(label).toHaveClass('block', 'text-sm', 'font-medium', 'text-secondary-700', 'mb-2');
    });

    test('ラベルがない場合は表示されない', () => {
      render(<ModernInput placeholder="ラベルなし" />);
      
      expect(screen.queryByRole('label')).not.toBeInTheDocument();
    });
  });

  describe('variant プロパティ', () => {
    test('default variant', () => {
      render(<ModernInput variant="default" data-testid="input" />);
      
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('border-secondary-300');
      expect(input).toHaveClass('focus:border-primary-500', 'focus:ring-primary-500/20');
      expect(input).toHaveClass('bg-white', 'hover:border-secondary-400');
    });

    test('filled variant', () => {
      render(<ModernInput variant="filled" data-testid="input" />);
      
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('border-transparent');
      expect(input).toHaveClass('bg-secondary-100');
      expect(input).toHaveClass('focus:bg-white', 'focus:border-primary-500', 'focus:ring-primary-500/20');
      expect(input).toHaveClass('hover:bg-secondary-50');
    });

    test('underline variant', () => {
      render(<ModernInput variant="underline" data-testid="input" />);
      
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('border-0', 'border-b-2', 'border-secondary-300');
      expect(input).toHaveClass('bg-transparent', 'rounded-none');
      expect(input).toHaveClass('focus:border-primary-500', 'focus:ring-0');
      expect(input).toHaveClass('hover:border-secondary-400');
    });

    test('未定義variantはdefaultクラスを使用', () => {
      render(<ModernInput variant="unknown" data-testid="input" />);
      
      const input = screen.getByTestId('input');
      // 未定義の場合、variants[variant]がundefinedになる
      expect(input).toHaveClass('w-full', 'border');
    });
  });

  describe('size プロパティ', () => {
    test('sm サイズ', () => {
      render(<ModernInput size="sm" data-testid="input" />);
      
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('px-3', 'py-2', 'text-sm', 'rounded-lg');
    });

    test('md サイズ（デフォルト）', () => {
      render(<ModernInput data-testid="input" />);
      
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('px-4', 'py-3', 'text-base', 'rounded-xl');
    });

    test('lg サイズ', () => {
      render(<ModernInput size="lg" data-testid="input" />);
      
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('px-5', 'py-4', 'text-lg', 'rounded-xl');
    });
  });

  describe('アイコン機能', () => {
    const TestIcon = () => <span>🔍</span>;

    test('左側アイコン（デフォルト）', () => {
      const { container } = render(
        <ModernInput 
          icon={<TestIcon />}
          data-testid="input"
        />
      );
      
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('pl-10');
      expect(input).not.toHaveClass('pr-10');
      
      const iconContainer = container.querySelector('.absolute.inset-y-0.left-0');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer).toHaveClass('pl-3');
      
      expect(screen.getByText('🔍')).toBeInTheDocument();
    });

    test('右側アイコン', () => {
      const { container } = render(
        <ModernInput 
          icon={<TestIcon />}
          iconPosition="right"
          data-testid="input"
        />
      );
      
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('pr-10');
      expect(input).not.toHaveClass('pl-10');
      
      const iconContainer = container.querySelector('.absolute.inset-y-0.right-0');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer).toHaveClass('pr-3');
      
      expect(screen.getByText('🔍')).toBeInTheDocument();
    });

    test('アイコンのサイズがinputサイズに連動', () => {
      const { container, rerender } = render(
        <ModernInput 
          icon={<TestIcon />}
          size="sm"
        />
      );
      
      let iconSpan = container.querySelector('.absolute span');
      expect(iconSpan).toHaveClass('w-4', 'h-4');
      
      rerender(
        <ModernInput 
          icon={<TestIcon />}
          size="md"
        />
      );
      
      iconSpan = container.querySelector('.absolute span');
      expect(iconSpan).toHaveClass('w-5', 'h-5');
      
      rerender(
        <ModernInput 
          icon={<TestIcon />}
          size="lg"
        />
      );
      
      iconSpan = container.querySelector('.absolute span');
      expect(iconSpan).toHaveClass('w-6', 'h-6');
    });

    test('アイコンがない場合はpaddingが適用されない', () => {
      render(<ModernInput data-testid="input" />);
      
      const input = screen.getByTestId('input');
      expect(input).not.toHaveClass('pl-10', 'pr-10');
    });

    test('アイコンコンテナにpointer-events-noneが適用される', () => {
      const { container } = render(
        <ModernInput icon={<span>🔍</span>} />
      );
      
      const iconContainer = container.querySelector('.absolute');
      expect(iconContainer).toHaveClass('pointer-events-none', 'text-secondary-400');
    });
  });

  describe('エラー表示', () => {
    test('エラーメッセージが表示される', () => {
      render(<ModernInput error="必須項目です" />);
      
      const errorMessage = screen.getByText('必須項目です');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage.tagName).toBe('P');
      expect(errorMessage).toHaveClass('mt-1', 'text-sm', 'text-danger-600', 'flex', 'items-center');
    });

    test('エラー時のinputスタイリング', () => {
      render(<ModernInput error="エラーです" data-testid="input" />);
      
      const input = screen.getByTestId('input');
      expect(input).toHaveClass('border-danger-500', 'focus:border-danger-500', 'focus:ring-danger-500/20');
    });

    test('エラーアイコンが表示される', () => {
      const { container } = render(<ModernInput error="エラーです" />);
      
      const errorIcon = container.querySelector('.text-danger-600 svg');
      expect(errorIcon).toBeInTheDocument();
      expect(errorIcon).toHaveClass('w-4', 'h-4', 'mr-1');
      expect(errorIcon).toHaveAttribute('fill', 'currentColor');
      expect(errorIcon).toHaveAttribute('viewBox', '0 0 20 20');
    });

    test('エラーがない場合はエラーメッセージが表示されない', () => {
      render(<ModernInput placeholder="エラーなし" />);
      
      expect(screen.queryByText(/text-danger-600/)).not.toBeInTheDocument();
    });
  });

  describe('ヒント表示', () => {
    test('ヒントメッセージが表示される', () => {
      render(<ModernInput hint="8文字以上で入力してください" />);
      
      const hintMessage = screen.getByText('8文字以上で入力してください');
      expect(hintMessage).toBeInTheDocument();
      expect(hintMessage).toHaveClass('mt-1', 'text-sm', 'text-secondary-500');
    });

    test('エラーがある場合はヒントが表示されない', () => {
      render(
        <ModernInput 
          hint="ヒントメッセージ"
          error="エラーメッセージ"
        />
      );
      
      expect(screen.getByText('エラーメッセージ')).toBeInTheDocument();
      expect(screen.queryByText('ヒントメッセージ')).not.toBeInTheDocument();
    });

    test('エラーもヒントもない場合', () => {
      render(<ModernInput placeholder="メッセージなし" />);
      
      expect(screen.queryByText(/text-sm/)).not.toBeInTheDocument();
    });
  });

  describe('入力機能', () => {
    test('値の入力と変更', () => {
      const handleChange = jest.fn();
      render(<ModernInput onChange={handleChange} data-testid="input" />);
      
      const input = screen.getByTestId('input');
      fireEvent.change(input, { target: { value: 'テスト入力' } });
      
      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(input.value).toBe('テスト入力');
    });

    test('フォーカスイベント', () => {
      const handleFocus = jest.fn();
      render(<ModernInput onFocus={handleFocus} data-testid="input" />);
      
      const input = screen.getByTestId('input');
      fireEvent.focus(input);
      
      expect(handleFocus).toHaveBeenCalledTimes(1);
      expect(input).toHaveFocus();
    });

    test('ブラーイベント', () => {
      const handleBlur = jest.fn();
      render(<ModernInput onBlur={handleBlur} data-testid="input" />);
      
      const input = screen.getByTestId('input');
      fireEvent.focus(input);
      fireEvent.blur(input);
      
      expect(handleBlur).toHaveBeenCalledTimes(1);
      expect(input).not.toHaveFocus();
    });
  });

  describe('disabled状態', () => {
    test('disabled時のスタイリング', () => {
      render(<ModernInput disabled data-testid="input" />);
      
      const input = screen.getByTestId('input');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });

    test('disabled時は入力できない', () => {
      const handleChange = jest.fn();
      render(<ModernInput disabled onChange={handleChange} data-testid="input" />);
      
      const input = screen.getByTestId('input');
      fireEvent.change(input, { target: { value: 'テスト' } });
      
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('アクセシビリティ', () => {
    test('labelとinputが正しく関連付けられる', () => {
      render(<ModernInput label="メールアドレス" />);
      
      const label = screen.getByText('メールアドレス');
      const input = screen.getByRole('textbox');
      
      expect(label).toBeInTheDocument();
      expect(input).toBeInTheDocument();
      
      // React Testing Libraryは自動的にlabel-input関連付けを認識
      expect(screen.getByLabelText('メールアドレス')).toBe(input);
    });

    test('aria属性の設定', () => {
      render(
        <ModernInput 
          label="パスワード"
          error="パスワードが短すぎます"
          aria-describedby="password-help"
        />
      );
      
      const input = screen.getByLabelText('パスワード');
      expect(input).toHaveAttribute('aria-describedby', 'password-help');
    });

    test('required属性', () => {
      render(<ModernInput label="必須項目" required />);
      
      const input = screen.getByLabelText('必須項目');
      expect(input).toHaveAttribute('required');
    });
  });

  describe('複合テスト', () => {
    test('全機能を組み合わせたテスト', () => {
      const handleChange = jest.fn();
      const { container } = render(
        <ModernInput 
          label="検索キーワード"
          placeholder="商品を検索..."
          icon={<span>🔍</span>}
          iconPosition="left"
          variant="filled"
          size="lg"
          hint="商品名またはカテゴリーで検索できます"
          onChange={handleChange}
          data-testid="search-input"
        />
      );
      
      // ラベル確認
      expect(screen.getByText('検索キーワード')).toBeInTheDocument();
      
      // input確認
      const input = screen.getByTestId('search-input');
      expect(input).toHaveClass('bg-secondary-100', 'px-5', 'py-4', 'text-lg', 'pl-10');
      expect(input).toHaveAttribute('placeholder', '商品を検索...');
      
      // アイコン確認
      expect(screen.getByText('🔍')).toBeInTheDocument();
      const iconContainer = container.querySelector('.absolute.left-0');
      expect(iconContainer).toBeInTheDocument();
      
      // ヒント確認
      expect(screen.getByText('商品名またはカテゴリーで検索できます')).toBeInTheDocument();
      
      // 入力動作確認
      fireEvent.change(input, { target: { value: 'ノートパソコン' } });
      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(input.value).toBe('ノートパソコン');
    });

    test('エラーとアイコンの組み合わせ', () => {
      render(
        <ModernInput 
          label="パスワード"
          icon={<span>🔒</span>}
          error="パスワードが短すぎます"
          hint="このヒントは表示されません"
          data-testid="password-input"
        />
      );
      
      const input = screen.getByTestId('password-input');
      expect(input).toHaveClass('border-danger-500', 'pl-10');
      
      expect(screen.getByText('🔒')).toBeInTheDocument();
      expect(screen.getByText('パスワードが短すぎます')).toBeInTheDocument();
      expect(screen.queryByText('このヒントは表示されません')).not.toBeInTheDocument();
    });
  });

  describe('エッジケース', () => {
    test('空文字列のlabel、error、hint', () => {
      render(
        <ModernInput 
          label=""
          error=""
          hint=""
        />
      );
      
      expect(screen.getByText('')).toBeInTheDocument(); // 空のラベル
    });

    test('nullまたはundefinedのprops', () => {
      expect(() => {
        render(
          <ModernInput 
            label={null}
            error={undefined}
            hint={null}
            icon={null}
          />
        );
      }).not.toThrow();
    });

    test('非標準のsize値', () => {
      render(<ModernInput size="unknown" data-testid="input" />);
      
      const input = screen.getByTestId('input');
      // 未定義サイズの場合、sizes[size]がundefinedになる
      expect(input).toHaveClass('w-full', 'border');
    });
  });
});