/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/components/simulation/AiAnalysisPrompt.jsx 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-08 14:30:00 
 * 
 * 更新履歴: 
 * - 2025-05-08 14:30:00 Koki Riho 初回作成
 * 
 * 説明: 
 * ポートフォリオデータを含むAI分析用プロンプトを生成するコンポーネント。
 * 現在のポートフォリオ構成、目標配分、予算情報などを含むプロンプトを生成し、
 * クリップボードにコピーしてAIアシスタントで使用できるようにする。
 */
import React, { useState } from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import { formatCurrency, formatPercent, formatDate } from '../../utils/formatters';

const AiAnalysisPrompt = () => {
  const {
    currentAssets,
    targetPortfolio,
    additionalBudget,
    baseCurrency,
    exchangeRate,
    totalAssets
  } = usePortfolioContext();
  
  const [isCopied, setIsCopied] = useState(false);
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  
  // 現在のポートフォリオ構成の計算
  const calculateCurrentAllocation = () => {
    // 保有資産がない場合は空配列を返す
    if (!currentAssets || currentAssets.length === 0) {
      return [];
    }
    
    const total = currentAssets.reduce((sum, asset) => {
      if (!asset.price || !asset.holdings) return sum;
      
      let assetValue = asset.price * asset.holdings;
      
      // 通貨換算
      if (asset.currency !== baseCurrency) {
        if (baseCurrency === 'JPY' && asset.currency === 'USD' && exchangeRate) {
          assetValue *= exchangeRate.rate;
        } else if (baseCurrency === 'USD' && asset.currency === 'JPY' && exchangeRate) {
          assetValue /= exchangeRate.rate;
        }
      }
      
      return sum + assetValue;
    }, 0);
    
    // 合計が0の場合は空配列を返す
    if (total <= 0) return [];
    
    return currentAssets.map(asset => {
      if (!asset.price || !asset.holdings) {
        return {
          ticker: asset.ticker,
          name: asset.name || asset.ticker,
          percentage: 0
        };
      }
      
      let assetValue = asset.price * asset.holdings;
      
      // 通貨換算
      if (asset.currency !== baseCurrency) {
        if (baseCurrency === 'JPY' && asset.currency === 'USD' && exchangeRate) {
          assetValue *= exchangeRate.rate;
        } else if (baseCurrency === 'USD' && asset.currency === 'JPY' && exchangeRate) {
          assetValue /= exchangeRate.rate;
        }
      }
      
      const percentage = (assetValue / total) * 100;
      
      return {
        ticker: asset.ticker,
        name: asset.name || asset.ticker,
        percentage: percentage
      };
    }).sort((a, b) => b.percentage - a.percentage); // 割合が大きい順にソート
  };

  // 目標ポートフォリオの配分取得
  const getTargetAllocation = () => {
    // 目標配分がない場合は空配列を返す
    if (!targetPortfolio || targetPortfolio.length === 0) {
      return [];
    }
    
    return targetPortfolio
      .map(target => {
        const asset = currentAssets?.find(a => a.ticker === target.ticker);
        return {
          ticker: target.ticker,
          name: asset ? (asset.name || target.ticker) : target.ticker,
          percentage: target.targetPercentage || 0
        };
      })
      .filter(target => target.percentage > 0)
      .sort((a, b) => b.percentage - a.percentage); // 割合が大きい順にソート
  };
  
  // 通貨に応じた金額フォーマット
  const formatBudget = (budget, currency) => {
    if (!budget || !currency) return '0';
    
    if (currency === 'JPY') {
      return `${budget.toLocaleString()} 円`;
    } else {
      return `$${budget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  // AIプロンプトの生成
  const generatePrompt = () => {
    const currentAllocation = calculateCurrentAllocation();
    const targetAllocation = getTargetAllocation();
    
    // 月間追加予算（未定義の場合は対応）
    const monthlyBudget = additionalBudget?.amount || 0;
    const budgetCurrency = additionalBudget?.currency || baseCurrency || 'JPY';
    
    const prompt = `あなたは投資分析に特化した AI アシスタントです。
目的: ユーザーの投資ポートフォリオを分析し、最適な配分戦略と具体的な投資プランを提案すること。

### 初期情報収集
- 現在の総資産額: ${formatBudget(totalAssets || 0, baseCurrency || 'JPY')} (${baseCurrency || 'JPY'})
- 毎月の新規投資予定額: ${formatBudget(monthlyBudget, budgetCurrency)} (${budgetCurrency})

### 現状の投資ポートフォリオ構成:
${currentAllocation.length > 0 
  ? currentAllocation.map(item => `- ${item.ticker}: ${formatPercent(item.percentage)}（${item.name}）`).join('\n')
  : '現在、保有資産はありません。'}

### 理想的と考えるポートフォリオ構成:
${targetAllocation.length > 0
  ? targetAllocation.map(item => `- ${item.ticker}: ${formatPercent(item.percentage)}（${item.name}）`).join('\n')
  : '目標配分が設定されていません。'}

▼ 分析ガイドライン
各銘柄について：
1. 直近の市場パフォーマンスと価格動向を調査
2. マクロ経済環境と当該資産クラスへの影響を考慮
3. 今後12ヶ月の見通しを分析
4. 現状の配分比率と理想的な配分比率の両方について妥当性を評価
5. 現状比率から理想比率への移行について具体的な提案（タイミングや段階的な調整方法など）

ポートフォリオ全体について：
1. 現状比率と理想比率それぞれにおける資産クラス間の相関性とリスク分散の評価
2. 現状比率と理想比率それぞれにおける地域分散とセクター分散の分析
3. 現在の市場環境における現状ポートフォリオと理想ポートフォリオのリスク評価
4. 両ポートフォリオ構成のパフォーマンス予測と比較

▼ 出力フォーマット（Markdown）
### 投資ポートフォリオ分析
#### 個別銘柄分析
| ETF | 現状比率 | 理想比率 | 最新動向と見通し | 配分評価とコメント |
|-----|---------|---------|------------------|------------------|
| 銘柄シンボル | 現状% | 理想% | 記入例：最新の動向と今後の見通し | 現状比率について：（評価コメント）<br>理想比率について：（評価コメント）<br>調整提案：（具体的な提案） |

#### ポートフォリオ全体評価
- **リスク分散**: 
  - 現状比率のリスク分散評価：（コメント）
  - 理想比率のリスク分散評価：（コメント）
  - 比較と改善点：（コメント）
- **地域分散**: 
  - 現状比率の地域分散評価：（コメント）
  - 理想比率の地域分散評価：（コメント）
  - 比較と改善点：（コメント）
- **セクター分散**: 
  - 現状比率のセクター分散評価：（コメント）
  - 理想比率のセクター分散評価：（コメント）
  - 比較と改善点：（コメント）
- **期待リターン**: 
  - 現状比率の期待リターン評価：（コメント）
  - 理想比率の期待リターン評価：（コメント）
  - 比較と改善点：（コメント）

#### 具体的な投資プラン
- **現在の総資産額**：${formatBudget(totalAssets || 0, baseCurrency || 'JPY')}
- **毎月の投資予定額**：${formatBudget(monthlyBudget, budgetCurrency)}

##### 6ヶ月投資プラン
各月の具体的な投資配分（金額と比率）：
- 1ヶ月目：（詳細な配分）
- 2ヶ月目：（詳細な配分）
- ...
- 6ヶ月目：（詳細な配分）

##### 継続投資戦略
- 毎月の定期投資における理想的な配分：（詳細）
- リバランスの頻度と条件：（詳細）
- 資産成長の予測：（1年後、3年後、5年後の予測）
- **移行戦略**: 
  - 段階的な移行プラン：（具体的なステップとタイミング）
  - 市場環境に応じた調整方法：（コメント）
  - 税金や取引コストの考慮：（コメント）

上記の分析を踏まえて、現在のポートフォリオから理想ポートフォリオへの移行方法と今後の投資戦略について、具体的なアドバイスを提供してください。
`;
    
    return prompt;
  };
  
  const promptText = generatePrompt();
  
  // プロンプトをクリップボードにコピーする関数
  const copyToClipboard = () => {
    navigator.clipboard.writeText(promptText).then(
      () => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 3000);
      },
      (err) => {
        console.error('クリップボードへのコピーに失敗しました:', err);
      }
    );
  };
  
  // プロンプトプレビューの表示（一部のみ表示）
  const getPromptPreview = () => {
    if (!promptText) return 'プロンプトを生成できません。';
    const lines = promptText.split('\n');
    return lines.slice(0, 10).join('\n') + '\n...';
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6 mt-6">
      <h2 className="text-xl font-semibold mb-4">AI分析プロンプト</h2>
      <p className="text-sm text-gray-600 mb-4">
        あなたのポートフォリオデータを使って、AIアシスタントに詳細な分析を依頼するためのプロンプトです。
        以下のプロンプトをコピーして、Claude、ChatGPT、Geminiなど、お好みのAIアシスタントに貼り付けるだけで高度な投資分析を得られます。
      </p>
      
      <div className="bg-gray-100 p-3 rounded-md mb-4 text-sm font-mono overflow-auto max-h-64">
        {showFullPrompt ? promptText : getPromptPreview()}
      </div>
      
      <div className="flex flex-wrap gap-2">
        <button
          onClick={copyToClipboard}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
        >
          {isCopied ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              コピー完了
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              プロンプトをコピー
            </>
          )}
        </button>
        <button
          onClick={() => setShowFullPrompt(!showFullPrompt)}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          {showFullPrompt ? 'プロンプトを折りたたむ' : 'プロンプト全文を表示'}
        </button>
      </div>
      
      <div className="mt-4 text-sm text-gray-600 p-4 bg-blue-50 rounded-md">
        <h3 className="font-semibold mb-2">使い方</h3>
        <ol className="list-decimal pl-5 space-y-2">
          <li>「プロンプトをコピー」ボタンをクリックしてプロンプトをコピーします</li>
          <li>Claude、ChatGPT、Geminiなど、お好みのAIアシスタントを開きます</li>
          <li>プロンプトを新しい会話に貼り付けます</li>
          <li>AIが自動的にあなたのポートフォリオを分析し、最適な投資戦略を提案します</li>
        </ol>
        <p className="mt-3">
          プロンプトには現在のポートフォリオ情報が自動的に組み込まれています。異なるAIモデルを試すと、異なる視点や分析結果が得られることがあります。
        </p>
      </div>
    </div>
  );
};

export default AiAnalysisPrompt;
