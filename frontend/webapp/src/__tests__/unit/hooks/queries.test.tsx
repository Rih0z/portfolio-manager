/**
 * TanStack Query カスタムフック テスト
 *
 * useExchangeRate / useStockPrices / useSubscription / usePriceHistory / useNotifications
 * の各フックに対して success / error / edge-case を検証する。
 */
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Service mocks ──────────────────────────────────
vi.mock('../../../services/marketDataService', () => ({
  fetchExchangeRate: vi.fn(),
  fetchMultipleStocks: vi.fn(),
}));

vi.mock('../../../services/subscriptionService', () => ({
  getSubscriptionStatus: vi.fn(),
  createCheckoutSession: vi.fn(),
  createPortalSession: vi.fn(),
}));

vi.mock('../../../services/priceHistoryService', () => ({
  fetchPriceHistory: vi.fn(),
}));

vi.mock('../../../services/notificationService', () => ({
  fetchNotifications: vi.fn(),
  fetchAlertRules: vi.fn(),
  createAlertRule: vi.fn(),
  updateAlertRule: vi.fn(),
  deleteAlertRule: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  deleteNotification: vi.fn(),
}));

// ── Import hooks ───────────────────────────────────
import {
  useExchangeRate,
  exchangeRateKeys,
} from '../../../hooks/queries/useExchangeRate';
import {
  useStockPrices,
  stockPriceKeys,
} from '../../../hooks/queries/useStockPrices';
import {
  useSubscriptionStatus,
  useCreateCheckout,
  useCreatePortal,
  subscriptionKeys,
} from '../../../hooks/queries/useSubscription';
import {
  usePriceHistory,
  usePriceHistories,
  priceHistoryKeys,
} from '../../../hooks/queries/usePriceHistory';
import {
  useNotifications,
  useAlertRules,
  useCreateAlertRule,
  useUpdateAlertRule,
  useDeleteAlertRule,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  notificationKeys,
} from '../../../hooks/queries/useNotifications';

// ── Import mocked service functions ────────────────
import { fetchExchangeRate, fetchMultipleStocks } from '../../../services/marketDataService';
import {
  getSubscriptionStatus,
  createCheckoutSession,
  createPortalSession,
} from '../../../services/subscriptionService';
import { fetchPriceHistory } from '../../../services/priceHistoryService';
import {
  fetchNotifications,
  fetchAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../../../services/notificationService';

// ── Helpers ────────────────────────────────────────

/**
 * 各テストごとに独立した QueryClient + Provider を生成する。
 * retry: false で即座にエラーを反映させる。
 */
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // retryDelay を 0 にすることで、フック側の retry 設定が残っても即座にリトライ完了する
        retryDelay: 0,
      },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { Wrapper, queryClient };
};

// ── Reset mocks ────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
});

// ================================================================
// 1. useExchangeRate
// ================================================================
describe('useExchangeRate', () => {
  const mockRate = {
    rate: 150.25,
    source: 'api',
    lastUpdated: '2026-03-08T00:00:00Z',
    isDefault: false,
    isStale: false,
  };

  it('should fetch exchange rate successfully', async () => {
    vi.mocked(fetchExchangeRate).mockResolvedValue({
      success: true,
      ...mockRate,
    } as any);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useExchangeRate('USD', 'JPY'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockRate);
    expect(fetchExchangeRate).toHaveBeenCalledWith('USD', 'JPY');
  });

  it('should handle fetch error', async () => {
    vi.mocked(fetchExchangeRate).mockRejectedValue(new Error('Network error'));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useExchangeRate('USD', 'JPY'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
  });

  it('should use default currencies (USD/JPY)', async () => {
    vi.mocked(fetchExchangeRate).mockResolvedValue({
      success: true,
      ...mockRate,
    } as any);

    const { Wrapper } = createWrapper();
    renderHook(() => useExchangeRate(), { wrapper: Wrapper });

    await waitFor(() =>
      expect(fetchExchangeRate).toHaveBeenCalledWith('USD', 'JPY')
    );
  });

  it('should be disabled when enabled=false', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useExchangeRate('USD', 'JPY', { enabled: false }),
      { wrapper: Wrapper }
    );

    // query should never fire
    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchExchangeRate).not.toHaveBeenCalled();
  });
});

// ================================================================
// 1b. exchangeRateKeys
// ================================================================
describe('exchangeRateKeys', () => {
  it('should generate correct key for all', () => {
    expect(exchangeRateKeys.all).toEqual(['exchangeRate']);
  });

  it('should generate correct key for pair', () => {
    expect(exchangeRateKeys.pair('USD', 'JPY')).toEqual([
      'exchangeRate',
      'USD',
      'JPY',
    ]);
    expect(exchangeRateKeys.pair('EUR', 'GBP')).toEqual([
      'exchangeRate',
      'EUR',
      'GBP',
    ]);
  });
});

// ================================================================
// 2. useStockPrices
// ================================================================
describe('useStockPrices', () => {
  const mockStockData = {
    AAPL: {
      price: 178.5,
      source: 'yahoo',
      lastUpdated: '2026-03-08T00:00:00Z',
      fundType: 'stock',
    },
    GOOGL: {
      price: 140.2,
      source: 'yahoo',
      lastUpdated: '2026-03-08T00:00:00Z',
      fundType: 'stock',
    },
  };

  it('should fetch stock prices successfully', async () => {
    vi.mocked(fetchMultipleStocks).mockResolvedValue({
      success: true,
      data: mockStockData,
      errors: [],
      sources: {},
    } as any);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useStockPrices(['AAPL', 'GOOGL']),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockStockData);
    expect(fetchMultipleStocks).toHaveBeenCalledWith(['AAPL', 'GOOGL']);
  });

  it('should handle fetch error', async () => {
    vi.mocked(fetchMultipleStocks).mockRejectedValue(
      new Error('API unavailable')
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useStockPrices(['AAPL']), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('API unavailable');
  });

  it('should be disabled for empty tickers array', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useStockPrices([]), {
      wrapper: Wrapper,
    });

    // enabled evaluates to false for empty array
    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchMultipleStocks).not.toHaveBeenCalled();
  });

  it('should handle null data gracefully', async () => {
    vi.mocked(fetchMultipleStocks).mockResolvedValue({
      success: true,
      data: null,
      errors: [],
      sources: {},
    } as any);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useStockPrices(['XYZ']), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({});
  });
});

// ================================================================
// 2b. stockPriceKeys
// ================================================================
describe('stockPriceKeys', () => {
  it('should generate correct key for all', () => {
    expect(stockPriceKeys.all).toEqual(['stockPrices']);
  });

  it('should sort tickers in the batch key', () => {
    expect(stockPriceKeys.batch(['GOOGL', 'AAPL', 'MSFT'])).toEqual([
      'stockPrices',
      'AAPL',
      'GOOGL',
      'MSFT',
    ]);
  });

  it('should produce the same key regardless of input order', () => {
    const keyA = stockPriceKeys.batch(['AAPL', 'GOOGL']);
    const keyB = stockPriceKeys.batch(['GOOGL', 'AAPL']);
    expect(keyA).toEqual(keyB);
  });
});

// ================================================================
// 3. useSubscriptionStatus / useCreateCheckout / useCreatePortal
// ================================================================
describe('useSubscriptionStatus', () => {
  const mockStatus = {
    planType: 'standard' as const,
    limits: { maxHoldings: 50 },
    subscription: {
      id: 'sub_123',
      status: 'active',
      createdAt: '2026-01-01T00:00:00Z',
      lastPaymentAt: '2026-03-01T00:00:00Z',
    },
    hasStripeCustomer: true,
  };

  it('should fetch subscription status successfully', async () => {
    vi.mocked(getSubscriptionStatus).mockResolvedValue(mockStatus);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSubscriptionStatus(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockStatus);
  });

  it('should handle fetch error', async () => {
    vi.mocked(getSubscriptionStatus).mockRejectedValue(
      new Error('Unauthorized')
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSubscriptionStatus(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Unauthorized');
  });

  it('should be disabled when enabled=false', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useSubscriptionStatus({ enabled: false }),
      { wrapper: Wrapper }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(getSubscriptionStatus).not.toHaveBeenCalled();
  });
});

describe('useCreateCheckout', () => {
  it('should create checkout and invalidate subscription queries', async () => {
    const mockCheckout = {
      checkoutUrl: 'https://checkout.stripe.com/session_abc',
      sessionId: 'cs_abc',
    };
    vi.mocked(createCheckoutSession).mockResolvedValue(mockCheckout);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateCheckout(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate('monthly');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockCheckout);
    expect(createCheckoutSession).toHaveBeenCalledWith('monthly');
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: subscriptionKeys.all,
    });
  });

  it('should handle checkout creation error', async () => {
    vi.mocked(createCheckoutSession).mockRejectedValue(
      new Error('Payment failed')
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateCheckout(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate('annual');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Payment failed');
  });
});

describe('useCreatePortal', () => {
  it('should create portal session successfully', async () => {
    const mockPortal = { portalUrl: 'https://billing.stripe.com/session_xyz' };
    vi.mocked(createPortalSession).mockResolvedValue(mockPortal);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreatePortal(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPortal);
  });

  it('should handle portal creation error', async () => {
    vi.mocked(createPortalSession).mockRejectedValue(
      new Error('Not a customer')
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreatePortal(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Not a customer');
  });
});

// ================================================================
// 3b. subscriptionKeys
// ================================================================
describe('subscriptionKeys', () => {
  it('should generate correct keys', () => {
    expect(subscriptionKeys.all).toEqual(['subscription']);
    expect(subscriptionKeys.status()).toEqual(['subscription', 'status']);
  });
});

// ================================================================
// 4. usePriceHistory / usePriceHistories
// ================================================================
describe('usePriceHistory', () => {
  const mockHistory = {
    ticker: 'AAPL',
    currency: 'USD',
    period: '1m',
    prices: [
      { date: '2026-02-08', close: 170.0, source: 'yahoo' },
      { date: '2026-03-08', close: 178.5, source: 'yahoo' },
    ],
    change: {
      dayOverDay: { amount: 1.2, percent: 0.68 },
      yearToDate: { amount: 15.0, percent: 9.2 },
    },
  };

  it('should fetch price history successfully', async () => {
    vi.mocked(fetchPriceHistory).mockResolvedValue(mockHistory);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePriceHistory('AAPL', '1m'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockHistory);
    expect(fetchPriceHistory).toHaveBeenCalledWith('AAPL', '1m');
  });

  it('should handle fetch error', async () => {
    vi.mocked(fetchPriceHistory).mockRejectedValue(new Error('Ticker not found'));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePriceHistory('INVALID', '1m'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Ticker not found');
  });

  it('should be disabled when ticker is empty string', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePriceHistory(''), {
      wrapper: Wrapper,
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchPriceHistory).not.toHaveBeenCalled();
  });

  it('should default period to 1m', async () => {
    vi.mocked(fetchPriceHistory).mockResolvedValue(mockHistory);

    const { Wrapper } = createWrapper();
    renderHook(() => usePriceHistory('AAPL'), { wrapper: Wrapper });

    await waitFor(() =>
      expect(fetchPriceHistory).toHaveBeenCalledWith('AAPL', '1m')
    );
  });
});

describe('usePriceHistories', () => {
  it('should fetch multiple price histories in parallel', async () => {
    const mockAAPL = {
      ticker: 'AAPL',
      currency: 'USD',
      period: '3m',
      prices: [{ date: '2026-03-08', close: 178.5, source: 'yahoo' }],
      change: { dayOverDay: null as { amount: number; percent: number } | null, yearToDate: null as { amount: number; percent: number } | null },
    };
    const mockGOOGL = {
      ticker: 'GOOGL',
      currency: 'USD',
      period: '3m',
      prices: [{ date: '2026-03-08', close: 140.2, source: 'yahoo' }],
      change: { dayOverDay: null as { amount: number; percent: number } | null, yearToDate: null as { amount: number; percent: number } | null },
    };

    vi.mocked(fetchPriceHistory).mockImplementation(async (ticker: string) => {
      if (ticker === 'AAPL') return mockAAPL;
      if (ticker === 'GOOGL') return mockGOOGL;
      return null;
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePriceHistories(['AAPL', 'GOOGL'], '3m'),
      { wrapper: Wrapper }
    );

    await waitFor(() => {
      expect(result.current).toHaveLength(2);
      expect(result.current[0].isSuccess).toBe(true);
      expect(result.current[1].isSuccess).toBe(true);
    });

    expect(result.current[0].data).toEqual(mockAAPL);
    expect(result.current[1].data).toEqual(mockGOOGL);
  });

  it('should be disabled when enabled=false', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePriceHistories(['AAPL'], '1m', { enabled: false }),
      { wrapper: Wrapper }
    );

    expect(result.current[0].fetchStatus).toBe('idle');
    expect(fetchPriceHistory).not.toHaveBeenCalled();
  });
});

// ================================================================
// 4b. priceHistoryKeys
// ================================================================
describe('priceHistoryKeys', () => {
  it('should generate correct keys', () => {
    expect(priceHistoryKeys.all).toEqual(['priceHistory']);
    expect(priceHistoryKeys.ticker('AAPL', '1m')).toEqual([
      'priceHistory',
      'AAPL',
      '1m',
    ]);
    expect(priceHistoryKeys.ticker('7203.T', 'ytd')).toEqual([
      'priceHistory',
      '7203.T',
      'ytd',
    ]);
  });
});

// ================================================================
// 5. useNotifications / useAlertRules / mutations
// ================================================================
describe('useNotifications', () => {
  const mockNotifications = {
    notifications: [
      {
        notificationId: 'n1',
        userId: 'u1',
        type: 'price_alert' as const,
        title: 'Price alert',
        message: 'AAPL exceeded target',
        read: false,
        metadata: {},
        createdAt: '2026-03-08T00:00:00Z',
      },
    ],
    lastKey: null as string | null,
  };

  it('should fetch notifications successfully', async () => {
    vi.mocked(fetchNotifications).mockResolvedValue(mockNotifications);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNotifications(20), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockNotifications);
    expect(fetchNotifications).toHaveBeenCalledWith(20);
  });

  it('should handle fetch error', async () => {
    vi.mocked(fetchNotifications).mockRejectedValue(
      new Error('Server error')
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNotifications(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Server error');
  });

  it('should use default limit of 20', async () => {
    vi.mocked(fetchNotifications).mockResolvedValue(mockNotifications);

    const { Wrapper } = createWrapper();
    renderHook(() => useNotifications(), { wrapper: Wrapper });

    await waitFor(() =>
      expect(fetchNotifications).toHaveBeenCalledWith(20)
    );
  });
});

describe('useAlertRules', () => {
  const mockRules = [
    {
      ruleId: 'r1',
      userId: 'u1',
      type: 'price_above' as const,
      ticker: 'AAPL',
      targetValue: 200,
      enabled: true,
      lastTriggered: null as string | null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  it('should fetch alert rules successfully', async () => {
    vi.mocked(fetchAlertRules).mockResolvedValue(mockRules);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAlertRules(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockRules);
  });

  it('should handle fetch error', async () => {
    vi.mocked(fetchAlertRules).mockRejectedValue(
      new Error('Forbidden')
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAlertRules(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Forbidden');
  });

  it('should be disabled when enabled=false', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useAlertRules({ enabled: false }),
      { wrapper: Wrapper }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchAlertRules).not.toHaveBeenCalled();
  });
});

describe('useCreateAlertRule', () => {
  it('should create a rule and invalidate alert rules cache', async () => {
    const newRule = {
      ruleId: 'r2',
      userId: 'u1',
      type: 'price_below' as const,
      ticker: 'GOOGL',
      targetValue: 130,
      enabled: true,
      lastTriggered: null as string | null,
      createdAt: '2026-03-08T00:00:00Z',
      updatedAt: '2026-03-08T00:00:00Z',
    };
    vi.mocked(createAlertRule).mockResolvedValue(newRule);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateAlertRule(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate({
        type: 'price_below',
        ticker: 'GOOGL',
        targetValue: 130,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(newRule);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: notificationKeys.alertRules(),
    });
  });
});

describe('useUpdateAlertRule', () => {
  it('should update a rule and invalidate alert rules cache', async () => {
    const updatedRule = {
      ruleId: 'r1',
      userId: 'u1',
      type: 'price_above' as const,
      ticker: 'AAPL',
      targetValue: 250,
      enabled: true,
      lastTriggered: null as string | null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-03-08T00:00:00Z',
    };
    vi.mocked(updateAlertRule).mockResolvedValue(updatedRule);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateAlertRule(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate({
        ruleId: 'r1',
        updates: { targetValue: 250 },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateAlertRule).toHaveBeenCalledWith('r1', { targetValue: 250 });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: notificationKeys.alertRules(),
    });
  });
});

describe('useDeleteAlertRule', () => {
  it('should delete a rule and invalidate alert rules cache', async () => {
    vi.mocked(deleteAlertRule).mockResolvedValue(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteAlertRule(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate('r1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(deleteAlertRule).toHaveBeenCalledWith('r1');
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: notificationKeys.alertRules(),
    });
  });
});

describe('useMarkNotificationRead', () => {
  it('should mark notification read and invalidate notifications cache', async () => {
    vi.mocked(markNotificationRead).mockResolvedValue(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate('n1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(markNotificationRead).toHaveBeenCalledWith('n1');
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: notificationKeys.all,
    });
  });
});

describe('useMarkAllNotificationsRead', () => {
  it('should mark all read and invalidate notifications cache', async () => {
    vi.mocked(markAllNotificationsRead).mockResolvedValue(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useMarkAllNotificationsRead(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(markAllNotificationsRead).toHaveBeenCalled();
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: notificationKeys.all,
    });
  });
});

describe('useDeleteNotification', () => {
  it('should delete notification and invalidate notifications cache', async () => {
    vi.mocked(deleteNotification).mockResolvedValue(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteNotification(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate('n1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(deleteNotification).toHaveBeenCalledWith('n1');
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: notificationKeys.all,
    });
  });

  it('should handle deletion error', async () => {
    vi.mocked(deleteNotification).mockRejectedValue(
      new Error('Not found')
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteNotification(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate('nonexistent');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Not found');
  });
});

// ================================================================
// 5b. notificationKeys
// ================================================================
describe('notificationKeys', () => {
  it('should generate correct keys', () => {
    expect(notificationKeys.all).toEqual(['notifications']);
    expect(notificationKeys.list(10)).toEqual(['notifications', 'list', 10]);
    expect(notificationKeys.list()).toEqual(['notifications', 'list', undefined]);
    expect(notificationKeys.alertRules()).toEqual([
      'notifications',
      'alertRules',
    ]);
  });
});
