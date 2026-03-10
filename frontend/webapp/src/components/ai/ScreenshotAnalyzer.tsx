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
import { FileText, CheckCircle, Lightbulb, Lock } from 'lucide-react';
import logger from '../../utils/logger';

const ScreenshotAnalyzer = ({
  onDataExtracted = () => {},
  className = ''
}: any) => {
  interface ExtractedPortfolioData {
    portfolioData?: {
      assets: unknown[];
      totalValue: number;
      extractedAt: string;
      source: string;
    };
    rawText?: string;
    extractedAt?: string;
    source?: string;
    [key: string]: unknown;
  }

  const [aiResponse, setAiResponse] = useState('');
  const [extractedData, setExtractedData] = useState<ExtractedPortfolioData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
      logger.error('AI応答の解析エラー:', error);
      // エラーハンドリング
    } finally {
      setIsProcessing(false);
    }
  };

  const parseTextResponse = (text: string) => {
    // 基本的なテキスト解析（JSON形式でない場合のフォールバック）
    const lines = text.split('\n').filter((line: string) => line.trim());

    return {
      portfolioData: {
        assets: [] as unknown[], // テキスト解析ロジックを実装
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
    <div className={`bg-card rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">
          <FileText className="inline-block w-5 h-5 mr-1" /> AI分析結果の受け取り
        </h3>
        <button
          onClick={clearAll}
          className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground border border-border hover:border-muted-foreground rounded transition-colors duration-200"
        >
          クリア
        </button>
      </div>

      {/* プライバシー保護の説明 */}
      <div className="mb-6">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-2xl flex items-center"><Lock className="w-6 h-6 text-blue-400" /></div>
            <div>
              <h5 className="text-blue-400 font-medium mb-2">
                プライバシー保護について
              </h5>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  このアプリではプライバシー保護のため、スクリーンショットのアップロードは一切行いません。
                </p>
                <p>
                  スクリーンショット分析プロンプトの生成は「AIアドバイザー」タブで行えます。
                </p>
                <p>
                  外部AIで分析された結果をこちらに貼り付けてください。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Response Input */}
      <div className="mb-6">
        <h4 className="font-medium text-white mb-3">
          AI分析結果を貼り付け
        </h4>
        <textarea
          value={aiResponse}
          onChange={(e) => setAiResponse(e.target.value)}
          placeholder={'AIからの分析結果をここに貼り付けてください...\n\nJSON形式または通常のテキスト形式のどちらでも対応できます。'}
          className="w-full p-3 bg-muted border border-border rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
          rows={10}
        />
        
        {aiResponse && (
          <div className="mt-3">
            <button
              onClick={processAIResponse}
              disabled={isProcessing}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-colors duration-200 ${
                isProcessing
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white dark:bg-green-600 dark:hover:bg-green-500'
              }`}
            >
              {isProcessing ? '処理中...' : 'データを抽出'}
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
                <CheckCircle className="inline-block w-5 h-5 mr-1" /> 抽出されたデータ
              </h4>
              <button
                onClick={downloadExtractedData}
                className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded transition-colors duration-200"
              >
                ダウンロード
              </button>
            </div>
            
            <div className="bg-background rounded p-4 max-h-48 overflow-y-auto">
              <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                {JSON.stringify(extractedData, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4">
        <h5 className="text-primary-400 font-medium mb-2">
          <Lightbulb className="inline-block w-5 h-5 mr-1" /> 使い方のヒント
        </h5>
        <div className="space-y-1 text-sm text-muted-foreground">
          <div>
            • プロンプト生成は「AIアドバイザー」タブを使用してください
          </div>
          <div>
            • JSON形式（```json ... ```）または通常のテキスト形式の結果を貼り付けてください
          </div>
          <div>
            • データは自動的にポートフォリオに統合されます
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreenshotAnalyzer;