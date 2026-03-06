/**
 * SEO Helmet ラッパーコンポーネント
 *
 * react-helmet-async の <Helmet> をラップし、
 * ルートに応じた title / description / OGP / canonical を自動設定する。
 *
 * @file src/components/seo/SEOHead.tsx
 */
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { getSEOMeta, SEO_DEFAULTS } from '../../utils/seo';

interface SEOHeadProps {
  /** タイトルを上書きする場合に指定 */
  title?: string;
  /** description を上書きする場合に指定 */
  description?: string;
  /** noindex を強制する場合に true */
  noindex?: boolean;
}

const SEOHead: React.FC<SEOHeadProps> = ({ title, description, noindex }) => {
  const { pathname } = useLocation();
  const meta = getSEOMeta(pathname);

  const pageTitle = title ?? meta.title;
  const pageDescription = description ?? meta.description;
  const shouldNoindex = noindex ?? meta.noindex;
  const canonical = `${SEO_DEFAULTS.baseUrl}${pathname}`;

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <link rel="canonical" href={canonical} />

      {/* OGP */}
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:type" content={meta.ogType ?? 'website'} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={SEO_DEFAULTS.ogImage} />
      <meta property="og:site_name" content={SEO_DEFAULTS.siteName} />
      <meta property="og:locale" content={SEO_DEFAULTS.locale} />

      {/* Twitter Card */}
      <meta name="twitter:card" content={SEO_DEFAULTS.twitterCard} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={SEO_DEFAULTS.ogImage} />

      {/* Robots */}
      {shouldNoindex && <meta name="robots" content="noindex, nofollow" />}
    </Helmet>
  );
};

export default SEOHead;
