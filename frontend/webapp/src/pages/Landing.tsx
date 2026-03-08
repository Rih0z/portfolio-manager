/**
 * ランディングページ
 *
 * 未認証ユーザー向けのマーケティング / コンバージョンページ。
 * 認証済みユーザーは /dashboard へ自動リダイレクト。
 *
 * セクション構成:
 *  1. Hero — キャッチコピー + Google Login CTA + スタッツバー
 *  2. Pain — 3つのペインカード（課題共感）
 *  3. Solution — 3つの解決策
 *  4. Features — PFスコア・AIプロンプト・ゴール管理
 *  5. Trust — Google OAuth + Stripe + AWS
 *  6. Pricing — Free vs Standard 比較（/pricing 誘導）
 *  7. FAQ
 *  8. CTA — 最終コンバージョン
 *
 * @file src/pages/Landing.tsx
 */
import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { trackEvent } from '../utils/analytics';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import SEOHead from '../components/seo/SEOHead';
import OAuthLoginButton from '../components/auth/OAuthLoginButton';
import ReferralBanner from '../components/referral/ReferralBanner';

// ─── アイコン SVG ────────────────────────────────
const ChartIcon = () => (
  <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);
const UploadIcon = () => (
  <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);
const BrainIcon = () => (
  <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);
const TargetIcon = () => (
  <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const ShieldIcon = () => (
  <svg className="w-8 h-8 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const CheckIcon = () => (
  <svg className="w-5 h-5 text-success-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// ペインセクション用アイコン（プロフェッショナルなモノクロSVG）
const PainIcon1 = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);
const PainIcon2 = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const PainIcon3 = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

// ─── コンポーネント ──────────────────────────────
const Landing: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  // 認証済みユーザーは /dashboard へリダイレクト
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Analytics
  useEffect(() => {
    trackEvent('landing_view');
  }, []);

  // 認証済みなら何も表示しない（リダイレクト中）
  if (isAuthenticated) return null;

  return (
    <>
      <SEOHead />

      <div data-testid="landing-page" className="px-4 sm:px-6 lg:px-8">
        {/* ───────── Referral Banner ───────── */}
        <ReferralBanner />

        {/* ───────── 1. Hero ───────── */}
        <section className="text-center py-12 sm:py-20 lg:py-28">
          <Badge variant="default" className="mb-4">
            {t('landing.heroBadge', '無料で始められる')}
          </Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground leading-tight mb-4">
            {t('landing.heroTitle', '分散投資の全体像が、')}
            <br />
            <span className="bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
              {t('landing.heroTitleAccent', 'ひとつの画面で完結')}
            </span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto mb-8">
            {t(
              'landing.heroDescription',
              '証券会社のCSVをインポートするだけ。日米株・投資信託を一元管理し、損益・配分・リバランスをリアルタイムで把握できます。'
            )}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <OAuthLoginButton />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {t('landing.heroCreditCard', 'クレジットカード不要 — 永久無料プランあり')}
          </p>

          {/* スタッツバー */}
          <div className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-4">
            {[
              { value: '日米株・投信', label: t('landing.stat1', '対応資産クラス') },
              { value: 'SBI・楽天', label: t('landing.stat2', 'CSV対応証券口座') },
              { value: '8指標', label: t('landing.stat3', 'PFスコア採点') },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-foreground font-mono">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ───────── 2. Pain（課題共感）───────── */}
        <section className="py-12 sm:py-16 bg-muted/40 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 rounded-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-4">
            {t('landing.painTitle', 'こんな状況、心当たりはありませんか')}
          </h2>
          <p className="text-muted-foreground text-center mb-10 max-w-xl mx-auto">
            {t('landing.painSubtitle', '複数口座で日米分散投資をしている方が抱えがちな課題')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: <PainIcon1 />,
                title: t('landing.pain1Title', '口座ごとにバラバラで把握できない'),
                desc: t('landing.pain1Desc', 'SBI・楽天・米国口座と複数に分散していて、全体の評価額と損益を手作業で集計している。'),
              },
              {
                icon: <PainIcon2 />,
                title: t('landing.pain2Title', 'リバランスの計算が面倒'),
                desc: t('landing.pain2Desc', '目標配分との乖離は感覚でしかわからず、追加投資のたびにスプレッドシートで試算が必要。'),
              },
              {
                icon: <PainIcon3 />,
                title: t('landing.pain3Title', '既存ツールは使いにくい'),
                desc: t('landing.pain3Desc', 'マネーフォワードは銀行口座連携前提で重い。証券会社のツールは自社口座しか見られない。'),
              },
            ].map((pain) => (
              <Card key={pain.title} hoverable padding="large">
                <div className="w-10 h-10 mb-3 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                  {pain.icon}
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{pain.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{pain.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* ───────── 3. Solution ───────── */}
        <section className="py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-4">
            {t('landing.solutionTitle', 'PortfolioWise が解決します')}
          </h2>
          <p className="text-muted-foreground text-center mb-10 max-w-xl mx-auto">
            {t('landing.solutionSubtitle', 'シンプルな3ステップで、投資管理がラクになる')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: <UploadIcon />,
                step: t('landing.solution1Step', 'STEP 1'),
                title: t('landing.solution1Title', 'CSVインポート'),
                desc: t('landing.solution1Desc', '証券口座からCSVをダウンロードしてアップロードするだけ。数秒で保有銘柄を反映。'),
              },
              {
                icon: <ChartIcon />,
                step: t('landing.solution2Step', 'STEP 2'),
                title: t('landing.solution2Title', '損益ダッシュボード'),
                desc: t('landing.solution2Desc', '総資産・損益・配分比率を一目で確認。通貨の異なる資産もまとめて可視化。'),
              },
              {
                icon: <BrainIcon />,
                step: t('landing.solution3Step', 'STEP 3'),
                title: t('landing.solution3Title', 'AIで分析'),
                desc: t('landing.solution3Desc', 'ポートフォリオデータを元にAI分析プロンプトを自動生成。ChatGPT/Claudeへそのままコピペ。'),
              },
            ].map((sol) => (
              <Card key={sol.title} hoverable padding="large" className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 bg-primary-50 dark:bg-primary-500/10 rounded-xl flex items-center justify-center">
                  {sol.icon}
                </div>
                <Badge variant="secondary" className="mb-2">{sol.step}</Badge>
                <h3 className="text-lg font-semibold text-foreground mb-2">{sol.title}</h3>
                <p className="text-sm text-muted-foreground">{sol.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* ───────── 4. Features ───────── */}
        <section className="py-12 sm:py-16 bg-muted/50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 rounded-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-10">
            {t('landing.featuresTitle', '主要機能')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: <TargetIcon />,
                title: t('landing.feature1Title', 'PFスコア'),
                desc: t('landing.feature1Desc', '分散度・コスト・配当・リスクなど最大8指標でポートフォリオを採点。'),
              },
              {
                icon: <BrainIcon />,
                title: t('landing.feature2Title', 'AIプロンプト生成'),
                desc: t('landing.feature2Desc', '保有銘柄データを元に、ChatGPT/Claude向けの投資分析プロンプトを生成。'),
              },
              {
                icon: <ChartIcon />,
                title: t('landing.feature3Title', '投資配分シミュレーション'),
                desc: t('landing.feature3Desc', '追加投資の最適配分を計算。目標ポートフォリオとのギャップを自動調整。'),
              },
              {
                icon: <UploadIcon />,
                title: t('landing.feature4Title', 'CSV / JSON インポート'),
                desc: t('landing.feature4Desc', '主要証券口座のCSVに対応。JSON形式での一括インポートも可能。'),
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                ),
                title: t('landing.feature5Title', 'Google Drive バックアップ'),
                desc: t('landing.feature5Desc', 'ポートフォリオデータをGoogle Driveに自動バックアップ。デバイス間同期も簡単。'),
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: t('landing.feature6Title', '多通貨対応'),
                desc: t('landing.feature6Desc', 'JPY/USDの同時管理。為替レートを自動取得し、円建て・ドル建てを切替表示。'),
              },
            ].map((feat) => (
              <Card key={feat.title} padding="medium">
                <div className="w-12 h-12 mb-3 bg-primary-50 dark:bg-primary-500/10 rounded-lg flex items-center justify-center">
                  {feat.icon}
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">{feat.title}</h3>
                <p className="text-sm text-muted-foreground">{feat.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* ───────── 5. Trust ───────── */}
        <section className="py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-10">
            {t('landing.trustTitle', '安心のセキュリティ')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto text-center">
            {[
              {
                icon: <ShieldIcon />,
                title: t('landing.trust1Title', 'Google OAuth 認証'),
                desc: t('landing.trust1Desc', 'パスワード不要。Googleアカウントで安全にログイン。'),
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                ),
                title: t('landing.trust2Title', 'Stripe 決済'),
                desc: t('landing.trust2Desc', '世界標準の決済プラットフォーム。カード情報は当社サーバーに保存されません。'),
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                  </svg>
                ),
                title: t('landing.trust3Title', 'AWS インフラ'),
                desc: t('landing.trust3Desc', 'APIはAWS Lambda + DynamoDBで運用。高可用性と暗号化通信を担保。'),
              },
            ].map((trust) => (
              <Card key={trust.title} padding="large" className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 bg-success-50 dark:bg-success-500/10 rounded-xl flex items-center justify-center">
                  {trust.icon}
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">{trust.title}</h3>
                <p className="text-sm text-muted-foreground">{trust.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* ───────── 6. Pricing ───────── */}
        <section className="py-12 sm:py-16 bg-muted/40 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 rounded-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-4">
            {t('landing.pricingTitle', 'シンプルな料金体系')}
          </h2>
          <p className="text-muted-foreground text-center mb-10 max-w-xl mx-auto">
            {t('landing.pricingSubtitle', 'まずは無料で。必要になったらアップグレード。')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free */}
            <Card padding="large" className="border-border">
              <h3 className="text-xl font-bold text-foreground mb-1">Free</h3>
              <p className="text-sm text-muted-foreground mb-4">{t('landing.pricingFreeDesc', '基本的なポートフォリオ管理')}</p>
              <div className="mb-6">
                <span className="text-3xl font-bold text-foreground">¥0</span>
                <span className="text-muted-foreground text-sm"> / {t('landing.pricingForever', '永久')}</span>
              </div>
              <ul className="space-y-2 text-sm">
                {[
                  t('landing.pricingFree1', '保有銘柄 5件まで'),
                  t('landing.pricingFree2', '市場データ 3回/日'),
                  t('landing.pricingFree3', 'AIプロンプト 1回/月'),
                  t('landing.pricingFree4', 'PFスコア 基本3指標'),
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2"><CheckIcon /><span>{item}</span></li>
                ))}
              </ul>
            </Card>

            {/* Standard */}
            <Card padding="large" className="border-primary-500/50 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                {t('landing.pricingRecommended', 'おすすめ')}
              </div>
              <h3 className="text-xl font-bold text-foreground mb-1">Standard</h3>
              <p className="text-sm text-muted-foreground mb-4">{t('landing.pricingStandardDesc', '本格的な投資分析ツール')}</p>
              <div className="mb-6">
                <span className="text-3xl font-bold text-primary-500">¥700</span>
                <span className="text-muted-foreground text-sm"> / {t('landing.pricingMonth', '月')}</span>
              </div>
              <ul className="space-y-2 text-sm">
                {[
                  t('landing.pricingStandard1', '保有銘柄 無制限'),
                  t('landing.pricingStandard2', 'リアルタイム市場データ'),
                  t('landing.pricingStandard3', 'AIプロンプト 無制限'),
                  t('landing.pricingStandard4', 'PFスコア 詳細8指標'),
                  t('landing.pricingStandard5', '広告非表示'),
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2"><CheckIcon /><span>{item}</span></li>
                ))}
              </ul>
            </Card>
          </div>
          <div className="text-center mt-6">
            <Link to="/pricing">
              <Button variant="outline" size="md">
                {t('landing.pricingCTA', '料金プランを詳しく見る')}
              </Button>
            </Link>
          </div>
        </section>

        {/* ───────── 7. FAQ ───────── */}
        <section className="py-12 sm:py-16 max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-10">
            {t('landing.faqTitle', 'よくある質問')}
          </h2>
          <div className="space-y-6">
            {[
              {
                q: t('landing.faq1Q', 'PortfolioWise は投資助言サービスですか？'),
                a: t('landing.faq1A', 'いいえ。PortfolioWise はポートフォリオ可視化ツールであり、投資助言・推奨は一切行いません。投資判断はご自身の責任で行ってください。'),
              },
              {
                q: t('landing.faq2Q', '対応している証券口座は？'),
                a: t('landing.faq2A', 'CSV/JSON形式でエクスポートできる証券口座であれば対応可能です。SBI証券・楽天証券・マネックス証券等の主要口座で動作確認済みです。'),
              },
              {
                q: t('landing.faq3Q', 'データは安全ですか？'),
                a: t('landing.faq3A', 'ポートフォリオデータはGoogle Driveのアプリ専用フォルダに保存されます。当社サーバーには一時的なキャッシュのみ保持し、暗号化通信(TLS)で保護しています。'),
              },
              {
                q: t('landing.faq4Q', '解約はいつでもできますか？'),
                a: t('landing.faq4A', 'はい。Standard プランはいつでもキャンセル可能です。解約後も請求期間終了まで Standard 機能をご利用いただけます。'),
              },
            ].map((faq) => (
              <Card key={faq.q} padding="medium">
                <h3 className="text-base font-semibold text-foreground mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* ───────── 8. Final CTA ───────── */}
        <section className="py-12 sm:py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            {t('landing.ctaTitle', '今すぐ無料で始める')}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            {t('landing.ctaDescription', 'クレジットカード不要。Googleアカウントだけで、すぐに使い始められます。')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <OAuthLoginButton />
          </div>
        </section>
      </div>
    </>
  );
};

export default Landing;
