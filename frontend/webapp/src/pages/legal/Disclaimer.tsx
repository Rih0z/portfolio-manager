/**
 * 免責事項ページ（投資助言非該当明記）
 * @file src/pages/legal/Disclaimer.tsx
 */
import React from 'react';
import { Link } from 'react-router-dom';

const Disclaimer: React.FC = () => {
  return (
    <div data-testid="disclaimer-page" className="px-4 sm:px-6 lg:px-8 py-6 max-w-3xl mx-auto">
      <nav className="text-xs text-gray-500 mb-4">
        <Link to="/" className="hover:text-gray-300">ホーム</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-300">免責事項</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-100 mb-6">免責事項</h1>
      <p className="text-xs text-gray-500 mb-8">最終更新日: 2026年3月5日</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-6 text-gray-300 leading-relaxed">
        {/* 重要な警告 */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-yellow-300 mb-1">重要なお知らせ</h3>
              <p className="text-sm text-yellow-200/80">
                本サービスは投資助言業・投資運用業には該当しません。
                金融商品取引法に基づく金融商品取引業者の登録は行っておりません。
              </p>
            </div>
          </div>
        </div>

        <section>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">1. 投資助言非該当の表明</h2>
          <p>
            PortfolioWise（以下「本サービス」）は、投資ポートフォリオの管理・分析を支援するツールです。
            本サービスが提供する情報、データ、分析結果、AI によるアドバイスはすべて
            <strong className="text-gray-100">情報提供を目的としたもの</strong>であり、
            特定の金融商品の売買を推奨するものではありません。
          </p>
          <p className="mt-2">
            本サービスは、金融商品取引法第2条第8項に規定する金融商品取引業に該当する
            投資助言・代理業、投資運用業のいずれにも該当しません。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">2. 投資判断の自己責任</h2>
          <p>
            投資に関する最終的な判断は、ユーザーご自身の責任において行ってください。
            本サービスの利用に起因する投資判断の結果（利益・損失を含む）について、
            運営者は一切の責任を負いません。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">3. 情報の正確性</h2>
          <p>
            本サービスが表示する市場データ、株価、為替レート等の情報は、
            第三者のデータプロバイダーから取得したものであり、
            リアルタイムのデータではない場合があります。
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>データの正確性、完全性、最新性について保証するものではありません</li>
            <li>データの遅延、欠落、誤りが生じる可能性があります</li>
            <li>システム障害等により一時的にデータが取得できない場合があります</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">4. AI 分析について</h2>
          <p>
            本サービスが提供する AI による分析・アドバイスは、
            人工知能モデルによる自動生成であり、専門家の助言に代わるものではありません。
            AI の出力には誤りや偏りが含まれる可能性があり、
            投資判断の唯一の根拠として利用すべきではありません。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">5. シミュレーション結果</h2>
          <p>
            本サービスが提供する投資シミュレーション機能は、
            過去のデータや仮定に基づく推計であり、将来の運用成果を示唆・保証するものではありません。
            実際の投資結果はシミュレーション結果と大きく異なる可能性があります。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">6. 損害の免責</h2>
          <p>
            以下の事由により生じた損害について、運営者は一切の責任を負いません。
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>本サービスの利用または利用不能により生じた損害</li>
            <li>市場データの遅延、誤り、欠落に起因する損害</li>
            <li>第三者による不正アクセスに起因する損害</li>
            <li>システム障害、メンテナンスに起因する損害</li>
            <li>投資判断の結果生じた損失</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">7. 推奨事項</h2>
          <p>
            重要な投資判断を行う際は、以下をお勧めします。
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>証券会社や金融機関が提供する公式情報を確認する</li>
            <li>必要に応じてファイナンシャルアドバイザー等の専門家に相談する</li>
            <li>複数の情報源を照合し、総合的に判断する</li>
            <li>投資はご自身のリスク許容度の範囲内で行う</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default Disclaimer;
