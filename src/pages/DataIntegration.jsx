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