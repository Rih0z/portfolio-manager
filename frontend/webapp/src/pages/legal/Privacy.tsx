/**
 * プライバシーポリシーページ（APPI準拠）
 * @file src/pages/legal/Privacy.tsx
 */
import React from 'react';
import { Link } from 'react-router-dom';

const Privacy: React.FC = () => {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-3xl mx-auto">
      <nav className="text-xs text-gray-500 mb-4">
        <Link to="/" className="hover:text-gray-300">ホーム</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-300">プライバシーポリシー</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-100 mb-6">プライバシーポリシー</h1>
      <p className="text-xs text-gray-500 mb-8">最終更新日: 2026年3月5日</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-6 text-gray-300 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">1. 事業者情報</h2>
          <p>
            PortfolioWise（以下「本サービス」）は、個人情報保護法（APPI）に基づき、
            以下のとおり個人情報を適切に取り扱います。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">2. 取得する個人情報</h2>
          <p>本サービスでは以下の個人情報を取得します。</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Google アカウント情報:</strong> 氏名、メールアドレス、プロフィール画像</li>
            <li><strong>決済情報:</strong> Stripe を通じたクレジットカード情報（本サービスでは直接保持しません）</li>
            <li><strong>利用データ:</strong> サービスの利用状況、アクセスログ</li>
            <li><strong>ポートフォリオデータ:</strong> ユーザーが入力した投資データ</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">3. 利用目的</h2>
          <p>取得した個人情報は以下の目的で利用します。</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>本サービスの提供・運営</li>
            <li>ユーザー認証およびアカウント管理</li>
            <li>有料プランの課金・決済処理</li>
            <li>サービスの改善および新機能の開発</li>
            <li>重要なお知らせの送信（サービス変更、セキュリティ通知等）</li>
            <li>利用規約違反の調査・対応</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">4. 第三者提供</h2>
          <p>
            以下の場合を除き、ユーザーの個人情報を第三者に提供することはありません。
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>ユーザーの同意がある場合</li>
            <li>法令に基づく開示要求がある場合</li>
            <li>サービス提供に必要な委託先（以下の外部サービス）に対する提供</li>
          </ul>

          <h3 className="text-base font-medium text-gray-200 mt-4 mb-1">利用する外部サービス</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Google OAuth:</strong> 認証処理（Google LLC）</li>
            <li><strong>Google Drive API:</strong> データバックアップ（Google LLC）</li>
            <li><strong>Stripe:</strong> 決済処理（Stripe, Inc.）</li>
            <li><strong>Amazon Web Services:</strong> サーバーインフラ（Amazon Web Services, Inc.）</li>
            <li><strong>Cloudflare:</strong> CDN・フロントエンドホスティング（Cloudflare, Inc.）</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">5. 安全管理措置</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>すべての通信は TLS/SSL により暗号化されます</li>
            <li>認証トークンはメモリ内のみで管理し、localStorage には保存しません</li>
            <li>API キーや秘密情報は AWS Secrets Manager で管理されます</li>
            <li>決済情報は Stripe が PCI DSS 準拠のもとで管理し、本サービスでは保持しません</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">6. Cookie の利用</h2>
          <p>
            本サービスでは、認証セッション管理のために httpOnly Cookie を使用します。
            これらの Cookie はサービスの正常な動作に必要なものであり、
            トラッキングや広告目的では使用しません。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">7. データの保存期間</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>セッションデータ: 最終アクセスから7日間</li>
            <li>使用量データ: 90日間</li>
            <li>アカウントデータ: アカウント削除まで</li>
            <li>決済履歴: 法令に基づく保存期間</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">8. ユーザーの権利</h2>
          <p>ユーザーは以下の権利を行使できます。</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>個人情報の開示請求</li>
            <li>個人情報の訂正・追加・削除の請求</li>
            <li>個人情報の利用停止の請求</li>
            <li>アカウントの削除</li>
          </ul>
          <p className="mt-2">
            これらの請求は、本サービスのお問い合わせ窓口までご連絡ください。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">9. ポリシーの変更</h2>
          <p>
            本ポリシーの内容を変更する場合は、本ページにて事前に通知します。
            変更後のポリシーは、本ページに掲載した時点から効力を生じるものとします。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">10. お問い合わせ</h2>
          <p>
            個人情報の取り扱いに関するお問い合わせは、以下までご連絡ください。
          </p>
          <p className="mt-2 text-gray-400">
            メール: support@portfolio-wise.com
          </p>
        </section>
      </div>
    </div>
  );
};

export default Privacy;
