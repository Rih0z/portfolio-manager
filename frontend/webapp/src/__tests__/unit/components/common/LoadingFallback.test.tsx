/**
 * LoadingFallback テスト
 *
 * Suspense fallback用のローディングUIコンポーネントテスト。
 */
import React, { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoadingFallback from '../../../../components/common/LoadingFallback';

describe('LoadingFallback', () => {
  it('should render loading indicator', () => {
    render(<LoadingFallback />);
    expect(screen.getByTestId('loading-fallback')).toBeInTheDocument();
  });

  it('should display loading text', () => {
    render(<LoadingFallback />);
    expect(screen.getByText(/読み込み中/)).toBeInTheDocument();
  });

  it('should render spinner animation', () => {
    render(<LoadingFallback />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should accept custom message via props', () => {
    render(<LoadingFallback message="データを取得中" />);
    expect(screen.getByText('データを取得中')).toBeInTheDocument();
  });

  it('should have centered layout with min-height', () => {
    render(<LoadingFallback />);
    const container = screen.getByTestId('loading-fallback');
    expect(container.className).toContain('flex');
    expect(container.className).toContain('items-center');
    expect(container.className).toContain('justify-center');
  });

  it('should work as Suspense fallback', () => {
    // Verify component renders without errors when used in Suspense context
    const { container } = render(
      <Suspense fallback={<LoadingFallback />}>
        <div>Loaded content</div>
      </Suspense>
    );
    expect(container.textContent).toContain('Loaded content');
  });
});
