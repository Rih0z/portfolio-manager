import { vi } from "vitest";
/**
 * ModernButton.jsx のユニットテスト
 * React forwardRefコンポーネントのテスト
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
    expect(button).toHaveClass('bg-primary-500');
  });

  it('secondary variantのスタイルを適用する', () => {
    render(<ModernButton variant="secondary">Secondary</ModernButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-card', 'border', 'border-border');
  });

  it('success variantのスタイルを適用する', () => {
    render(<ModernButton variant="success">Success</ModernButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-success-500');
  });

  it('danger variantのスタイルを適用する', () => {
    render(<ModernButton variant="danger">Danger</ModernButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-danger-500');
  });

  it('ghost variantのスタイルを適用する', () => {
    render(<ModernButton variant="ghost">Ghost</ModernButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('text-foreground', 'hover:bg-accent');
  });

  it('outline variantのスタイルを適用する', () => {
    render(<ModernButton variant="outline">Outline</ModernButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('border-2', 'border-primary-500', 'text-primary-500');
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
    const mockClick = vi.fn();
    render(<ModernButton onClick={mockClick}>Click me</ModernButton>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockClick).toHaveBeenCalledTimes(1);
  });

  it('disabled状態ではクリックイベントが発火しない', () => {
    const mockClick = vi.fn();
    render(<ModernButton onClick={mockClick} disabled>Disabled</ModernButton>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockClick).not.toHaveBeenCalled();
  });

  it('loading状態ではクリックイベントが発火しない', () => {
    const mockClick = vi.fn();
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
    expect(button).toHaveClass('bg-primary-500'); // primary variant
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
    expect(button).toHaveClass('bg-success-500');
    expect(button).toHaveClass('px-8', 'py-4', 'text-lg');
    expect(button).toHaveClass('rounded-md');
    expect(button).toHaveClass('w-full');
    expect(button).toHaveClass('custom-class');
  });

  it('displayNameが正しく設定される', () => {
    expect(ModernButton.displayName).toBe('ModernButton');
  });
});