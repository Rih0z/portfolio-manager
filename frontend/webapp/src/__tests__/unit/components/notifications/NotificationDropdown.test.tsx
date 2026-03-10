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

const mockMarkReadMutate = vi.fn();
const mockMarkAllReadMutate = vi.fn();
const mockDeleteNotificationMutate = vi.fn();

vi.mock('../../../../hooks/queries', () => ({
  useNotifications: vi.fn(() => ({ data: null, isPending: false })),
  useMarkNotificationRead: vi.fn(() => ({ mutate: mockMarkReadMutate, isPending: false })),
  useMarkAllNotificationsRead: vi.fn(() => ({ mutate: mockMarkAllReadMutate, isPending: false })),
  useDeleteNotification: vi.fn(() => ({ mutate: mockDeleteNotificationMutate, isPending: false })),
}));

vi.mock('../../../../stores/authStore', () => ({
  useAuthStore: vi.fn((selector: (state: any) => any) =>
    selector({ isAuthenticated: true })
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
import { useNotifications } from '../../../../hooks/queries';

const setupMocks = (notifications: any[] = [], loading = false) => {
  vi.mocked(useNotifications).mockReturnValue({
    data: { notifications, lastKey: null },
    isPending: loading,
  } as any);
};

describe('NotificationDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks([]);
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
    setupMocks([
      {
        notificationId: 'n1',
        title: 'テスト通知',
        message: 'テストメッセージ',
        type: 'price_alert',
        read: false,
        createdAt: new Date().toISOString(),
      },
    ]);

    render(<NotificationDropdown />);
    expect(screen.getByText('テスト通知')).toBeInTheDocument();
  });

  it('should show mark-all-read button when unread > 0', () => {
    setupMocks([
      {
        notificationId: 'n1',
        title: 'Test',
        message: 'msg',
        type: 'price_alert',
        read: false,
        createdAt: new Date().toISOString(),
      },
    ]);

    render(<NotificationDropdown />);
    expect(screen.getByTestId('mark-all-read')).toBeInTheDocument();
  });

  it('should render settings link', () => {
    render(<NotificationDropdown />);
    expect(screen.getByTestId('notification-settings-link')).toBeInTheDocument();
  });
});
