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
import { useTranslation } from 'react-i18next';
import promptOrchestrationService from '../../services/PromptOrchestrationService';

const PromptOrchestrator = ({
  promptType = 'portfolio_analysis',
  userContext = {},
  onPromptGenerated = () => {},
  className = ''
}: any) => {
  const { t, i18n } = useTranslation();
  const [generatedPrompt, setGeneratedPrompt] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [promptHistory, setPromptHistory] = useState([]);
  const [selectedAI, setSelectedAI] = useState('claude');
  const [userFeedback, setUserFeedback] = useState(null);

  const isJapanese = i18n.language === 'ja';

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
      console.error('プロンプト生成エラー:', error);
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
        console.error('コピー失敗:', error);
      }
    }
  };

  const openAI = (aiType) => {
    const urls = {
      claude: 'https://claude.ai',
      gemini: 'https://gemini.google.com',
      chatgpt: 'https://chat.openai.com'
    };
    window.open(urls[aiType], '_blank');
    setSelectedAI(aiType);
  };

  const submitFeedback = (rating, comments = '') => {
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

  const getPromptTypeDisplayName = (type) => {
    const names = {
      portfolio_analysis: isJapanese ? 'ポートフォリオ分析' : 'Portfolio Analysis',
      data_import_screenshot: isJapanese ? 'データインポート' : 'Data Import',
      market_analysis: isJapanese ? '市場分析' : 'Market Analysis',
      goal_setting: isJapanese ? '目標設定' : 'Goal Setting',
      emotional_support: isJapanese ? 'メンタルサポート' : 'Emotional Support'
    };
    return names[type] || type;
  };

  return (
    <div className={`bg-dark-200 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">
          🎯 {isJapanese ? 'プロンプトオーケストレーター' : 'Prompt Orchestrator'}
        </h3>
        <div className="text-sm text-gray-400">
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
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-primary-500 hover:bg-primary-600 text-white'
          }`}
        >
          {isGenerating 
            ? (isJapanese ? '生成中...' : 'Generating...')
            : (isJapanese ? 'パーソナライズドプロンプトを生成' : 'Generate Personalized Prompt')
          }
        </button>
      </div>

      {/* Generated Prompt Display */}
      {generatedPrompt && (
        <div className="mb-6">
          <div className="bg-dark-300 rounded-lg p-4 border border-dark-400">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-white">
                {isJapanese ? '生成されたプロンプト' : 'Generated Prompt'}
              </h4>
              <button
                onClick={copyToClipboard}
                className="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white text-sm rounded transition-colors duration-200"
              >
                {isJapanese ? 'コピー' : 'Copy'}
              </button>
            </div>
            
            <div className="bg-dark-100 rounded p-4 max-h-64 overflow-y-auto">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                {generatedPrompt.content}
              </pre>
            </div>
            
            <div className="mt-3 text-xs text-gray-500">
              {isJapanese ? '生成日時' : 'Generated'}: {new Date(generatedPrompt.metadata.generatedAt).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* AI Selection */}
      {generatedPrompt && (
        <div className="mb-6">
          <h4 className="font-medium text-white mb-3">
            {isJapanese ? 'AIを選んで相談' : 'Choose AI for Consultation'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => openAI('claude')}
              className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 text-white text-center"
            >
              <div className="text-lg mb-1">🎯</div>
              <div className="font-medium">Claude</div>
              <div className="text-xs opacity-80">
                {isJapanese ? '長期戦略・詳細分析' : 'Long-term Strategy'}
              </div>
            </button>

            <button
              onClick={() => openAI('gemini')}
              className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-white text-center"
            >
              <div className="text-lg mb-1">🔍</div>
              <div className="font-medium">Gemini</div>
              <div className="text-xs opacity-80">
                {isJapanese ? '最新情報・市場分析' : 'Latest Info & Markets'}
              </div>
            </button>

            <button
              onClick={() => openAI('chatgpt')}
              className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 text-white text-center"
            >
              <div className="text-lg mb-1">💬</div>
              <div className="font-medium">ChatGPT</div>
              <div className="text-xs opacity-80">
                {isJapanese ? '対話・創造的思考' : 'Interactive & Creative'}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Feedback Section */}
      {generatedPrompt && !userFeedback && (
        <div className="mb-6">
          <h4 className="font-medium text-white mb-3">
            {isJapanese ? 'プロンプトの評価' : 'Rate this Prompt'}
          </h4>
          <div className="flex gap-2 mb-3">
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                onClick={() => submitFeedback(rating)}
                className="w-10 h-10 rounded-full bg-dark-300 hover:bg-yellow-500 border border-dark-400 hover:border-yellow-400 transition-all duration-200 flex items-center justify-center"
              >
                <span className="text-lg">⭐</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            {isJapanese 
              ? 'プロンプトの品質を評価してください（学習に活用されます）'
              : 'Rate the prompt quality (used for learning)'
            }
          </p>
        </div>
      )}

      {/* Success Feedback */}
      {userFeedback && (
        <div className="mb-6 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="text-green-400 text-sm">
            {isJapanese ? 'フィードバックありがとうございます！' : 'Thank you for your feedback!'}
          </div>
        </div>
      )}

      {/* Recent Prompt History */}
      {promptHistory.length > 0 && (
        <div>
          <h4 className="font-medium text-white mb-3">
            {isJapanese ? '最近のプロンプト' : 'Recent Prompts'}
          </h4>
          <div className="space-y-2">
            {promptHistory.map((item, index) => (
              <div
                key={item.id}
                className="p-3 bg-dark-300 rounded border border-dark-400 cursor-pointer hover:bg-dark-200 transition-colors duration-200"
                onClick={() => setGeneratedPrompt(item.prompt)}
              >
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-300 truncate flex-1">
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
          <h4 className="font-medium text-primary-400 mb-2">
            💡 {isJapanese ? '使い方' : 'How to Use'}
          </h4>
          <ol className="text-sm text-gray-300 space-y-1">
            <li>1. {isJapanese ? '上記プロンプトをコピー' : 'Copy the prompt above'}</li>
            <li>2. {isJapanese ? 'お好みのAIサービスにアクセス' : 'Access your preferred AI service'}</li>
            <li>3. {isJapanese ? 'プロンプトを貼り付けて送信' : 'Paste the prompt and send'}</li>
            <li>4. {isJapanese ? 'AIからのアドバイスを受け取る' : 'Receive advice from AI'}</li>
            <li>5. {isJapanese ? '結果を評価して学習を改善' : 'Rate the result to improve learning'}</li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default PromptOrchestrator;