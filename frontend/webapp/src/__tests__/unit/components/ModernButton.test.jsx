import { vi } from "vitest";
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ModernButton from '../../../components/common/ModernButton';

describe.skip('ModernButton', () => {
  it('renders button with text', () => {
    render(<ModernButton>Click me</ModernButton>);
    
    expect(screen.getByText('Click me')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<ModernButton onClick={handleClick}>Click me</ModernButton>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders different variants', () => {
    const { rerender } = render(<ModernButton variant="primary">Primary</ModernButton>);
    let button = screen.getByRole('button');
    expect(button).toHaveClass('from-primary-500');

    rerender(<ModernButton variant="secondary">Secondary</ModernButton>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('bg-white');

    rerender(<ModernButton variant="danger">Danger</ModernButton>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('from-danger-500');
  });

  it('renders different sizes', () => {
    const { rerender } = render(<ModernButton size="sm">Small</ModernButton>);
    let button = screen.getByRole('button');
    expect(button).toHaveClass('px-4', 'py-2', 'text-sm');

    rerender(<ModernButton size="md">Medium</ModernButton>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('px-6', 'py-3', 'text-base');

    rerender(<ModernButton size="lg">Large</ModernButton>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('px-8', 'py-4', 'text-lg');
  });

  it('renders disabled state', () => {
    const handleClick = vi.fn();
    render(<ModernButton disabled onClick={handleClick}>Disabled</ModernButton>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders loading state', () => {
    render(<ModernButton loading>Loading</ModernButton>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    
    // ローディングインジケーターがあることを確認
    const loadingElement = document.querySelector('.loading, .spinner, [data-loading]');
    expect(loadingElement).toBeInTheDocument();
  });

  it('renders with icon', () => {
    render(<ModernButton icon="🚀">With Icon</ModernButton>);
    
    expect(screen.getByText('🚀')).toBeInTheDocument();
    expect(screen.getByText('With Icon')).toBeInTheDocument();
  });

  it('renders as full width', () => {
    render(<ModernButton fullWidth>Full Width</ModernButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass(/w-full|full-width/);
  });

  it('handles keyboard navigation', () => {
    const handleClick = vi.fn();
    render(<ModernButton onClick={handleClick}>Button</ModernButton>);
    
    const button = screen.getByRole('button');
    
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);
    
    fireEvent.keyDown(button, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('renders with custom className', () => {
    render(<ModernButton className="custom-class">Custom</ModernButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef();
    render(<ModernButton ref={ref}>Ref Button</ModernButton>);
    
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('renders as different element types', () => {
    render(<ModernButton as="a" href="#test">Link Button</ModernButton>);
    
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '#test');
  });

  it('has proper accessibility attributes', () => {
    render(<ModernButton aria-label="Accessible button">Button</ModernButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Accessible button');
  });

  it('renders with proper focus styles', () => {
    render(<ModernButton>Focus Button</ModernButton>);
    
    const button = screen.getByRole('button');
    fireEvent.focus(button);
    
    // フォーカススタイルが適用されることを確認
    expect(button).toHaveClass(/focus|ring/);
  });

  it('handles hover states', () => {
    render(<ModernButton>Hover Button</ModernButton>);
    
    const button = screen.getByRole('button');
    fireEvent.mouseEnter(button);
    
    // ホバースタイルが適用されることを確認
    expect(button).toHaveClass(/hover/);
  });

  it('renders loading text when loading', () => {
    render(<ModernButton loading loadingText="Loading...">Submit</ModernButton>);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Submit')).not.toBeInTheDocument();
  });

  it('handles form submission', () => {
    const handleSubmit = vi.fn(e => e.preventDefault());
    
    render(
      <form onSubmit={handleSubmit}>
        <ModernButton type="submit">Submit</ModernButton>
      </form>
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('renders with proper button styling', () => {
    render(<ModernButton>Styled Button</ModernButton>);
    
    const button = screen.getByRole('button');
    
    // モダンなボタンスタイルが適用されていることを確認
    const hasModernStyles = button.className.includes('rounded') || 
                           button.className.includes('shadow') ||
                           button.className.includes('transition');
    expect(hasModernStyles).toBe(true);
  });

  it('handles edge cases gracefully', () => {
    // 空の子要素
    render(<ModernButton></ModernButton>);
    expect(screen.getByRole('button')).toBeInTheDocument();

    // null/undefined props
    render(<ModernButton variant={null} size={undefined}>Edge Case</ModernButton>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});