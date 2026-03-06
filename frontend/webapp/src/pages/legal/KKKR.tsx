/**
 * 特定商取引法に基づく表記ページ
 * @file src/pages/legal/KKKR.tsx
 */
import React from 'react';
import { Link } from 'react-router-dom';
import SEOHead from '../../components/seo/SEOHead';

const KKKR: React.FC = () => {
  return (
    <>
    <SEOHead />
    <div data-testid="kkkr-page" className="px-4 sm:px-6 lg:px-8 py-6 max-w-3xl mx-auto">
      <nav className="text-xs text-gray-500 mb-4">
        <Link to="/" className="hover:text-gray-300">ホーム</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-300">特定商取引法に基づく表記</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-100 mb-6">特定商取引法に基づく表記</h1>
      <p className="text-xs text-gray-500 mb-8">最終更新日: 2026年3月5日</p>

      <div className="space-y-4">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-dark-400">
            <tr>
              <th className="text-left text-gray-400 py-3 pr-4 w-1/3 align-top font-medium">販売業者</th>
              <td className="text-gray-200 py-3">Koki Riho</td>
            </tr>
            <tr>
              <th className="text-left text-gray-400 py-3 pr-4 w-1/3 align-top font-medium">運営責任者</th>
              <td className="text-gray-200 py-3">Koki Riho</td>
            </tr>
            <tr>
              <th className="text-left text-gray-400 py-3 pr-4 w-1/3 align-top font-medium">所在地</th>
              <td className="text-gray-200 py-3">
                請求があった場合には遅滞なく開示いたします。
              </td>
            </tr>
            <tr>
              <th className="text-left text-gray-400 py-3 pr-4 w-1/3 align-top font-medium">電話番号</th>
              <td className="text-gray-200 py-3">
                請求があった場合には遅滞なく開示いたします。
              </td>
            </tr>
            <tr>
              <th className="text-left text-gray-400 py-3 pr-4 w-1/3 align-top font-medium">メールアドレス</th>
              <td className="text-gray-200 py-3">support@portfolio-wise.com</td>
            </tr>
            <tr>
              <th className="text-left text-gray-400 py-3 pr-4 w-1/3 align-top font-medium">販売URL</th>
              <td className="text-gray-200 py-3">https://portfolio-wise.com/</td>
            </tr>
            <tr>
              <th className="text-left text-gray-400 py-3 pr-4 w-1/3 align-top font-medium">販売価格</th>
              <td className="text-gray-200 py-3">
                <ul className="space-y-1">
                  <li>Standard プラン（月額）: 700円（税込）</li>
                  <li>Standard プラン（年額）: 7,000円（税込）</li>
                </ul>
              </td>
            </tr>
            <tr>
              <th className="text-left text-gray-400 py-3 pr-4 w-1/3 align-top font-medium">販売価格以外の必要料金</th>
              <td className="text-gray-200 py-3">
                インターネット接続に必要な通信費はお客様のご負担となります。
              </td>
            </tr>
            <tr>
              <th className="text-left text-gray-400 py-3 pr-4 w-1/3 align-top font-medium">支払方法</th>
              <td className="text-gray-200 py-3">クレジットカード（Stripe経由）</td>
            </tr>
            <tr>
              <th className="text-left text-gray-400 py-3 pr-4 w-1/3 align-top font-medium">支払時期</th>
              <td className="text-gray-200 py-3">
                月額プラン: 申込時および毎月の契約更新日<br />
                年額プラン: 申込時および毎年の契約更新日
              </td>
            </tr>
            <tr>
              <th className="text-left text-gray-400 py-3 pr-4 w-1/3 align-top font-medium">サービス提供時期</th>
              <td className="text-gray-200 py-3">決済完了後、即時にご利用いただけます。</td>
            </tr>
            <tr>
              <th className="text-left text-gray-400 py-3 pr-4 w-1/3 align-top font-medium">キャンセル・解約</th>
              <td className="text-gray-200 py-3">
                サービス設定画面の「プランを管理」からいつでも解約可能です。
                解約後も現在の請求期間終了までサービスをご利用いただけます。
                なお、日割り計算による返金は行いません。
              </td>
            </tr>
            <tr>
              <th className="text-left text-gray-400 py-3 pr-4 w-1/3 align-top font-medium">返品・返金</th>
              <td className="text-gray-200 py-3">
                デジタルサービスの性質上、原則として返品・返金はお受けしておりません。
                ただし、システム障害等によりサービスが提供できなかった場合は個別に対応いたします。
              </td>
            </tr>
            <tr>
              <th className="text-left text-gray-400 py-3 pr-4 w-1/3 align-top font-medium">動作環境</th>
              <td className="text-gray-200 py-3">
                最新版の Google Chrome、Safari、Firefox、Microsoft Edge。
                インターネット接続環境が必要です。
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </>
  );
};

export default KKKR;
