/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/pages/DataImport.jsx
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-08-22 15:00:00 
 * 
 * 更新履歴: 
 * - 2025-08-22 15:00:00 Koki Riho 初回作成 - ダークテーマ版データインポートページ
 * 
 * 説明: 
 * データのインポート・エクスポート機能を提供するダークテーマページコンポーネント。
 * Netflix/Uber風のモダンなUIデザインでローカルストレージおよびGoogle Driveとの連携機能を実装。
 */

import React from 'react';
import ExportOptions from '../components/data/ExportOptions';
import ImportOptions from '../components/data/ImportOptions';
import GoogleDriveIntegration from '../components/data/GoogleDriveIntegration';
import { useAuth } from '../hooks/useAuth';

const DataImport = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-dark-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Page Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 bg-primary-500/10 rounded-xl">
              <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white">データ管理</h1>
          </div>
          <p className="text-gray-300 text-lg max-w-3xl mx-auto">
            ポートフォリオデータのインポート・エクスポートとGoogle Drive連携
          </p>
        </div>

        {/* Export Section */}
        <div className="bg-dark-200 border border-dark-400 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-success-500/10 rounded-lg">
              <svg className="w-6 h-6 text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">データのエクスポート</h2>
              <p className="text-gray-400 text-sm">
                現在の設定とポートフォリオデータをエクスポートできます
              </p>
            </div>
          </div>
          <ExportOptions />
        </div>

        {/* Import Section */}
        <div className="bg-dark-200 border border-dark-400 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-info-500/10 rounded-lg">
              <svg className="w-6 h-6 text-info-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">データのインポート</h2>
              <p className="text-gray-400 text-sm">
                以前にエクスポートしたデータを読み込むことができます
              </p>
            </div>
          </div>
          <ImportOptions />
        </div>

        {/* Google Drive Integration - Authenticated */}
        {isAuthenticated && (
          <div className="bg-dark-200 border border-dark-400 rounded-xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-warning-500/10 rounded-lg">
                <svg className="w-6 h-6 text-warning-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Google ドライブ連携</h2>
                <p className="text-gray-400 text-sm">
                  ポートフォリオデータをGoogleドライブに保存・読み込みできます
                </p>
              </div>
            </div>
            <GoogleDriveIntegration />
          </div>
        )}

        {/* Google Drive Integration - Not Authenticated */}
        {!isAuthenticated && (
          <div className="bg-primary-500/5 border border-primary-500/20 rounded-xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary-500/10 rounded-lg">
                <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Google ドライブ連携</h2>
                <p className="text-gray-400 text-sm">
                  Googleアカウントでログインすると、ポートフォリオデータをGoogleドライブに保存・読み込みできます
                </p>
              </div>
            </div>
            <div className="bg-dark-300/50 border border-dark-500 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary-400 rounded-full"></div>
                <p className="text-primary-300 text-sm font-medium">
                  ヘッダーのログインボタンからGoogleアカウントでログインしてください
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default DataImport;