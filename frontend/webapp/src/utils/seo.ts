/**
 * SEOメタデータ定義
 *
 * 各ルートに対応する title / description / OGP 情報を一元管理。
 * SEOHead コンポーネントから参照される。
 *
 * @file src/utils/seo.ts
 */

export interface SEOMeta {
  title: string;
  description: string;
  ogType?: 'website' | 'article';
  noindex?: boolean;
}

const SITE_NAME = 'PortfolioWise';
const BASE_URL = 'https://portfolio-wise.com';
const OG_IMAGE = `${BASE_URL}/og-image.png`;

export const SEO_DEFAULTS = {
  siteName: SITE_NAME,
  baseUrl: BASE_URL,
  ogImage: OG_IMAGE,
  locale: 'ja_JP',
  twitterCard: 'summary_large_image' as const,
};

export const SEO_BY_ROUTE: Record<string, SEOMeta> = {
  '/': {
    title: `${SITE_NAME} — 分散投資の全体像が、ひとつの画面で完結`,
    description:
      'CSVインポートで簡単にポートフォリオを可視化。損益ダッシュボード・PFスコア・AIプロンプトで投資判断をサポート。無料で始められます。',
    ogType: 'website',
  },
  '/pricing': {
    title: `料金プラン | ${SITE_NAME}`,
    description:
      'PortfolioWise の Free / Standard プラン比較。月額700円で無制限の銘柄管理・リアルタイムデータ・AIプロンプト生成。',
  },
  '/dashboard': {
    title: `ダッシュボード | ${SITE_NAME}`,
    description: 'ポートフォリオの資産総額・損益・配分をリアルタイムで確認。',
    noindex: true,
  },
  '/ai-advisor': {
    title: `AI投資戦略 | ${SITE_NAME}`,
    description: 'AIを活用した投資戦略プロンプトを生成。',
    noindex: true,
  },
  '/settings': {
    title: `設定 | ${SITE_NAME}`,
    description: 'ポートフォリオ設定・AI分析設定・データ管理。',
    noindex: true,
  },
  '/simulation': {
    title: `投資配分シミュレーション | ${SITE_NAME}`,
    description: '追加投資の最適配分をシミュレーション。',
    noindex: true,
  },
  '/data': {
    title: `データ管理 | ${SITE_NAME}`,
    description: 'CSV/JSONインポート・エクスポート・Google Drive連携。',
    noindex: true,
  },
  '/data-import': {
    title: `データ取り込み | ${SITE_NAME}`,
    description: 'CSV/JSONファイルからポートフォリオデータをインポート。',
    noindex: true,
  },
  '/legal/terms': {
    title: `利用規約 | ${SITE_NAME}`,
    description: 'PortfolioWise サービス利用規約。',
  },
  '/legal/privacy': {
    title: `プライバシーポリシー | ${SITE_NAME}`,
    description: 'PortfolioWise のプライバシーポリシー。個人情報の取り扱いについて。',
  },
  '/legal/kkkr': {
    title: `特定商取引法に基づく表記 | ${SITE_NAME}`,
    description: '特定商取引法に基づく表記。',
  },
  '/legal/disclaimer': {
    title: `免責事項 | ${SITE_NAME}`,
    description: 'PortfolioWise の免責事項。投資判断はご自身の責任で行ってください。',
  },
};

/**
 * パスに対応する SEO メタデータを取得する。
 * 一致がなければランディングページのデフォルトを返す。
 */
export const getSEOMeta = (pathname: string): SEOMeta => {
  return SEO_BY_ROUTE[pathname] ?? SEO_BY_ROUTE['/']!;
};
