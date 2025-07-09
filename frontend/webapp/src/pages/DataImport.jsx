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

import React, { useState, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PortfolioContext } from '../context/PortfolioContext';
import ScreenshotAnalyzer from '../components/ai/ScreenshotAnalyzer';
import portfolioPromptService from '../services/PortfolioPromptService';
import { parseYAMLSafely } from '../utils/yamlProcessor';
import GoogleDriveIntegration from '../components/data/GoogleDriveIntegration';
import { 
  FaFileAlt, 
  FaFileCode, 
  FaCheckCircle, 
  FaExclamationCircle,
  FaChartBar,
  FaChartLine,
  FaGem,
  FaClipboardList,
  FaLightbulb,
  FaCopy
} from 'react-icons/fa';
import { HiDocumentText } from 'react-icons/hi';

const DataImport = () => {
  const { t, i18n } = useTranslation();
  const { portfolio, updatePortfolio } = useContext(PortfolioContext);
  const [activeTab, setActiveTab] = useState('ai-import');
  const [importHistory, setImportHistory] = useState([]);
  const [importStats, setImportStats] = useState({
    totalImports: 0,
    successfulImports: 0,
    assetsAdded: 0
  });
  const [jsonImportData, setJsonImportData] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  const isJapanese = i18n.language === 'ja';

  // YAMLとJSONを自動判定してパースする関数
  const parseDataWithAutoDetection = (inputData) => {
    if (!inputData || typeof inputData !== 'string') {
      throw new Error('Invalid input data');
    }

    const trimmedData = inputData.trim();
    
    // JSON形式を試行
    try {
      const jsonData = JSON.parse(trimmedData);
      return { data: jsonData, format: 'JSON' };
    } catch (jsonError) {
      // JSON失敗時、YAML形式を試行
      try {
        const yamlData = parseYAMLSafely(trimmedData);
        return { data: yamlData, format: 'YAML' };
      } catch (yamlError) {
        throw new Error(`データ形式を認識できません。JSON Error: ${jsonError.message}, YAML Error: ${yamlError.message}`);
      }
    }
  };

  // URLパラメータからタブを設定
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'ai-analysis') {
      setActiveTab('ai-import');
    }
  }, []);

  const tabs = [
    {
      id: 'ai-import',
      name: isJapanese ? 'AI結果取り込み' : 'AI Import',
      icon: <HiDocumentText className="w-5 h-5" />,
      description: isJapanese 
        ? '外部AIで分析されたポートフォリオデータを取り込み'
        : 'Import portfolio data analyzed by external AI'
    },
    {
      id: 'file-import',
      name: isJapanese ? 'ファイル取り込み' : 'File Import',
      icon: <FaFileCode className="w-5 h-5" />,
      description: isJapanese 
        ? 'YAML/JSON形式のファイルからデータを取り込み'
        : 'Import data from YAML/JSON files'
    },
    {
      id: 'cloud-sync',
      name: isJapanese ? 'クラウド同期' : 'Cloud Sync',
      icon: <FaFileAlt className="w-5 h-5" />,
      description: isJapanese 
        ? 'Google Driveとデータを同期・バックアップ'
        : 'Sync and backup data with Google Drive'
    },
    {
      id: 'data-export',
      name: isJapanese ? 'データ出力' : 'Data Export',
      icon: <FaFileAlt className="w-5 h-5" />,
      description: isJapanese 
        ? 'ポートフォリオデータをファイル出力'
        : 'Export portfolio data to files'
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
      
      // AIからのポートフォリオJSONを検証
      const validation = portfolioPromptService.validatePortfolioJSON(importedData);
      setValidationResult(validation);
      
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
      
      // ポートフォリオデータの構造を検証
      const portfolioData = importedData.portfolio || importedData;
      if (portfolioData.assets && Array.isArray(portfolioData.assets)) {
        // 既存のポートフォリオと統合
        const updatedPortfolio = {
          ...portfolio,
          ...portfolioData,
          lastImportAt: new Date().toISOString()
        };
        
        updatePortfolio(updatedPortfolio);
        
        // 統計を更新
        setImportStats(prev => ({
          ...prev,
          totalImports: prev.totalImports + 1,
          successfulImports: prev.successfulImports + 1,
          assetsAdded: prev.assetsAdded + portfolioData.assets.length
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

  const handleExportYaml = () => {
    const exportData = {
      portfolio: {
        ...portfolio,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      }
    };
    
    try {
      // YAML文字列に変換（yamlProcessorを使用）
      const yamlStr = `# Portfolio Data Export
# Generated by Portfolio Wise - ${new Date().toLocaleString()}
# Version: 1.0

portfolio:
  exportedAt: "${exportData.portfolio.exportedAt}"
  version: "${exportData.portfolio.version}"
  baseCurrency: "${exportData.portfolio.baseCurrency || 'JPY'}"
  totalValue: ${exportData.portfolio.totalValue || 0}
  lastUpdated: "${exportData.portfolio.lastUpdated || new Date().toISOString()}"
  
  assets:${exportData.portfolio.assets && exportData.portfolio.assets.length > 0 ? 
    exportData.portfolio.assets.map(asset => `
    - name: "${asset.name}"
      ticker: "${asset.ticker || ''}"
      type: "${asset.type || 'stock'}"
      quantity: ${asset.quantity || 0}
      averagePrice: ${asset.averagePrice || 0}
      currentPrice: ${asset.currentPrice || 0}
      currency: "${asset.currency || 'JPY'}"
      market: "${asset.market || 'Japan'}"
      sector: "${asset.sector || ''}"
      totalValue: ${asset.totalValue || 0}`).join('') : '\n    []'
  }
  
  targetPortfolio:${exportData.portfolio.targetPortfolio && exportData.portfolio.targetPortfolio.length > 0 ?
    exportData.portfolio.targetPortfolio.map(target => `
    - ticker: "${target.ticker}"
      targetPercent: ${target.targetPercent || 0}
      currentPercent: ${target.currentPercent || 0}`).join('') : '\n    []'
  }`;
      
      const dataBlob = new Blob([yamlStr], { type: 'text/yaml' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `portfolio-data-${Date.now()}.yaml`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('YAML Export Error:', error);
      // フォールバック：JSON形式でエクスポート
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `portfolio-data-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (file && (file.type === 'application/json' || 
                 file.name.endsWith('.yaml') || 
                 file.name.endsWith('.yml') ||
                 file.type === 'text/yaml' ||
                 file.type === 'text/x-yaml' ||
                 file.type === 'application/x-yaml')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setJsonImportData(e.target.result);
      };
      reader.readAsText(file);
    } else {
      console.warn('Unsupported file type:', file.type, file.name);
      alert(isJapanese 
        ? 'YAMLまたはJSONファイルを選択してください'
        : 'Please select a YAML or JSON file'
      );
    }
  };


  const getTabContent = () => {
    switch (activeTab) {
      case 'ai-import':
        return (
          <div className="bg-dark-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <HiDocumentText className="text-primary-400 text-xl" />
              <h3 className="text-xl font-semibold text-white">
                {isJapanese ? 'AI結果取り込み' : 'AI Result Import'}
              </h3>
            </div>
            <ScreenshotAnalyzer 
              onDataExtracted={handleDataExtracted}
              className="w-full"
            />
          </div>
        );
      
      case 'file-import':
        return (
          <div className="bg-dark-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <FaFileCode className="text-primary-400 text-xl" />
              <h3 className="text-xl font-semibold text-white">
                {isJapanese ? 'YAML/JSONデータ管理' : 'YAML/JSON Data Management'}
              </h3>
            </div>
            
            {/* File Upload Section */}
            <div className="mb-6">
              <h4 className="font-medium text-white mb-3">
                {isJapanese ? 'ファイルからインポート' : 'Import from File'}
              </h4>
              <div className="bg-dark-300 rounded-lg p-4 border border-dark-400 mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {isJapanese ? 'YAML/JSONファイルを選択' : 'Select YAML/JSON File'}
                </label>
                <input
                  type="file"
                  accept=".yaml,.yml,.json"
                  onChange={handleFileImport}
                  className="w-full px-3 py-2 bg-dark-400 border border-dark-500 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-500 file:text-white hover:file:bg-primary-600"
                />
                <p className="text-xs text-gray-400 mt-2">
                  {isJapanese 
                    ? '対応形式: .yaml, .yml, .json'
                    : 'Supported formats: .yaml, .yml, .json'
                  }
                </p>
              </div>
            </div>

            {/* Direct Data Import Section */}
            <div className="mb-6">
              <h4 className="font-medium text-white mb-3">
                {isJapanese ? 'テキストデータ貼り付け' : 'Paste Text Data'}
              </h4>
              <textarea
                value={jsonImportData}
                onChange={(e) => {
                  setJsonImportData(e.target.value);
                  // リアルタイム検証（YAML/JSON自動判定）
                  if (e.target.value.trim()) {
                    try {
                      const parseResult = parseDataWithAutoDetection(e.target.value);
                      const validation = portfolioPromptService.validatePortfolioJSON(parseResult.data);
                      setValidationResult({
                        ...validation,
                        format: parseResult.format
                      });
                    } catch (error) {
                      setValidationResult({
                        isValid: false,
                        errors: [`データ解析エラー: ${error.message}`],
                        warnings: [],
                        format: 'Unknown'
                      });
                    }
                  } else {
                    setValidationResult(null);
                  }
                }}
                placeholder={isJapanese 
                  ? 'YAML/JSON形式のポートフォリオデータをここに貼り付けてください...\n\nportfolio:\n  assets:\n    - ticker: "AAPL"\n      name: "Apple Inc."\n      quantity: 10\n      price: 150.00\n    - ticker: "7203.T"\n      name: "トヨタ自動車"\n      quantity: 100\n      price: 2500'
                  : 'Paste YAML/JSON portfolio data here...\n\nportfolio:\n  assets:\n    - ticker: "AAPL"\n      name: "Apple Inc."\n      quantity: 10\n      price: 150.00\n    - ticker: "7203.T"\n      name: "Toyota Motor"\n      quantity: 100\n      price: 2500'
                }
                className="w-full p-3 bg-dark-300 border border-dark-400 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
                rows={12}
              />
              
              {jsonImportData && validationResult && (
                <div className={`mt-3 p-3 rounded-lg border ${
                  validationResult.isValid 
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {validationResult.isValid ? (
                      <FaCheckCircle className="text-green-400" />
                    ) : (
                      <FaExclamationCircle className="text-red-400" />
                    )}
                    <span className={`font-medium ${
                      validationResult.isValid ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {isJapanese ? 
                        (validationResult.isValid ? `データ検証成功 (${validationResult.format || 'YAML'}形式)` : 'データ検証エラー') :
                        (validationResult.isValid ? `Data Validation Successful (${validationResult.format || 'YAML'} format)` : 'Data Validation Error')
                      }
                    </span>
                  </div>
                  
                  {validationResult.isValid ? (
                    <div className="text-sm text-gray-300">
                      <div>• {isJapanese ? '戦略タイプ' : 'Strategy Type'}: {validationResult.strategyType || 'Unknown'}</div>
                      <div>• {isJapanese ? '市場分析' : 'Market Analysis'}: {validationResult.marketCount || 0} {isJapanese ? '市場' : 'markets'}</div>
                      <div>• {isJapanese ? '推奨資産' : 'Recommended Assets'}: {validationResult.assetsCount || 0}</div>
                    </div>
                  ) : (
                    <div className="text-sm text-red-300">
                      {validationResult.errors.map((error, index) => (
                        <div key={index}>• {error}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {jsonImportData && (
                <button
                  onClick={handleJsonImport}
                  disabled={isImporting}
                  className={`mt-3 w-full py-2 px-4 rounded-lg font-medium transition-colors duration-200 ${
                    isImporting
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-primary-500 hover:bg-primary-600 text-white'
                  }`}
                >
                  {isImporting 
                    ? (isJapanese ? 'データインポート中...' : 'Importing Data...')
                    : (isJapanese ? 'データをインポート' : 'Import Data')
                  }
                </button>
              )}
            </div>

            {/* Import Help */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-400 font-medium mb-2">
                <FaLightbulb />
                <h5>{isJapanese ? 'ファイル取り込みについて' : 'About File Import'}</h5>
              </div>
              <div className="space-y-1 text-sm text-gray-300">
                <div>
                  • {isJapanese 
                    ? 'YAML/JSON形式のポートフォリオデータを取り込み'
                    : 'Import portfolio data in YAML/JSON format'
                  }
                </div>
                <div>
                  • {isJapanese 
                    ? 'ファイルアップロードまたは直接貼り付けに対応'
                    : 'Supports file upload or direct paste'
                  }
                </div>
                <div>
                  • {isJapanese 
                    ? '自動データ検証でエラーを事前に検出'
                    : 'Automatic data validation to detect errors'
                  }
                </div>
                <div>
                  • {isJapanese 
                    ? '既存データとの統合で重複を自動処理'
                    : 'Automatic handling of duplicates when merging with existing data'
                  }
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'cloud-sync':
        return (
          <div className="bg-dark-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <FaFileAlt className="text-primary-400 text-xl" />
              <h3 className="text-xl font-semibold text-white">
                {isJapanese ? 'クラウド同期' : 'Cloud Sync'}
              </h3>
            </div>
            <GoogleDriveIntegration />
          </div>
        );
      
      case 'data-export':
        return (
          <div className="bg-dark-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <FaFileAlt className="text-primary-400 text-xl" />
              <h3 className="text-xl font-semibold text-white">
                {isJapanese ? 'データ出力' : 'Data Export'}
              </h3>
            </div>
            
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
                onClick={handleExportYaml}
                className="w-full py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors duration-200"
              >
                {isJapanese ? 'YAML形式でエクスポート' : 'Export as YAML File'}
              </button>
            </div>

            {/* Export Info */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-400 font-medium mb-2">
                <FaFileAlt />
                <h5>{isJapanese ? 'データ出力内容' : 'Data Export Contents'}</h5>
              </div>
              <div className="space-y-1 text-sm text-gray-300">
                <div>
                  • {isJapanese 
                    ? 'すべての保有資産データ（YAML形式）'
                    : 'All asset holdings data (YAML format)'
                  }
                </div>
                <div>
                  • {isJapanese 
                    ? '目標配分設定（構造化データ）'
                    : 'Target allocation settings (structured data)'
                  }
                </div>
                <div>
                  • {isJapanese 
                    ? 'ポートフォリオ設定（人間が読みやすい形式）'
                    : 'Portfolio configuration (human-readable format)'
                  }
                </div>
                <div>
                  • {isJapanese 
                    ? 'エクスポート日時とバージョン情報（メタデータ）'
                    : 'Export timestamp and version info (metadata)'
                  }
                </div>
                <div>
                  • {isJapanese 
                    ? 'コメント付きで分かりやすいデータ構造'
                    : 'Clear data structure with comments'
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
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 text-3xl font-bold mb-4">
            <FaChartBar className="text-primary-400" />
            <h1>{isJapanese ? 'データ連携' : 'Data Integration'}</h1>
          </div>
          <p className="text-gray-400 max-w-2xl mx-auto">
            {isJapanese 
              ? 'AI分析結果の取り込み、ファイル連携、クラウド同期、データ出力などの連携機能を提供します。プライバシーを保護しながら安全にデータを管理します。'
              : 'Provides integration features including AI result import, file connectivity, cloud sync, and data export. Manage your data safely while protecting privacy.'
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
                  {isJapanese ? '連携回数' : 'Total Integrations'}
                </div>
              </div>
              <FaChartLine className="text-3xl text-primary-400" />
            </div>
          </div>

          <div className="bg-dark-200 rounded-lg p-4 border border-dark-400">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-400">
                  {importStats.successfulImports}
                </div>
                <div className="text-sm text-gray-400">
                  {isJapanese ? '成功連携' : 'Successful Integrations'}
                </div>
              </div>
              <FaCheckCircle className="text-3xl text-green-400" />
            </div>
          </div>

          <div className="bg-dark-200 rounded-lg p-4 border border-dark-400">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-400">
                  {importStats.assetsAdded}
                </div>
                <div className="text-sm text-gray-400">
                  {isJapanese ? '連携データ件数' : 'Data Records Integrated'}
                </div>
              </div>
              <FaGem className="text-3xl text-blue-400" />
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
            <div className="flex items-center gap-2 text-xl font-semibold text-white mb-4">
              <FaClipboardList className="text-primary-400" />
              <h3>{isJapanese ? '連携履歴' : 'Integration History'}</h3>
            </div>
            <div className="space-y-3">
              {importHistory.map(record => (
                <div
                  key={record.id}
                  className="bg-dark-300 rounded-lg p-4 border border-dark-400"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-lg">
                          {record.type === 'screenshot_portfolio' ? <FaChartBar className="text-primary-400" /> :
                           record.type === 'market_data_screenshot' ? <FaChartLine className="text-green-400" /> : 
                           <FaClipboardList className="text-blue-400" />}
                        </div>
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
          <div className="flex items-center gap-2 text-lg font-semibold text-primary-400 mb-3">
            <FaLightbulb />
            <h3>{isJapanese ? 'データ連携のヒント' : 'Data Integration Tips'}</h3>
          </div>
          <div className="space-y-2 text-sm text-gray-300">
            <div>
              • {isJapanese 
                ? 'AI結果取り込み：外部AIで分析されたポートフォリオデータを取り込み'
                : 'AI Import: Import portfolio data analyzed by external AI'
              }
            </div>
            <div>
              • {isJapanese 
                ? 'ファイル取り込み：YAML/JSON形式でデータを一括インポート'
                : 'File Import: Bulk import data in YAML/JSON format'
              }
            </div>
            <div>
              • {isJapanese 
                ? 'クラウド同期：Google Driveでデータのバックアップと同期'
                : 'Cloud Sync: Backup and sync data with Google Drive'
              }
            </div>
            <div>
              • {isJapanese 
                ? 'データ出力：ポートフォリオデータを外部形式で出力'
                : 'Data Export: Export portfolio data to external formats'
              }
            </div>
            <div>
              • {isJapanese 
                ? 'このアプリからスクリーンショットが送信されることはありません'
                : 'No screenshots are ever sent from this app'
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataImport;
