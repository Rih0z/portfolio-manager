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
  FaChartPie,
  FaCalculator,
  FaCopy,
  FaDollarSign
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
  const [investmentAmount, setInvestmentAmount] = useState(100000); // 投資金額（デフォルト10万円）
  const [investmentCurrency, setInvestmentCurrency] = useState('JPY'); // 投資金額の通貨（JPY/USD）
  const [generatedOptimizationPrompt, setGeneratedOptimizationPrompt] = useState('');
  const [depositAmount, setDepositAmount] = useState(100000); // 配分計算用入金額（デフォルト10万円）
  const [generatedAllocationPrompt, setGeneratedAllocationPrompt] = useState(''); // 配分計算プロンプト

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
      id: 'yaml-strategy',
      name: isJapanese ? 'YAML戦略データ' : 'YAML Strategy',
      icon: <FaLightbulb className="w-5 h-5" />,
      description: isJapanese 
        ? 'AI戦略データをYAML形式で管理・インポート'
        : 'Manage and import AI strategy data in YAML format'
    },
    {
      id: 'yaml-data',
      name: isJapanese ? 'YAMLデータ' : 'YAML Data',
      icon: <FaFileCode className="w-5 h-5" />,
      description: isJapanese 
        ? 'YAMLファイルからポートフォリオデータを読み込み'
        : 'Import portfolio data from YAML files'
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
      id: 'portfolio-optimizer',
      name: isJapanese ? '理想比率達成' : 'Portfolio Optimizer',
      icon: <FaChartPie className="w-5 h-5" />,
      description: isJapanese 
        ? '理想比率に近づけるための最適な購入銘柄を提案'
        : 'Suggest optimal purchases to achieve target allocation'
    },
    {
      id: 'allocation-calculator',
      name: isJapanese ? '配分計算' : 'Allocation Calculator',
      icon: <FaCalculator className="w-5 h-5" />,
      description: isJapanese 
        ? '入金額から具体的な銘柄別投資金額を計算'
        : 'Calculate specific investment amounts per stock from deposit amount'
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

  // 理想比率達成プロンプト生成関数
  const generateOptimizationPrompt = () => {
    if (!portfolio.assets || portfolio.assets.length === 0) {
      alert(isJapanese 
        ? 'まず現在の資産データを入力してください'
        : 'Please input current asset data first'
      );
      return;
    }

    const currentAssets = portfolio.assets || [];
    const targetPortfolio = portfolio.targetPortfolio || [];
    const totalCurrentValue = currentAssets.reduce((sum, asset) => sum + (asset.totalValue || 0), 0);

    const promptContent = isJapanese ? `# ポートフォリオ最適化アドバイザー

あなたは専門的な投資アドバイザーです。以下の現在のポートフォリオ状況と理想比率を分析し、追加投資で理想比率に近づけるための具体的な購入推奨を提示してください。

## 📊 現在のポートフォリオ状況

**総資産額**: ¥${totalCurrentValue.toLocaleString()}
**基準通貨**: ${portfolio.baseCurrency || 'JPY'}
**最終更新**: ${portfolio.lastUpdated ? new Date(portfolio.lastUpdated).toLocaleDateString() : '未設定'}

### 保有資産一覧
${currentAssets.map((asset, index) => `
${index + 1}. **${asset.name}** (${asset.ticker || 'N/A'})
   - 保有数量: ${asset.quantity || 0}
   - 現在価値: ¥${(asset.totalValue || 0).toLocaleString()}
   - 現在比率: ${totalCurrentValue > 0 ? ((asset.totalValue || 0) / totalCurrentValue * 100).toFixed(2) : 0}%
   - セクター: ${asset.sector || '未分類'}
   - 市場: ${asset.market || '未分類'}`).join('')}

## 🎯 理想ポートフォリオ比率
${targetPortfolio.length > 0 ? 
  targetPortfolio.map((target, index) => `
${index + 1}. **${target.ticker}**: 目標比率 ${target.targetPercent}% (現在: ${target.currentPercent || 0}%)`).join('') :
  '\n目標比率が設定されていません。一般的な分散投資の観点から推奨比率を提案してください。'
}

## 💰 今回の投資予算
**追加投資金額**: ${investmentCurrency === 'USD' ? '$' : '¥'}${investmentAmount.toLocaleString()}
**投資通貨**: ${investmentCurrency}

## 📋 分析・推奨事項の要請

以下の形式でYAML形式の投資推奨を生成してください：

\`\`\`yaml
portfolio_optimization:
  analysis_date: "${new Date().toISOString()}"
  current_total_value: ${totalCurrentValue}
  additional_investment: ${investmentAmount}
  investment_currency: "${investmentCurrency}"
  target_total_value: ${totalCurrentValue + investmentAmount}
  
  current_allocation:${currentAssets.map(asset => `
    - ticker: "${asset.ticker || asset.name}"
      name: "${asset.name}"
      current_value: ${asset.totalValue || 0}
      current_percentage: ${totalCurrentValue > 0 ? ((asset.totalValue || 0) / totalCurrentValue * 100).toFixed(2) : 0}
      target_percentage: ${targetPortfolio.find(t => t.ticker === asset.ticker)?.targetPercent || 'TBD'}`).join('')}
  
  recommendations:
    - action: "buy"
      ticker: "推奨銘柄1"
      name: "銘柄名"
      suggested_amount: 推奨購入金額
      quantity: 推奨購入数量
      reason: "購入理由（理想比率達成のため）"
      
    - action: "buy"
      ticker: "推奨銘柄2"
      name: "銘柄名"
      suggested_amount: 推奨購入金額
      quantity: 推奨購入数量
      reason: "購入理由"
  
  optimization_strategy:
    priority: "理想比率への接近"
    diversification_score: "分散度評価"
    risk_assessment: "リスク評価"
    expected_outcome: "期待される結果"
    
  implementation_plan:
    step1: "最優先購入銘柄"
    step2: "次優先購入銘柄"
    step3: "追加検討事項"
\`\`\`

**重要な分析ポイント:**
1. 現在の比率と理想比率の乖離を分析
2. 追加投資${investmentCurrency === 'USD' ? '$' : '¥'}${investmentAmount.toLocaleString()}で最も効果的な理想比率接近方法
3. リスク分散の観点からの推奨
4. 具体的な購入数量と金額の提示
5. 実行優先順位の明確化

よろしくお願いいたします！` : 

`# Portfolio Optimization Advisor

You are a professional investment advisor. Please analyze the current portfolio situation and target allocation below, then provide specific purchase recommendations to achieve the ideal allocation through additional investment.

## 📊 Current Portfolio Status

**Total Assets**: ¥${totalCurrentValue.toLocaleString()}
**Base Currency**: ${portfolio.baseCurrency || 'JPY'}
**Last Updated**: ${portfolio.lastUpdated ? new Date(portfolio.lastUpdated).toLocaleDateString() : 'Not set'}

### Current Holdings
${currentAssets.map((asset, index) => `
${index + 1}. **${asset.name}** (${asset.ticker || 'N/A'})
   - Quantity: ${asset.quantity || 0}
   - Current Value: ¥${(asset.totalValue || 0).toLocaleString()}
   - Current %: ${totalCurrentValue > 0 ? ((asset.totalValue || 0) / totalCurrentValue * 100).toFixed(2) : 0}%
   - Sector: ${asset.sector || 'Unclassified'}
   - Market: ${asset.market || 'Unclassified'}`).join('')}

## 🎯 Target Portfolio Allocation
${targetPortfolio.length > 0 ? 
  targetPortfolio.map((target, index) => `
${index + 1}. **${target.ticker}**: Target ${target.targetPercent}% (Current: ${target.currentPercent || 0}%)`).join('') :
  '\nNo target allocation set. Please suggest recommended allocation from diversification perspective.'
}

## 💰 Investment Budget
**Additional Investment Amount**: ${investmentCurrency === 'USD' ? '$' : '¥'}${investmentAmount.toLocaleString()}
**Investment Currency**: ${investmentCurrency}

## 📋 Analysis & Recommendation Request

Please generate investment recommendations in YAML format:

\`\`\`yaml
portfolio_optimization:
  analysis_date: "${new Date().toISOString()}"
  current_total_value: ${totalCurrentValue}
  additional_investment: ${investmentAmount}
  investment_currency: "${investmentCurrency}"
  target_total_value: ${totalCurrentValue + investmentAmount}
  
  current_allocation:${currentAssets.map(asset => `
    - ticker: "${asset.ticker || asset.name}"
      name: "${asset.name}"
      current_value: ${asset.totalValue || 0}
      current_percentage: ${totalCurrentValue > 0 ? ((asset.totalValue || 0) / totalCurrentValue * 100).toFixed(2) : 0}
      target_percentage: ${targetPortfolio.find(t => t.ticker === asset.ticker)?.targetPercent || 'TBD'}`).join('')}
  
  recommendations:
    - action: "buy"
      ticker: "RECOMMENDED_TICKER_1"
      name: "Asset Name"
      suggested_amount: recommended_purchase_amount
      quantity: recommended_quantity
      reason: "Purchase reason (to achieve target allocation)"
      
    - action: "buy"
      ticker: "RECOMMENDED_TICKER_2"
      name: "Asset Name"
      suggested_amount: recommended_purchase_amount
      quantity: recommended_quantity
      reason: "Purchase reason"
  
  optimization_strategy:
    priority: "Approach target allocation"
    diversification_score: "Diversification assessment"
    risk_assessment: "Risk evaluation"
    expected_outcome: "Expected results"
    
  implementation_plan:
    step1: "Highest priority purchase"
    step2: "Second priority purchase"
    step3: "Additional considerations"
\`\`\`

**Key Analysis Points:**
1. Analyze gap between current and target allocation
2. Most effective approach to target allocation with ${investmentCurrency === 'USD' ? '$' : '¥'}${investmentAmount.toLocaleString()} additional investment
3. Recommendations from risk diversification perspective
4. Specific purchase quantities and amounts
5. Clear implementation priorities

Thank you!`;

    setGeneratedOptimizationPrompt(promptContent);
  };

  // 投資配分計算プロンプト生成関数
  const generateAllocationCalculationPrompt = () => {
    if (!portfolio.assets || portfolio.assets.length === 0) {
      alert(isJapanese 
        ? 'まず現在の資産データを入力してください'
        : 'Please input current asset data first'
      );
      return;
    }

    const currentAssets = portfolio.assets || [];
    const targetAllocation = portfolio.targetAllocation || [];
    const totalCurrentValue = currentAssets.reduce((sum, asset) => sum + (asset.totalValue || 0), 0);
    const newTotalValue = totalCurrentValue + depositAmount;

    // 現在の比率を計算
    const currentAllocations = currentAssets.map(asset => ({
      ...asset,
      currentPercent: totalCurrentValue > 0 ? ((asset.totalValue || 0) / totalCurrentValue * 100) : 0
    }));

    // 理想配分との乖離を計算
    const allocationGaps = targetAllocation.map(target => {
      const currentAsset = currentAssets.find(asset => 
        asset.ticker === target.ticker || asset.name === target.ticker
      );
      const currentPercent = currentAsset && totalCurrentValue > 0 ? 
        ((currentAsset.totalValue || 0) / totalCurrentValue * 100) : 0;
      
      return {
        ticker: target.ticker,
        targetPercent: target.targetPercent,
        currentPercent: currentPercent,
        gap: target.targetPercent - currentPercent,
        currentValue: currentAsset?.totalValue || 0
      };
    });

    const promptContent = isJapanese ? `# 投資配分計算エキスパート

あなたは精密な投資配分計算の専門家です。以下の現在のポートフォリオ状況と理想配分を分析し、入金額${depositAmount.toLocaleString()}円を使って理想比率に最も近づけるための具体的な投資配分を計算してください。

## 📊 現在のポートフォリオ状況

**現在の総資産額**: ¥${totalCurrentValue.toLocaleString()}
**今回の入金額**: ¥${depositAmount.toLocaleString()}
**入金後の総資産額**: ¥${newTotalValue.toLocaleString()}

### 現在の保有資産詳細
${currentAllocations.map((asset, index) => `
${index + 1}. **${asset.name}** (${asset.ticker || 'N/A'})
   - 現在価値: ¥${(asset.totalValue || 0).toLocaleString()}
   - 現在比率: ${asset.currentPercent.toFixed(2)}%
   - 保有数量: ${asset.quantity || 0}
   - セクター: ${asset.sector || '未分類'}`).join('')}

## 🎯 理想配分と現在の乖離分析

${allocationGaps.length > 0 ? 
  allocationGaps.map((gap, index) => `
${index + 1}. **${gap.ticker}**
   - 理想比率: ${gap.targetPercent}%
   - 現在比率: ${gap.currentPercent.toFixed(2)}%
   - 乖離: ${gap.gap > 0 ? '+' : ''}${gap.gap.toFixed(2)}% ${gap.gap > 0 ? '(不足)' : '(過多)'}
   - 現在価値: ¥${gap.currentValue.toLocaleString()}`).join('') :
  '\n⚠️ 理想配分が設定されていません。以下の計算では分散投資の観点から最適な配分を提案してください。'
}

## 💰 配分計算要請

入金額¥${depositAmount.toLocaleString()}を使って、理想比率に最も近づけるための具体的な投資配分をYAML形式で計算してください：

\`\`\`yaml
allocation_calculation:
  calculation_date: "${new Date().toISOString()}"
  deposit_amount: ${depositAmount}
  current_total_value: ${totalCurrentValue}
  target_total_value: ${newTotalValue}
  
  current_portfolio:${currentAllocations.map(asset => `
    - ticker: "${asset.ticker || asset.name}"
      name: "${asset.name}"
      current_value: ${asset.totalValue || 0}
      current_percentage: ${asset.currentPercent.toFixed(2)}
      target_percentage: ${targetAllocation.find(t => t.ticker === asset.ticker)?.targetPercent || 'TBD'}`).join('')}
  
  allocation_gaps:${allocationGaps.map(gap => `
    - ticker: "${gap.ticker}"
      target_percentage: ${gap.targetPercent}
      current_percentage: ${gap.currentPercent.toFixed(2)}
      gap: ${gap.gap.toFixed(2)}
      status: "${gap.gap > 0 ? 'under_allocated' : 'over_allocated'}"`).join('')}
  
  recommended_allocation:
    - ticker: "推奨銘柄1"
      investment_amount: 具体的な投資金額
      shares_to_buy: 購入株数
      reason: "理想比率達成のため（乖離-X%を解消）"
      priority: 1
      
    - ticker: "推奨銘柄2"  
      investment_amount: 具体的な投資金額
      shares_to_buy: 購入株数
      reason: "分散効果向上のため"
      priority: 2
      
    # 入金額¥${depositAmount.toLocaleString()}を完全に配分
  
  calculation_summary:
    total_allocated: ${depositAmount} # 入金額を100%配分
    expected_improvement: "理想比率への接近度"
    risk_assessment: "リスク分散の改善度"
    implementation_order: "購入順序の推奨"
\`\`\`

## 🔍 計算の重要ポイント

1. **乖離解消優先**: 理想比率との乖離が大きい銘柄を優先
2. **入金額完全配分**: ¥${depositAmount.toLocaleString()}を余すことなく最適配分
3. **実際の購入可能数量**: 株価を考慮した現実的な購入株数
4. **手数料考慮**: 取引コストも含めた実用的な計算
5. **優先順位**: どの銘柄から順番に購入すべきかを明示

この入金額で理想ポートフォリオに最も近づける精密な計算をお願いします！` : 

`# Investment Allocation Calculation Expert

You are a precision investment allocation calculation specialist. Please analyze the current portfolio situation and ideal allocation below, then calculate the specific investment allocation to best approach the ideal ratio using the deposit amount of ¥${depositAmount.toLocaleString()}.

## 📊 Current Portfolio Status

**Current Total Assets**: ¥${totalCurrentValue.toLocaleString()}
**Deposit Amount**: ¥${depositAmount.toLocaleString()}
**Total After Deposit**: ¥${newTotalValue.toLocaleString()}

### Current Asset Holdings Details
${currentAllocations.map((asset, index) => `
${index + 1}. **${asset.name}** (${asset.ticker || 'N/A'})
   - Current Value: ¥${(asset.totalValue || 0).toLocaleString()}
   - Current %: ${asset.currentPercent.toFixed(2)}%
   - Quantity: ${asset.quantity || 0}
   - Sector: ${asset.sector || 'Unclassified'}`).join('')}

## 🎯 Ideal Allocation vs Current Gap Analysis

${allocationGaps.length > 0 ? 
  allocationGaps.map((gap, index) => `
${index + 1}. **${gap.ticker}**
   - Target %: ${gap.targetPercent}%
   - Current %: ${gap.currentPercent.toFixed(2)}%
   - Gap: ${gap.gap > 0 ? '+' : ''}${gap.gap.toFixed(2)}% ${gap.gap > 0 ? '(Underweight)' : '(Overweight)'}
   - Current Value: ¥${gap.currentValue.toLocaleString()}`).join('') :
  '\n⚠️ No target allocation set. Please suggest optimal allocation from diversification perspective.'
}

## 💰 Allocation Calculation Request

Using deposit amount ¥${depositAmount.toLocaleString()}, please calculate specific investment allocation to best approach ideal ratio in YAML format:

\`\`\`yaml
allocation_calculation:
  calculation_date: "${new Date().toISOString()}"
  deposit_amount: ${depositAmount}
  current_total_value: ${totalCurrentValue}
  target_total_value: ${newTotalValue}
  
  current_portfolio:${currentAllocations.map(asset => `
    - ticker: "${asset.ticker || asset.name}"
      name: "${asset.name}"
      current_value: ${asset.totalValue || 0}
      current_percentage: ${asset.currentPercent.toFixed(2)}
      target_percentage: ${targetAllocation.find(t => t.ticker === asset.ticker)?.targetPercent || 'TBD'}`).join('')}
  
  allocation_gaps:${allocationGaps.map(gap => `
    - ticker: "${gap.ticker}"
      target_percentage: ${gap.targetPercent}
      current_percentage: ${gap.currentPercent.toFixed(2)}
      gap: ${gap.gap.toFixed(2)}
      status: "${gap.gap > 0 ? 'under_allocated' : 'over_allocated'}"`).join('')}
  
  recommended_allocation:
    - ticker: "RECOMMENDED_TICKER_1"
      investment_amount: specific_investment_amount
      shares_to_buy: number_of_shares
      reason: "To achieve ideal ratio (close gap of -X%)"
      priority: 1
      
    - ticker: "RECOMMENDED_TICKER_2"  
      investment_amount: specific_investment_amount
      shares_to_buy: number_of_shares
      reason: "For diversification improvement"
      priority: 2
      
    # Fully allocate deposit amount ¥${depositAmount.toLocaleString()}
  
  calculation_summary:
    total_allocated: ${depositAmount} # 100% allocation of deposit
    expected_improvement: "Degree of approach to ideal ratio"
    risk_assessment: "Risk diversification improvement"
    implementation_order: "Recommended purchase order"
\`\`\`

## 🔍 Important Calculation Points

1. **Gap Resolution Priority**: Prioritize stocks with large gaps from ideal ratio
2. **Complete Allocation**: Optimally allocate all ¥${depositAmount.toLocaleString()}
3. **Realistic Purchase Quantity**: Practical share counts considering stock prices
4. **Fee Consideration**: Practical calculation including transaction costs
5. **Priority Order**: Clear sequence of which stocks to purchase first

Please provide precise calculations to best approach the ideal portfolio with this deposit amount!`;

    setGeneratedAllocationPrompt(promptContent);
  };

  // プロンプトをクリップボードにコピー
  const copyOptimizationPromptToClipboard = async () => {
    if (generatedOptimizationPrompt) {
      try {
        await navigator.clipboard.writeText(generatedOptimizationPrompt);
        alert(isJapanese ? 'プロンプトをクリップボードにコピーしました' : 'Prompt copied to clipboard');
      } catch (error) {
        console.error('コピー失敗:', error);
        alert(isJapanese ? 'コピーに失敗しました' : 'Failed to copy');
      }
    }
  };

  // 配分計算プロンプトをクリップボードにコピー
  const copyAllocationPromptToClipboard = async () => {
    if (generatedAllocationPrompt) {
      try {
        await navigator.clipboard.writeText(generatedAllocationPrompt);
        alert(isJapanese ? 'プロンプトをクリップボードにコピーしました' : 'Prompt copied to clipboard');
      } catch (error) {
        console.error('コピー失敗:', error);
        alert(isJapanese ? 'コピーに失敗しました' : 'Failed to copy');
      }
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
      
      case 'yaml-strategy':
        return (
          <div className="bg-dark-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <FaLightbulb className="text-primary-400 text-xl" />
              <h3 className="text-xl font-semibold text-white">
                {isJapanese ? 'YAML戦略データ管理' : 'YAML Strategy Data Management'}
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
      
      case 'yaml-data':
        return (
          <div className="bg-dark-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <FaFileCode className="text-primary-400 text-xl" />
              <h3 className="text-xl font-semibold text-white">
                {isJapanese ? 'YAMLデータインポート' : 'YAML Data Import'}
              </h3>
            </div>
            
            {/* File Import */}
            <div className="mb-6">
              <h4 className="font-medium text-white mb-3">
                {isJapanese ? 'YAMLファイルからインポート' : 'Import from YAML File'}
              </h4>
              <input
                type="file"
                accept=".yaml,.yml"
                onChange={handleFileImport}
                className="w-full p-3 bg-dark-300 border border-dark-400 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-primary-500 file:text-white hover:file:bg-primary-600"
              />
            </div>

            {/* YAML Text Import */}
            <div className="mb-6">
              <h4 className="font-medium text-white mb-3">
                {isJapanese ? 'YAMLテキストから直接インポート' : 'Import from YAML Text'}
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
                  ? 'YAMLポートフォリオデータをここに貼り付けてください...\n\nportfolio:\n  assets:\n    - name: "トヨタ自動車"\n      ticker: "7203.T"\n      type: "stock"\n      quantity: 100\n      currency: "JPY"'
                  : 'Paste YAML portfolio data here...\n\nportfolio:\n  assets:\n    - name: "Toyota Motor"\n      ticker: "7203.T"\n      type: "stock"\n      quantity: 100\n      currency: "JPY"'
                }
                className="w-full p-3 bg-dark-300 border border-dark-400 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none font-mono text-sm"
                rows={12}
              />
              
              {jsonImportData && (
                <div className="mt-3 space-y-3">
                  {/* Validation Results */}
                  {validationResult && (
                    <div className={`p-3 rounded-lg border ${
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
                            (validationResult.isValid ? `YAMLデータ検証成功 (${validationResult.format || 'YAML'}形式)` : 'YAMLデータ検証エラー') :
                            (validationResult.isValid ? `YAML Validation Successful (${validationResult.format || 'YAML'} format)` : 'YAML Validation Error')
                          }
                        </span>
                      </div>
                      
                      {validationResult.isValid ? (
                        <div className="text-sm text-gray-300">
                          <div>• {isJapanese ? '資産数' : 'Assets'}: {validationResult.assetsCount}</div>
                          <div>• {isJapanese ? '総評価額' : 'Total Value'}: ¥{validationResult.totalValue?.toLocaleString() || '0'}</div>
                          {validationResult.warnings.length > 0 && (
                            <div className="mt-2">
                              <div className="text-yellow-400 text-xs">{isJapanese ? '警告:' : 'Warnings:'}</div>
                              {validationResult.warnings.map((warning, index) => (
                                <div key={index} className="text-xs text-yellow-300">• {warning}</div>
                              ))}
                            </div>
                          )}
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
                      ? (isJapanese ? 'YAMLインポート中...' : 'Importing YAML...')
                      : (isJapanese ? 'YAMLデータをインポート' : 'Import YAML Data')
                    }
                  </button>
                </div>
              )}
            </div>

            {/* YAML Format Help */}
            <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-primary-400 font-medium mb-2">
                <FaExclamationCircle />
                <h5>{isJapanese ? 'YAMLフォーマットについて' : 'YAML Format Info'}</h5>
              </div>
              <div className="space-y-1 text-sm text-gray-300">
                <div>
                  • {isJapanese 
                    ? 'YAML形式でポートフォリオデータを管理・インポート'
                    : 'Manage and import portfolio data in YAML format'
                  }
                </div>
                <div>
                  • {isJapanese 
                    ? 'より読みやすく、人間にとって理解しやすいデータ形式'
                    : 'More readable and human-friendly data format'
                  }
                </div>
                <div>
                  • {isJapanese 
                    ? 'インポート時に既存データとマージされます'
                    : 'Data will be merged with existing portfolio'
                  }
                </div>
                <div>
                  • {isJapanese 
                    ? '例: portfolio.assets[0].name: "トヨタ自動車"'
                    : 'Example: portfolio.assets[0].name: "Toyota Motor"'
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
      
      case 'portfolio-optimizer':
        return (
          <div className="bg-dark-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <FaChartPie className="text-primary-400 text-xl" />
              <h3 className="text-xl font-semibold text-white">
                {isJapanese ? 'ポートフォリオ最適化アドバイザー' : 'Portfolio Optimization Advisor'}
              </h3>
            </div>
            
            {/* Investment Amount Input */}
            <div className="mb-6">
              <h4 className="font-medium text-white mb-3">
                {isJapanese ? '投資予定金額' : 'Investment Amount'}
              </h4>
              <div className="space-y-3">
                {/* Currency Selection */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setInvestmentCurrency('JPY');
                      if (investmentCurrency === 'USD') {
                        // USD→JPYに変更時、概算で150倍に変換
                        setInvestmentAmount(Math.round(investmentAmount * 150));
                      }
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      investmentCurrency === 'JPY'
                        ? 'bg-primary-500 text-white'
                        : 'bg-dark-300 text-gray-400 hover:bg-dark-400'
                    }`}
                  >
                    JPY (¥)
                  </button>
                  <button
                    onClick={() => {
                      setInvestmentCurrency('USD');
                      if (investmentCurrency === 'JPY') {
                        // JPY→USDに変更時、概算で150で割る
                        setInvestmentAmount(Math.round(investmentAmount / 150));
                      }
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      investmentCurrency === 'USD'
                        ? 'bg-primary-500 text-white'
                        : 'bg-dark-300 text-gray-400 hover:bg-dark-400'
                    }`}
                  >
                    USD ($)
                  </button>
                </div>
                
                {/* Amount Input */}
                <div className="relative">
                  <FaDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                    placeholder={investmentCurrency === 'USD' ? '1000' : '100000'}
                    className="w-full pl-10 pr-16 py-3 bg-dark-300 border border-dark-400 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm font-medium">
                    {investmentCurrency}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                {isJapanese 
                  ? `今回追加で投資する予定の金額を${investmentCurrency}で入力してください`
                  : `Enter the amount you plan to invest additionally in ${investmentCurrency}`
                }
              </p>
            </div>

            {/* Current Portfolio Status */}
            <div className="mb-6">
              <h4 className="font-medium text-white mb-3">
                {isJapanese ? '現在のポートフォリオ状況' : 'Current Portfolio Status'}
              </h4>
              <div className="bg-dark-300 rounded-lg p-4 border border-dark-400">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">{isJapanese ? '保有資産数：' : 'Assets:'}</span>
                    <span className="text-white ml-2">{portfolio?.assets?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">{isJapanese ? '総資産額：' : 'Total Value:'}</span>
                    <span className="text-white ml-2">¥{portfolio?.totalValue?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400">{isJapanese ? '理想配分設定：' : 'Target Allocation:'}</span>
                    <span className="text-white ml-2">
                      {portfolio?.targetAllocation?.length ? 
                        `${portfolio.targetAllocation.length}${isJapanese ? '個の配分設定' : ' allocation targets'}` :
                        isJapanese ? '未設定' : 'Not configured'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Generate Optimization Prompt */}
            <div className="mb-6">
              <button
                onClick={generateOptimizationPrompt}
                className="w-full py-3 px-4 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <FaCalculator />
                {isJapanese ? '最適化プロンプトを生成' : 'Generate Optimization Prompt'}
              </button>
            </div>

            {/* Generated Prompt Display */}
            {generatedOptimizationPrompt && (
              <div className="mb-6">
                <h4 className="font-medium text-white mb-3">
                  {isJapanese ? '生成されたプロンプト' : 'Generated Prompt'}
                </h4>
                <div className="bg-dark-300 rounded-lg border border-dark-400 overflow-hidden">
                  <div className="bg-dark-400 px-4 py-2 flex items-center justify-between">
                    <span className="text-sm text-gray-300 font-medium">
                      {isJapanese ? 'ポートフォリオ最適化プロンプト' : 'Portfolio Optimization Prompt'}
                    </span>
                    <button
                      onClick={copyOptimizationPromptToClipboard}
                      className="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white text-sm rounded transition-colors duration-200 flex items-center gap-1"
                    >
                      <FaCopy className="text-xs" />
                      {isJapanese ? 'コピー' : 'Copy'}
                    </button>
                  </div>
                  <div className="p-4 max-h-96 overflow-y-auto">
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                      {generatedOptimizationPrompt}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-primary-400 font-medium mb-2">
                <FaLightbulb />
                <h5>{isJapanese ? '使い方' : 'How to Use'}</h5>
              </div>
              <div className="space-y-2 text-sm text-gray-300">
                <div>
                  1. {isJapanese 
                    ? '投資予定金額を入力してください'
                    : 'Enter your planned investment amount'
                  }
                </div>
                <div>
                  2. {isJapanese 
                    ? '「最適化プロンプトを生成」ボタンをクリック'
                    : 'Click "Generate Optimization Prompt" button'
                  }
                </div>
                <div>
                  3. {isJapanese 
                    ? '生成されたプロンプトをClaude（claude.ai）やGemini（gemini.google.com）にコピー&ペースト'
                    : 'Copy & paste the generated prompt to Claude (claude.ai) or Gemini (gemini.google.com)'
                  }
                </div>
                <div>
                  4. {isJapanese 
                    ? 'AIから具体的な銘柄購入推奨を受け取り、投資判断に活用'
                    : 'Receive specific stock purchase recommendations from AI for investment decisions'
                  }
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'allocation-calculator':
        return (
          <div className="bg-dark-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <FaCalculator className="text-primary-400 text-xl" />
              <h3 className="text-xl font-semibold text-white">
                {isJapanese ? '投資配分計算機' : 'Investment Allocation Calculator'}
              </h3>
            </div>
            
            {/* Deposit Amount Input */}
            <div className="mb-6">
              <h4 className="font-medium text-white mb-3">
                {isJapanese ? '入金額' : 'Deposit Amount'}
              </h4>
              <div className="relative">
                <FaDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  placeholder="100000"
                  className="w-full pl-10 pr-16 py-3 bg-dark-300 border border-dark-400 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm font-medium">
                  JPY
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                {isJapanese 
                  ? '新規で投資する金額を入力してください'
                  : 'Enter the amount you want to invest'
                }
              </p>
            </div>

            {/* Current Portfolio Analysis */}
            <div className="mb-6">
              <h4 className="font-medium text-white mb-3">
                {isJapanese ? '現在のポートフォリオ分析' : 'Current Portfolio Analysis'}
              </h4>
              <div className="bg-dark-300 rounded-lg p-4 border border-dark-400">
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-gray-400">{isJapanese ? '総資産額：' : 'Total Assets:'}</span>
                    <span className="text-white ml-2">¥{portfolio?.totalValue?.toLocaleString() || '0'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">{isJapanese ? '入金後：' : 'After Deposit:'}</span>
                    <span className="text-white ml-2">¥{((portfolio?.totalValue || 0) + depositAmount).toLocaleString()}</span>
                  </div>
                </div>
                
                {/* Current Assets */}
                {portfolio?.assets && portfolio.assets.length > 0 ? (
                  <div className="space-y-2">
                    <h5 className="font-medium text-white">{isJapanese ? '保有資産：' : 'Current Holdings:'}</h5>
                    {portfolio.assets.map((asset, index) => {
                      const currentPercent = portfolio.totalValue > 0 ? 
                        ((asset.totalValue || 0) / portfolio.totalValue * 100) : 0;
                      return (
                        <div key={index} className="flex justify-between items-center text-xs">
                          <span className="text-gray-300">{asset.name}</span>
                          <span className="text-primary-400">{currentPercent.toFixed(1)}%</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm">
                    {isJapanese ? 'まず現在の資産データを入力してください' : 'Please input current asset data first'}
                  </div>
                )}
              </div>
            </div>

            {/* Ideal Allocation Gap */}
            <div className="mb-6">
              <h4 className="font-medium text-white mb-3">
                {isJapanese ? '理想配分との乖離' : 'Gap from Ideal Allocation'}
              </h4>
              <div className="bg-dark-300 rounded-lg p-4 border border-dark-400">
                {portfolio?.targetAllocation && portfolio.targetAllocation.length > 0 ? (
                  <div className="space-y-2">
                    {portfolio.targetAllocation.map((target, index) => {
                      const currentAsset = portfolio.assets?.find(asset => 
                        asset.ticker === target.ticker || asset.name === target.ticker
                      );
                      const currentPercent = currentAsset && portfolio.totalValue > 0 ? 
                        ((currentAsset.totalValue || 0) / portfolio.totalValue * 100) : 0;
                      const gap = target.targetPercent - currentPercent;
                      
                      return (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="text-gray-300">{target.ticker}</span>
                          <div className="flex gap-2">
                            <span className="text-blue-400">{isJapanese ? '目標' : 'Target'}: {target.targetPercent}%</span>
                            <span className="text-yellow-400">{isJapanese ? '現在' : 'Current'}: {currentPercent.toFixed(1)}%</span>
                            <span className={`${gap > 0 ? 'text-red-400' : 'text-green-400'}`}>
                              {gap > 0 ? '+' : ''}{gap.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm">
                    {isJapanese ? '理想配分が設定されていません' : 'No target allocation set'}
                  </div>
                )}
              </div>
            </div>

            {/* Generate Button */}
            <div className="mb-6">
              <button
                onClick={generateAllocationCalculationPrompt}
                className="w-full py-3 px-4 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <FaCalculator />
                {isJapanese ? '配分計算プロンプトを生成' : 'Generate Allocation Calculation Prompt'}
              </button>
            </div>

            {/* Generated Prompt Display */}
            {generatedAllocationPrompt && (
              <div className="mb-6">
                <h4 className="font-medium text-white mb-3">
                  {isJapanese ? '生成されたプロンプト' : 'Generated Prompt'}
                </h4>
                <div className="bg-dark-300 rounded-lg border border-dark-400 overflow-hidden">
                  <div className="bg-dark-400 px-4 py-2 flex items-center justify-between">
                    <span className="text-sm text-gray-300 font-medium">
                      {isJapanese ? '投資配分計算プロンプト' : 'Investment Allocation Calculation Prompt'}
                    </span>
                    <button
                      onClick={copyAllocationPromptToClipboard}
                      className="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white text-sm rounded transition-colors duration-200 flex items-center gap-1"
                    >
                      <FaCopy className="text-xs" />
                      {isJapanese ? 'コピー' : 'Copy'}
                    </button>
                  </div>
                  <div className="p-4 max-h-96 overflow-y-auto">
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                      {generatedAllocationPrompt}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-400 font-medium mb-2">
                <FaLightbulb />
                <h5>{isJapanese ? '使い方' : 'How to Use'}</h5>
              </div>
              <div className="space-y-2 text-sm text-gray-300">
                <div>
                  1. {isJapanese 
                    ? '入金額を入力してください'
                    : 'Enter your deposit amount'
                  }
                </div>
                <div>
                  2. {isJapanese 
                    ? '現在のポートフォリオと理想配分の乖離を確認'
                    : 'Review the gap between current and ideal allocation'
                  }
                </div>
                <div>
                  3. {isJapanese 
                    ? '「配分計算プロンプトを生成」ボタンをクリック'
                    : 'Click "Generate Allocation Calculation Prompt" button'
                  }
                </div>
                <div>
                  4. {isJapanese 
                    ? '生成されたプロンプトをClaude（claude.ai）やGemini（gemini.google.com）にコピー&ペースト'
                    : 'Copy & paste the generated prompt to Claude (claude.ai) or Gemini (gemini.google.com)'
                  }
                </div>
                <div>
                  5. {isJapanese 
                    ? 'AIから具体的な銘柄別投資金額の計算結果を受け取る'
                    : 'Receive specific investment amount calculations per stock from AI'
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