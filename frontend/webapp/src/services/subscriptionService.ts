/**
 * サブスクリプションサービス
 *
 * Stripe Checkout / Customer Portal / ステータス取得の
 * API 呼び出しを一元管理する。
 *
 * @file src/services/subscriptionService.ts
 */

import { getApiEndpoint } from '../utils/envUtils';
import { authFetch } from '../utils/apiUtils';

export interface SubscriptionStatus {
  planType: 'free' | 'standard';
  limits: Record<string, any>;
  subscription: {
    id: string;
    status: string;
    createdAt: string;
    lastPaymentAt: string | null;
  } | null;
  hasStripeCustomer: boolean;
}

export interface CheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
}

export interface PortalResponse {
  portalUrl: string;
}

/**
 * Checkout Session を作成し、Stripe 決済ページの URL を取得
 * @param plan 'monthly' | 'annual'
 */
export const createCheckoutSession = async (plan: 'monthly' | 'annual' = 'monthly'): Promise<CheckoutResponse> => {
  const endpoint = await getApiEndpoint('v1/subscription/checkout');
  const response: any = await authFetch(endpoint, 'post', { plan });

  if (response?.success && response.data) {
    return response.data;
  }
  throw new Error(response?.error?.message || 'チェックアウトの作成に失敗しました');
};

/**
 * Customer Portal Session を作成し、管理ページの URL を取得
 */
export const createPortalSession = async (): Promise<PortalResponse> => {
  const endpoint = await getApiEndpoint('v1/subscription/portal');
  const response: any = await authFetch(endpoint, 'post');

  if (response?.success && response.data) {
    return response.data;
  }
  throw new Error(response?.error?.message || 'ポータルの作成に失敗しました');
};

/**
 * 現在のサブスクリプション状態を取得
 */
export const getSubscriptionStatus = async (): Promise<SubscriptionStatus> => {
  const endpoint = await getApiEndpoint('v1/subscription/status');
  const response: any = await authFetch(endpoint, 'get');

  if (response?.success && response.data) {
    return response.data;
  }
  throw new Error(response?.error?.message || 'ステータスの取得に失敗しました');
};
