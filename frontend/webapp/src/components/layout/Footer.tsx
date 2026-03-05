/**
 * フッターコンポーネント
 *
 * 法務リンク（利用規約、プライバシーポリシー、特定商取引法、免責事項）
 * + コピーライトを表示するグローバルフッター。
 *
 * @file src/components/layout/Footer.tsx
 */
import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-border mt-8 pb-20 sm:pb-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* 法務リンク */}
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <Link to="/legal/terms" className="hover:text-foreground transition-colors">
              利用規約
            </Link>
            <Link to="/legal/privacy" className="hover:text-foreground transition-colors">
              プライバシーポリシー
            </Link>
            <Link to="/legal/kkkr" className="hover:text-foreground transition-colors">
              特定商取引法に基づく表記
            </Link>
            <Link to="/legal/disclaimer" className="hover:text-foreground transition-colors">
              免責事項
            </Link>
            <Link to="/pricing" className="hover:text-foreground transition-colors">
              料金プラン
            </Link>
          </nav>

          {/* コピーライト */}
          <p className="text-xs text-muted-foreground/70">
            &copy; {currentYear} PortfolioWise. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
