/**
 * アンケートYAML管理コンポーネント
 * 
 * AIAdvisorのアンケートデータのYAMLエクスポート/インポート機能を提供
 * ユーザーフレンドリーなUIでYAML操作を可能にする
 * 
 * 機能:
 * - アンケートデータのYAMLエクスポート
 * - YAMLファイルからのインポート
 * - データプレビューと検証
 * - 完成度表示
 * 
 * @author Claude Code
 * @since 2025-01-03
 */

import React, { useState, useCallback } from 'react';
import { FaDownload, FaUpload, FaEye, FaCheck, FaExclamationTriangle, FaTimes, FaFileAlt } from 'react-icons/fa';
import { HiDocumentText, HiClipboard } from 'react-icons/hi';
import { useSurveyYAML } from '../../hooks/useSurveyYAML';

const SurveyYAMLManager = ({ 
  surveyData, 
  onImportData, 
  isVisible = true,
  showPreview = true,
  compact = false 
}) => {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewContent, setPreviewContent] = useState('');

  const {
    exportSurveyToYAML,
    importYAMLFromFile,
    validateSurveyData,
    generateYAMLPreview,
    getCompletenessInfo,
    isExporting,
    isImporting,
    lastExportResult,
    lastImportResult
  } = useSurveyYAML({
    autoValidate: true,
    showNotifications: true
  });

  // アンケートデータの完成度情報
  const completenessInfo = surveyData ? getCompletenessInfo(surveyData) : null;

  /**
   * YAMLエクスポート処理
   */
  const handleExport = useCallback(async () => {
    if (!surveyData) {
      alert('エクスポートするアンケートデータがありません');
      return;
    }

    try {
      const result = await exportSurveyToYAML(surveyData, {
        autoDownload: true,
        filename: `survey-data-${new Date().toISOString().split('T')[0]}.yml`
      });

      if (result.success) {
        // 成功時の処理は useSurveyYAML で自動的に行われる（ダウンロード等）
      } else {
        alert(`エクスポートに失敗しました: ${result.errors?.join(', ') || '不明なエラー'}`);
      }
    } catch (error) {
      alert(`エクスポートエラー: ${error.message}`);
    }
  }, [surveyData, exportSurveyToYAML]);

  /**
   * ファイル選択処理
   */
  const handleFileSelect = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);
    }
  }, []);

  /**
   * YAMLインポート処理
   */
  const handleImport = useCallback(async () => {
    if (!uploadedFile) {
      alert('インポートするファイルを選択してください');
      return;
    }

    try {
      const result = await importYAMLFromFile(uploadedFile);

      if (result.success) {
        if (onImportData) {
          onImportData(result.surveyData, result.metadata);
        }
        alert('データのインポートが完了しました');
        setUploadedFile(null);
        // ファイル入力をリセット
        const fileInput = document.getElementById('yaml-file-input');
        if (fileInput) fileInput.value = '';
      } else {
        alert(`インポートに失敗しました: ${result.error || '不明なエラー'}`);
      }
    } catch (error) {
      alert(`インポートエラー: ${error.message}`);
    }
  }, [uploadedFile, importYAMLFromFile, onImportData]);

  /**
   * プレビュー表示
   */
  const handleShowPreview = useCallback(() => {
    if (!surveyData) {
      alert('プレビューするデータがありません');
      return;
    }

    const preview = generateYAMLPreview(surveyData, 50);
    setPreviewContent(preview);
    setShowPreviewModal(true);
  }, [surveyData, generateYAMLPreview]);

  /**
   * プレビューのクリップボードコピー
   */
  const handleCopyPreview = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(previewContent);
      alert('YAMLデータをクリップボードにコピーしました');
    } catch (error) {
      alert('コピーに失敗しました');
    }
  }, [previewContent]);

  if (!isVisible) return null;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-base'}`}>
          YAML データ管理
        </h3>
        {completenessInfo && (
          <div className="flex items-center space-x-2">
            <span className={`text-xs px-2 py-1 rounded ${
              completenessInfo.status === 'excellent' ? 'bg-green-100 text-green-800' :
              completenessInfo.status === 'good' ? 'bg-blue-100 text-blue-800' :
              completenessInfo.status === 'fair' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              完成度: {completenessInfo.completeness}%
            </span>
          </div>
        )}
      </div>

      {/* エクスポートセクション */}
      <div className="mb-4">
        <h4 className={`font-medium text-gray-700 mb-2 ${compact ? 'text-sm' : 'text-base'}`}>
          エクスポート
        </h4>
        <div className="flex space-x-2">
          <button
            onClick={handleExport}
            disabled={isExporting || !surveyData}
            className={`
              inline-flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg 
              hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors
              ${compact ? 'text-sm' : ''}
            `}
          >
            <FaDownload className="w-4 h-4" />
            <span>{isExporting ? 'エクスポート中...' : 'YAMLダウンロード'}</span>
          </button>

          {showPreview && (
            <button
              onClick={handleShowPreview}
              disabled={!surveyData}
              className={`
                inline-flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded-lg 
                hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                ${compact ? 'text-sm' : ''}
              `}
            >
              <FaEye className="w-4 h-4" />
              <span>プレビュー</span>
            </button>
          )}
        </div>
      </div>

      {/* インポートセクション */}
      <div>
        <h4 className={`font-medium text-gray-700 mb-2 ${compact ? 'text-sm' : 'text-base'}`}>
          インポート
        </h4>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              id="yaml-file-input"
              type="file"
              accept=".yml,.yaml"
              onChange={handleFileSelect}
              className="hidden"
            />
            <label
              htmlFor="yaml-file-input"
              className={`
                inline-flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg 
                hover:bg-gray-200 cursor-pointer transition-colors border border-gray-300
                ${compact ? 'text-sm' : ''}
              `}
            >
              <FaFileAlt className="w-4 h-4" />
              <span>ファイル選択</span>
            </label>

            {uploadedFile && (
              <span className={`text-gray-600 ${compact ? 'text-sm' : ''}`}>
                {uploadedFile.name}
              </span>
            )}
          </div>

          {uploadedFile && (
            <button
              onClick={handleImport}
              disabled={isImporting}
              className={`
                inline-flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg 
                hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                ${compact ? 'text-sm' : ''}
              `}
            >
              <FaUpload className="w-4 h-4" />
              <span>{isImporting ? 'インポート中...' : 'データをインポート'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 結果表示 */}
      {(lastExportResult || lastImportResult) && (
        <div className="mt-4 p-3 rounded-lg border">
          {lastExportResult && (
            <div className={`flex items-start space-x-2 ${
              lastExportResult.success ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
            } p-2 rounded`}>
              {lastExportResult.success ? (
                <FaCheck className="w-4 h-4 mt-0.5" />
              ) : (
                <FaTimes className="w-4 h-4 mt-0.5" />
              )}
              <div className={compact ? 'text-sm' : ''}>
                <p className="font-medium">
                  {lastExportResult.success ? 'エクスポート完了' : 'エクスポート失敗'}
                </p>
                {lastExportResult.warnings && lastExportResult.warnings.length > 0 && (
                  <ul className="text-sm mt-1 list-disc list-inside">
                    {lastExportResult.warnings.map((warning, index) => (
                      <li key={index}>{warning.message || warning}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {lastImportResult && (
            <div className={`flex items-start space-x-2 mt-2 ${
              lastImportResult.success ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
            } p-2 rounded`}>
              {lastImportResult.success ? (
                <FaCheck className="w-4 h-4 mt-0.5" />
              ) : (
                <FaTimes className="w-4 h-4 mt-0.5" />
              )}
              <div className={compact ? 'text-sm' : ''}>
                <p className="font-medium">
                  {lastImportResult.success ? 'インポート完了' : 'インポート失敗'}
                </p>
                {lastImportResult.error && (
                  <p className="text-sm mt-1">{lastImportResult.error}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* プレビューモーダル */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            
            <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    YAML プレビュー
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCopyPreview}
                      className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200 transition-colors"
                    >
                      <HiClipboard className="w-4 h-4" />
                      <span>コピー</span>
                    </button>
                    <button
                      onClick={() => setShowPreviewModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <FaTimes className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                    {previewContent}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyYAMLManager;