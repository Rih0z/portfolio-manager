/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/components/settings/PortfolioYamlConverter.jsx
 * 
 * 作成者: Claude Code
 * 作成日: 2025-09-05
 * 
 * 説明:
 * ポートフォリオデータをYAML形式で入出力する機能を提供するコンポーネント。
 * AIとの連携で使用するYAMLプロンプトの生成と、返却されたYAMLデータの取り込みをサポート。
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';

const PortfolioYamlConverter = () => {
  const { t, i18n } = useTranslation();
  const { 
    portfolio, 
    targetPortfolio, 
    updatePortfolioFromImport,
    totalAssets,
    baseCurrency 
  } = usePortfolioContext();
  
  const [yamlOutput, setYamlOutput] = useState('');
  const [yamlInput, setYamlInput] = useState('');
  const [importStatus, setImportStatus] = useState(null);
  const [showCopyConfirm, setShowCopyConfirm] = useState(false);
  
  const isJapanese = i18n.language === 'ja';

  // ポートフォリオデータをYAML形式に変換
  const generateYamlPrompt = useCallback(() => {
    const yamlData = {
      portfolio: {
        totalAssets: totalAssets || 0,
        currency: baseCurrency || 'JPY',
        timestamp: new Date().toISOString(),
        currentAllocation: portfolio.map(item => ({
          ticker: item.ticker,
          name: item.name,
          holdings: item.holdings || 0,
          price: item.price || 0,
          value: (item.holdings || 0) * (item.price || 0),
          percentage: item.percentage || 0,
          type: item.type || 'stock'
        })),
        targetAllocation: targetPortfolio.map(item => ({
          ticker: item.ticker,
          name: item.name,
          targetPercentage: item.targetPercentage || 0,
          type: item.type || 'stock'
        }))
      }
    };

    const yamlString = `# ポートフォリオデータ (YAML形式)
# 生成日時: ${new Date().toLocaleString('ja-JP')}
# 
# このデータをAI（Claude, ChatGPT等）に渡して分析を依頼してください。
# プロンプト例：
# "以下のポートフォリオデータを分析し、改善提案をしてください。
#  現在の配分と理想的な配分を比較し、具体的なリバランス戦略を提案してください。"

portfolio:
  総資産額: ${yamlData.portfolio.totalAssets} ${yamlData.portfolio.currency}
  基準通貨: ${yamlData.portfolio.currency}
  データ取得日時: "${yamlData.portfolio.timestamp}"
  
  現在の保有資産:
${yamlData.portfolio.currentAllocation.map(item => `    - ティッカー: ${item.ticker}
      銘柄名: "${item.name}"
      保有数: ${item.holdings}
      現在価格: ${item.price}
      評価額: ${item.value}
      配分率: ${item.percentage}%
      タイプ: ${item.type}`).join('\n')}
  
  理想的な配分:
${yamlData.portfolio.targetAllocation.map(item => `    - ティッカー: ${item.ticker}
      銘柄名: "${item.name}"
      目標配分率: ${item.targetPercentage}%
      タイプ: ${item.type}`).join('\n')}

# AI分析依頼事項:
# 1. 現在のポートフォリオのリスク分析
# 2. 理想配分との差異分析
# 3. リバランス戦略の提案
# 4. 市場環境を考慮した投資提案
# 5. 今後6ヶ月の投資計画`;

    setYamlOutput(yamlString);
    return yamlString;
  }, [portfolio, targetPortfolio, totalAssets, baseCurrency]);

  // YAMLデータをパースしてポートフォリオに取り込む
  const parseYamlInput = useCallback((yamlText) => {
    try {
      // 簡易的なYAMLパーサー（基本的な構造のみ対応）
      const lines = yamlText.split('\n');
      const assets = [];
      let currentAsset = null;
      let inCurrentSection = false;
      let inTargetSection = false;

      lines.forEach(line => {
        const trimmed = line.trim();
        
        // セクション判定
        if (trimmed.includes('現在の保有資産:') || trimmed.includes('current_holdings:')) {
          inCurrentSection = true;
          inTargetSection = false;
          return;
        }
        if (trimmed.includes('理想的な配分:') || trimmed.includes('target_allocation:')) {
          inCurrentSection = false;
          inTargetSection = true;
          return;
        }
        
        // アセット情報の抽出
        if (inCurrentSection) {
          if (trimmed.startsWith('- ティッカー:') || trimmed.startsWith('- ticker:')) {
            if (currentAsset) assets.push(currentAsset);
            const ticker = trimmed.split(':')[1]?.trim();
            currentAsset = { ticker };
          } else if (currentAsset) {
            if (trimmed.includes('銘柄名:') || trimmed.includes('name:')) {
              currentAsset.name = trimmed.split(':')[1]?.trim().replace(/"/g, '');
            } else if (trimmed.includes('保有数:') || trimmed.includes('holdings:')) {
              currentAsset.holdings = parseFloat(trimmed.split(':')[1]?.trim()) || 0;
            } else if (trimmed.includes('現在価格:') || trimmed.includes('price:')) {
              currentAsset.price = parseFloat(trimmed.split(':')[1]?.trim()) || 0;
            } else if (trimmed.includes('配分率:') || trimmed.includes('percentage:')) {
              currentAsset.percentage = parseFloat(trimmed.split(':')[1]?.trim().replace('%', '')) || 0;
            }
          }
        }
      });
      
      if (currentAsset) assets.push(currentAsset);
      
      return { assets, success: true };
    } catch (error) {
      console.error('YAML parse error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const handleGenerateYaml = () => {
    generateYamlPrompt();
    setImportStatus({ type: 'success', message: isJapanese ? 'YAML生成完了' : 'YAML generated' });
  };

  const handleCopyYaml = () => {
    navigator.clipboard.writeText(yamlOutput).then(() => {
      setShowCopyConfirm(true);
      setTimeout(() => setShowCopyConfirm(false), 2000);
    });
  };

  const handleImportYaml = () => {
    const result = parseYamlInput(yamlInput);
    
    if (result.success && result.assets.length > 0) {
      updatePortfolioFromImport(result.assets);
      setImportStatus({ 
        type: 'success', 
        message: isJapanese 
          ? `${result.assets.length}件の資産を取り込みました` 
          : `Imported ${result.assets.length} assets`
      });
      setYamlInput('');
    } else {
      setImportStatus({ 
        type: 'error', 
        message: isJapanese 
          ? 'YAMLの解析に失敗しました' 
          : 'Failed to parse YAML'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* YAML生成セクション */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          {isJapanese ? 'AI分析用YAMLプロンプト生成' : 'Generate YAML Prompt for AI Analysis'}
        </h3>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {isJapanese 
            ? '現在のポートフォリオをYAML形式で出力し、AIに分析を依頼できます。'
            : 'Export your portfolio in YAML format for AI analysis.'}
        </p>

        <button
          onClick={handleGenerateYaml}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mb-4"
        >
          {isJapanese ? 'YAMLプロンプトを生成' : 'Generate YAML Prompt'}
        </button>

        {yamlOutput && (
          <div className="relative">
            <textarea
              value={yamlOutput}
              readOnly
              className="w-full h-64 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm font-mono"
            />
            <button
              onClick={handleCopyYaml}
              className="absolute top-2 right-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            >
              {showCopyConfirm ? '✓ コピーしました' : 'コピー'}
            </button>
          </div>
        )}
      </div>

      {/* YAML取り込みセクション */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          {isJapanese ? 'AI分析結果（YAML）の取り込み' : 'Import AI Analysis Results (YAML)'}
        </h3>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {isJapanese 
            ? 'AIから返却されたYAML形式のデータを貼り付けて取り込みます。'
            : 'Paste YAML data returned from AI analysis.'}
        </p>

        <textarea
          value={yamlInput}
          onChange={(e) => setYamlInput(e.target.value)}
          placeholder={isJapanese 
            ? 'AIから返却されたYAMLデータをここに貼り付けてください...' 
            : 'Paste YAML data from AI here...'}
          className="w-full h-48 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm font-mono"
        />

        <button
          onClick={handleImportYaml}
          disabled={!yamlInput.trim()}
          className={`mt-4 px-4 py-2 rounded-lg transition-colors ${
            yamlInput.trim() 
              ? 'bg-green-600 text-white hover:bg-green-700' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isJapanese ? 'YAMLデータを取り込む' : 'Import YAML Data'}
        </button>

        {importStatus && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            importStatus.type === 'success' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            {importStatus.message}
          </div>
        )}
      </div>

      {/* 使用方法の説明 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
          {isJapanese ? '使用方法' : 'How to Use'}
        </h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-300">
          <li>{isJapanese ? 'YAMLプロンプトを生成してコピー' : 'Generate and copy YAML prompt'}</li>
          <li>{isJapanese ? 'Claude、ChatGPT等のAIに貼り付けて分析を依頼' : 'Paste to AI (Claude, ChatGPT) for analysis'}</li>
          <li>{isJapanese ? 'AIから返却された改善案（YAML形式）を取り込み' : 'Import AI suggestions in YAML format'}</li>
          <li>{isJapanese ? 'ポートフォリオが自動的に更新されます' : 'Portfolio will be updated automatically'}</li>
        </ol>
      </div>
    </div>
  );
};

export default PortfolioYamlConverter;