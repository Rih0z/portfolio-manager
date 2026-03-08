/**
 * UpgradePrompt テスト
 *
 * アップグレード促進コンポーネントのレンダリングとナビゲーションを検証する。
 * @file src/__tests__/unit/components/common/UpgradePrompt.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// --- Mocks ---
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import UpgradePrompt from '../../../../components/common/UpgradePrompt';

describe('UpgradePrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('inline variant（デフォルト）', () => {
    it('機能名と上限メッセージを表示する', () => {
      render(
        <MemoryRouter>
          <UpgradePrompt feature="AIプロンプト" />
        </MemoryRouter>
      );

      expect(screen.getByText(/AIプロンプトの無料プラン上限/)).toBeInTheDocument();
    });

    it('使用量を表示する（current/limit指定時）', () => {
      render(
        <MemoryRouter>
          <UpgradePrompt feature="保有銘柄" current={5} limit={5} />
        </MemoryRouter>
      );

      expect(screen.getByText(/（5\/5）/)).toBeInTheDocument();
    });

    it('使用量なしでも正常にレンダリングされる', () => {
      render(
        <MemoryRouter>
          <UpgradePrompt feature="市場データ" />
        </MemoryRouter>
      );

      expect(screen.getByText(/市場データの無料プラン上限/)).toBeInTheDocument();
      expect(screen.queryByText(/\//)).not.toBeInTheDocument();
    });

    it('「アップグレード」ボタンクリックで/pricingへ遷移する', () => {
      render(
        <MemoryRouter>
          <UpgradePrompt feature="AIプロンプト" />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText('アップグレード'));
      expect(mockNavigate).toHaveBeenCalledWith('/pricing');
    });
  });

  describe('banner variant', () => {
    it('上限到達メッセージを表示する', () => {
      render(
        <MemoryRouter>
          <UpgradePrompt feature="AIプロンプト" variant="banner" />
        </MemoryRouter>
      );

      expect(screen.getByText('AIプロンプトの上限に到達しました')).toBeInTheDocument();
      expect(screen.getByText(/Standard プランにアップグレードすると/)).toBeInTheDocument();
    });

    it('使用量を表示する（current/limit指定時）', () => {
      render(
        <MemoryRouter>
          <UpgradePrompt feature="保有銘柄" variant="banner" current={5} limit={5} />
        </MemoryRouter>
      );

      expect(screen.getByText('使用量: 5 / 5')).toBeInTheDocument();
    });

    it('「プランを見る」ボタンクリックで/pricingへ遷移する', () => {
      render(
        <MemoryRouter>
          <UpgradePrompt feature="AIプロンプト" variant="banner" />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText('プランを見る'));
      expect(mockNavigate).toHaveBeenCalledWith('/pricing');
    });

    it('閉じるボタンが表示されonCloseが呼ばれる', () => {
      const mockOnClose = vi.fn();
      render(
        <MemoryRouter>
          <UpgradePrompt feature="AIプロンプト" variant="banner" onClose={mockOnClose} />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByLabelText('閉じる'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('onCloseが未指定の場合、閉じるボタンは表示されない', () => {
      render(
        <MemoryRouter>
          <UpgradePrompt feature="AIプロンプト" variant="banner" />
        </MemoryRouter>
      );

      expect(screen.queryByLabelText('閉じる')).not.toBeInTheDocument();
    });
  });
});
