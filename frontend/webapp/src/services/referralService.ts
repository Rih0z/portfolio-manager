/**
 * リファラルサービス
 *
 * リファラルコードの取得・検証・適用、統計情報の取得を
 * API 呼び出しで一元管理する。
 *
 * @file src/services/referralService.ts
 */

import { getApiEndpoint } from '../utils/envUtils';
import { authFetch } from '../utils/apiUtils';
import axios from 'axios';
import type {
  ReferralCode,
  ReferralStats,
  ApplyReferralResponse,
  ValidateReferralResponse,
} from '../types/referral.types';

/**
 * ユーザーのリファラルコードを取得（存在しない場合は新規作成）
 * JWT認証必須
 */
export const getReferralCode = async (): Promise<ReferralCode> => {
  const endpoint = await getApiEndpoint('api/referral/code');
  const response: any = await authFetch(endpoint, 'get');

  if (response?.success && response.data) {
    return response.data;
  }
  throw new Error(response?.error?.message || 'リファラルコードの取得に失敗しました');
};

/**
 * ユーザーのリファラル統計を取得
 * JWT認証必須
 */
export const getReferralStats = async (): Promise<ReferralStats> => {
  const endpoint = await getApiEndpoint('api/referral/stats');
  const response: any = await authFetch(endpoint, 'get');

  if (response?.success && response.data) {
    return response.data;
  }
  throw new Error(response?.error?.message || 'リファラル統計の取得に失敗しました');
};

/**
 * リファラルコードを適用する
 * JWT認証必須
 *
 * @param code - リファラルコード
 */
export const applyReferralCode = async (
  code: string
): Promise<ApplyReferralResponse> => {
  const endpoint = await getApiEndpoint('api/referral/apply');
  const response: any = await authFetch(endpoint, 'post', { code });

  if (response?.success && response.data) {
    return response.data;
  }
  throw new Error(response?.error?.message || 'リファラルコードの適用に失敗しました');
};

/**
 * リファラルコードの有効性を検証する（公開エンドポイント、認証不要）
 *
 * @param code - リファラルコード
 */
export const validateReferralCode = async (
  code: string
): Promise<ValidateReferralResponse> => {
  const endpoint = await getApiEndpoint('api/referral/validate');

  // 公開エンドポイントのため authFetch ではなく直接 axios を使用
  const response = await axios.post(endpoint, { code }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
  });

  if (response.data?.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(
    response.data?.error?.message || 'リファラルコードの検証に失敗しました'
  );
};
