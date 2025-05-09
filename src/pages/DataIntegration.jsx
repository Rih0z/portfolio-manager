/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/pages/DataIntegration.jsx
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-03-22 10:15:30 
 * 
 * 更新履歴: 
 * - 2025-03-22 10:15:30 Koki Riho 初回作成
 * - 2025-04-05 15:40:12 Koki Riho Google Drive連携機能を追加
 * - 2025-04-25 11:05:45 Yuta Sato 認証状態に応じた表示制御を改善
 * 
 * 説明: 
 * データのインポート・エクスポート機能を提供するページコンポーネント。
 * ローカルストレージおよびGoogle Driveとの連携機能を実装。
 */

import React from 'react';
import ExportOptions from '../components/data/ExportOptions';
import ImportOptions from '../components/data/ImportOptions';
import GoogleDriveIntegration from '../components/data/GoogleDriveIntegration';
import { useAuth } from '../hooks/useAuth';

const DataIntegration = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">データのエクスポート</h2>
        <p className="text-gray-600 mb-4">
          現在の設定とポートフォリオデータをエクスポートできます。
        </p>
        <ExportOptions />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">データのインポート</h2>
        <p className="text-gray-600 mb-4">
          以前にエクスポートしたデータを読み込むことができます。
        </p>
        <ImportOptions />
      </div>

      {isAuthenticated && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Google ドライブ連携</h2>
          <p className="text-gray-600 mb-4">
            ポートフォリオデータをGoogleドライブに保存・読み込みできます。
          </p>
          <GoogleDriveIntegration />
        </div>
      )}

      {!isAuthenticated && (
        <div className="bg-blue-50 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Google ドライブ連携</h2>
          <p className="text-gray-600 mb-4">
            Googleアカウントでログインすると、ポートフォリオデータをGoogleドライブに保存・読み込みできます。
          </p>
          <div className="mt-4">
            <p className="text-sm text-blue-600">
              ※ ヘッダーのログインボタンからログインしてください。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataIntegration;
