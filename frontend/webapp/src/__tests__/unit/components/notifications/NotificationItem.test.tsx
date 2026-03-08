/**
 * NotificationItem smoke render tests
 *
 * 個別通知アイテムの基本レンダリングを検証する。
 * @file src/__tests__/unit/components/notifications/NotificationItem.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// --- Mock dependencies ---
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'ja' },
  }),
}));

vi.mock('../../../../lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

import NotificationItem from '../../../../components/notifications/NotificationItem';

const createNotification = (overrides: Record<string, any> = {}) => ({
  notificationId: 'notif-1',
  title: 'AAPL 価格アラート',
  message: '目標価格 $200 に到達しました',
  type: 'price_alert' as const,
  read: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('NotificationItem', () => {
  const defaultProps = {
    notification: createNotification(),
    onMarkRead: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render notification title and message', () => {
    render(<NotificationItem {...defaultProps} />);
    expect(screen.getByText('AAPL 価格アラート')).toBeInTheDocument();
    expect(
      screen.getByText('目標価格 $200 に到達しました')
    ).toBeInTheDocument();
  });

  it('should render delete button', () => {
    render(<NotificationItem {...defaultProps} />);
    expect(screen.getByTestId('notification-delete')).toBeInTheDocument();
  });

  it('should call onMarkRead when clicked for unread notification', () => {
    render(<NotificationItem {...defaultProps} />);
    fireEvent.click(screen.getByTestId('notification-item'));
    expect(defaultProps.onMarkRead).toHaveBeenCalledWith('notif-1');
  });

  it('should not call onMarkRead when clicked for read notification', () => {
    const props = {
      ...defaultProps,
      notification: createNotification({ read: true }),
    };
    render(<NotificationItem {...props} />);
    fireEvent.click(screen.getByTestId('notification-item'));
    expect(defaultProps.onMarkRead).not.toHaveBeenCalled();
  });

  it('should call onDelete when delete button is clicked', () => {
    render(<NotificationItem {...defaultProps} />);
    fireEvent.click(screen.getByTestId('notification-delete'));
    expect(defaultProps.onDelete).toHaveBeenCalledWith('notif-1');
  });
});
