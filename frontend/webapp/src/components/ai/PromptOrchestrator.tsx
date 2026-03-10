/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/components/ai/PromptOrchestrator.jsx
 * 
 * 作成者: Claude Code
 * 作成日: 2025-01-03
 * 
 * 説明:
 * プロンプトオーケストレーター - ユーザーの状況に応じて
 * 最適なプロンプトを動的生成し、AI間連携をサポートする
 */

import React, { useState, useEffect } from 'react';
import { Target, Lightbulb, Search, MessageSquare, Star } from 'lucide-react';
import promptOrchestrationService from '../../services/PromptOrchestrationService';
import logger from '../../utils/logger';

type GeneratedPromptService = ReturnType<typeof promptOrchestrationService.generatePersonalizedPrompt>;

interface PromptRecord {
  id: string;
  prompt: GeneratedPromptService & { id?: string };
  timestamp: string;
}

interface UserFeedback {
  rating: number;
  comments: string;
  aiUsed: string;
  timestamp: string;
}

const PromptOrchestrator = ({
  promptType = 'portfolio_analysis',
  userContext = {},
  onPromptGenerated = () => {},
  className = ''
}: any) => {
  const [generatedPrompt, setGeneratedPrompt] = useState<(GeneratedPromptService & { id?: string }) | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [promptHistory, setPromptHistory] = useState<PromptRecord[]>([]);
  const [selectedAI, setSelectedAI] = useState('claude');
  const [userFeedback, setUserFeedback] = useState<UserFeedback | null>(null);

  useEffect(() => {
    if (Object.keys(userContext).length > 0) {
      promptOrchestrationService.updateUserContext(userContext);
    }
    loadPromptHistory();
  }, [userContext]);

  const loadPromptHistory = () => {
    const history = promptOrchestrationService.promptHistory
      .filter(p => p.prompt.metadata?.promptType?.includes(promptType))
      .slice(0, 5);
    setPromptHistory(history);
  };

  const generatePrompt = async () => {
    setIsGenerating(true);
    try {
      const prompt = promptOrchestrationService.generatePersonalizedPrompt(
        promptType,
        userContext
      );
      
      setGeneratedPrompt(prompt);
      
      // プロンプト履歴に記録
      const promptId = promptOrchestrationService.recordPrompt(prompt);
      prompt.id = promptId;
      
      onPromptGenerated(prompt);
      loadPromptHistory();
    } catch (error) {
      logger.error('プロンプト生成エラー:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (generatedPrompt) {
      try {
        await navigator.clipboard.writeText(generatedPrompt.content);
        // Success feedback could be added here
      } catch (error) {
        logger.error('コピー失敗:', error);
      }
    }
  };

  const openAI = (aiType: string) => {
    const urls: Record<string, string> = {
      claude: 'https://claude.ai',
      gemini: 'https://gemini.google.com',
      chatgpt: 'https://chat.openai.com'
    };
    window.open(urls[aiType], '_blank');
    setSelectedAI(aiType);
  };

  const submitFeedback = (rating: number, comments = '') => {
    if (generatedPrompt && generatedPrompt.id) {
      const feedback = {
        rating,
        comments,
        aiUsed: selectedAI,
        timestamp: new Date().toISOString()
      };
      
      promptOrchestrationService.learnFromResponse(
        generatedPrompt.id,
        { aiProvider: selectedAI },
        feedback
      );
      
      setUserFeedback(feedback);
    }
  };

  const getPromptTypeDisplayName = (type: string) => {
    const names: Record<string, string> = {
      portfolio_analysis: 'ポートフォリオ分析',
      data_import_screenshot: 'データインポート',
      market_analysis: '市場分析',
      goal_setting: '目標設定',
      emotional_support: 'メンタルサポート'
    };
    return names[type] || type;
  };

  return (
    <div className={`bg-card rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
          <Target size={16} /> プロンプトオーケストレーター
        </h3>
        <div className="text-sm text-muted-foreground">
          {getPromptTypeDisplayName(promptType)}
        </div>
      </div>

      {/* Generate Prompt Section */}
      <div className="mb-6">
        <button
          onClick={generatePrompt}
          disabled={isGenerating}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
            isGenerating
              ? 'bg-gray-600 text-muted-foreground cursor-not-allowed'
              : 'bg-primary-500 hover:bg-primary-600 text-white'
          }`}
        >
          {isGenerating
            ? '生成中...'
            : 'パーソナライズドプロンプトを生成'
          }
        </button>
      </div>

      {/* Generated Prompt Display */}
      {generatedPrompt && (
        <div className="mb-6">
          <div className="bg-muted rounded-lg p-4 border border-border">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-white">
                生成されたプロンプト
              </h4>
              <button
                onClick={copyToClipboard}
                className="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white text-sm rounded transition-colors duration-200"
              >
                コピー
              </button>
            </div>
            
            <div className="bg-background rounded p-4 max-h-64 overflow-y-auto">
              <pre className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {generatedPrompt.content}
              </pre>
            </div>
            
            <div className="mt-3 text-xs text-gray-500">
              生成日時: {new Date(generatedPrompt.metadata.generatedAt).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* AI Selection */}
      {generatedPrompt && (
        <div className="mb-6">
          <h4 className="font-medium text-white mb-3">
            AIを選んで相談
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => openAI('claude')}
              className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 text-white text-center"
            >
              <div className="text-lg mb-1 flex justify-center"><Target size={16} /></div>
              <div className="font-medium">Claude</div>
              <div className="text-xs opacity-80">
                長期戦略・詳細分析
              </div>
            </button>

            <button
              onClick={() => openAI('gemini')}
              className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-white text-center"
            >
              <div className="text-lg mb-1 flex justify-center"><Search size={16} /></div>
              <div className="font-medium">Gemini</div>
              <div className="text-xs opacity-80">
                最新情報・市場分析
              </div>
            </button>

            <button
              onClick={() => openAI('chatgpt')}
              className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 text-white text-center"
            >
              <div className="text-lg mb-1 flex justify-center"><MessageSquare size={16} /></div>
              <div className="font-medium">ChatGPT</div>
              <div className="text-xs opacity-80">
                対話・創造的思考
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Feedback Section */}
      {generatedPrompt && !userFeedback && (
        <div className="mb-6">
          <h4 className="font-medium text-white mb-3">
            プロンプトの評価
          </h4>
          <div className="flex gap-2 mb-3">
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                onClick={() => submitFeedback(rating)}
                className="w-10 h-10 rounded-full bg-muted hover:bg-yellow-500 border border-border hover:border-yellow-400 transition-all duration-200 flex items-center justify-center"
              >
                <Star size={16} className="text-yellow-400" />
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            プロンプトの品質を評価してください（学習に活用されます）
          </p>
        </div>
      )}

      {/* Success Feedback */}
      {userFeedback && (
        <div className="mb-6 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="text-green-400 text-sm">
            フィードバックありがとうございます！
          </div>
        </div>
      )}

      {/* Recent Prompt History */}
      {promptHistory.length > 0 && (
        <div>
          <h4 className="font-medium text-white mb-3">
            最近のプロンプト
          </h4>
          <div className="space-y-2">
            {promptHistory.map((item, index) => (
              <div
                key={item.id}
                className="p-3 bg-muted rounded border border-border cursor-pointer hover:bg-card transition-colors duration-200"
                onClick={() => setGeneratedPrompt(item.prompt)}
              >
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground truncate flex-1">
                    {item.prompt.title}
                  </div>
                  <div className="text-xs text-gray-500 ml-2">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      {generatedPrompt && (
        <div className="mt-6 p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg">
          <h4 className="font-medium text-primary-400 mb-2 flex items-center gap-2">
            <Lightbulb size={16} /> 使い方
          </h4>
          <ol className="text-sm text-muted-foreground space-y-1">
            <li>1. 上記プロンプトをコピー</li>
            <li>2. お好みのAIサービスにアクセス</li>
            <li>3. プロンプトを貼り付けて送信</li>
            <li>4. AIからのアドバイスを受け取る</li>
            <li>5. 結果を評価して学習を改善</li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default PromptOrchestrator;