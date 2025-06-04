/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/pages/DataImport.jsx
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

import React, { useState, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { PortfolioContext } from '../context/PortfolioContext';
import ScreenshotAnalyzer from '../components/ai/ScreenshotAnalyzer';

const DataImport = () => {
  const { t, i18n } = useTranslation();
  const { portfolio, updatePortfolio } = useContext(PortfolioContext);
  const [activeTab, setActiveTab] = useState('ai-result');
  const [importHistory, setImportHistory] = useState([]);
  const [importStats, setImportStats] = useState({
    totalImports: 0,
    successfulImports: 0,
    assetsAdded: 0
  });
  const [jsonImportData, setJsonImportData] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const isJapanese = i18n.language === 'ja';

  const tabs = [
    {
      id: 'ai-result',
      name: isJapanese ? 'AI分析結果' : 'AI Results',
      icon: '📄',
      description: isJapanese 
        ? '外部AIで分析された結果をテキストで受け取り'
        : 'Receive AI analysis results as text'
    },
    {
      id: 'json',
      name: isJapanese ? 'JSONインポート' : 'JSON Import',
      icon: '📁',
      description: isJapanese 
        ? 'JSONファイルからポートフォリオデータを読み込み'
        : 'Import portfolio data from JSON files'
    },
    {
      id: 'export',
      name: isJapanese ? 'データエクスポート' : 'Data Export',
      icon: '💾',
      description: isJapanese 
        ? '現在のポートフォリオデータをエクスポート'
        : 'Export current portfolio data'
    }
  ];

  const handleDataExtracted = (extractedData, analysisType) => {
    console.log('抽出されたデータ:', extractedData);
    
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
      const updatedAssets = [...(portfolio.assets || [])];
      
      newAssets.forEach(newAsset => {
        // 重複チェック（ティッカーシンボルで判定）
        const existingIndex = updatedAssets.findIndex(
          asset => asset.ticker === newAsset.ticker
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

  const handlePromptGenerated = (prompt) => {
    console.log('生成されたプロンプト:', prompt);
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
        
        console.log('JSONインポート成功:', importedData);
      } else {
        throw new Error('Invalid portfolio data format');
      }
    } catch (error) {
      console.error('JSONインポートエラー:', error);
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

  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e) => {
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
          <div className="bg-dark-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">
              📁 {isJapanese ? 'JSONインポート' : 'JSON Import'}
            </h3>
            
            {/* File Import */}
            <div className="mb-6">
              <h4 className="font-medium text-white mb-3">
                {isJapanese ? 'ファイルからインポート' : 'Import from File'}
              </h4>
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="w-full p-3 bg-dark-300 border border-dark-400 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-primary-500 file:text-white hover:file:bg-primary-600"
              />
            </div>

            {/* Text Import */}
            <div className="mb-6">
              <h4 className="font-medium text-white mb-3">
                {isJapanese ? 'JSONテキストから直接インポート' : 'Import from JSON Text'}
              </h4>
              <textarea
                value={jsonImportData}
                onChange={(e) => setJsonImportData(e.target.value)}
                placeholder={isJapanese 
                  ? 'JSONデータをここに貼り付けてください...'
                  : 'Paste JSON data here...'
                }
                className="w-full p-3 bg-dark-300 border border-dark-400 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
                rows={10}
              />
              
              {jsonImportData && (
                <div className="mt-3">
                  <button
                    onClick={handleJsonImport}
                    disabled={isImporting}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors duration-200 ${
                      isImporting
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-primary-500 hover:bg-primary-600 text-white'
                    }`}
                  >
                    {isImporting 
                      ? (isJapanese ? 'インポート中...' : 'Importing...')
                      : (isJapanese ? 'インポート実行' : 'Import Data')
                    }
                  </button>
                </div>
              )}
            </div>

            {/* Format Help */}
            <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4">
              <h5 className="text-primary-400 font-medium mb-2">
                💡 {isJapanese ? 'JSONフォーマットについて' : 'JSON Format Info'}
              </h5>
              <div className="space-y-1 text-sm text-gray-300">
                <div>
                  • {isJapanese 
                    ? 'エクスポートされたJSONファイルと同じ形式を使用してください'
                    : 'Use the same format as exported JSON files'
                  }
                </div>
                <div>
                  • {isJapanese 
                    ? 'assets配列にポートフォリオデータが含まれている必要があります'
                    : 'Must contain an assets array with portfolio data'
                  }
                </div>
                <div>
                  • {isJapanese 
                    ? 'インポート時に既存データとマージされます'
                    : 'Data will be merged with existing portfolio'
                  }
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'export':
        return (
          <div className="bg-dark-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">
              💾 {isJapanese ? 'データエクスポート' : 'Data Export'}
            </h3>
            
            {/* Current Portfolio Summary */}
            <div className="mb-6">
              <h4 className="font-medium text-white mb-3">
                {isJapanese ? '現在のポートフォリオ' : 'Current Portfolio'}
              </h4>
              <div className="bg-dark-300 rounded-lg p-4 border border-dark-400">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">{isJapanese ? '資産数：' : 'Assets:'}</span>
                    <span className="text-white ml-2">{portfolio?.assets?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">{isJapanese ? '総資産額：' : 'Total Value:'}</span>
                    <span className="text-white ml-2">¥{portfolio?.totalValue?.toLocaleString() || '0'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">{isJapanese ? '最終更新：' : 'Last Updated:'}</span>
                    <span className="text-white ml-2">
                      {portfolio?.lastUpdated 
                        ? new Date(portfolio.lastUpdated).toLocaleDateString()
                        : isJapanese ? '未設定' : 'Not set'
                      }
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">{isJapanese ? '通貨：' : 'Currency:'}</span>
                    <span className="text-white ml-2">{portfolio?.baseCurrency || 'JPY'}</span>
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
                {isJapanese ? 'JSONファイルとしてエクスポート' : 'Export as JSON File'}
              </button>
            </div>

            {/* Export Info */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <h5 className="text-green-400 font-medium mb-2">
                📄 {isJapanese ? 'エクスポート内容' : 'Export Contents'}
              </h5>
              <div className="space-y-1 text-sm text-gray-300">
                <div>
                  • {isJapanese 
                    ? 'すべての保有資産データ'
                    : 'All asset holdings data'
                  }
                </div>
                <div>
                  • {isJapanese 
                    ? '目標配分設定'
                    : 'Target allocation settings'
                  }
                </div>
                <div>
                  • {isJapanese 
                    ? 'ポートフォリオ設定'
                    : 'Portfolio configuration'
                  }
                </div>
                <div>
                  • {isJapanese 
                    ? 'エクスポート日時とバージョン情報'
                    : 'Export timestamp and version info'
                  }
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
    <div className="min-h-screen bg-dark-100 text-white">
      <div className="container mx-auto px-4 py-8 pb-20">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">
            📊 {isJapanese ? 'データ取り込み' : 'Data Import'}
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            {isJapanese 
              ? '外部AIで分析されたデータの受け取りや、JSONファイルでのデータ交換が行えます。プライバシーを保護しながら安全にデータを管理します。'
              : 'Receive AI-analyzed data and exchange data via JSON files. Manage your data safely while protecting privacy.'
            }
          </p>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-dark-200 rounded-lg p-4 border border-dark-400">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-primary-400">
                  {importStats.totalImports}
                </div>
                <div className="text-sm text-gray-400">
                  {isJapanese ? 'インポート回数' : 'Total Imports'}
                </div>
              </div>
              <div className="text-3xl">📈</div>
            </div>
          </div>

          <div className="bg-dark-200 rounded-lg p-4 border border-dark-400">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-400">
                  {importStats.successfulImports}
                </div>
                <div className="text-sm text-gray-400">
                  {isJapanese ? '成功インポート' : 'Successful Imports'}
                </div>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </div>

          <div className="bg-dark-200 rounded-lg p-4 border border-dark-400">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-400">
                  {importStats.assetsAdded}
                </div>
                <div className="text-sm text-gray-400">
                  {isJapanese ? '追加された資産' : 'Assets Added'}
                </div>
              </div>
              <div className="text-3xl">💎</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-dark-200 p-1 rounded-lg">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 px-4 rounded-md text-center transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-dark-300'
                }`}
              >
                <div className="text-xl mb-1">{tab.icon}</div>
                <div className="text-sm font-medium">{tab.name}</div>
              </button>
            ))}
          </div>
          
          {/* Tab Description */}
          <div className="mt-3 text-center text-sm text-gray-400">
            {tabs.find(tab => tab.id === activeTab)?.description}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mb-8">
          {getTabContent()}
        </div>

        {/* Import History */}
        {importHistory.length > 0 && (
          <div className="bg-dark-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">
              📋 {isJapanese ? 'インポート履歴' : 'Import History'}
            </h3>
            <div className="space-y-3">
              {importHistory.map(record => (
                <div
                  key={record.id}
                  className="bg-dark-300 rounded-lg p-4 border border-dark-400"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">
                          {record.type === 'screenshot_portfolio' ? '📊' :
                           record.type === 'market_data_screenshot' ? '📈' : '📋'}
                        </span>
                        <span className="font-medium text-white">
                          {record.type === 'screenshot_portfolio' ? 
                            (isJapanese ? 'ポートフォリオ' : 'Portfolio') :
                           record.type === 'market_data_screenshot' ? 
                            (isJapanese ? '市場データ' : 'Market Data') : 
                            (isJapanese ? '取引履歴' : 'Transactions')
                          }
                        </span>
                        <span className={`px-2 py-1 text-xs rounded ${
                          record.status === 'success' 
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {record.status === 'success' ? 
                            (isJapanese ? '成功' : 'Success') :
                            (isJapanese ? '失敗' : 'Failed')
                          }
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        {new Date(record.timestamp).toLocaleString()}
                      </div>
                      {record.data.portfolioData?.assets && (
                        <div className="text-sm text-gray-300 mt-1">
                          {record.data.portfolioData.assets.length} {isJapanese ? '件の資産' : 'assets'}
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
          <h3 className="text-lg font-semibold text-primary-400 mb-3">
            💡 {isJapanese ? '使い方のヒント' : 'Usage Tips'}
          </h3>
          <div className="space-y-2 text-sm text-gray-300">
            <div>
              • {isJapanese 
                ? 'プロンプト生成は「AIアドバイザー」タブをご利用ください'
                : 'Use the "AI Advisor" tab for prompt generation'
              }
            </div>
            <div>
              • {isJapanese 
                ? '外部AIでの分析完了後、結果をこちらに貼り付けてください'
                : 'After analyzing with external AI, paste the results here'
              }
            </div>
            <div>
              • {isJapanese 
                ? 'JSONエクスポート機能でデータのバックアップが取れます'
                : 'Use JSON export to backup your data'
              }
            </div>
            <div>
              • {isJapanese 
                ? 'このアプリからスクリーンショットが送信されることはありません'
                : 'No screenshots are ever sent from this app'
              }
            </div>
            <div>
              • {isJapanese 
                ? '複数の証券会社のデータを統合して管理できます'
                : 'You can integrate data from multiple brokerages'
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataImport;