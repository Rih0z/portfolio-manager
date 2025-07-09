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
  const [activeTab, setActiveTab] = useState('ai-result');
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
      setActiveTab('ai-result');
    }
  }, []);

  const tabs = [
    {
      id: 'ai-result',
      name: isJapanese ? 'AI分析結果' : 'AI Results',
      icon: <HiDocumentText className="w-5 h-5" />,
      description: isJapanese 
        ? '外部AIで分析された結果をテキストで受け取り'
        : 'Receive AI analysis results as text'
    },
    {
      id: 'yaml-data',
      name: isJapanese ? 'YAML/JSON' : 'YAML/JSON',
      icon: <FaFileCode className="w-5 h-5" />,
      description: isJapanese 
        ? 'YAML/JSON形式でポートフォリオや戦略データを管理'
        : 'Manage portfolio and strategy data in YAML/JSON format'
    },
    {
      id: 'google-drive',
      name: isJapanese ? 'Google Drive連携' : 'Google Drive Sync',
      icon: <FaFileAlt className="w-5 h-5" />,
      description: isJapanese 
        ? 'Google Driveでデータを同期・バックアップ'
        : 'Sync and backup data with Google Drive'
    },
    {
      id: 'export',
      name: isJapanese ? 'データエクスポート' : 'Data Export',
      icon: <FaFileAlt className="w-5 h-5" />,
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
      case 'ai-result':
        return (
          <ScreenshotAnalyzer 
            onDataExtracted={handleDataExtracted}
            className="w-full"
          />
        );
      
      case 'yaml-data':
        return (
          <div className="bg-dark-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <FaFileCode className="text-primary-400 text-xl" />
              <h3 className="text-xl font-semibold text-white">
                {isJapanese ? 'YAML/JSONデータ管理' : 'YAML/JSON Data Management'}
              </h3>
            </div>
            
            {/* YAML Strategy Template Generator */}
            <div className="mb-6">
              <h4 className="font-medium text-white mb-3">
                {isJapanese ? 'データ取得専用プロンプト生成' : 'Data Acquisition Prompt Generation'}
              </h4>
              <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-primary-400 font-medium mb-2">
                  <FaLightbulb />
                  <h5>{isJapanese ? 'AI戦略データ取得プロンプト' : 'AI Strategy Data Acquisition Prompt'}</h5>
                </div>
                <div className="bg-dark-300 rounded-lg p-4 text-sm text-gray-300">
                  <div className="mb-2 font-medium text-white">
                    {isJapanese ? '以下のプロンプトをAIに送信してください：' : 'Send the following prompt to AI:'}
                  </div>
                  <pre className="whitespace-pre-wrap text-xs">
{`あなたは投資戦略エキスパートです。以下のYAMLテンプレートに従って、ポートフォリオ最適化のためのデータ構造を生成してください。

# YAML戦略データテンプレート
\`\`\`yaml
investment_strategy:
  meta:
    version: "1.0"
    created_at: "${new Date().toISOString()}"
    strategy_type: "data_driven_optimization"
    
  market_analysis:
    target_markets:
      - market: "日本株"
        allocation_target: 40
        risk_level: "medium"
        sectors:
          - "technology"
          - "healthcare"
          - "finance"
      - market: "米国株"
        allocation_target: 35
        risk_level: "medium"
        sectors:
          - "technology"
          - "consumer_discretionary"
      - market: "新興国"
        allocation_target: 15
        risk_level: "high"
      - market: "債券"
        allocation_target: 10
        risk_level: "low"
        
  asset_recommendations:
    equities:
      - ticker: "7203.T"
        name: "トヨタ自動車"
        allocation: 5.0
        reason: "自動車産業のリーダー"
        target_price: 2500
      - ticker: "AAPL"
        name: "Apple Inc."
        allocation: 8.0
        reason: "テクノロジー分野の安定企業"
        target_price: 200
        
  risk_management:
    max_position_size: 10.0
    sector_concentration_limit: 25.0
    rebalancing_frequency: "quarterly"
    stop_loss_threshold: -15.0
    
  performance_targets:
    annual_return_target: 8.0
    max_drawdown_limit: -20.0
    sharpe_ratio_target: 1.2
\`\`\`

このテンプレートを参考に、現在の市場状況に応じた具体的な投資戦略をYAML形式で提案してください。`}
                  </pre>
                </div>
                <button
                  onClick={() => {
                    const promptText = document.querySelector('pre').textContent;
                    navigator.clipboard.writeText(promptText).then(() => {
                      alert(isJapanese ? 'プロンプトをクリップボードにコピーしました' : 'Prompt copied to clipboard');
                    });
                  }}
                  className="mt-3 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {isJapanese ? 'プロンプトをコピー' : 'Copy Prompt'}
                </button>
              </div>
            </div>

            {/* YAML Import Section */}
            <div className="mb-6">
              <h4 className="font-medium text-white mb-3">
                {isJapanese ? 'YAML戦略データインポート' : 'YAML Strategy Data Import'}
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
                  ? 'AIで生成されたYAML戦略データをここに貼り付けてください...\n\ninvestment_strategy:\n  meta:\n    version: "1.0"\n    strategy_type: "data_driven_optimization"\n  market_analysis:\n    target_markets:\n      - market: "日本株"\n        allocation_target: 40\n        risk_level: "medium"'
                  : 'Paste AI-generated YAML strategy data here...\n\ninvestment_strategy:\n  meta:\n    version: "1.0"\n    strategy_type: "data_driven_optimization"\n  market_analysis:\n    target_markets:\n      - market: "Japanese Stocks"\n        allocation_target: 40\n        risk_level: "medium"'
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
                        (validationResult.isValid ? `YAML戦略データ検証成功 (${validationResult.format || 'YAML'}形式)` : 'YAML戦略データ検証エラー') :
                        (validationResult.isValid ? `YAML Strategy Validation Successful (${validationResult.format || 'YAML'} format)` : 'YAML Strategy Validation Error')
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
                    ? (isJapanese ? 'YAML戦略データインポート中...' : 'Importing YAML Strategy...')
                    : (isJapanese ? 'YAML戦略データをインポート' : 'Import YAML Strategy Data')
                  }
                </button>
              )}
            </div>

            {/* YAML Help */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-400 font-medium mb-2">
                <FaLightbulb />
                <h5>{isJapanese ? 'YAML戦略データについて' : 'About YAML Strategy Data'}</h5>
              </div>
              <div className="space-y-1 text-sm text-gray-300">
                <div>
                  • {isJapanese 
                    ? 'AI生成の投資戦略をYAML形式で構造化管理'
                    : 'Structured management of AI-generated investment strategies in YAML format'
                  }
                </div>
                <div>
                  • {isJapanese 
                    ? '市場分析、資産推奨、リスク管理を包含したデータ'
                    : 'Data including market analysis, asset recommendations, and risk management'
                  }
                </div>
                <div>
                  • {isJapanese 
                    ? 'ポートフォリオ最適化のための戦略的データ取得'
                    : 'Strategic data acquisition for portfolio optimization'
                  }
                </div>
                <div>
                  • {isJapanese 
                    ? 'バージョン管理対応で戦略の進化を追跡'
                    : 'Version control support to track strategy evolution'
                  }
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'google-drive':
        return (
          <div className="bg-dark-200 rounded-lg p-6">
            <GoogleDriveIntegration />
          </div>
        );
      
      case 'export':
        return (
          <div className="bg-dark-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <FaFileAlt className="text-primary-400 text-xl" />
              <h3 className="text-xl font-semibold text-white">
                {isJapanese ? 'YAMLエクスポート' : 'YAML Export'}
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
                {isJapanese ? 'YAMLファイルとしてエクスポート' : 'Export as YAML File'}
              </button>
            </div>

            {/* Export Info */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-400 font-medium mb-2">
                <FaFileAlt />
                <h5>{isJapanese ? 'YAMLエクスポート内容' : 'YAML Export Contents'}</h5>
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
            <h1>{isJapanese ? 'データ取り込み' : 'Data Import'}</h1>
          </div>
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
                  {isJapanese ? '成功インポート' : 'Successful Imports'}
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
                  {isJapanese ? '追加された資産' : 'Assets Added'}
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
              <h3>{isJapanese ? 'インポート履歴' : 'Import History'}</h3>
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
            <h3>{isJapanese ? '使い方のヒント' : 'Usage Tips'}</h3>
          </div>
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
