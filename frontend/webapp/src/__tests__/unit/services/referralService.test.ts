/**
 * referralService unit tests
 *
 * リファラルコードの取得・検証・適用、統計情報の取得を検証する。
 * @file src/__tests__/unit/services/referralService.test.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// --- Mock dependencies BEFORE imports ---
vi.mock('../../../utils/envUtils', () => ({
  getApiEndpoint: vi.fn((path: string) => `https://api.test.com/${path}`),
}));

vi.mock('../../../utils/apiUtils', () => ({
  authFetch: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}));

// --- Import after mocks ---
import {
  getReferralCode,
  getReferralStats,
  applyReferralCode,
  validateReferralCode,
} from '../../../services/referralService';
import { authFetch } from '../../../utils/apiUtils';
import axios from 'axios';

describe('referralService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── getReferralCode ────────────────────────────
  describe('getReferralCode', () => {
    it('should return referral code on success', async () => {
      const mockCode = {
        referralCode: 'PW3X9K2M',
        userId: 'user-123',
        createdAt: '2026-03-01T00:00:00.000Z',
      };
      vi.mocked(authFetch).mockResolvedValue({
        success: true,
        data: mockCode,
      });

      const result = await getReferralCode();

      expect(result).toEqual(mockCode);
      expect(authFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/referral/code',
        'get'
      );
    });

    it('should throw on unsuccessful response', async () => {
      vi.mocked(authFetch).mockResolvedValue({
        success: false,
        error: { message: 'Unauthorized' },
      });

      await expect(getReferralCode()).rejects.toThrow('Unauthorized');
    });

    it('should throw default message on empty error', async () => {
      vi.mocked(authFetch).mockResolvedValue({
        success: false,
      });

      await expect(getReferralCode()).rejects.toThrow(
        'リファラルコードの取得に失敗しました'
      );
    });
  });

  // ─── getReferralStats ───────────────────────────
  describe('getReferralStats', () => {
    it('should return referral stats on success', async () => {
      const mockStats = {
        totalReferrals: 5,
        successfulConversions: 2,
        rewardMonths: 2,
        maxRewardMonths: 6,
      };
      vi.mocked(authFetch).mockResolvedValue({
        success: true,
        data: mockStats,
      });

      const result = await getReferralStats();

      expect(result).toEqual(mockStats);
      expect(authFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/referral/stats',
        'get'
      );
    });

    it('should throw on unsuccessful response', async () => {
      vi.mocked(authFetch).mockResolvedValue({
        success: false,
        error: { message: 'Server error' },
      });

      await expect(getReferralStats()).rejects.toThrow('Server error');
    });
  });

  // ─── applyReferralCode ─────────────────────────
  describe('applyReferralCode', () => {
    it('should apply referral code and return result', async () => {
      const mockResult = { success: true, message: 'コード適用成功' };
      vi.mocked(authFetch).mockResolvedValue({
        success: true,
        data: mockResult,
      });

      const result = await applyReferralCode('PW3X9K2M');

      expect(result).toEqual(mockResult);
      expect(authFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/referral/apply',
        'post',
        { code: 'PW3X9K2M' }
      );
    });

    it('should throw on unsuccessful response', async () => {
      vi.mocked(authFetch).mockResolvedValue({
        success: false,
        error: { message: '自己参照はできません' },
      });

      await expect(applyReferralCode('MYCODE')).rejects.toThrow(
        '自己参照はできません'
      );
    });
  });

  // ─── validateReferralCode ──────────────────────
  describe('validateReferralCode', () => {
    it('should validate code via public endpoint (no auth)', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: {
          success: true,
          data: { valid: true },
        },
      });

      const result = await validateReferralCode('PW3X9K2M');

      expect(result).toEqual({ valid: true });
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.test.com/api/referral/validate',
        { code: 'PW3X9K2M' },
        { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
      );
      // authFetch should NOT be used for public endpoint
      expect(authFetch).not.toHaveBeenCalled();
    });

    it('should return invalid for non-existent code', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: {
          success: true,
          data: { valid: false },
        },
      });

      const result = await validateReferralCode('INVALID');

      expect(result).toEqual({ valid: false });
    });

    it('should throw on unsuccessful response', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: {
          success: false,
          error: { message: 'Invalid request' },
        },
      });

      await expect(validateReferralCode('BAD')).rejects.toThrow(
        'Invalid request'
      );
    });

    it('should throw on network error', async () => {
      vi.mocked(axios.post).mockRejectedValue(new Error('Network error'));

      await expect(validateReferralCode('CODE')).rejects.toThrow(
        'Network error'
      );
    });
  });
});
