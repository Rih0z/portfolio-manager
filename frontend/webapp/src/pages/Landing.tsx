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
import {
  TrendingUp,
  Upload,
  Brain,
  BarChart3,
  ShieldCheck,
  Check,
  ClipboardList,
  HelpCircle,
  LayoutGrid,
  Cloud,
  CircleDollarSign,
  CreditCard,
  Server,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { trackEvent } from '../utils/analytics';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import SEOHead from '../components/seo/SEOHead';
import OAuthLoginButton from '../components/auth/OAuthLoginButton';
import ReferralBanner from '../components/referral/ReferralBanner';

// ─── コンポーネント ──────────────────────────────
const Landing: React.FC = () => {
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
            無料で始められる
          </Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground leading-tight mb-4">
            分散投資の全体像が、
            <br />
            <span className="bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
              ひとつの画面で完結
            </span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto mb-8">
            証券会社のCSVをインポートするだけ。日米株・投資信託を一元管理し、損益・配分・リバランスをリアルタイムで把握できます。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <OAuthLoginButton />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            クレジットカード不要 — 永久無料プランあり
          </p>

          {/* スタッツバー */}
          <div className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-4">
            {[
              { value: '日米株・投信', label: '対応資産クラス' },
              { value: 'SBI・楽天', label: 'CSV対応証券口座' },
              { value: '8指標', label: 'PFスコア採点' },
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
            こんな状況、心当たりはありませんか
          </h2>
          <p className="text-muted-foreground text-center mb-10 max-w-xl mx-auto">
            複数口座で日米分散投資をしている方が抱えがちな課題
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                Icon: ClipboardList,
                title: '口座ごとにバラバラで把握できない',
                desc: 'SBI・楽天・米国口座と複数に分散していて、全体の評価額と損益を手作業で集計している。',
              },
              {
                Icon: HelpCircle,
                title: 'リバランスの計算が面倒',
                desc: '目標配分との乖離は感覚でしかわからず、追加投資のたびにスプレッドシートで試算が必要。',
              },
              {
                Icon: LayoutGrid,
                title: '既存ツールは使いにくい',
                desc: 'マネーフォワードは銀行口座連携前提で重い。証券会社のツールは自社口座しか見られない。',
              },
            ].map((pain) => (
              <Card key={pain.title} hoverable padding="large">
                <div className="w-10 h-10 mb-3 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                  <pain.Icon size={24} strokeWidth={1.5} />
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
            PortfolioWise が解決します
          </h2>
          <p className="text-muted-foreground text-center mb-10 max-w-xl mx-auto">
            シンプルな3ステップで、投資管理がラクになる
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                Icon: Upload,
                step: 'STEP 1',
                title: 'CSVインポート',
                desc: '証券口座からCSVをダウンロードしてアップロードするだけ。数秒で保有銘柄を反映。',
              },
              {
                Icon: TrendingUp,
                step: 'STEP 2',
                title: '損益ダッシュボード',
                desc: '総資産・損益・配分比率を一目で確認。通貨の異なる資産もまとめて可視化。',
              },
              {
                Icon: Brain,
                step: 'STEP 3',
                title: 'AIで分析',
                desc: 'ポートフォリオデータを元にAI分析プロンプトを自動生成。ChatGPT/Claudeへそのままコピペ。',
              },
            ].map((sol) => (
              <Card key={sol.title} hoverable padding="large" className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 bg-primary-50 dark:bg-primary-500/10 rounded-xl flex items-center justify-center">
                  <sol.Icon size={32} strokeWidth={1.5} className="text-primary-500" />
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
            主要機能
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                Icon: BarChart3,
                title: 'PFスコア',
                desc: '分散度・コスト・配当・リスクなど最大8指標でポートフォリオを採点。',
              },
              {
                Icon: Brain,
                title: 'AIプロンプト生成',
                desc: '保有銘柄データを元に、ChatGPT/Claude向けの投資分析プロンプトを生成。',
              },
              {
                Icon: TrendingUp,
                title: '投資配分シミュレーション',
                desc: '追加投資の最適配分を計算。目標ポートフォリオとのギャップを自動調整。',
              },
              {
                Icon: Upload,
                title: 'CSV / JSON インポート',
                desc: '主要証券口座のCSVに対応。JSON形式での一括インポートも可能。',
              },
              {
                Icon: Cloud,
                title: 'Google Drive バックアップ',
                desc: 'ポートフォリオデータをGoogle Driveに自動バックアップ。デバイス間同期も簡単。',
              },
              {
                Icon: CircleDollarSign,
                title: '多通貨対応',
                desc: 'JPY/USDの同時管理。為替レートを自動取得し、円建て・ドル建てを切替表示。',
              },
            ].map((feat) => (
              <Card key={feat.title} padding="medium">
                <div className="w-12 h-12 mb-3 bg-primary-50 dark:bg-primary-500/10 rounded-lg flex items-center justify-center">
                  <feat.Icon size={32} strokeWidth={1.5} className="text-primary-500" />
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
            安心のセキュリティ
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto text-center">
            {[
              {
                Icon: ShieldCheck,
                title: 'Google OAuth 認証',
                desc: 'パスワード不要。Googleアカウントで安全にログイン。',
              },
              {
                Icon: CreditCard,
                title: 'Stripe 決済',
                desc: '世界標準の決済プラットフォーム。カード情報は当社サーバーに保存されません。',
              },
              {
                Icon: Server,
                title: 'AWS インフラ',
                desc: 'APIはAWS Lambda + DynamoDBで運用。高可用性と暗号化通信を担保。',
              },
            ].map((trust) => (
              <Card key={trust.title} padding="large" className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 bg-success-50 dark:bg-success-500/10 rounded-xl flex items-center justify-center">
                  <trust.Icon size={32} strokeWidth={1.5} className="text-success-500" />
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
            シンプルな料金体系
          </h2>
          <p className="text-muted-foreground text-center mb-10 max-w-xl mx-auto">
            まずは無料で。必要になったらアップグレード。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free */}
            <Card padding="large" className="border-border">
              <h3 className="text-xl font-bold text-foreground mb-1">Free</h3>
              <p className="text-sm text-muted-foreground mb-4">基本的なポートフォリオ管理</p>
              <div className="mb-6">
                <span className="text-3xl font-bold text-foreground">¥0</span>
                <span className="text-muted-foreground text-sm"> / 永久</span>
              </div>
              <ul className="space-y-2 text-sm">
                {[
                  '保有銘柄 5件まで',
                  '市場データ 3回/日',
                  'AIプロンプト 1回/月',
                  'PFスコア 基本3指標',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check size={20} strokeWidth={2} className="text-success-500 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Standard */}
            <Card padding="large" className="border-primary-500/50 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                おすすめ
              </div>
              <h3 className="text-xl font-bold text-foreground mb-1">Standard</h3>
              <p className="text-sm text-muted-foreground mb-4">本格的な投資分析ツール</p>
              <div className="mb-6">
                <span className="text-3xl font-bold text-primary-500">¥700</span>
                <span className="text-muted-foreground text-sm"> / 月</span>
              </div>
              <ul className="space-y-2 text-sm">
                {[
                  '保有銘柄 無制限',
                  'リアルタイム市場データ',
                  'AIプロンプト 無制限',
                  'PFスコア 詳細8指標',
                  '広告非表示',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check size={20} strokeWidth={2} className="text-success-500 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
          <div className="text-center mt-6">
            <Link to="/pricing">
              <Button variant="outline" size="md">
                料金プランを詳しく見る
              </Button>
            </Link>
          </div>
        </section>

        {/* ───────── 7. FAQ ───────── */}
        <section className="py-12 sm:py-16 max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-10">
            よくある質問
          </h2>
          <div className="space-y-6">
            {[
              {
                q: 'PortfolioWise は投資助言サービスですか？',
                a: 'いいえ。PortfolioWise はポートフォリオ可視化ツールであり、投資助言・推奨は一切行いません。投資判断はご自身の責任で行ってください。',
              },
              {
                q: '対応している証券口座は？',
                a: 'CSV/JSON形式でエクスポートできる証券口座であれば対応可能です。SBI証券・楽天証券・マネックス証券等の主要口座で動作確認済みです。',
              },
              {
                q: 'データは安全ですか？',
                a: 'ポートフォリオデータはGoogle Driveのアプリ専用フォルダに保存されます。当社サーバーには一時的なキャッシュのみ保持し、暗号化通信(TLS)で保護しています。',
              },
              {
                q: '解約はいつでもできますか？',
                a: 'はい。Standard プランはいつでもキャンセル可能です。解約後も請求期間終了まで Standard 機能をご利用いただけます。',
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
            今すぐ無料で始める
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            クレジットカード不要。Googleアカウントだけで、すぐに使い始められます。
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
