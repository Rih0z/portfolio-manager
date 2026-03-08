/**
 * サブスクリプションサービスの単体テスト
 *
 * @file src/__tests__/unit/services/subscriptionService.test.ts
 */

import {
  getSubscriptionStatus,
  createCheckoutSession,
  createPortalSession,
} from '@/services/subscriptionService';
import * as apiUtils from '@/utils/apiUtils';
import * as envUtils from '@/utils/envUtils';

vi.mock('@/utils/apiUtils');
vi.mock('@/utils/envUtils');

const mockAuthFetch = vi.mocked(apiUtils.authFetch);
const mockGetApiEndpoint = vi.mocked(envUtils.getApiEndpoint);

describe('subscriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetApiEndpoint.mockResolvedValue('https://api.test.com/v1/subscription');
  });

  describe('getSubscriptionStatus', () => {
    it('サブスクリプション状態を取得する', async () => {
      const mockStatus = {
        planType: 'standard',
        limits: { maxHoldings: -1 },
        subscription: { id: 'sub-1', status: 'active', createdAt: '2026-01-01', lastPaymentAt: '2026-03-01' },
        hasStripeCustomer: true,
      };
      mockAuthFetch.mockResolvedValue({ success: true, data: mockStatus });

      const result = await getSubscriptionStatus();
      expect(result.planType).toBe('standard');
    });

    it('エラー時に例外をスローする', async () => {
      mockAuthFetch.mockResolvedValue({ success: false, error: { message: 'Unauthorized' } });

      await expect(getSubscriptionStatus()).rejects.toThrow('Unauthorized');
    });
  });

  describe('createCheckoutSession', () => {
    it('チェックアウトセッションを作成する', async () => {
      mockAuthFetch.mockResolvedValue({
        success: true,
        data: { checkoutUrl: 'https://checkout.stripe.com/test', sessionId: 'sess-1' },
      });

      const result = await createCheckoutSession('monthly');
      expect(result.checkoutUrl).toBe('https://checkout.stripe.com/test');
    });

    it('エラー時に例外をスローする', async () => {
      mockAuthFetch.mockResolvedValue({ success: false, error: { message: 'Stripe error' } });

      await expect(createCheckoutSession()).rejects.toThrow('Stripe error');
    });
  });

  describe('createPortalSession', () => {
    it('ポータルセッションを作成する', async () => {
      mockAuthFetch.mockResolvedValue({
        success: true,
        data: { portalUrl: 'https://billing.stripe.com/portal' },
      });

      const result = await createPortalSession();
      expect(result.portalUrl).toBe('https://billing.stripe.com/portal');
    });

    it('エラー時に例外をスローする', async () => {
      mockAuthFetch.mockResolvedValue({ success: false, error: { message: 'Not customer' } });

      await expect(createPortalSession()).rejects.toThrow('Not customer');
    });
  });
});
