/**
 * NotificationDropdown smoke render tests
 *
 * 通知ドロップダウンの基本レンダリングを検証する。
 * @file src/__tests__/unit/components/notifications/NotificationDropdown.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// --- Mock dependencies ---
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'ja' },
  }),
}));

const mockNotificationState: Record<string, any> = {
  notifications: [],
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  removeNotification: vi.fn(),
  loading: false,
  unreadCount: 0,
};

vi.mock('../../../../stores/notificationStore', () => ({
  useNotificationStore: vi.fn((selector: (state: any) => any) =>
    selector(mockNotificationState)
  ),
}));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: any) => (
    <a href={to} {...props}>{children}</a>
  ),
}));

vi.mock('../../../../components/notifications/NotificationItem', () => ({
  default: ({ notification }: any) => (
    <div data-testid="notification-item">{notification.title}</div>
  ),
}));

import NotificationDropdown from '../../../../components/notifications/NotificationDropdown';

describe('NotificationDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotificationState.notifications = [];
    mockNotificationState.loading = false;
    mockNotificationState.unreadCount = 0;
  });

  it('should render the dropdown panel', () => {
    render(<NotificationDropdown />);
    expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
  });

  it('should display title', () => {
    render(<NotificationDropdown />);
    expect(screen.getByText('通知')).toBeInTheDocument();
  });

  it('should display empty state when no notifications', () => {
    render(<NotificationDropdown />);
    expect(screen.getByText('通知はありません')).toBeInTheDocument();
  });

  it('should display notification items when present', () => {
    mockNotificationState.notifications = [
      {
        notificationId: 'n1',
        title: 'テスト通知',
        message: 'テストメッセージ',
        type: 'price_alert',
        read: false,
        createdAt: new Date().toISOString(),
      },
    ];

    render(<NotificationDropdown />);
    expect(screen.getByText('テスト通知')).toBeInTheDocument();
  });

  it('should show mark-all-read button when unread > 0', () => {
    mockNotificationState.unreadCount = 3;
    mockNotificationState.notifications = [
      {
        notificationId: 'n1',
        title: 'Test',
        message: 'msg',
        type: 'price_alert',
        read: false,
        createdAt: new Date().toISOString(),
      },
    ];

    render(<NotificationDropdown />);
    expect(screen.getByTestId('mark-all-read')).toBeInTheDocument();
  });

  it('should render settings link', () => {
    render(<NotificationDropdown />);
    expect(screen.getByTestId('notification-settings-link')).toBeInTheDocument();
  });
});
