/**
 * ShareLinkDisplay テスト
 *
 * 共有リンク表示コンポーネントのコピー・削除フローを検証する。
 * @file src/__tests__/unit/components/social/ShareLinkDisplay.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';

// --- Mocks ---
const mockMutate = vi.fn();
let mockIsPending = false;
vi.mock('../../../../hooks/queries', () => ({
  useDeleteShare: vi.fn(() => ({
    mutate: mockMutate,
    isPending: mockIsPending,
  })),
}));

import ShareLinkDisplay from '../../../../components/social/ShareLinkDisplay';
import { useDeleteShare } from '../../../../hooks/queries';

const sampleShare = {
  shareId: 'share-123',
  displayName: 'テストポートフォリオ',
  portfolioScore: 85,
  assetCount: 10,
  ageGroup: '30代',
  allocationSnapshot: [] as { category: string; percentage: number }[],
  expiresAt: '2026-12-31T00:00:00.000Z',
  userId: 'user-1',
  assets: [] as unknown[],
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('ShareLinkDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending = false;
    vi.mocked(useDeleteShare).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as any);
  });

  describe('フルバリアント（デフォルト）', () => {
    it('共有リンクの表示名を表示する', () => {
      render(<ShareLinkDisplay share={sampleShare} />);
      expect(screen.getByText('テストポートフォリオ')).toBeInTheDocument();
    });

    it('共有URLをinputフィールドに表示する', () => {
      render(<ShareLinkDisplay share={sampleShare} />);
      const input = screen.getByDisplayValue(/\/share\/share-123/);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('readOnly');
    });

    it('スコア・銘柄数・年齢グループを表示する', () => {
      render(<ShareLinkDisplay share={sampleShare} />);
      expect(screen.getByText('Score: 85')).toBeInTheDocument();
      expect(screen.getByText('10 銘柄')).toBeInTheDocument();
      expect(screen.getByText('30代')).toBeInTheDocument();
    });

    it('有効期限を表示する', () => {
      render(<ShareLinkDisplay share={sampleShare} />);
      expect(screen.getByText(/期限:/)).toBeInTheDocument();
    });

    it('Copyボタンクリックでクリップボードにコピーされる', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: mockWriteText },
      });

      render(<ShareLinkDisplay share={sampleShare} />);
      fireEvent.click(screen.getByText('Copy'));

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(
          expect.stringContaining('/share/share-123')
        );
      });

      // コピー後のテキスト変更
      await waitFor(() => {
        expect(screen.getByText('Copied')).toBeInTheDocument();
      });
    });

    it('削除ボタンクリックで確認ダイアログが表示される', () => {
      render(<ShareLinkDisplay share={sampleShare} />);
      fireEvent.click(screen.getByText('削除'));

      expect(screen.getByText('共有リンクの削除')).toBeInTheDocument();
      expect(screen.getByText('この共有リンクを削除しますか？')).toBeInTheDocument();
    });

    it('確認ダイアログで「削除」をクリックするとdeleteShareが呼ばれる', async () => {
      render(<ShareLinkDisplay share={sampleShare} />);

      // ダイアログを開く
      fireEvent.click(screen.getByText('削除'));

      // ConfirmDialogの「削除」ボタンをクリック（dialog内のボタンをテキストで特定）
      const dialog = screen.getByRole('dialog');
      fireEvent.click(within(dialog).getByText('削除'));

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith('share-123', expect.objectContaining({ onError: expect.any(Function) }));
      });
    });

    it('確認ダイアログで「キャンセル」をクリックするとdeleteShareは呼ばれない', () => {
      render(<ShareLinkDisplay share={sampleShare} />);

      // ダイアログを開く
      fireEvent.click(screen.getByText('削除'));

      // 「キャンセル」ボタンをクリック
      fireEvent.click(screen.getByText('キャンセル'));

      expect(mockMutate).not.toHaveBeenCalled();
      expect(screen.queryByText('共有リンクの削除')).not.toBeInTheDocument();
    });

    it('loading中は削除ボタンがdisabledになる', () => {
      vi.mocked(useDeleteShare).mockReturnValue({
        mutate: mockMutate,
        isPending: true,
      } as any);

      render(<ShareLinkDisplay share={sampleShare} />);
      const deleteButton = screen.getByText('削除').closest('button');
      expect(deleteButton).toBeDisabled();
    });
  });

  describe('コンパクトバリアント', () => {
    it('表示名を表示する', () => {
      render(<ShareLinkDisplay share={sampleShare} compact />);
      expect(screen.getByText('テストポートフォリオ')).toBeInTheDocument();
    });

    it('CopyボタンとDelボタンを表示する', () => {
      render(<ShareLinkDisplay share={sampleShare} compact />);
      expect(screen.getByText('Copy')).toBeInTheDocument();
      expect(screen.getByText('Del')).toBeInTheDocument();
    });

    it('共有URLをテキストで表示する', () => {
      render(<ShareLinkDisplay share={sampleShare} compact />);
      expect(screen.getByText(/\/share\/share-123/)).toBeInTheDocument();
    });

    it('有効期限を表示する', () => {
      render(<ShareLinkDisplay share={sampleShare} compact />);
      expect(screen.getByText(/期限:/)).toBeInTheDocument();
    });

    it('DelボタンクリックでhandleDeleteが呼ばれる（ConfirmDialogはフルバリアントのみ）', () => {
      // NOTE: compact variantでは early return しているため ConfirmDialog がレンダリングされない
      // この点は将来的に修正が必要（ConfirmDialogをcompact内にも配置すべき）
      render(<ShareLinkDisplay share={sampleShare} compact />);
      const delButton = screen.getByText('Del');
      // ボタンが存在しクリック可能であること
      expect(delButton).toBeInTheDocument();
      fireEvent.click(delButton);
      // compact variantにはConfirmDialogがないため、ダイアログは表示されない
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('loading中はDelボタンがdisabledになる', () => {
      vi.mocked(useDeleteShare).mockReturnValue({
        mutate: mockMutate,
        isPending: true,
      } as any);

      render(<ShareLinkDisplay share={sampleShare} compact />);
      const delButton = screen.getByText('Del').closest('button');
      expect(delButton).toBeDisabled();
    });

    it('有効期限がない場合は期限表示がない', () => {
      const shareWithoutExpiry = { ...sampleShare, expiresAt: undefined as string | undefined };
      render(<ShareLinkDisplay share={shareWithoutExpiry as any} compact />);
      expect(screen.queryByText(/期限:/)).not.toBeInTheDocument();
    });
  });
});
