/**
 * プロンプト表示コンポーネント
 * 
 * Claude AIで使用するプロンプトの表示と操作を提供
 * 
 * 機能:
 * - プロンプトテキストの表示
 * - ワンクリックコピー機能
 * - 使用手順の表示
 * - レスポンシブ対応
 * 
 * @author Claude Code
 * @since 2025-01-03
 */

import React, { useState, useCallback } from 'react';
import { FaCopy, FaCheck, FaRobot, FaCamera, FaClipboard, FaExternalLinkAlt } from 'react-icons/fa';
import { HiSparkles, HiDocumentText } from 'react-icons/hi';

const PromptDisplay = ({ 
  prompt, 
  dataType = 'portfolio',
  onCopy,
  copied = false,
  showInstructions = true 
}) => {
  const [expandedPrompt, setExpandedPrompt] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      if (onCopy) onCopy();
    } catch (error) {
      console.error('Failed to copy prompt:', error);
    }
  }, [prompt, onCopy]);

  const getDataTypeInfo = () => {
    const dataTypeInfo = {
      portfolio: {
        title: 'ポートフォリオデータ取り込み',
        description: '保有資産、目標配分、投資額等の投資情報を取り込みます',
        icon: '📊',
        color: 'blue'
      },
      user_profile: {
        title: 'ユーザープロファイル取り込み',
        description: '投資経験、リスク許容度、投資目標等の個人情報を取り込みます',
        icon: '👤',
        color: 'green'
      },
      app_config: {
        title: 'アプリ設定取り込み',
        description: '表示設定、データソース、機能設定等を取り込みます',
        icon: '⚙️',
        color: 'purple'
      },
      allocation_templates: {
        title: '配分テンプレート取り込み',
        description: '資産配分のテンプレートと推奨配分を取り込みます',
        icon: '📋',
        color: 'orange'
      }
    };
    return dataTypeInfo[dataType] || dataTypeInfo.portfolio;
  };

  const info = getDataTypeInfo();

  return (
    <div className="space-y-6">
      {/* データタイプ情報 */}
      <div className={`bg-${info.color}-50 border border-${info.color}-200 rounded-lg p-4`}>
        <div className="flex items-start space-x-3">
          <span className="text-2xl">{info.icon}</span>
          <div>
            <h5 className={`font-semibold text-${info.color}-900`}>
              {info.title}
            </h5>
            <p className={`text-sm text-${info.color}-700 mt-1`}>
              {info.description}
            </p>
          </div>
        </div>
      </div>

      {/* 使用手順 */}
      {showInstructions && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h5 className="font-semibold text-gray-900 mb-3 flex items-center">
            <HiDocumentText className="w-5 h-5 mr-2" />
            使用手順
          </h5>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>下のプロンプトをコピーしてください</li>
            <li>Claude AI（claude.ai）またはGemini（gemini.google.com）を開きます</li>
            <li>データのスクリーンショットと一緒にプロンプトを送信してください</li>
            <li>AIが生成したYAMLデータをコピーして次のステップに進んでください</li>
          </ol>
          
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="https://claude.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full hover:bg-blue-200 transition-colors"
            >
              <FaRobot className="w-3 h-3 mr-1" />
              Claude AI
              <FaExternalLinkAlt className="w-3 h-3 ml-1" />
            </a>
            <a
              href="https://gemini.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full hover:bg-green-200 transition-colors"
            >
              <HiSparkles className="w-3 h-3 mr-1" />
              Gemini
              <FaExternalLinkAlt className="w-3 h-3 ml-1" />
            </a>
          </div>
        </div>
      )}

      {/* プロンプト表示エリア */}
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FaRobot className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-900">Claude AIプロンプト</span>
              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                {dataType}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setExpandedPrompt(!expandedPrompt)}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                {expandedPrompt ? '折りたたむ' : '全体を表示'}
              </button>
              <button
                onClick={handleCopy}
                className={`
                  flex items-center space-x-1 px-3 py-1 rounded text-xs transition-all
                  ${copied 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}
                `}
              >
                {copied ? (
                  <>
                    <FaCheck className="w-3 h-3" />
                    <span>コピー済み</span>
                  </>
                ) : (
                  <>
                    <FaCopy className="w-3 h-3" />
                    <span>コピー</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* プロンプト本文 */}
        <div className={`relative ${expandedPrompt ? '' : 'max-h-64 overflow-hidden'}`}>
          <pre className="p-4 text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed bg-white">
            {prompt}
          </pre>
          
          {/* グラデーションオーバーレイ（折りたたみ時） */}
          {!expandedPrompt && (
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          )}
        </div>

        {/* フッター（文字数表示） */}
        <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              文字数: {prompt.length.toLocaleString()}文字
            </span>
            <div className="flex items-center space-x-4">
              <span>Claude AI, Gemini対応</span>
              <span className="text-green-600">✓ YAML形式</span>
            </div>
          </div>
        </div>
      </div>

      {/* 追加のヒント */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FaCamera className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <h6 className="font-medium text-blue-900 mb-1">スクリーンショットのコツ</h6>
            <ul className="text-blue-700 space-y-1">
              <li>• 文字がはっきり読める解像度で撮影してください</li>
              <li>• 必要な情報が全て含まれていることを確認してください</li>
              <li>• 複数画面の場合は、個別にスクリーンショットを撮ってください</li>
              <li>• 個人情報（氏名、住所等）は事前にマスクしてください</li>
            </ul>
          </div>
        </div>
      </div>

      {/* AIサービス選択ガイド */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <HiSparkles className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div className="text-sm">
            <h6 className="font-medium text-yellow-900 mb-1">推奨AIサービス</h6>
            <div className="text-yellow-700 space-y-1">
              <p><strong>Claude AI:</strong> 詳細な分析と正確なYAML生成に優れています</p>
              <p><strong>Gemini:</strong> 画像認識とマルチモーダル処理に強みがあります</p>
              <p className="text-xs text-yellow-600 mt-2">
                ※ どちらのサービスでも同じプロンプトが使用できます
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptDisplay;