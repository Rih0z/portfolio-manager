/**
 * 通知ベルアイコンコンポーネント
 *
 * ヘッダーに配置するベルアイコン。未読通知数のバッジ表示、
 * クリックで NotificationDropdown の開閉を行う。
 * 外部クリックでドロップダウンを閉じる。
 *
 * @file src/components/notifications/NotificationBell.tsx
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotificationStore } from '../../stores/notificationStore';
import NotificationDropdown from './NotificationDropdown';

// ─── Component ────────────────────────────────────────

const NotificationBell: React.FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = useNotificationStore((s) => s.unreadCount);

  // ─── Click outside to close ──────────────────────────

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    // Delay attachment to avoid closing on the same click that opened
    const timerId = window.setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      window.clearTimeout(timerId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // ─── Escape key to close ─────────────────────────────

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // ─── Badge text (cap at 99) ──────────────────────────

  const badgeText = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <div ref={containerRef} className="relative" data-testid="notification-bell">
      {/* Bell button */}
      <button
        onClick={toggleDropdown}
        className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring transition-colors relative"
        aria-label={
          unreadCount > 0
            ? t('notifications.bellWithCount', '通知 ({{count}}件未読)', { count: unreadCount })
            : t('notifications.bell', '通知')
        }
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls="notification-dropdown-panel"
      >
        {/* Bell SVG icon */}
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread count badge */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-none text-white bg-danger-500 rounded-full"
            aria-hidden="true"
          >
            {badgeText}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && <NotificationDropdown />}
    </div>
  );
};

export default NotificationBell;
