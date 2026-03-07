/**
 * ランディングページ
 *
 * 未認証ユーザー向けのマーケティング / コンバージョンページ。
 * 認証済みユーザーは /dashboard へ自動リダイレクト。
 *
 * セクション構成:
 *  1. Hero — キャッチコピー + Google Login CTA
 *  2. Pain — 3つのペインカード（課題共感）
 *  3. Solution — スクショ付き3つの解決策
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
const CrossIcon = () => (
  <svg className="w-5 h-5 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
        {/* ───────── 1. Hero ───────── */}
        <section className="text-center py-12 sm:py-20 lg:py-28">
          <Badge variant="default" className="mb-4">
            {t('landing.heroBadge', '無料で始められる')}
          </Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground leading-tight mb-4">
            {t('landing.heroTitle', '資産の全体像が、')}
            <br />
            <span className="bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              {t('landing.heroTitleAccent', '1分でわかる')}
            </span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto mb-8">
            {t(
              'landing.heroDescription',
              'CSVインポートで保有銘柄を取り込むだけ。損益ダッシュボード・PFスコア・AIプロンプトであなたの投資判断をサポートします。'
            )}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <OAuthLoginButton />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {t('landing.heroCreditCard', 'クレジットカード不要 — 永久無料プランあり')}
          </p>
        </section>

        {/* ───────── 2. Pain（課題共感）───────── */}
        <section className="py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-4">
            {t('landing.painTitle', 'こんな悩み、ありませんか？')}
          </h2>
          <p className="text-muted-foreground text-center mb-10 max-w-xl mx-auto">
            {t('landing.painSubtitle', '個人投資家が抱えるよくある課題')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                title: t('landing.pain1Title', '入力が面倒すぎる'),
                desc: t('landing.pain1Desc', '証券口座ごとにログインして手動で記録…。面倒で続かない。'),
                emoji: '😩',
              },
              {
                title: t('landing.pain2Title', '儲かってるか分からない'),
                desc: t('landing.pain2Desc', '含み益・含み損がバラバラで、全体の損益が把握できない。'),
                emoji: '😵',
              },
              {
                title: t('landing.pain3Title', 'ツールが使いにくい'),
                desc: t('landing.pain3Desc', '既存のアプリはデザインが古く、操作が複雑で直感的でない。'),
                emoji: '😤',
              },
            ].map((pain) => (
              <Card key={pain.title} hoverable padding="large">
                <div className="text-4xl mb-3">{pain.emoji}</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{pain.title}</h3>
                <p className="text-sm text-muted-foreground">{pain.desc}</p>
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
                desc: t('landing.solution3Desc', 'ポートフォリオデータを元にAI分析プロンプトを自動生成。戦略立案を加速。'),
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
        <section className="py-12 sm:py-16 bg-muted/30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 rounded-2xl">
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
        <section className="py-12 sm:py-16">
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
