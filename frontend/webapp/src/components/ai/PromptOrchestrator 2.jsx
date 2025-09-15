/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/components/ai/PromptOrchestrator.jsx
 * 
 * 作成者: Claude Code
 * 作成日: 2025-01-03
 * 
 * 説明:
 * AI投資戦略のプロンプト生成と管理を行うコンポーネント。
 * YAML処理機能とプロンプト生成機能を統合。
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ModernButton from '../common/ModernButton';
import { FaCopy, FaCheck, FaRobot } from 'react-icons/fa';

const PromptOrchestrator = ({ userProfile, selectedMarkets, budget, onPromptGenerated }) => {
  const { t } = useTranslation();
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generatePrompt = () => {
    setIsGenerating(true);
    
    // プロンプト生成ロジック
    const marketDescriptions = selectedMarkets?.map(market => {
      const marketNames = {
        us: '米国市場',
        japan: '日本市場', 
        global: '全世界市場',
        reit: 'REIT（不動産投資信託）',
        crypto: '仮想通貨',
        bonds: '債券'
      };
      return marketNames[market] || market;
    }).join('、');

    const prompt = `# AI投資戦略コンサルティング依頼

## 投資家プロフィール
- **投資予算**: ${budget ? `${budget.toLocaleString()}円` : '未設定'}
- **関心市場**: ${marketDescriptions || '未設定'}
- **投資経験**: ${userProfile?.experience || '初心者'}
- **リスク許容度**: ${userProfile?.riskTolerance || '低'}

## 依頼内容
以下の条件に基づいて、パーソナライズされた投資戦略を提案してください：

1. **ポートフォリオ構成案**
   - 各アセットクラスの推奨配分比率
   - 具体的な投資商品（ETF、投資信託等）の提案
   - リバランシングの頻度とタイミング

2. **リスク管理戦略**
   - 最大損失許容額の設定
   - 分散投資によるリスク軽減方法
   - 市場下落時の対応策

3. **投資実行プラン**
   - 段階的な投資開始方法
   - 定期積立の推奨金額と頻度
   - 投資開始に必要な準備事項

## 重要事項
- 投資は自己責任であることを理解しています
- 提案内容は教育目的であり、投資アドバイスではありません
- 最終的な投資判断は投資家自身が行います

よろしくお願いします。`;

    setTimeout(() => {
      setGeneratedPrompt(prompt);
      setIsGenerating(false);
      onPromptGenerated?.(prompt);
    }, 1500);
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('コピーに失敗しました:', err);
    }
  };

  return (
    <div className="bg-dark-300 rounded-xl p-6 border border-dark-400">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary-500/10 rounded-lg">
          <FaRobot className="w-5 h-5 text-primary-400" />
        </div>
        <h3 className="text-lg font-semibold text-white">AI投資戦略プロンプト生成</h3>
      </div>

      {!generatedPrompt && (
        <div className="text-center py-8">
          <ModernButton
            onClick={generatePrompt}
            disabled={isGenerating}
            className="bg-primary-500 hover:bg-primary-600"
          >
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                プロンプト生成中...
              </div>
            ) : (
              'プロンプトを生成'
            )}
          </ModernButton>
        </div>
      )}

      {generatedPrompt && (
        <div className="space-y-4">
          <div className="bg-dark-200 rounded-lg p-4 border border-dark-400">
            <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-auto max-h-96">
              {generatedPrompt}
            </pre>
          </div>
          
          <div className="flex gap-3">
            <ModernButton
              onClick={copyPrompt}
              className="flex items-center gap-2 bg-dark-400 hover:bg-dark-500"
            >
              {copied ? (
                <>
                  <FaCheck className="w-4 h-4 text-green-400" />
                  コピー完了
                </>
              ) : (
                <>
                  <FaCopy className="w-4 h-4" />
                  クリップボードにコピー
                </>
              )}
            </ModernButton>
            
            <ModernButton
              onClick={() => setGeneratedPrompt('')}
              className="bg-gray-600 hover:bg-gray-700"
            >
              新しいプロンプトを生成
            </ModernButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptOrchestrator;