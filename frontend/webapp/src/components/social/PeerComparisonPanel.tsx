/**
 * PeerComparisonPanel — ピア比較パネル
 *
 * 同年代の投資家と資産配分を比較する。
 * 平均アロケーションと参加者数を表示。
 *
 * @file src/components/social/PeerComparisonPanel.tsx
 */
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Select } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import PeerRankBadge from './PeerRankBadge';
import { usePeerComparison } from '../../hooks/queries';
import { useAuthStore } from '../../stores/authStore';
import { AGE_GROUPS } from '../../types/social.types';
import { CHART_COLORS } from '../../constants/chartColors';

const COLORS = CHART_COLORS;

const PeerComparisonPanel: React.FC = () => {
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('');
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: peerComparison, isPending: peerLoading, refetch } = usePeerComparison(selectedAgeGroup);

  const handleFetch = () => {
    if (selectedAgeGroup) {
      refetch();
    }
  };

  return (
    <Card elevation="low">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary-500"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          同世代比較
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Select
                label="年代を選択"
                options={AGE_GROUPS.map((g) => ({ value: g.value, label: g.label }))}
                value={selectedAgeGroup}
                onChange={(e) => setSelectedAgeGroup(e.target.value)}
                placeholder="年代を選択"
              />
            </div>
            <Button
              variant="outline"
              size="md"
              onClick={handleFetch}
              loading={peerLoading}
              disabled={!selectedAgeGroup || peerLoading}
            >
              比較
            </Button>
          </div>

          {peerLoading && !peerComparison && (
            <div className="space-y-3 animate-pulse">
              <div className="flex items-center gap-2">
                <div className="h-5 w-24 bg-muted rounded" />
                <div className="h-5 w-16 bg-muted rounded" />
              </div>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between">
                      <div className="h-3 w-20 bg-muted rounded" />
                      <div className="h-3 w-10 bg-muted rounded" />
                    </div>
                    <div className="h-2 bg-muted rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {peerComparison && (
            <div className="space-y-4">
              {/* 統計情報 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {peerComparison.totalParticipants} 名が参加
                  </Badge>
                  <Badge variant="outline">
                    {AGE_GROUPS.find((g) => g.value === peerComparison.ageGroup)?.label || peerComparison.ageGroup}
                  </Badge>
                </div>
                {isAuthenticated && peerComparison.userRankPercentile != null && (
                  <PeerRankBadge percentile={peerComparison.userRankPercentile} />
                )}
              </div>

              {peerComparison.totalParticipants === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <p>まだこの年代の比較データがありません。</p>
                  <p className="mt-1">ポートフォリオを共有して最初の参加者になりましょう。</p>
                </div>
              ) : (
                /* 平均アロケーション */
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">
                    平均資産配分
                  </h4>
                  {peerComparison.averageAllocation.map((item, index) => (
                    <div key={item.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-foreground font-medium truncate mr-2">
                          {item.category}
                        </span>
                        <span className="text-muted-foreground tabular-nums font-mono shrink-0">
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(item.percentage, 100)}%`,
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!peerComparison && !peerLoading && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <p>年代を選択して同世代の投資家と比較しましょう。</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PeerComparisonPanel;
