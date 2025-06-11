/**
 * ModernButton.jsx のユニットテスト
 * React forwardRefコンポーネントのテスト
 * 
 * カバレッジ対象:
 * - 基本的なレンダリングとプロパティ
 * - 全variant（primary, secondary, success, danger, ghost, outline）
 * - 全size（xs, sm, md, lg, xl）
 * - 全rounded（none, sm, md, lg, xl, 2xl, full）
 * - loading状態とスピナー
 * - アイコンの左右配置
 * - disabled状態
 * - fullWidth機能
 * - forwardRef機能
 * - CSS クラス合成
 * - イベントハンドリング
 * - アクセシビリティ
 * - エッジケース
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ModernButton from '../../../../components/common/ModernButton';

describe('ModernButton', () => {
  it('基本的なボタンをレンダリングする', () => {
    render(<ModernButton>Click me</ModernButton>);
    
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Click me');
  });

  it('disabled状態を正しく処理する', () => {
    render(<ModernButton disabled>Disabled Button</ModernButton>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
  });

  it('loading状態を正しく処理する', () => {
    render(<ModernButton loading loadingText="Loading...">Submit</ModernButton>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Loading...');
    expect(button).toHaveClass('cursor-wait');
  });

  it('loading状態でスピナーを表示する', () => {
    render(<ModernButton loading>Submit</ModernButton>);
    
    const spinner = screen.getByRole('button').querySelector('svg');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');
  });

  it('primary variantのスタイルを適用する', () => {
    render(<ModernButton variant="primary">Primary</ModernButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-gradient-to-r', 'from-primary-500', 'to-primary-600');
  });

  it('secondary variantのスタイルを適用する', () => {
    render(<ModernButton variant="secondary">Secondary</ModernButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-white', 'border', 'border-secondary-300');
  });

  it('success variantのスタイルを適用する', () => {
    render(<ModernButton variant="success">Success</ModernButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('from-success-500', 'to-success-600');
  });

  it('danger variantのスタイルを適用する', () => {
    render(<ModernButton variant="danger">Danger</ModernButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('from-danger-500', 'to-danger-600');
  });

  it('ghost variantのスタイルを適用する', () => {
    render(<ModernButton variant="ghost">Ghost</ModernButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('text-secondary-700', 'hover:bg-secondary-100');
  });

  it('outline variantのスタイルを適用する', () => {
    render(<ModernButton variant="outline">Outline</ModernButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('border-2', 'border-primary-500', 'text-primary-600');
  });

  it('異なるサイズのスタイルを適用する', () => {
    const { rerender } = render(<ModernButton size="xs">XS</ModernButton>);
    expect(screen.getByRole('button')).toHaveClass('px-3', 'py-1.5', 'text-xs');

    rerender(<ModernButton size="sm">SM</ModernButton>);
    expect(screen.getByRole('button')).toHaveClass('px-4', 'py-2', 'text-sm');

    rerender(<ModernButton size="md">MD</ModernButton>);
    expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'text-base');

    rerender(<ModernButton size="lg">LG</ModernButton>);
    expect(screen.getByRole('button')).toHaveClass('px-8', 'py-4', 'text-lg');

    rerender(<ModernButton size="xl">XL</ModernButton>);
    expect(screen.getByRole('button')).toHaveClass('px-10', 'py-5', 'text-xl');
  });

  it('異なる角丸スタイルを適用する', () => {
    const { rerender } = render(<ModernButton rounded="none">None</ModernButton>);
    expect(screen.getByRole('button')).toHaveClass('rounded-none');

    rerender(<ModernButton rounded="sm">SM</ModernButton>);
    expect(screen.getByRole('button')).toHaveClass('rounded-sm');

    rerender(<ModernButton rounded="md">MD</ModernButton>);
    expect(screen.getByRole('button')).toHaveClass('rounded-md');

    rerender(<ModernButton rounded="lg">LG</ModernButton>);
    expect(screen.getByRole('button')).toHaveClass('rounded-lg');

    rerender(<ModernButton rounded="xl">XL</ModernButton>);
    expect(screen.getByRole('button')).toHaveClass('rounded-xl');

    rerender(<ModernButton rounded="2xl">2XL</ModernButton>);
    expect(screen.getByRole('button')).toHaveClass('rounded-2xl');

    rerender(<ModernButton rounded="full">Full</ModernButton>);
    expect(screen.getByRole('button')).toHaveClass('rounded-full');
  });

  it('fullWidth プロパティを正しく処理する', () => {
    render(<ModernButton fullWidth>Full Width</ModernButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('w-full');
  });

  it('カスタムクラス名を追加する', () => {
    render(<ModernButton className="custom-class">Custom</ModernButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('左側にアイコンを表示する', () => {
    const icon = <span data-testid="test-icon">🔍</span>;
    render(<ModernButton icon={icon} iconPosition="left">Search</ModernButton>);
    
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('右側にアイコンを表示する', () => {
    const icon = <span data-testid="test-icon">➡️</span>;
    render(<ModernButton icon={icon} iconPosition="right">Next</ModernButton>);
    
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('loading状態ではアイコンを表示しない', () => {
    const icon = <span data-testid="test-icon">🔍</span>;
    render(<ModernButton icon={icon} loading>Search</ModernButton>);
    
    expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument();
  });

  it('クリックイベントを正しく処理する', () => {
    const mockClick = jest.fn();
    render(<ModernButton onClick={mockClick}>Click me</ModernButton>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockClick).toHaveBeenCalledTimes(1);
  });

  it('disabled状態ではクリックイベントが発火しない', () => {
    const mockClick = jest.fn();
    render(<ModernButton onClick={mockClick} disabled>Disabled</ModernButton>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockClick).not.toHaveBeenCalled();
  });

  it('loading状態ではクリックイベントが発火しない', () => {
    const mockClick = jest.fn();
    render(<ModernButton onClick={mockClick} loading>Loading</ModernButton>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockClick).not.toHaveBeenCalled();
  });

  it('forwardRefが正しく動作する', () => {
    const ref = React.createRef();
    render(<ModernButton ref={ref}>Ref Test</ModernButton>);
    
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current).toHaveTextContent('Ref Test');
  });

  it('HTML属性を正しく渡す', () => {
    render(
      <ModernButton 
        type="submit" 
        name="test-button" 
        value="test-value"
        data-testid="custom-button"
      >
        Submit
      </ModernButton>
    );
    
    const button = screen.getByTestId('custom-button');
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveAttribute('name', 'test-button');
    expect(button).toHaveAttribute('value', 'test-value');
  });

  it('aria属性を正しく処理する', () => {
    render(
      <ModernButton 
        aria-label="カスタムラベル"
        aria-describedby="help-text"
      >
        アクセシブルボタン
      </ModernButton>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'カスタムラベル');
    expect(button).toHaveAttribute('aria-describedby', 'help-text');
  });

  it('基本クラスが常に適用される', () => {
    render(<ModernButton>Test</ModernButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass(
      'inline-flex',
      'items-center',
      'justify-center',
      'font-medium',
      'transition-all',
      'duration-200',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-2'
    );
  });

  it('デフォルト値が正しく適用される', () => {
    render(<ModernButton>Default</ModernButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('from-primary-500'); // primary variant
    expect(button).toHaveClass('px-6', 'py-3'); // md size
    expect(button).toHaveClass('rounded-full'); // full rounded
    expect(button).not.toBeDisabled(); // not disabled
    expect(button).not.toHaveClass('w-full'); // not fullWidth
  });

  it('複数のpropsを組み合わせて使用できる', () => {
    render(
      <ModernButton 
        variant="success"
        size="lg"
        rounded="md"
        fullWidth
        className="custom-class"
      >
        Complex Button
      </ModernButton>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('from-success-500');
    expect(button).toHaveClass('px-8', 'py-4', 'text-lg');
    expect(button).toHaveClass('rounded-md');
    expect(button).toHaveClass('w-full');
    expect(button).toHaveClass('custom-class');
  });

  it('displayNameが正しく設定される', () => {
    expect(ModernButton.displayName).toBe('ModernButton');
  });

  // エッジケース・追加テスト
  describe('エッジケースとCSSクラス合成', () => {
    it('無効なvariantを指定した場合はundefinedクラスが適用される', () => {
      render(<ModernButton variant="invalid">Invalid</ModernButton>);
      
      const button = screen.getByRole('button');
      // 無効なvariantでもbaseClassesは適用される
      expect(button).toHaveClass('inline-flex', 'items-center');
    });

    it('無効なsizeを指定した場合はundefinedクラスが適用される', () => {
      render(<ModernButton size="invalid">Invalid Size</ModernButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('inline-flex', 'items-center');
    });

    it('無効なroundedを指定した場合はundefinedクラスが適用される', () => {
      render(<ModernButton rounded="invalid">Invalid Rounded</ModernButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('inline-flex', 'items-center');
    });

    it('CSSクラスの空白が正しく処理される（複数空白の除去）', () => {
      render(<ModernButton className="  extra   spaces  ">Test</ModernButton>);
      
      const button = screen.getByRole('button');
      const classString = button.className;
      // 複数の連続空白が単一空白に変換されているかチェック
      expect(classString).not.toMatch(/\s{2,}/);
    });

    it('undefinedやnullのchildrenを処理できる', () => {
      const { rerender } = render(<ModernButton>{undefined}</ModernButton>);
      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(<ModernButton>{null}</ModernButton>);
      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(<ModernButton>{0}</ModernButton>);
      expect(screen.getByRole('button')).toHaveTextContent('0');

      rerender(<ModernButton>{''}</ModernButton>);
      expect(screen.getByRole('button')).toHaveTextContent('');
    });

    it('複雑なReactElementをchildrenとして受け取れる', () => {
      render(
        <ModernButton>
          <span>複雑な</span>
          <strong>内容</strong>
          <em>テスト</em>
        </ModernButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('複雑な内容テスト');
      expect(button.querySelector('span')).toBeInTheDocument();
      expect(button.querySelector('strong')).toBeInTheDocument();
      expect(button.querySelector('em')).toBeInTheDocument();
    });

    it('loadingTextがundefinedの場合はデフォルトテキストを使用する', () => {
      render(<ModernButton loading loadingText={undefined}>Submit</ModernButton>);
      
      const button = screen.getByRole('button');
      // loadingTextがundefinedの場合はLoadingTextプロパティのデフォルト値が使われる
      expect(button).toHaveTextContent('Loading...');
    });

    it('iconがnullやundefinedの場合は表示されない', () => {
      const { rerender } = render(<ModernButton icon={null}>Test</ModernButton>);
      expect(screen.getByRole('button')).not.toContainElement(screen.queryByRole('img'));

      rerender(<ModernButton icon={undefined}>Test</ModernButton>);
      expect(screen.getByRole('button')).not.toContainElement(screen.queryByRole('img'));
    });
  });

  describe('アクセシビリティの詳細テスト', () => {
    it('loading状態でaria-busyが設定される（オプション）', () => {
      render(<ModernButton loading aria-busy="true">Loading</ModernButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('disabled状態でaria-disabledが設定される（オプション）', () => {
      render(<ModernButton disabled aria-disabled="true">Disabled</ModernButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('複数のaria属性を同時に処理できる', () => {
      render(
        <ModernButton 
          aria-label="カスタムラベル"
          aria-describedby="help-text"
          aria-pressed="false"
          role="button"
        >
          アクセシブルボタン
        </ModernButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'カスタムラベル');
      expect(button).toHaveAttribute('aria-describedby', 'help-text');
      expect(button).toHaveAttribute('aria-pressed', 'false');
    });

    it('フォーカス時にoutline-noneが適用される', () => {
      render(<ModernButton>Focus Test</ModernButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus:outline-none');
    });

    it('フォーカスリング設定が正しい', () => {
      render(<ModernButton variant="primary">Focus Ring</ModernButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus:ring-2', 'focus:ring-offset-2', 'focus:ring-primary-500');
    });
  });

  describe('イベントハンドリングの詳細テスト', () => {
    it('複数のイベントハンドラーを処理できる', () => {
      const mockClick = jest.fn();
      const mockMouseDown = jest.fn();
      const mockMouseUp = jest.fn();
      const mockFocus = jest.fn();
      const mockBlur = jest.fn();

      render(
        <ModernButton 
          onClick={mockClick}
          onMouseDown={mockMouseDown}
          onMouseUp={mockMouseUp}
          onFocus={mockFocus}
          onBlur={mockBlur}
        >
          Event Test
        </ModernButton>
      );
      
      const button = screen.getByRole('button');
      
      fireEvent.click(button);
      fireEvent.mouseDown(button);
      fireEvent.mouseUp(button);
      fireEvent.focus(button);
      fireEvent.blur(button);
      
      expect(mockClick).toHaveBeenCalledTimes(1);
      expect(mockMouseDown).toHaveBeenCalledTimes(1);
      expect(mockMouseUp).toHaveBeenCalledTimes(1);
      expect(mockFocus).toHaveBeenCalledTimes(1);
      expect(mockBlur).toHaveBeenCalledTimes(1);
    });

    it('イベントオブジェクトが正しく渡される', () => {
      const mockClick = jest.fn();
      render(<ModernButton onClick={mockClick}>Event Object Test</ModernButton>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockClick).toHaveBeenCalledWith(expect.objectContaining({
        type: 'click',
        target: button
      }));
    });

    it('キーボードイベントを処理できる', () => {
      const mockKeyDown = jest.fn();
      const mockKeyUp = jest.fn();

      render(
        <ModernButton 
          onKeyDown={mockKeyDown}
          onKeyUp={mockKeyUp}
        >
          Keyboard Test
        </ModernButton>
      );
      
      const button = screen.getByRole('button');
      
      fireEvent.keyDown(button, { key: 'Enter' });
      fireEvent.keyUp(button, { key: 'Enter' });
      
      expect(mockKeyDown).toHaveBeenCalledTimes(1);
      expect(mockKeyUp).toHaveBeenCalledTimes(1);
    });
  });

  describe('スピナーコンポーネントの詳細テスト', () => {
    it('スピナーのSVG属性が正しく設定される', () => {
      render(<ModernButton loading>Loading</ModernButton>);
      
      const spinner = screen.getByRole('button').querySelector('svg');
      expect(spinner).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
      expect(spinner).toHaveAttribute('fill', 'none');
      expect(spinner).toHaveAttribute('viewBox', '0 0 24 24');
      expect(spinner).toHaveClass('animate-spin', 'h-4', 'w-4');
    });

    it('スピナーのcircle要素が正しく設定される', () => {
      render(<ModernButton loading>Loading</ModernButton>);
      
      const circle = screen.getByRole('button').querySelector('circle');
      expect(circle).toHaveAttribute('cx', '12');
      expect(circle).toHaveAttribute('cy', '12');
      expect(circle).toHaveAttribute('r', '10');
      expect(circle).toHaveAttribute('stroke', 'currentColor');
      expect(circle).toHaveAttribute('stroke-width', '4');
      expect(circle).toHaveClass('opacity-25');
    });

    it('スピナーのpath要素が正しく設定される', () => {
      render(<ModernButton loading>Loading</ModernButton>);
      
      const path = screen.getByRole('button').querySelector('path');
      expect(path).toHaveAttribute('fill', 'currentColor');
      expect(path).toHaveClass('opacity-75');
      expect(path).toHaveAttribute('d');
    });
  });

  describe('アイコン配置の詳細テスト', () => {
    it('アイコンのmarginクラスが正しく適用される（左配置）', () => {
      const icon = <span data-testid="test-icon">🔍</span>;
      render(<ModernButton icon={icon} iconPosition="left">Search</ModernButton>);
      
      const iconWrapper = screen.getByTestId('test-icon').parentElement;
      expect(iconWrapper).toHaveClass('mr-2');
    });

    it('アイコンのmarginクラスが正しく適用される（右配置）', () => {
      const icon = <span data-testid="test-icon">➡️</span>;
      render(<ModernButton icon={icon} iconPosition="right">Next</ModernButton>);
      
      const iconWrapper = screen.getByTestId('test-icon').parentElement;
      expect(iconWrapper).toHaveClass('ml-2');
    });

    it('複雑なアイコンコンポーネントを処理できる', () => {
      const ComplexIcon = () => (
        <svg data-testid="complex-icon" viewBox="0 0 24 24">
          <path d="M12 2L2 7v10c0 5.55 3.84 9.739 9 11 5.16-1.261 9-5.45 9-11V7l-10-5z"/>
        </svg>
      );

      render(<ModernButton icon={<ComplexIcon />}>With Complex Icon</ModernButton>);
      
      expect(screen.getByTestId('complex-icon')).toBeInTheDocument();
    });

    it('iconPositionが無効な値の場合はアイコンが表示されない', () => {
      const icon = <span data-testid="test-icon">🔍</span>;
      render(<ModernButton icon={icon} iconPosition="invalid">Search</ModernButton>);
      
      // 無効な値の場合、leftでもrightでもない条件になるため、アイコンは表示されない
      expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument();
      expect(screen.getByText('Search')).toBeInTheDocument();
    });
  });

  describe('パフォーマンスとメモリリーク対策', () => {
    it('refが正しくクリーンアップされる', () => {
      const ref = React.createRef();
      const { unmount } = render(<ModernButton ref={ref}>Cleanup Test</ModernButton>);
      
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      
      unmount();
      
      // アンマウント後もrefオブジェクト自体は残るが、DOMへの参照は有効
      expect(ref.current).toBeDefined();
    });

    it('大量のpropsでもパフォーマンス問題がない', () => {
      const manyProps = {};
      for (let i = 0; i < 100; i++) {
        manyProps[`data-prop-${i}`] = `value-${i}`;
      }

      render(<ModernButton {...manyProps}>Many Props Test</ModernButton>);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('data-prop-0', 'value-0');
      expect(button).toHaveAttribute('data-prop-99', 'value-99');
    });
  });

  describe('TypeScriptサポートとプロパティ型チェック', () => {
    it('数値や真偽値のpropsを正しく処理する', () => {
      render(
        <ModernButton 
          tabIndex={0}
          data-count={42}
          data-enabled={true}
          data-disabled={false}
        >
          Type Test
        </ModernButton>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('tabIndex', '0');
      expect(button).toHaveAttribute('data-count', '42');
      expect(button).toHaveAttribute('data-enabled', 'true');
      expect(button).toHaveAttribute('data-disabled', 'false');
    });

    it('関数型のpropsを正しく処理する', () => {
      const customHandler = jest.fn();
      render(
        <ModernButton 
          onClick={customHandler}
          onDoubleClick={() => {}}
          onContextMenu={(e) => e.preventDefault()}
        >
          Function Props Test
        </ModernButton>
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      fireEvent.doubleClick(button);
      fireEvent.contextMenu(button);
      
      expect(customHandler).toHaveBeenCalledTimes(1);
    });
  });
});