/**
 * TanStack Query カスタムフック バレルエクスポート
 *
 * サーバー状態管理をZustandストアから分離し、
 * TanStack Queryのキャッシュ・再取得・楽観的更新を活用する。
 */
export { useExchangeRate, exchangeRateKeys } from './useExchangeRate';
export type { ExchangeRateData } from './useExchangeRate';

export { useStockPrices, stockPriceKeys } from './useStockPrices';
export type { StockPriceData } from './useStockPrices';

export {
  useSubscriptionStatus,
  useCreateCheckout,
  useCreatePortal,
  subscriptionKeys,
} from './useSubscription';

export {
  usePriceHistory,
  usePriceHistories,
  priceHistoryKeys,
} from './usePriceHistory';

export {
  useNotifications,
  useAlertRules,
  useCreateAlertRule,
  useUpdateAlertRule,
  useDeleteAlertRule,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  notificationKeys,
} from './useNotifications';

export {
  useUserShares,
  useCreateShare,
  useDeleteShare,
  userShareKeys,
} from './useUserShares';

export {
  usePeerComparison,
  peerComparisonKeys,
} from './usePeerComparison';

export {
  useReferralCode,
  useReferralStats,
  useApplyReferral,
  referralKeys,
} from './useReferral';

export {
  useServerPortfolio,
  useSavePortfolio,
  serverPortfolioKeys,
} from './useServerPortfolio';
