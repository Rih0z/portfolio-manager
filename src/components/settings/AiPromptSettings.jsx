import React, { useState, useEffect } from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';

const AiPromptSettings = () => {
  const { aiPromptTemplate, updateAiPromptTemplate } = usePortfolioContext();
  
  const [template, setTemplate] = useState(aiPromptTemplate);
  const [isSaved, setIsSaved] = useState(false);
  
  useEffect(() => {
    setTemplate(aiPromptTemplate);
  }, [aiPromptTemplate]);
  
  const handleSave = () => {
    updateAiPromptTemplate(template);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };
  
  const handleReset = () => {
    // デフォルトテンプレートを設定
    const defaultTemplate = `あなたは投資分析に特化した AI アシスタントです。
目的: ユーザーの投資ポートフォリオを分析し、最適な配分戦略と具体的な投資プランを提案すること。

### 初期情報収集
- 現在の総資産額: {totalAssets} ({baseCurrency})
- 毎月の新規投資予定額: {monthlyBudget} ({budgetCurrency})

### 現状の投資ポートフォリオ構成:
{currentAllocation}

### 理想的と考えるポートフォリオ構成:
{targetAllocation}

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
- **現在の総資産額**：{totalAssets}
- **毎月の投資予定額**：{monthlyBudget}

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

上記の分析を踏まえて、現在のポートフォリオから理想ポートフォリオへの移行方法と今後の投資戦略について、具体的なアドバイスを提供してください。`;
    
    setTemplate(defaultTemplate);
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">AI分析プロンプト設定</h2>
      <p className="text-sm text-gray-600 mb-4">
        シミュレーションタブで使用するAI分析プロンプトのテンプレートを編集できます。
        次のプレースホルダーは実際のデータに置き換えられます:
      </p>
      
      <ul className="list-disc pl-5 mb-4 text-sm">
        <li><code className="bg-gray-100 px-1">{'{totalAssets}'}</code>: 総資産額</li>
        <li><code className="bg-gray-100 px-1">{'{baseCurrency}'}</code>: 基本通貨</li>
        <li><code className="bg-gray-100 px-1">{'{monthlyBudget}'}</code>: 毎月の投資予定額</li>
        <li><code className="bg-gray-100 px-1">{'{budgetCurrency}'}</code>: 予算通貨</li>
        <li><code className="bg-gray-100 px-1">{'{currentAllocation}'}</code>: 現在のポートフォリオ配分</li>
        <li><code className="bg-gray-100 px-1">{'{targetAllocation}'}</code>: 目標ポートフォリオ配分</li>
      </ul>
      
      <div className="mb-4">
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          className="w-full h-96 border border-gray-300 rounded-md p-3 font-mono text-sm"
          spellCheck="false"
        />
      </div>
      
      <div className="flex space-x-4">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          保存
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          デフォルトに戻す
        </button>
        
        {isSaved && (
          <span className="text-green-600 flex items-center">
            <svg className="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            保存しました
          </span>
        )}
      </div>
    </div>
  );
};

export default AiPromptSettings;
