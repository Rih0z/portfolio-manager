/**
 * リファラルプログラム型定義
 * @file src/types/referral.types.ts
 */

/** リファラルコード情報 */
export interface ReferralCode {
  referralCode: string;
  userId: string;
  createdAt: string;
}

/** リファラル統計情報 */
export interface ReferralStats {
  totalReferrals: number;
  successfulConversions: number;
  rewardMonths: number;
  maxRewardMonths: number;
}

/** リファラルコード適用レスポンス */
export interface ApplyReferralResponse {
  success: boolean;
  message: string;
}

/** リファラルコード検証レスポンス */
export interface ValidateReferralResponse {
  valid: boolean;
}
