/**
 * 利用規約ページ
 * @file src/pages/legal/Terms.tsx
 */
import React from 'react';
import { Link } from 'react-router-dom';

const Terms: React.FC = () => {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-3xl mx-auto">
      <nav className="text-xs text-gray-500 mb-4">
        <Link to="/" className="hover:text-gray-300">ホーム</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-300">利用規約</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-100 mb-6">利用規約</h1>
      <p className="text-xs text-gray-500 mb-8">最終更新日: 2026年3月5日</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-6 text-gray-300 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">第1条（適用）</h2>
          <p>
            本利用規約（以下「本規約」）は、PortfolioWise（以下「本サービス」）の利用に関する条件を定めるものです。
            ユーザーは本サービスを利用することにより、本規約に同意したものとみなされます。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">第2条（定義）</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>「ユーザー」とは、本サービスを利用する全ての個人を指します。</li>
            <li>「有料プラン」とは、Standard プランなど、月額または年額の料金を支払うことで利用できるサービスプランを指します。</li>
            <li>「コンテンツ」とは、ユーザーが本サービスに入力・保存するポートフォリオデータ等を指します。</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">第3条（アカウント）</h2>
          <p>
            本サービスは Google アカウントによる認証を使用します。ユーザーは自己の Google アカウントの
            管理責任を負い、第三者への貸与・共有を行ってはなりません。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">第4条（サービス内容）</h2>
          <p>
            本サービスは投資ポートフォリオの管理・分析ツールを提供します。
            本サービスが提供する情報は投資助言には該当せず、投資判断はユーザー自身の責任において行うものとします。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">第5条（料金と支払い）</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>有料プランの料金は料金プランページに記載のとおりとします。</li>
            <li>決済は Stripe を通じてクレジットカードにより行われます。</li>
            <li>有料プランは自動更新されます。更新を停止するには、次回請求日の前日までに解約手続きを行ってください。</li>
            <li>既に支払済みの料金は、法令に定める場合を除き返金いたしません。</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">第6条（禁止事項）</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>本サービスの不正利用またはシステムへの過負荷を与える行為</li>
            <li>他のユーザーの利用を妨害する行為</li>
            <li>リバースエンジニアリング、スクレイピング等の行為</li>
            <li>法令または公序良俗に反する行為</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">第7条（サービスの変更・停止）</h2>
          <p>
            運営者は、事前の通知なくサービス内容の変更、一時停止、または終了を行うことがあります。
            これによりユーザーに損害が生じた場合でも、運営者は一切の責任を負いません。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">第8条（免責事項）</h2>
          <p>
            本サービスが提供する市場データ、分析結果、AIによるアドバイスは参考情報であり、
            その正確性・完全性を保証するものではありません。
            投資判断に基づく損失について、運営者は一切の責任を負いません。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">第9条（知的財産権）</h2>
          <p>
            本サービスに関する知的財産権は運営者に帰属します。
            ユーザーが入力したコンテンツの権利はユーザーに帰属しますが、
            サービス提供に必要な範囲での利用を許諾するものとします。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">第10条（準拠法・管轄）</h2>
          <p>
            本規約の解釈は日本法に準拠し、本サービスに関する紛争については
            東京地方裁判所を第一審の専属的合意管轄裁判所とします。
          </p>
        </section>
      </div>
    </div>
  );
};

export default Terms;
