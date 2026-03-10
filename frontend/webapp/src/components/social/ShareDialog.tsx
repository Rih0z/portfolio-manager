/**
 * ShareDialog — ポートフォリオ共有ダイアログ
 *
 * 表示名と年代を入力して共有リンクを生成する。
 * 共有成功時は ShareLinkDisplay で URL を表示。
 *
 * @file src/components/social/ShareDialog.tsx
 */
import React, { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input, Select } from '../ui/input';
import ShareLinkDisplay from './ShareLinkDisplay';
import { useCreateShare, useUserShares, useIsPremium } from '../../hooks/queries';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { AGE_GROUPS, SOCIAL_LIMITS } from '../../types/social.types';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShareDialog: React.FC<ShareDialogProps> = ({ isOpen, onClose }) => {
  const [displayName, setDisplayName] = useState('');
  const [showAgeGroup, setShowAgeGroup] = useState(false);
  const [ageGroup, setAgeGroup] = useState('');
  const [createdShare, setCreatedShare] = useState<any>(null);
  const [error, setError] = useState('');

  const createShareMutation = useCreateShare();
  const { data: sharesData } = useUserShares();
  const isPremium = useIsPremium();

  const loading = createShareMutation.isPending;
  const maxShares = isPremium ? SOCIAL_LIMITS.STANDARD.maxShares : SOCIAL_LIMITS.FREE.maxShares;
  const ttlDays = isPremium ? SOCIAL_LIMITS.STANDARD.ttlDays : SOCIAL_LIMITS.FREE.ttlDays;
  const shareCount = sharesData?.shares?.length ?? 0;
  const canCreateShare = () => shareCount < maxShares;

  // ポートフォリオ情報の取得
  const targetPortfolio = usePortfolioStore((s) => s.targetPortfolio);
  const currentAssets = usePortfolioStore((s) => s.currentAssets);

  // アロケーションスナップショットを生成
  const generateAllocationSnapshot = () => {
    if (targetPortfolio && targetPortfolio.length > 0) {
      return targetPortfolio
        .filter((item: any) => item.targetPercentage > 0)
        .map((item: any) => ({
          category: item.name || item.ticker,
          percentage: item.targetPercentage,
        }));
    }
    return [];
  };

  // 簡易ポートフォリオスコアを計算
  const calculateSimpleScore = () => {
    const assetCount = currentAssets?.length || 0;
    const targetCount = targetPortfolio?.filter((t: any) => t.targetPercentage > 0).length || 0;

    // 分散度（銘柄数）と目標設定を基にスコア算出
    let score = 0;
    score += Math.min(assetCount * 5, 30); // 銘柄数: 最大30点
    score += Math.min(targetCount * 5, 30); // 目標設定: 最大30点
    score += assetCount > 3 ? 20 : assetCount * 5; // 分散: 最大20点
    score += targetCount > 0 ? 20 : 0; // 目標有無: 20点

    return Math.min(score, 100);
  };

  const handleSubmit = async () => {
    setError('');

    if (!displayName.trim()) {
      setError('表示名を入力してください');
      return;
    }

    if (displayName.trim().length > 30) {
      setError('表示名は30文字以内にしてください');
      return;
    }

    const allocationSnapshot = generateAllocationSnapshot();
    if (allocationSnapshot.length === 0) {
      setError('ポートフォリオにデータがありません。先に設定を行ってください。');
      return;
    }

    createShareMutation.mutate(
      {
        displayName: displayName.trim(),
        ageGroup: showAgeGroup && ageGroup ? ageGroup : undefined,
        allocationSnapshot,
        portfolioScore: calculateSimpleScore(),
        assetCount: currentAssets?.length || 0,
      },
      {
        onSuccess: (share) => {
          setCreatedShare(share);
        },
        onError: () => {
          setError('共有リンクの作成に失敗しました。しばらく経ってから再度お試しください。');
        },
      },
    );
  };

  const handleClose = () => {
    setDisplayName('');
    setShowAgeGroup(false);
    setAgeGroup('');
    setCreatedShare(null);
    setError('');
    onClose();
  };


  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="md">
      <DialogHeader onClose={handleClose}>
        <DialogTitle>ポートフォリオを共有</DialogTitle>
      </DialogHeader>

      <DialogBody>
        {createdShare ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              共有リンクが作成されました。このリンクを友人や投資仲間と共有できます。
            </p>
            <ShareLinkDisplay share={createdShare} />
            <p className="text-xs text-muted-foreground">
              このリンクは {ttlDays} 日後に自動的に期限切れになります。
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              ポートフォリオの配分を匿名で共有できます。
              個人情報や具体的な金額は含まれません。
            </p>

            {!canCreateShare() && (
              <div className="bg-warning-50 dark:bg-warning-500/10 border border-warning-200 dark:border-warning-500/20 rounded-lg p-3">
                <p className="text-sm text-warning-700 dark:text-warning-400">
                  共有数の上限に達しています。新しい共有を作成するには、既存の共有を削除するか、プランをアップグレードしてください。
                </p>
              </div>
            )}

            <Input
              label="表示名"
              placeholder="例: 長期投資家A"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              helperText="他のユーザーに表示される匿名の名前です（最大30文字）"
              required
            />

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAgeGroup}
                  onChange={(e) => {
                    setShowAgeGroup(e.target.checked);
                    if (!e.target.checked) setAgeGroup('');
                  }}
                  className="rounded border-border text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-foreground">年代を公開する</span>
              </label>
              {showAgeGroup && (
                <Select
                  label="年代"
                  options={AGE_GROUPS.map((g) => ({ value: g.value, label: g.label }))}
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value)}
                  placeholder="年代を選択"
                  helperText="同年代の投資家との比較に使用されます"
                />
              )}
            </div>

            {error && (
              <p className="text-sm text-danger-500" role="alert">
                {error}
              </p>
            )}

            <div className="bg-muted rounded-lg p-3">
              <h4 className="text-xs font-medium text-foreground mb-1">共有される内容</h4>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                <li>- 資産配分の比率（カテゴリと割合）</li>
                <li>- ポートフォリオスコア</li>
                <li>- 保有銘柄数</li>
              </ul>
              <h4 className="text-xs font-medium text-foreground mt-2 mb-1">共有されない内容</h4>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                <li>- 具体的な金額や評価額</li>
                <li>- 個人情報やアカウント情報</li>
                <li>- 個別銘柄のティッカーシンボル</li>
              </ul>
            </div>
          </div>
        )}
      </DialogBody>

      <DialogFooter>
        {createdShare ? (
          <Button variant="primary" onClick={handleClose}>
            閉じる
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={handleClose}>
              キャンセル
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={loading}
              disabled={!canCreateShare() || loading}
            >
              共有リンクを作成
            </Button>
          </>
        )}
      </DialogFooter>
    </Dialog>
  );
};

export default ShareDialog;
