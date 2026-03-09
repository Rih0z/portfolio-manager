/**
 * SharedPortfolio — 公開共有ポートフォリオページ
 *
 * /share/:shareId でアクセス可能な公開ページ。
 * 共有されたポートフォリオのアロケーション円グラフとスコアを表示。
 * 認証不要。CTA でサービス紹介。
 *
 * @file src/pages/SharedPortfolio.tsx
 */
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { getShareApi } from '../services/socialService';
import { trackEvent, AnalyticsEvents } from '../utils/analytics';
import { getErrorMessage } from '../utils/errorUtils';
import type { SharedPortfolio as SharedPortfolioType } from '../types/social.types';
import { AGE_GROUPS } from '../types/social.types';
import { CHART_COLORS } from '../constants/chartColors';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-md p-2 text-sm">
        <p className="font-medium text-foreground">{payload[0].payload.category}</p>
        <p className="text-muted-foreground tabular-nums font-mono">
          {payload[0].value.toFixed(1)}%
        </p>
      </div>
    );
  }
  return null;
};

const SharedPortfolio: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [share, setShare] = useState<SharedPortfolioType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShare = async () => {
      if (!shareId) {
        setError('共有IDが指定されていません');
        setLoading(false);
        return;
      }

      try {
        const data = await getShareApi(shareId);
        setShare(data);
        trackEvent(AnalyticsEvents.SHARE_VIEW, { shareId });
      } catch (err: unknown) {
        setError(getErrorMessage(err) || '共有ポートフォリオの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchShare();
  }, [shareId]);

  // スコアの色を決定
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success-500';
    if (score >= 60) return 'text-primary-500';
    if (score >= 40) return 'text-warning-500';
    return 'text-danger-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return '優秀';
    if (score >= 60) return '良好';
    if (score >= 40) return '普通';
    return '要改善';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 relative">
            <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative w-12 h-12 bg-card rounded-full flex items-center justify-center border border-border">
              <svg className="w-6 h-6 text-primary-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !share) {
    return (
      <div className="min-h-screen bg-background">
        <Helmet>
          <title>共有ポートフォリオ - PortfolioWise</title>
        </Helmet>
        <div className="max-w-lg mx-auto px-4 py-16">
          <Card elevation="medium" padding="large">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-danger-50 dark:bg-danger-500/10 rounded-full flex items-center justify-center border border-danger-200 dark:border-danger-500/20">
                <svg className="w-8 h-8 text-danger-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                共有ポートフォリオが見つかりません
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                {error || 'このリンクは期限切れか、存在しないポートフォリオです。'}
              </p>
              <Link to="/">
                <Button variant="primary">
                  PortfolioWise を始める
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const chartData = share.allocationSnapshot.map((item) => ({
    ...item,
    name: item.category,
    value: item.percentage,
  }));

  const ageGroupLabel = share.ageGroup
    ? AGE_GROUPS.find((g) => g.value === share.ageGroup)?.label || share.ageGroup
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{share.displayName} のポートフォリオ - PortfolioWise</title>
        <meta name="description" content={`${share.displayName}${ageGroupLabel ? `（${ageGroupLabel}）` : ''}の資産配分を確認 - PortfolioWise`} />
        <meta property="og:title" content={`${share.displayName} のポートフォリオ - PortfolioWise`} />
        <meta property="og:description" content={`${share.assetCount}銘柄、スコア${share.portfolioScore}点の投資ポートフォリオ`} />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* ヘッダー */}
      <div className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-foreground hover:text-primary-500 transition-colors">
            <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="font-semibold text-sm">PortfolioWise</span>
          </Link>
          <Badge variant="outline">共有ポートフォリオ</Badge>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* プロフィール */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-1">
            {share.displayName}
          </h1>
          <div className="flex items-center justify-center gap-2">
            {ageGroupLabel && <Badge variant="secondary">{ageGroupLabel}</Badge>}
            <Badge variant="outline">{share.assetCount} 銘柄</Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(share.createdAt).toLocaleDateString('ja-JP')} 共有
            </span>
          </div>
        </div>

        {/* スコア */}
        <Card elevation="medium" padding="medium">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">ポートフォリオスコア</p>
            <div className="flex items-center justify-center gap-3">
              <span className={`text-5xl font-bold tabular-nums font-mono ${getScoreColor(share.portfolioScore)}`}>
                {share.portfolioScore}
              </span>
              <div className="text-left">
                <span className="text-sm text-muted-foreground">/ 100</span>
                <p className={`text-sm font-medium ${getScoreColor(share.portfolioScore)}`}>
                  {getScoreLabel(share.portfolioScore)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* 円グラフ */}
        <Card elevation="medium" padding="medium">
          <CardHeader>
            <CardTitle>資産配分</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="category"
                    label={({ category, percentage }) =>
                      `${category} ${percentage.toFixed(1)}%`
                    }
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {chartData.map((_entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* 凡例テーブル */}
            <div className="mt-4 space-y-1.5">
              {share.allocationSnapshot.map((item, index) => (
                <div
                  key={item.category}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{
                        backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                      }}
                    />
                    <span className="text-foreground truncate">{item.category}</span>
                  </div>
                  <span className="text-muted-foreground tabular-nums font-mono shrink-0 ml-2">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card
          elevation="medium"
          padding="large"
          className="bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-950 dark:to-primary-900/50 border-primary-200 dark:border-primary-800"
        >
          <div className="text-center space-y-4">
            <h2 className="text-xl font-bold text-foreground">
              あなたのポートフォリオも分析してみませんか?
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              PortfolioWise は、資産配分の可視化、投資シミュレーション、
              同世代比較など、投資管理に必要な機能を無料で提供します。
            </p>
            <Link
              to="/"
              onClick={() => trackEvent(AnalyticsEvents.SHARE_CTA_CLICK, { shareId })}
            >
              <Button variant="primary" size="lg" className="mt-2">
                無料で始める
              </Button>
            </Link>
          </div>
        </Card>

        {/* フッター */}
        <div className="text-center text-xs text-muted-foreground pb-8">
          <p>このページは PortfolioWise ユーザーによって共有されました。</p>
          {share.expiresAt && (
            <p className="mt-1">
              リンク有効期限: {new Date(share.expiresAt).toLocaleDateString('ja-JP')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SharedPortfolio;
