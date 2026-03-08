/**
 * サブスクリプションストアの単体テスト
 *
 * @file src/__tests__/unit/stores/subscriptionStore.test.ts
 */

import { useSubscriptionStore } from '@/stores/subscriptionStore';
import * as subscriptionService from '@/services/subscriptionService';

vi.mock('@/services/subscriptionService');
vi.mock('@/utils/analytics', () => ({ trackEvent: vi.fn(), AnalyticsEvents: {} }));

const mockGetStatus = vi.mocked(subscriptionService.getSubscriptionStatus);
const mockCreateCheckout = vi.mocked(subscriptionService.createCheckoutSession);
const mockCreatePortal = vi.mocked(subscriptionService.createPortalSession);

describe('useSubscriptionStore', () => {
  let locationHref: string;

  beforeEach(() => {
    useSubscriptionStore.setState({
      planType: 'free',
      subscription: null,
      limits: {},
      loading: false,
      error: null,
    });
    vi.clearAllMocks();

    // window.location.href のモック
    locationHref = '';
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        get href() {
          return locationHref;
        },
        set href(url: string) {
          locationHref = url;
        },
      },
      writable: true,
      configurable: true,
    });
  });

  // ─── 初期状態 ──────────────────────────────────────────

  it('初期状態が正しい', () => {
    const state = useSubscriptionStore.getState();
    expect(state.planType).toBe('free');
    expect(state.subscription).toBeNull();
    expect(state.loading).toBe(false);
  });

  // ─── fetchStatus ──────────────────────────────────────────

  it('fetchStatusがプラン情報を更新する', async () => {
    mockGetStatus.mockResolvedValue({
      planType: 'standard',
      limits: { maxHoldings: -1 },
      subscription: {
        id: 'sub-1',
        status: 'active',
        createdAt: '2026-01-01',
        lastPaymentAt: '2026-03-01',
      },
      hasStripeCustomer: true,
    });

    await useSubscriptionStore.getState().fetchStatus();

    const state = useSubscriptionStore.getState();
    expect(state.planType).toBe('standard');
    expect(state.subscription).toBeTruthy();
    expect(state.subscription!.id).toBe('sub-1');
  });

  it('fetchStatusが失敗してもクラッシュしない', async () => {
    mockGetStatus.mockRejectedValue(new Error('Network error'));

    await useSubscriptionStore.getState().fetchStatus();

    const state = useSubscriptionStore.getState();
    expect(state.planType).toBe('free'); // 変更されない
  });

  // ─── isPremium ────────────────────────────────────────────

  it('isPremiumがplanType="standard"でtrueを返す', () => {
    useSubscriptionStore.setState({ planType: 'standard' });
    expect(useSubscriptionStore.getState().isPremium()).toBe(true);
  });

  it('isPremiumがplanType="free"でfalseを返す', () => {
    useSubscriptionStore.setState({ planType: 'free' });
    expect(useSubscriptionStore.getState().isPremium()).toBe(false);
  });

  // ─── canUseFeature ────────────────────────────────────────

  it('Freeプランでは制限機能が使えない', () => {
    useSubscriptionStore.setState({ planType: 'free' });
    const state = useSubscriptionStore.getState();

    expect(state.canUseFeature('unlimitedHoldings')).toBe(false);
    expect(state.canUseFeature('fullPfScore')).toBe(false);
    expect(state.canUseFeature('adFree')).toBe(false);
  });

  it('Standardプランでは全機能が使える', () => {
    useSubscriptionStore.setState({ planType: 'standard' });
    const state = useSubscriptionStore.getState();

    expect(state.canUseFeature('unlimitedHoldings')).toBe(true);
    expect(state.canUseFeature('fullPfScore')).toBe(true);
    expect(state.canUseFeature('adFree')).toBe(true);
  });

  it('goalTrackingはFreeプランでも使用可能', () => {
    useSubscriptionStore.setState({ planType: 'free' });
    expect(useSubscriptionStore.getState().canUseFeature('goalTracking')).toBe(true);
  });

  it('未定義の機能はFreeプランでもデフォルトtrue', () => {
    useSubscriptionStore.setState({ planType: 'free' });
    expect(useSubscriptionStore.getState().canUseFeature('unknownFeature')).toBe(true);
  });

  // ─── setPlanType ──────────────────────────────────────────

  it('setPlanTypeがplanTypeを更新する', () => {
    useSubscriptionStore.getState().setPlanType('standard');
    expect(useSubscriptionStore.getState().planType).toBe('standard');
  });

  // ─── startCheckout ────────────────────────────────────────

  it('startCheckoutがチェックアウトURLにリダイレクトする', async () => {
    mockCreateCheckout.mockResolvedValue({
      checkoutUrl: 'https://checkout.stripe.com/session123',
      sessionId: 'session123',
    });

    await useSubscriptionStore.getState().startCheckout('monthly');

    expect(locationHref).toBe('https://checkout.stripe.com/session123');
  });

  it('startCheckoutが失敗した場合errorを設定する', async () => {
    mockCreateCheckout.mockRejectedValue(new Error('Stripe error'));

    await useSubscriptionStore.getState().startCheckout();

    expect(useSubscriptionStore.getState().error).toBe('Stripe error');
    expect(useSubscriptionStore.getState().loading).toBe(false);
  });

  // ─── openPortal ───────────────────────────────────────────

  it('openPortalがポータルURLにリダイレクトする', async () => {
    mockCreatePortal.mockResolvedValue({
      portalUrl: 'https://billing.stripe.com/portal123',
    });

    await useSubscriptionStore.getState().openPortal();

    expect(locationHref).toBe('https://billing.stripe.com/portal123');
  });

  it('openPortalが失敗した場合errorを設定する', async () => {
    mockCreatePortal.mockRejectedValue(new Error('Portal error'));

    await useSubscriptionStore.getState().openPortal();

    expect(useSubscriptionStore.getState().error).toBe('Portal error');
    expect(useSubscriptionStore.getState().loading).toBe(false);
  });
});
