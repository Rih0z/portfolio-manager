/**
 * PriceAlertDialog unit tests
 *
 * アラートルール作成ダイアログのレンダリング、フォーム、
 * バリデーション、送信、キャンセルを検証する。
 * @file src/__tests__/unit/components/notifications/PriceAlertDialog.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// --- Mock dependencies BEFORE imports ---
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'ja' },
  }),
}));

// TQ hooks mock
const mockMutateAsync = vi.fn();

vi.mock('../../../../hooks/queries', () => ({
  useCreateAlertRule: vi.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
  useAlertRules: vi.fn(() => ({ data: [], isPending: false })),
  useIsPremium: vi.fn(() => false),
}));

import PriceAlertDialog from '../../../../components/notifications/PriceAlertDialog';
import { useAlertRules, useIsPremium } from '../../../../hooks/queries';

describe('PriceAlertDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({ ruleId: 'r-1', type: 'price_above', ticker: 'AAPL', targetValue: 200, enabled: true });
    // Reset hooks to defaults (clearAllMocks doesn't reset implementations)
    vi.mocked(useAlertRules).mockReturnValue({ data: [], isPending: false } as any);
    vi.mocked(useIsPremium).mockReturnValue(false);
  });

  // =========================================================================
  // Rendering
  // =========================================================================
  describe('rendering', () => {
    it('should render dialog when isOpen is true', () => {
      render(<PriceAlertDialog {...defaultProps} />);
      expect(screen.getByTestId('price-alert-dialog')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<PriceAlertDialog isOpen={false} onClose={vi.fn()} />);
      expect(screen.queryByTestId('price-alert-dialog')).not.toBeInTheDocument();
    });

    it('should show dialog title', () => {
      render(<PriceAlertDialog {...defaultProps} />);
      expect(screen.getByText('アラートルールを追加')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Form fields
  // =========================================================================
  describe('form fields', () => {
    it('should render alert type select', () => {
      render(<PriceAlertDialog {...defaultProps} />);
      expect(screen.getByTestId('alert-type-select')).toBeInTheDocument();
    });

    it('should render ticker input', () => {
      render(<PriceAlertDialog {...defaultProps} />);
      expect(screen.getByTestId('alert-ticker-input')).toBeInTheDocument();
    });

    it('should render target value input', () => {
      render(<PriceAlertDialog {...defaultProps} />);
      expect(screen.getByTestId('alert-target-value-input')).toBeInTheDocument();
    });

    it('should render submit and cancel buttons', () => {
      render(<PriceAlertDialog {...defaultProps} />);
      expect(screen.getByTestId('alert-submit-button')).toBeInTheDocument();
      expect(screen.getByTestId('alert-cancel-button')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Validation
  // =========================================================================
  describe('validation', () => {
    it('should show error when submitting with empty ticker', async () => {
      render(<PriceAlertDialog {...defaultProps} />);

      // Target value filled, ticker empty by default
      fireEvent.change(screen.getByTestId('alert-target-value-input'), {
        target: { value: '200' },
      });
      // Use fireEvent.submit to bypass HTML5 required attribute validation
      fireEvent.submit(screen.getByTestId('price-alert-dialog'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('should show error when target value is empty', async () => {
      render(<PriceAlertDialog {...defaultProps} />);

      fireEvent.change(screen.getByTestId('alert-ticker-input'), {
        target: { value: 'AAPL' },
      });
      fireEvent.submit(screen.getByTestId('price-alert-dialog'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('should show error when target value is 0', async () => {
      render(<PriceAlertDialog {...defaultProps} />);

      fireEvent.change(screen.getByTestId('alert-ticker-input'), {
        target: { value: 'AAPL' },
      });
      fireEvent.change(screen.getByTestId('alert-target-value-input'), {
        target: { value: '0' },
      });
      fireEvent.submit(screen.getByTestId('price-alert-dialog'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('should show error when target value is negative', async () => {
      render(<PriceAlertDialog {...defaultProps} />);

      fireEvent.change(screen.getByTestId('alert-ticker-input'), {
        target: { value: 'AAPL' },
      });
      fireEvent.change(screen.getByTestId('alert-target-value-input'), {
        target: { value: '-10' },
      });
      fireEvent.submit(screen.getByTestId('price-alert-dialog'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Submit
  // =========================================================================
  describe('submit', () => {
    it('should call addAlertRule with correct data on valid submit', async () => {
      mockMutateAsync.mockResolvedValue({ success: true });
      const onClose = vi.fn();

      render(<PriceAlertDialog isOpen={true} onClose={onClose} />);

      fireEvent.change(screen.getByTestId('alert-ticker-input'), {
        target: { value: 'aapl' },
      });
      fireEvent.change(screen.getByTestId('alert-target-value-input'), {
        target: { value: '200' },
      });
      fireEvent.click(screen.getByTestId('alert-submit-button'));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          type: 'price_above',
          ticker: 'AAPL', // trimmed and uppercased
          targetValue: 200,
          enabled: true,
        });
      });
    });

    it('should close dialog on successful submit', async () => {
      mockMutateAsync.mockResolvedValue({ success: true });
      const onClose = vi.fn();

      render(<PriceAlertDialog isOpen={true} onClose={onClose} />);

      fireEvent.change(screen.getByTestId('alert-ticker-input'), {
        target: { value: 'GOOG' },
      });
      fireEvent.change(screen.getByTestId('alert-target-value-input'), {
        target: { value: '150' },
      });
      fireEvent.click(screen.getByTestId('alert-submit-button'));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should show limit reached error when at plan limit (free)', async () => {
      // Free plan has 2 max rules — mock 2 existing rules
      vi.mocked(useAlertRules).mockReturnValue({
        data: [{ ruleId: 'r1' }, { ruleId: 'r2' }],
        isPending: false,
      } as any);
      vi.mocked(useIsPremium).mockReturnValue(false);

      render(<PriceAlertDialog {...defaultProps} />);

      fireEvent.change(screen.getByTestId('alert-ticker-input'), {
        target: { value: 'AAPL' },
      });
      fireEvent.change(screen.getByTestId('alert-target-value-input'), {
        target: { value: '200' },
      });
      fireEvent.click(screen.getByTestId('alert-submit-button'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(
          screen.getByText('アラートルール数の上限に達しています')
        ).toBeInTheDocument();
      });
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('should show generic error when addAlertRule throws', async () => {
      mockMutateAsync.mockRejectedValue(new Error('Unexpected error'));

      render(<PriceAlertDialog {...defaultProps} />);

      fireEvent.change(screen.getByTestId('alert-ticker-input'), {
        target: { value: 'AAPL' },
      });
      fireEvent.change(screen.getByTestId('alert-target-value-input'), {
        target: { value: '200' },
      });
      fireEvent.click(screen.getByTestId('alert-submit-button'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(
          screen.getByText('アラートルールの作成に失敗しました')
        ).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // Cancel
  // =========================================================================
  describe('cancel', () => {
    it('should call onClose when cancel button is clicked', () => {
      const onClose = vi.fn();
      render(<PriceAlertDialog isOpen={true} onClose={onClose} />);

      fireEvent.click(screen.getByTestId('alert-cancel-button'));

      expect(onClose).toHaveBeenCalled();
    });

    it('should not call addAlertRule when cancel is clicked', () => {
      render(<PriceAlertDialog {...defaultProps} />);

      fireEvent.change(screen.getByTestId('alert-ticker-input'), {
        target: { value: 'AAPL' },
      });
      fireEvent.change(screen.getByTestId('alert-target-value-input'), {
        target: { value: '200' },
      });
      fireEvent.click(screen.getByTestId('alert-cancel-button'));

      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Alert type selection
  // =========================================================================
  describe('alert type selection', () => {
    it('should allow changing alert type', () => {
      render(<PriceAlertDialog {...defaultProps} />);

      const select = screen.getByTestId('alert-type-select');
      fireEvent.change(select, { target: { value: 'price_below' } });

      expect((select as HTMLSelectElement).value).toBe('price_below');
    });
  });
});
