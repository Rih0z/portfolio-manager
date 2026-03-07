/**
 * 個別通知アイテムコンポーネント
 *
 * 通知リスト内の1行を描画する。通知タイプに応じたアイコン、
 * タイトル・メッセージ・相対時刻表示、既読/未読スタイリング、
 * 既読マークおよび削除操作を提供する。
 *
 * @file src/components/notifications/NotificationItem.tsx
 */
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppNotification } from '../../types/notification.types';
import { cn } from '../../lib/utils';

// ─── Props ────────────────────────────────────────────

interface NotificationItemProps {
  notification: AppNotification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

// ─── Helpers ──────────────────────────────────────────

/**
 * 相対時刻を日本語で返す。
 * 例: "5分前", "2時間前", "昨日", "3日前"
 */
function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'たった今';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'たった今';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;

  const days = Math.floor(hours / 24);
  if (days === 1) return '昨日';
  if (days < 30) return `${days}日前`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}ヶ月前`;

  const years = Math.floor(months / 12);
  return `${years}年前`;
}

// ─── Icons ────────────────────────────────────────────

/** 価格アラートアイコン（チャート） */
const PriceAlertIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={cn('w-5 h-5', className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
    />
  </svg>
);

/** 目標達成アイコン（トロフィー） */
const GoalAchievedIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={cn('w-5 h-5', className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 3h14M9 3v2a4 4 0 004 4h0a4 4 0 004-4V3M7 9a5 5 0 005 5 5 5 0 005-5M12 14v4m-4 3h8m-8 0a1 1 0 01-1-1v-1h10v1a1 1 0 01-1 1"
    />
  </svg>
);

/** リバランスアイコン（矢印） */
const RebalanceIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={cn('w-5 h-5', className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
    />
  </svg>
);

/** 通知タイプに応じたアイコンとカラーを返す */
function getIconForType(type: AppNotification['type']) {
  switch (type) {
    case 'price_alert':
      return {
        Icon: PriceAlertIcon,
        colorClass: 'text-primary-500 bg-primary-100 dark:bg-primary-900/30',
      };
    case 'goal_achieved':
      return {
        Icon: GoalAchievedIcon,
        colorClass: 'text-success-500 bg-success-100 dark:bg-success-900/30',
      };
    case 'rebalance_suggestion':
      return {
        Icon: RebalanceIcon,
        colorClass: 'text-warning-500 bg-warning-100 dark:bg-warning-500/20',
      };
    default:
      return {
        Icon: PriceAlertIcon,
        colorClass: 'text-muted-foreground bg-muted',
      };
  }
}

// ─── Component ────────────────────────────────────────

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkRead,
  onDelete,
}) => {
  const { t } = useTranslation();

  const { Icon, colorClass } = useMemo(
    () => getIconForType(notification.type),
    [notification.type]
  );

  const relativeTime = useMemo(
    () => formatRelativeTime(notification.createdAt),
    [notification.createdAt]
  );

  const handleClick = useCallback(() => {
    if (!notification.read) {
      onMarkRead(notification.notificationId);
    }
  }, [notification.read, notification.notificationId, onMarkRead]);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(notification.notificationId);
    },
    [notification.notificationId, onDelete]
  );

  return (
    <div
      data-testid="notification-item"
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        'flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer',
        'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        'min-h-[44px]',
        notification.read
          ? 'bg-transparent'
          : 'bg-primary-50 dark:bg-primary-900/10'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5',
          colorClass
        )}
      >
        <Icon />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm text-foreground truncate',
            !notification.read && 'font-semibold'
          )}
        >
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">{relativeTime}</p>
      </div>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        className={cn(
          'flex-shrink-0 p-1 rounded-md text-muted-foreground/50',
          'hover:text-foreground hover:bg-muted transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'min-h-[28px] min-w-[28px] flex items-center justify-center'
        )}
        aria-label={t('notifications.delete', '通知を削除')}
        data-testid="notification-delete"
      >
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
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
};

export default NotificationItem;
