/**
 * 料金プランページ
 *
 * Free / Standard プランの比較カードを表示し、
 * Stripe Checkout へのリダイレクトを提供する。
 *
 * @file src/pages/Pricing.tsx
 */
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { trackEvent, AnalyticsEvents } from '../utils/analytics';
import { useSubscriptionStore } from '../stores/subscriptionStore';

const CheckIcon = () => (
  <svg className="w-5 h-5 text-success-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const CrossIcon = () => (
  <svg className="w-5 h-5 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface FeatureRow {
  label: string;
  free: string;
  standard: string;
  freeAvailable: boolean;
  standardAvailable: boolean;
}

const features: FeatureRow[] = [
  { label: '保有銘柄数', free: '5件まで', standard: '無制限', freeAvailable: true, standardAvailable: true },
  { label: '市場データ取得', free: '3回/日', standard: 'リアルタイム', freeAvailable: true, standardAvailable: true },
  { label: 'シミュレーション', free: '3回/月', standard: '無制限', freeAvailable: true, standardAvailable: true },
  { label: 'AIプロンプト生成', free: '1回/月', standard: '無制限', freeAvailable: true, standardAvailable: true },
  { label: 'PFスコア', free: '基本3指標', standard: '詳細8指標', freeAvailable: true, standardAvailable: true },
  { label: 'エクスポート', free: 'CSV', standard: 'CSV + JSON + PDF', freeAvailable: true, standardAvailable: true },
  { label: 'Driveバックアップ', free: '手動', standard: '自動（日次）', freeAvailable: true, standardAvailable: true },
  { label: '広告非表示', free: '', standard: '', freeAvailable: false, standardAvailable: true },
];

const Pricing: React.FC = () => {
  useEffect(() => { trackEvent(AnalyticsEvents.PRICING_VIEW); }, []);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const { planType, startCheckout, openPortal, loading } = useSubscriptionStore();

  const isCurrentPlan = (plan: string) => planType === plan;
  const monthlyPrice = 700;
  const annualPrice = 7000;
  const displayPrice = billingPeriod === 'monthly' ? monthlyPrice : annualPrice;
  const periodLabel = billingPeriod === 'monthly' ? '/月' : '/年';
  const annualSavings = (monthlyPrice * 12) - annualPrice;

  const handleUpgrade = () => {
    if (!isAuthenticated) {
      window.location.href = '/';
      return;
    }
    startCheckout(billingPeriod);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">料金プラン</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          あなたの投資スタイルに合ったプランを選択してください
        </p>
      </div>

      {/* 課金期間切替 */}
      <div className="flex items-center justify-center mb-8">
        <div className="bg-muted rounded-xl p-1 flex">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              billingPeriod === 'monthly'
                ? 'bg-primary-500 text-white shadow-lg'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            月額
          </button>
          <button
            onClick={() => setBillingPeriod('annual')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              billingPeriod === 'annual'
                ? 'bg-primary-500 text-white shadow-lg'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            年額
            <span className="ml-1 text-xs text-success-500">
              ¥{annualSavings.toLocaleString()}お得
            </span>
          </button>
        </div>
      </div>

      {/* プランカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Free プラン */}
        <div className={`bg-card border rounded-2xl p-6 ${
          isCurrentPlan('free') ? 'border-primary-500/50' : 'border-border'
        }`}>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-foreground">Free</h2>
            <p className="text-muted-foreground text-sm mt-1">基本的なポートフォリオ管理</p>
          </div>
          <div className="mb-6">
            <span className="text-3xl font-bold text-foreground">¥0</span>
            <span className="text-muted-foreground text-sm">/永久</span>
          </div>
          {isCurrentPlan('free') ? (
            <div className="w-full py-3 rounded-xl bg-accent text-muted-foreground text-center font-medium text-sm">
              現在のプラン
            </div>
          ) : (
            <div className="w-full py-3 rounded-xl bg-accent text-muted-foreground text-center font-medium text-sm">
              Free プラン
            </div>
          )}
          <ul className="mt-6 space-y-3">
            {features.map((f) => (
              <li key={f.label} className="flex items-start gap-3 text-sm">
                {f.freeAvailable ? <CheckIcon /> : <CrossIcon />}
                <div>
                  <span className="text-foreground">{f.label}</span>
                  {f.free && <span className="text-muted-foreground ml-1">— {f.free}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Standard プラン */}
        <div className={`bg-card border rounded-2xl p-6 relative ${
          isCurrentPlan('standard') ? 'border-primary-500' : 'border-primary-500/30'
        }`}>
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            おすすめ
          </div>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-foreground">Standard</h2>
            <p className="text-muted-foreground text-sm mt-1">本格的な投資分析ツール</p>
          </div>
          <div className="mb-6">
            <span className="text-3xl font-bold text-primary-500">¥{displayPrice.toLocaleString()}</span>
            <span className="text-muted-foreground text-sm">{periodLabel}</span>
          </div>
          {isCurrentPlan('standard') ? (
            <button
              onClick={() => openPortal()}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-accent text-foreground font-medium text-sm hover:bg-muted transition-colors disabled:opacity-50"
            >
              {loading ? '読み込み中...' : 'プランを管理'}
            </button>
          ) : (
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary-500 text-white font-medium text-sm hover:bg-primary-600 transition-all shadow-lg hover:shadow-glow disabled:opacity-50"
            >
              {loading ? '読み込み中...' : 'アップグレード'}
            </button>
          )}
          <ul className="mt-6 space-y-3">
            {features.map((f) => (
              <li key={f.label} className="flex items-start gap-3 text-sm">
                <CheckIcon />
                <div>
                  <span className="text-foreground">{f.label}</span>
                  {f.standard && <span className="text-primary-500 ml-1">— {f.standard}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* FAQ / 注記 */}
      <div className="text-center text-muted-foreground/70 text-xs space-y-1">
        <p>価格はすべて税込です。Stripeによる安全な決済処理を使用しています。</p>
        <p>いつでもキャンセル可能です。解約後も請求期間終了まで Standard 機能をご利用いただけます。</p>
      </div>
    </div>
  );
};

export default Pricing;
