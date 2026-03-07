/**
 * OfflineIndicator テスト
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import OfflineIndicator from '../../../../components/pwa/OfflineIndicator';

// i18n モック
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'pwa.offline': 'オフラインモード — 一部機能が制限されます',
      };
      return translations[key] || key;
    },
  }),
}));

describe('OfflineIndicator', () => {
  const originalOnLine = navigator.onLine;

  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: originalOnLine,
    });
  });

  it('should not render when online', () => {
    const { container } = render(<OfflineIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('should render when offline', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
    render(<OfflineIndicator />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('オフラインモード — 一部機能が制限されます')).toBeInTheDocument();
  });

  it('should have aria-live="polite" for accessibility', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
    render(<OfflineIndicator />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('should show when going offline and hide when back online', () => {
    const { container } = render(<OfflineIndicator />);
    expect(container.firstChild).toBeNull();

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
});
