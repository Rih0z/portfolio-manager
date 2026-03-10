/**
 * SharePortfolioButton — ダッシュボードにポートフォリオ共有ボタンを配置
 *
 * 認証済みユーザーがクリックすると ShareDialog を開く。
 * 既に共有がある場合は共有リンクを表示する。
 *
 * @file src/components/social/SharePortfolioButton.tsx
 */
import React, { useState } from 'react';
import { Button } from '../ui/button';
import ShareDialog from './ShareDialog';
import ShareLinkDisplay from './ShareLinkDisplay';
import { useUserShares } from '../../hooks/queries';
import { useAuthStore } from '../../stores/authStore';

const SharePortfolioButton: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: sharesData, isPending: loading } = useUserShares({ enabled: isAuthenticated });
  const shares = sharesData?.shares ?? [];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {shares.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLinks(!showLinks)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-1"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          共有リンク ({shares.length})
        </Button>
      )}

      <Button
        variant="primary"
        size="sm"
        onClick={() => setDialogOpen(true)}
        loading={loading}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-1"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        ポートフォリオを共有
      </Button>

      <ShareDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />

      {showLinks && shares.length > 0 && (
        <div className="fixed inset-0 z-40" onClick={() => setShowLinks(false)}>
          <div
            className="absolute right-4 top-16 z-50 w-80 bg-card border border-border rounded-xl shadow-large p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-foreground">共有中のリンク</h3>
            {shares.map((share) => (
              <ShareLinkDisplay
                key={share.shareId}
                share={share}
                compact
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SharePortfolioButton;
