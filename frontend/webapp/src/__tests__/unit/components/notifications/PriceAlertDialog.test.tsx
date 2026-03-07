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

// Mutable store state
const mockAddAlertRule = vi.fn();

const mockStoreState: Record<string, any> = {
  addAlertRule: mockAddAlertRule,
};

vi.mock('../../../../stores/notificationStore', () => ({
  useNotificationStore: vi.fn((selector: (state: any) => any) => selector(mockStoreState)),
}));

import PriceAlertDialog from '../../../../components/notifications/PriceAlertDialog';

describe('PriceAlertDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAddAlertRule.mockResolvedValue({ success: true });
    mockStoreState.addAlertRule = mockAddAlertRule;
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
      expect(mockAddAlertRule).not.toHaveBeenCalled();
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
      expect(mockAddAlertRule).not.toHaveBeenCalled();
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
      expect(mockAddAlertRule).not.toHaveBeenCalled();
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
      expect(mockAddAlertRule).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Submit
  // =========================================================================
  describe('submit', () => {
    it('should call addAlertRule with correct data on valid submit', async () => {
      mockAddAlertRule.mockResolvedValue({ success: true });
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
        expect(mockAddAlertRule).toHaveBeenCalledWith({
          type: 'price_above',
          ticker: 'AAPL', // trimmed and uppercased
          targetValue: 200,
          enabled: true,
        });
      });
    });

    it('should close dialog on successful submit', async () => {
      mockAddAlertRule.mockResolvedValue({ success: true });
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

    it('should show limit reached error', async () => {
      mockAddAlertRule.mockResolvedValue({
        success: false,
        limitReached: true,
      });

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
    });

    it('should show errors array from addAlertRule result', async () => {
      mockAddAlertRule.mockResolvedValue({
        success: false,
        errors: ['カスタムエラーメッセージ'],
      });

      render(<PriceAlertDialog {...defaultProps} />);

      fireEvent.change(screen.getByTestId('alert-ticker-input'), {
        target: { value: 'AAPL' },
      });
      fireEvent.change(screen.getByTestId('alert-target-value-input'), {
        target: { value: '200' },
      });
      fireEvent.click(screen.getByTestId('alert-submit-button'));

      await waitFor(() => {
        expect(screen.getByText('カスタムエラーメッセージ')).toBeInTheDocument();
      });
    });

    it('should show generic error when addAlertRule throws', async () => {
      mockAddAlertRule.mockRejectedValue(new Error('Unexpected error'));

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

      expect(mockAddAlertRule).not.toHaveBeenCalled();
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
