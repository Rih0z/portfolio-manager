/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/pages/DataImport.tsx
 *
 * 作成者: Claude Code
 * 作成日: 2025-01-03
 * 更新日: 2025-02-06
 *
 * 説明:
 * データ取り込みページ - プライバシーを保護しながら外部AIで分析された
 * データの受け取りとJSONファイルでのデータ交換機能を提供
 * プロンプト生成機能はAIアドバイザータブに集約済み
 */

import React, { useState } from 'react';
import { FileText, FolderOpen, HardDrive, BarChart3, TrendingUp, CheckCircle, ClipboardList, Lightbulb, Gem } from 'lucide-react';
import { usePortfolioContext } from '../hooks/usePortfolioContext';
import ScreenshotAnalyzer from '../components/ai/ScreenshotAnalyzer';
import logger from '../utils/logger';

const DataImport = () => {
  const { portfolio, updatePortfolio } = usePortfolioContext();
  const [activeTab, setActiveTab] = useState('ai-result');
  const [importHistory, setImportHistory] = useState<any[]>([]);
  const [importStats, setImportStats] = useState({
    totalImports: 0,
    successfulImports: 0,
    assetsAdded: 0
  });
  const [jsonImportData, setJsonImportData] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const tabs = [
    {
      id: 'ai-result',
      name: 'AI分析結果',
      icon: <FileText size={20} />,
      description: '外部AIで分析された結果をテキストで受け取り'
    },
    {
      id: 'json',
      name: 'JSONインポート',
      icon: <FolderOpen size={20} />,
      description: 'JSONファイルからポートフォリオデータを読み込み'
    },
    {
      id: 'export',
      name: 'データエクスポート',
      icon: <HardDrive size={20} />,
      description: '現在のポートフォリオデータをエクスポート'
    }
  ];

  const handleDataExtracted = (extractedData: any, analysisType: any) => {
    logger.debug('抽出されたデータ:', extractedData);

    // データインポートの統計を更新
    setImportStats(prev => ({
      ...prev,
      totalImports: prev.totalImports + 1,
      successfulImports: prev.successfulImports + 1,
      assetsAdded: prev.assetsAdded + (extractedData.portfolioData?.assets?.length || 0)
    }));

    // インポート履歴に追加
    const importRecord = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type: analysisType,
      data: extractedData,
      status: 'success'
    };

    setImportHistory(prev => [importRecord, ...prev.slice(0, 9)]); // 最新10件まで保持

    // ポートフォリオデータの場合はポートフォリオに追加
    if (analysisType === 'screenshot_portfolio' && extractedData.portfolioData) {
      const newAssets = extractedData.portfolioData.assets || [];

      // 既存のポートフォリオに新しい資産を追加
      const updatedAssets = [...((portfolio as any).assets || [])];

      newAssets.forEach((newAsset: any) => {
        // 重複チェック（ティッカーシンボルで判定）
        const existingIndex = updatedAssets.findIndex(
          (asset: any) => asset.ticker === newAsset.ticker
        );

        if (existingIndex >= 0) {
          // 既存資産の更新
          updatedAssets[existingIndex] = {
            ...updatedAssets[existingIndex],
            ...newAsset,
            lastUpdated: new Date().toISOString()
          };
        } else {
          // 新規資産の追加
          updatedAssets.push({
            ...newAsset,
            id: Date.now().toString() + Math.random(),
            addedAt: new Date().toISOString(),
            source: 'ai_import'
          });
        }
      });

      // ポートフォリオを更新
      updatePortfolio({
        ...portfolio,
        assets: updatedAssets,
        lastImportAt: new Date().toISOString()
      });
    }
  };

  const handlePromptGenerated = (prompt: any) => {
    logger.debug('生成されたプロンプト:', prompt);
  };

  const handleJsonImport = () => {
    if (!jsonImportData.trim()) return;

    setIsImporting(true);
    try {
      const importedData = JSON.parse(jsonImportData);

      // ポートフォリオデータの構造を検証
      if (importedData.assets && Array.isArray(importedData.assets)) {
        // 既存のポートフォリオと統合
        const updatedPortfolio = {
          ...portfolio,
          ...importedData,
          lastImportAt: new Date().toISOString()
        };

        updatePortfolio(updatedPortfolio);

        // 統計を更新
        setImportStats(prev => ({
          ...prev,
          totalImports: prev.totalImports + 1,
          successfulImports: prev.successfulImports + 1,
          assetsAdded: prev.assetsAdded + importedData.assets.length
        }));

        // インポート履歴に追加
        const importRecord = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          type: 'json_import',
          data: importedData,
          status: 'success'
        };

        setImportHistory(prev => [importRecord, ...prev.slice(0, 9)]);
        setJsonImportData('');

        logger.log('JSONインポート成功:', importedData);
      } else {
        throw new Error('Invalid portfolio data format');
      }
    } catch (error) {
      logger.error('JSONインポートエラー:', error);
      // エラーハンドリング
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportJson = () => {
    const exportData = {
      ...portfolio,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `portfolio-data-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (event: any) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        setJsonImportData(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  const getTabContent = () => {
    switch (activeTab) {
      case 'ai-result':
        return (
          <ScreenshotAnalyzer
            onDataExtracted={handleDataExtracted}
            className="w-full"
          />
        );

      case 'json':
        return (
          <div className="bg-card rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <FolderOpen size={20} className="inline-block" /> JSONインポート
            </h3>

            {/* File Import */}
            <div className="mb-6">
              <h4 className="font-medium text-white mb-3">
                ファイルからインポート
              </h4>
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="w-full p-3 bg-muted border border-border rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-primary-500 file:text-white hover:file:bg-primary-600"
              />
            </div>

            {/* Text Import */}
            <div className="mb-6">
              <h4 className="font-medium text-white mb-3">
                JSONテキストから直接インポート
              </h4>
              <textarea
                value={jsonImportData}
                onChange={(e: any) => setJsonImportData(e.target.value)}
                placeholder="JSONデータをここに貼り付けてください..."
                className="w-full p-3 bg-muted border border-border rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
                rows={10}
              />

              {jsonImportData && (
                <div className="mt-3">
                  <button
                    onClick={handleJsonImport}
                    disabled={isImporting}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors duration-200 ${
                      isImporting
                        ? 'bg-gray-600 text-muted-foreground cursor-not-allowed'
                        : 'bg-primary-500 hover:bg-primary-600 text-white'
                    }`}
                  >
                    {isImporting ? 'インポート中...' : 'インポート実行'}
                  </button>
                </div>
              )}
            </div>

            {/* Format Help */}
            <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4">
              <h5 className="text-primary-400 font-medium mb-2 flex items-center gap-2">
                <Lightbulb size={16} className="inline-block" /> JSONフォーマットについて
              </h5>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>
                  • エクスポートされたJSONファイルと同じ形式を使用してください
                </div>
                <div>
                  • assets配列にポートフォリオデータが含まれている必要があります
                </div>
                <div>
                  • インポート時に既存データとマージされます
                </div>
              </div>
            </div>
          </div>
        );

      case 'export':
        return (
          <div className="bg-card rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <HardDrive size={20} className="inline-block" /> データエクスポート
            </h3>

            {/* Current Portfolio Summary */}
            <div className="mb-6">
              <h4 className="font-medium text-white mb-3">
                現在のポートフォリオ
              </h4>
              <div className="bg-muted rounded-lg p-4 border border-border">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">資産数：</span>
                    <span className="text-white ml-2">{(portfolio as any)?.assets?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">総資産額：</span>
                    <span className="text-white ml-2">¥{(portfolio as any)?.totalValue?.toLocaleString() || '0'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">最終更新：</span>
                    <span className="text-white ml-2">
                      {(portfolio as any)?.lastUpdated
                        ? new Date((portfolio as any).lastUpdated).toLocaleDateString()
                        : '未設定'
                      }
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">通貨：</span>
                    <span className="text-white ml-2">{(portfolio as any)?.baseCurrency || 'JPY'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Export Button */}
            <div className="mb-6">
              <button
                onClick={handleExportJson}
                className="w-full py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors duration-200"
              >
                JSONファイルとしてエクスポート
              </button>
            </div>

            {/* Export Info */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <h5 className="text-green-400 font-medium mb-2 flex items-center gap-2">
                <FileText size={16} className="inline-block" /> エクスポート内容
              </h5>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>
                  • すべての保有資産データ
                </div>
                <div>
                  • 目標配分設定
                </div>
                <div>
                  • ポートフォリオ設定
                </div>
                <div>
                  • エクスポート日時とバージョン情報
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div data-testid="data-import-page" className="min-h-screen bg-background text-white">
      <div className="container mx-auto px-4 py-8 pb-20">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
            <BarChart3 size={28} className="inline-block" /> データ取り込み
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            外部AIで分析されたデータの受け取りや、JSONファイルでのデータ交換が行えます。プライバシーを保護しながら安全にデータを管理します。
          </p>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card rounded-lg p-4 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-primary-400">
                  {importStats.totalImports}
                </div>
                <div className="text-sm text-muted-foreground">
                  インポート回数
                </div>
              </div>
              <TrendingUp size={28} className="text-primary-400" />
            </div>
          </div>

          <div className="bg-card rounded-lg p-4 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-400">
                  {importStats.successfulImports}
                </div>
                <div className="text-sm text-muted-foreground">
                  成功インポート
                </div>
              </div>
              <CheckCircle size={28} className="text-green-400" />
            </div>
          </div>

          <div className="bg-card rounded-lg p-4 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-400">
                  {importStats.assetsAdded}
                </div>
                <div className="text-sm text-muted-foreground">
                  追加された資産
                </div>
              </div>
              <Gem size={28} className="text-blue-400" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-card p-1 rounded-lg">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 px-4 rounded-md text-center transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-primary-500 text-white'
                    : 'text-muted-foreground hover:text-white hover:bg-muted'
                }`}
              >
                <div className="flex justify-center mb-1">{tab.icon}</div>
                <div className="text-sm font-medium">{tab.name}</div>
              </button>
            ))}
          </div>

          {/* Tab Description */}
          <div className="mt-3 text-center text-sm text-muted-foreground">
            {tabs.find(tab => tab.id === activeTab)?.description}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mb-8">
          {getTabContent()}
        </div>

        {/* Import History */}
        {importHistory.length > 0 && (
          <div className="bg-card rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <ClipboardList size={20} className="inline-block" /> インポート履歴
            </h3>
            <div className="space-y-3">
              {importHistory.map((record: any) => (
                <div
                  key={record.id}
                  className="bg-muted rounded-lg p-4 border border-border"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">
                          {record.type === 'screenshot_portfolio' ? <BarChart3 size={18} /> :
                           record.type === 'market_data_screenshot' ? <TrendingUp size={18} /> : <ClipboardList size={18} />}
                        </span>
                        <span className="font-medium text-white">
                          {record.type === 'screenshot_portfolio' ?
                            'ポートフォリオ' :
                           record.type === 'market_data_screenshot' ?
                            '市場データ' :
                            '取引履歴'
                          }
                        </span>
                        <span className={`px-2 py-1 text-xs rounded ${
                          record.status === 'success'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {record.status === 'success' ? '成功' : '失敗'}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(record.timestamp).toLocaleString()}
                      </div>
                      {record.data.portfolioData?.assets && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {record.data.portfolioData.assets.length} 件の資産
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 bg-primary-500/10 border border-primary-500/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-primary-400 mb-3 flex items-center gap-2">
            <Lightbulb size={18} className="inline-block" /> 使い方のヒント
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>
              • プロンプト生成は「AIアドバイザー」タブをご利用ください
            </div>
            <div>
              • 外部AIでの分析完了後、結果をこちらに貼り付けてください
            </div>
            <div>
              • JSONエクスポート機能でデータのバックアップが取れます
            </div>
            <div>
              • このアプリからスクリーンショットが送信されることはありません
            </div>
            <div>
              • 複数の証券会社のデータを統合して管理できます
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataImport;
