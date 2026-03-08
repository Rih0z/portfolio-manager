/**
 * ShareLinkDisplay — 共有リンク表示コンポーネント
 *
 * 共有 URL をコピーボタンと共に表示する。
 * 削除ボタンも提供する。
 *
 * @file src/components/social/ShareLinkDisplay.tsx
 */
import React, { useState } from 'react';
import { Button } from '../ui/button';
import ConfirmDialog from '../ui/confirm-dialog';
import { useSocialStore } from '../../stores/socialStore';
import type { SharedPortfolio } from '../../types/social.types';

interface ShareLinkDisplayProps {
  share: SharedPortfolio;
  compact?: boolean;
}

const ShareLinkDisplay: React.FC<ShareLinkDisplayProps> = ({ share, compact = false }) => {
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteShare = useSocialStore((s) => s.deleteShare);
  const loading = useSocialStore((s) => s.loading);

  const shareUrl = `${window.location.origin}/share/${share.shareId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // フォールバック: input selectからのコピー
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    await deleteShare(share.shareId);
  };

  if (compact) {
    return (
      <div className="bg-muted rounded-lg p-2.5 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground truncate mr-2">
            {share.displayName}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleCopy}
              className="text-xs text-primary-500 hover:text-primary-600 font-medium"
              title="リンクをコピー"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDelete}
              className="text-xs text-danger-500 hover:text-danger-600 font-medium ml-1"
              title="共有を削除"
              disabled={loading}
            >
              Del
            </button>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground truncate font-mono">
          {shareUrl}
        </div>
        {share.expiresAt && (
          <div className="text-[10px] text-muted-foreground">
            期限: {new Date(share.expiresAt).toLocaleDateString('ja-JP')}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-muted rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          {share.displayName}
        </span>
        {share.expiresAt && (
          <span className="text-xs text-muted-foreground">
            期限: {new Date(share.expiresAt).toLocaleDateString('ja-JP')}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={shareUrl}
          readOnly
          className="flex-1 h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs font-mono text-muted-foreground"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <Button
          variant={copied ? 'success' : 'outline'}
          size="sm"
          onClick={handleCopy}
          className="shrink-0"
        >
          {copied ? (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-1"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-1"
              >
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
              Copy
            </>
          )}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Score: {share.portfolioScore}</span>
          <span>{share.assetCount} 銘柄</span>
          <span>{share.ageGroup}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={loading}
          className="text-danger-500 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-500/10"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-1"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
          削除
        </Button>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="共有リンクの削除"
        description="この共有リンクを削除しますか？"
        confirmLabel="削除"
        cancelLabel="キャンセル"
        variant="danger"
      />
    </div>
  );
};

export default ShareLinkDisplay;
