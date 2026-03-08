/**
 * ReferralBanner smoke render tests
 *
 * リファラルバナーの基本レンダリングを検証する。
 * @file src/__tests__/unit/components/referral/ReferralBanner.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// --- Mock dependencies ---
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'ja' },
  }),
}));

vi.mock('../../../../services/referralService', () => ({
  validateReferralCode: vi.fn().mockResolvedValue({ valid: true }),
}));

import ReferralBanner from '../../../../components/referral/ReferralBanner';

describe('ReferralBanner', () => {
  let originalLocation: Location;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.location.search
    originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, search: '' },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  it('should render nothing when no ref parameter', () => {
    const { container } = render(<ReferralBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('should render loading state when ref parameter is present', () => {
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, search: '?ref=ABC123' },
      writable: true,
    });

    render(<ReferralBanner />);
    expect(screen.getByTestId('referral-banner')).toBeInTheDocument();
  });
});
