/**
 * NotificationBell unit tests
 *
 * ベルアイコン、未読バッジ表示、ドロップダウン開閉を検証する。
 * @file src/__tests__/unit/components/notifications/NotificationBell.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

// --- Mock dependencies BEFORE imports ---
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ja' },
  }),
}));

// Mutable state object for the store mock
const mockStoreState: Record<string, any> = {
  unreadCount: 0,
  notifications: [],
  loading: false,
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  removeNotification: vi.fn(),
};

vi.mock('../../../../stores/notificationStore', () => ({
  useNotificationStore: vi.fn((selector: (state: any) => any) => selector(mockStoreState)),
}));

// Mock NotificationDropdown as a simple div to isolate tests
vi.mock('../../../../components/notifications/NotificationDropdown', () => ({
  default: () => <div data-testid="notification-dropdown">Dropdown Content</div>,
}));

// Mock react-router-dom (used by NotificationDropdown)
vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

import NotificationBell from '../../../../components/notifications/NotificationBell';

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState.unreadCount = 0;
    mockStoreState.notifications = [];
    mockStoreState.loading = false;
  });

  // =========================================================================
  // Rendering
  // =========================================================================
  describe('rendering', () => {
    it('should render bell icon', () => {
      render(<NotificationBell />);
      expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
    });

    it('should render bell button with correct aria-label', () => {
      render(<NotificationBell />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      // When unreadCount is 0, uses notifications.bell key
      expect(button).toHaveAttribute('aria-label', 'notifications.bell');
    });

    it('should render SVG bell icon inside button', () => {
      render(<NotificationBell />);
      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Unread badge
  // =========================================================================
  describe('unread badge', () => {
    it('should show unread count badge when unreadCount > 0', () => {
      mockStoreState.unreadCount = 3;
      render(<NotificationBell />);

      const badge = screen.getByText('3');
      expect(badge).toBeInTheDocument();
    });

    it('should hide badge when unreadCount is 0', () => {
      mockStoreState.unreadCount = 0;
      render(<NotificationBell />);

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('should cap badge at 99+', () => {
      mockStoreState.unreadCount = 150;
      render(<NotificationBell />);

      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('should show exact count for 99', () => {
      mockStoreState.unreadCount = 99;
      render(<NotificationBell />);

      expect(screen.getByText('99')).toBeInTheDocument();
    });

    it('should use aria-label with count when unread > 0', () => {
      mockStoreState.unreadCount = 5;
      render(<NotificationBell />);

      const button = screen.getByRole('button');
      // t('notifications.bellWithCount', ...) returns the key
      expect(button).toHaveAttribute('aria-label', 'notifications.bellWithCount');
    });
  });

  // =========================================================================
  // Dropdown toggle
  // =========================================================================
  describe('dropdown toggle', () => {
    it('should open dropdown on click', () => {
      render(<NotificationBell />);

      expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
    });

    it('should close dropdown on second click', () => {
      render(<NotificationBell />);

      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();

      fireEvent.click(button);
      expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
    });

    it('should set aria-expanded correctly', () => {
      render(<NotificationBell />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have aria-haspopup attribute', () => {
      render(<NotificationBell />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-haspopup', 'true');
    });
  });

  // =========================================================================
  // Close on Escape
  // =========================================================================
  describe('close on Escape key', () => {
    it('should close dropdown when Escape is pressed', () => {
      render(<NotificationBell />);

      // Open dropdown
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();

      // Press Escape
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });

      expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
    });
  });
});
