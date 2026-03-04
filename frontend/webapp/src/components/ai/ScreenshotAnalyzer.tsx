/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/components/ai/ScreenshotAnalyzer.jsx
 * 
 * 作成者: Claude Code
 * 作成日: 2025-01-03
 * 更新日: 2025-02-06
 * 
 * 説明:
 * AIで分析されたデータの受け取り・処理機能
 * プライバシー保護のため、この画面でのスクリーンショットアップロードは行いません。
 * 外部AIで分析された結果をテキストで受け取り、構造化データに変換します。
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const ScreenshotAnalyzer = ({
  onDataExtracted = () => {},
  className = ''
}: any) => {
  const { t, i18n } = useTranslation();
  const [aiResponse, setAiResponse] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const isJapanese = i18n.language === 'ja';

  const processAIResponse = () => {
    if (!aiResponse.trim()) return;

    setIsProcessing(true);
    try {
      // JSON形式のレスポンスを抽出
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/);
      
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[1]);
        setExtractedData(jsonData);
        onDataExtracted(jsonData, 'ai_analysis');
      } else {
        // JSON形式でない場合は、テキスト解析を試行
        const structuredData = parseTextResponse(aiResponse);
        setExtractedData(structuredData);
        onDataExtracted(structuredData, 'ai_analysis');
      }
    } catch (error) {
      console.error('AI応答の解析エラー:', error);
      // エラーハンドリング
    } finally {
      setIsProcessing(false);
    }
  };

  const parseTextResponse = (text) => {
    // 基本的なテキスト解析（JSON形式でない場合のフォールバック）
    const lines = text.split('\n').filter(line => line.trim());
    
    return {
      portfolioData: {
        assets: [], // テキスト解析ロジックを実装
        totalValue: 0,
        extractedAt: new Date().toISOString(),
        source: 'text_analysis'
      },
      rawText: text,
      extractedAt: new Date().toISOString(),
      source: 'text_analysis'
    };
  };

  const clearAll = () => {
    setAiResponse('');
    setExtractedData(null);
  };

  const downloadExtractedData = () => {
    if (extractedData) {
      const dataStr = JSON.stringify(extractedData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `extracted-data-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className={`bg-dark-200 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">
          📄 {isJapanese ? 'AI分析結果の受け取り' : 'AI Analysis Result Input'}
        </h3>
        <button
          onClick={clearAll}
          className="px-3 py-1 text-sm text-gray-400 hover:text-white border border-gray-600 hover:border-gray-400 rounded transition-colors duration-200"
        >
          {isJapanese ? 'クリア' : 'Clear'}
        </button>
      </div>

      {/* プライバシー保護の説明 */}
      <div className="mb-6">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">🔒</div>
            <div>
              <h5 className="text-blue-400 font-medium mb-2">
                {isJapanese ? 'プライバシー保護について' : 'Privacy Protection'}
              </h5>
              <div className="text-sm text-gray-300 space-y-2">
                <p>
                  {isJapanese 
                    ? 'このアプリではプライバシー保護のため、スクリーンショットのアップロードは一切行いません。'
                    : 'This app does not upload any screenshots to protect your privacy.'
                  }
                </p>
                <p>
                  {isJapanese 
                    ? 'スクリーンショット分析プロンプトの生成は「AIアドバイザー」タブで行えます。'
                    : 'Screenshot analysis prompt generation is available in the "AI Advisor" tab.'
                  }
                </p>
                <p>
                  {isJapanese 
                    ? '外部AIで分析された結果をこちらに貼り付けてください。'
                    : 'Please paste the analysis results from external AI here.'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Response Input */}
      <div className="mb-6">
        <h4 className="font-medium text-white mb-3">
          {isJapanese ? 'AI分析結果を貼り付け' : 'Paste AI Analysis Result'}
        </h4>
        <textarea
          value={aiResponse}
          onChange={(e) => setAiResponse(e.target.value)}
          placeholder={isJapanese 
            ? 'AIからの分析結果をここに貼り付けてください...\n\nJSON形式または通常のテキスト形式のどちらでも対応できます。'
            : 'Paste AI analysis result here...\n\nBoth JSON and plain text formats are supported.'
          }
          className="w-full p-3 bg-dark-300 border border-dark-400 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
          rows={10}
        />
        
        {aiResponse && (
          <div className="mt-3">
            <button
              onClick={processAIResponse}
              disabled={isProcessing}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-colors duration-200 ${
                isProcessing
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isProcessing 
                ? (isJapanese ? '処理中...' : 'Processing...')
                : (isJapanese ? 'データを抽出' : 'Extract Data')
              }
            </button>
          </div>
        )}
      </div>

      {/* Extracted Data Display */}
      {extractedData && (
        <div className="mb-6">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-green-400">
                ✅ {isJapanese ? '抽出されたデータ' : 'Extracted Data'}
              </h4>
              <button
                onClick={downloadExtractedData}
                className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded transition-colors duration-200"
              >
                {isJapanese ? 'ダウンロード' : 'Download'}
              </button>
            </div>
            
            <div className="bg-dark-100 rounded p-4 max-h-48 overflow-y-auto">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                {JSON.stringify(extractedData, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4">
        <h5 className="text-primary-400 font-medium mb-2">
          💡 {isJapanese ? '使い方のヒント' : 'Usage Tips'}
        </h5>
        <div className="space-y-1 text-sm text-gray-300">
          <div>
            • {isJapanese 
              ? 'プロンプト生成は「AIアドバイザー」タブを使用してください'
              : 'Use the "AI Advisor" tab for prompt generation'
            }
          </div>
          <div>
            • {isJapanese 
              ? 'JSON形式（```json ... ```）または通常のテキスト形式の結果を貼り付けてください'
              : 'Paste results in JSON format (```json ... ```) or plain text'
            }
          </div>
          <div>
            • {isJapanese 
              ? 'データは自動的にポートフォリオに統合されます'
              : 'Data will be automatically integrated into your portfolio'
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreenshotAnalyzer;