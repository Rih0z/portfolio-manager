/**
 * AIデータ取り込みモーダル
 * 
 * ユーザーがスクリーンショットから投資データを取り込むための
 * Claude AIプロンプトを提供するモーダルコンポーネント
 * 
 * 機能:
 * - マルチステップ指示の表示
 * - Claude AIプロンプトの自動生成
 * - プロンプトのコピー機能
 * - データタイプ選択（ポートフォリオ、設定、アンケート等）
 * 
 * @author Claude Code
 * @since 2025-01-03
 */

import React, { useState, useCallback, useEffect } from 'react';
import { FaTimes, FaCopy, FaCheck, FaRobot, FaCamera, FaUpload, FaUndo } from 'react-icons/fa';
import { HiSparkles, HiDocumentText } from 'react-icons/hi';
import PromptDisplay from './PromptDisplay';
import YAMLUtils from '../../utils/yamlProcessor';
import { useYAMLIntegration } from '../../hooks/useYAMLIntegration';

const AIDataImportModal = ({ 
  isOpen, 
  onClose, 
  dataType = 'portfolio',
  userContext = {},
  onImportComplete 
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDataType, setSelectedDataType] = useState(dataType);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [yamlInput, setYamlInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // YAML統合フックを使用
  const {
    integrateYAMLData,
    rollbackToBackup,
    isIntegrating,
    lastIntegrationResult,
    hasBackup,
    integrationHistory
  } = useYAMLIntegration({
    autoSave: true,
    showNotifications: true,
    backupBeforeIntegration: true
  });

  // データタイプオプション
  const dataTypeOptions = [
    {
      value: 'portfolio',
      label: 'ポートフォリオデータ',
      description: '保有資産、目標配分、投資額などの投資情報',
      icon: '📊'
    },
    {
      value: 'user_profile', 
      label: 'ユーザープロファイル',
      description: '投資経験、リスク許容度、投資目標等の個人情報',
      icon: '👤'
    },
    {
      value: 'app_config',
      label: 'アプリ設定',
      description: '表示設定、データソース、機能設定等',
      icon: '⚙️'
    },
    {
      value: 'allocation_templates',
      label: '配分テンプレート',
      description: '資産配分のテンプレートと推奨配分',
      icon: '📋'
    }
  ];

  const getCurrentDataTypeOption = () => 
    dataTypeOptions.find(option => option.value === selectedDataType);

  // プロンプト生成
  useEffect(() => {
    if (isOpen && selectedDataType) {
      const prompt = generateAIPrompt(selectedDataType, userContext);
      setGeneratedPrompt(prompt);
    }
  }, [isOpen, selectedDataType, userContext]);

  // モーダル制御
  const handleClose = useCallback(() => {
    setCurrentStep(1);
    setYamlInput('');
    setProcessingResult(null);
    setCopiedPrompt(false);
    onClose();
  }, [onClose]);

  // プロンプトコピー機能
  const handleCopyPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch (error) {
      console.error('Failed to copy prompt:', error);
    }
  }, [generatedPrompt]);

  // YAMLデータ処理と統合
  const handleProcessYAML = useCallback(async () => {
    if (!yamlInput.trim()) return;

    setIsProcessing(true);
    try {
      // YAML解析
      const parsedData = YAMLUtils.parse(yamlInput);
      const detectedType = YAMLUtils.detectType(parsedData);
      const metadata = YAMLUtils.generateMetadata(yamlInput, parsedData);

      // YAML統合フックを使用してデータを統合
      const integrationResult = await integrateYAMLData(parsedData, detectedType, {
        mergeStrategy: 'replace', // デフォルトは既存データを置き換え
        preserveExisting: false
      });

      setProcessingResult({
        success: integrationResult.success,
        data: parsedData,
        metadata,
        integrationResult,
        detectedType
      });

      if (integrationResult.success && onImportComplete) {
        onImportComplete(parsedData, detectedType);
      }

    } catch (error) {
      setProcessingResult({
        success: false,
        error: error.message,
        errorType: error.name || 'UnknownError'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [yamlInput, integrateYAMLData, onImportComplete]);

  // ロールバック処理
  const handleRollback = useCallback(async () => {
    if (!hasBackup) return;

    try {
      setIsProcessing(true);
      await rollbackToBackup();
      setProcessingResult({
        success: true,
        rollback: true,
        message: 'データのロールバックが完了しました'
      });
    } catch (error) {
      setProcessingResult({
        success: false,
        error: `ロールバックに失敗: ${error.message}`,
        errorType: 'ROLLBACK_ERROR'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [hasBackup, rollbackToBackup]);

  // ステップナビゲーション
  const goToNextStep = () => setCurrentStep(prev => Math.min(prev + 1, 3));
  const goToPreviousStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* オーバーレイ */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* モーダル本体 */}
        <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-4xl sm:w-full">
          {/* ヘッダー */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <HiSparkles className="w-6 h-6 text-white" />
                <h3 className="text-lg font-semibold text-white">
                  AI投資データ取り込み
                </h3>
              </div>
              <button
                onClick={handleClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* プログレス表示 */}
            <div className="mt-4">
              <div className="flex items-center space-x-4">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                      ${currentStep >= step 
                        ? 'bg-white text-blue-600' 
                        : 'bg-blue-400 text-white'}
                    `}>
                      {step}
                    </div>
                    {step < 3 && (
                      <div className={`
                        w-12 h-1 mx-2
                        ${currentStep > step ? 'bg-white' : 'bg-blue-400'}
                      `} />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 text-sm text-blue-100">
                {currentStep === 1 && 'データタイプを選択'}
                {currentStep === 2 && 'Claude AIプロンプトを使用'}
                {currentStep === 3 && 'YAMLデータを確認・取り込み'}
              </div>
            </div>
          </div>

          {/* メインコンテンツ */}
          <div className="px-6 py-6">
            {/* Step 1: データタイプ選択 */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    取り込むデータタイプを選択してください
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dataTypeOptions.map((option) => (
                      <div
                        key={option.value}
                        onClick={() => setSelectedDataType(option.value)}
                        className={`
                          p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md
                          ${selectedDataType === option.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'}
                        `}
                      >
                        <div className="flex items-start space-x-3">
                          <span className="text-2xl">{option.icon}</span>
                          <div>
                            <h5 className="font-medium text-gray-900">
                              {option.label}
                            </h5>
                            <p className="text-sm text-gray-600 mt-1">
                              {option.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={goToNextStep}
                    disabled={!selectedDataType}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    次へ
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: プロンプト表示 */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Claude AIプロンプトを使用してデータを取り込み
                  </h4>
                  
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xl">{getCurrentDataTypeOption()?.icon}</span>
                      <span className="font-medium text-gray-900">
                        {getCurrentDataTypeOption()?.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {getCurrentDataTypeOption()?.description}
                    </p>
                  </div>

                  <PromptDisplay
                    prompt={generatedPrompt}
                    dataType={selectedDataType}
                    onCopy={handleCopyPrompt}
                    copied={copiedPrompt}
                  />
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={goToPreviousStep}
                    className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    戻る
                  </button>
                  <button
                    onClick={goToNextStep}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    次へ
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: YAML取り込み */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Claude AIから取得したYAMLデータを貼り付けてください
                  </h4>
                  
                  <textarea
                    value={yamlInput}
                    onChange={(e) => setYamlInput(e.target.value)}
                    placeholder="Claude AIが生成したYAMLデータをここに貼り付けてください..."
                    className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  />

                  {processingResult && (
                    <div className={`
                      mt-4 p-4 rounded-lg
                      ${processingResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}
                    `}>
                      {processingResult.success ? (
                        <div>
                          <div className="flex items-center space-x-2 text-green-800 mb-2">
                            <FaCheck className="w-4 h-4" />
                            <span className="font-medium">
                              {processingResult.rollback ? 'ロールバックが完了しました' : 'データの統合が完了しました'}
                            </span>
                          </div>
                          <div className="text-sm text-green-700">
                            <p>検出されたデータタイプ: {processingResult.detectedType}</p>
                            
                            {/* 統合結果の詳細 */}
                            {processingResult.integrationResult && (
                              <div className="mt-2">
                                <p className="font-medium">適用された変更:</p>
                                <ul className="list-disc list-inside ml-2">
                                  {processingResult.integrationResult.appliedChanges.map((change, index) => (
                                    <li key={index}>{change.description}</li>
                                  ))}
                                </ul>
                                
                                {processingResult.integrationResult.warnings.length > 0 && (
                                  <div className="mt-2">
                                    <p className="font-medium">警告:</p>
                                    <ul className="list-disc list-inside ml-2">
                                      {processingResult.integrationResult.warnings.map((warning, index) => (
                                        <li key={index}>{warning.message}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* ロールバック案内 */}
                            {!processingResult.rollback && hasBackup && (
                              <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                                <p className="text-xs text-blue-700">
                                  統合前のデータはバックアップされています。問題がある場合はロールバックできます。
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center space-x-2 text-red-800 mb-2">
                            <FaTimes className="w-4 h-4" />
                            <span className="font-medium">データの処理中にエラーが発生しました</span>
                          </div>
                          <div className="text-sm text-red-700">
                            <p>{processingResult.error}</p>
                            {processingResult.errorType && (
                              <p className="mt-1">エラータイプ: {processingResult.errorType}</p>
                            )}
                            
                            {/* 統合エラーの詳細 */}
                            {processingResult.integrationResult?.errors && (
                              <div className="mt-2">
                                <p className="font-medium">詳細エラー:</p>
                                <ul className="list-disc list-inside ml-2">
                                  {processingResult.integrationResult.errors.map((error, index) => (
                                    <li key={index}>{error.message}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={goToPreviousStep}
                    className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    戻る
                  </button>
                  <div className="flex space-x-3">
                    {/* ロールバックボタン */}
                    {hasBackup && processingResult?.success && !processingResult.rollback && (
                      <button
                        onClick={handleRollback}
                        disabled={isProcessing || isIntegrating}
                        className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center space-x-2"
                      >
                        <FaUndo className="w-4 h-4" />
                        <span>ロールバック</span>
                      </button>
                    )}
                    
                    {/* データ取り込みボタン */}
                    {!processingResult?.success && (
                      <button
                        onClick={handleProcessYAML}
                        disabled={!yamlInput.trim() || isProcessing || isIntegrating}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isProcessing || isIntegrating ? '処理中...' : 'データを取り込む'}
                      </button>
                    )}
                    
                    {/* 完了ボタン */}
                    {processingResult?.success && (
                      <button
                        onClick={handleClose}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        完了
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * データタイプに応じたAIプロンプトを生成
 * @param {string} dataType - データタイプ
 * @param {Object} userContext - ユーザーコンテキスト
 * @returns {string} 生成されたプロンプト
 */
const generateAIPrompt = (dataType, userContext = {}) => {
  const basePrompt = `あなたはポートフォリオ管理アプリ「PortfolioWise」のデータ変換アシスタントです。

【重要な指示】
1. 提供されたスクリーンショットや情報から正確にデータを抽出してください
2. 以下の厳密なYAML形式で出力してください
3. 数値は必ず数値型（文字列ではない）で出力してください
4. 不明な項目は推定せず、null または省略してください
5. 通貨は明確に指定してください（JPY, USD等）

【出力形式】
必ずYAMLコードブロック（\`\`\`yaml から \`\`\`まで）で囲んで出力してください。
`;

  const dataTypePrompts = {
    portfolio: `${basePrompt}

【ポートフォリオデータ形式】
\`\`\`yaml
portfolio_data:
  metadata:
    total_assets: 1000000  # 総資産額（数値）
    currency: "JPY"        # 基準通貨
    last_updated: "2025-01-03"
    monthly_investment: 50000
    exchange_rate_usd_jpy: 150.0
  holdings:
    - symbol: "VTI"
      name: "バンガード・トータルストックマーケットETF"
      type: "ETF"
      market: "US"
      quantity: 10
      average_cost: 200.0
      current_price: 210.0
      currency: "USD"
      current_value: 2100.0
      allocation_percentage: 30.0
      target_percentage: 35.0
  target_allocation:
    - asset_class: "US_Stocks"
      target_percentage: 50.0
    - asset_class: "JP_Stocks"
      target_percentage: 30.0
    - asset_class: "Bonds"
      target_percentage: 20.0
\`\`\`

スクリーンショットから上記形式のYAMLを生成してください。`,

    user_profile: `${basePrompt}

【ユーザープロファイル形式】
\`\`\`yaml
user_profile:
  basic_info:
    age_group: "30-40"
    experience_level: "intermediate"
    investment_period: "long_term"
  risk_assessment:
    risk_tolerance: "moderate"
    loss_tolerance_percentage: 20
    volatility_comfort: "medium"
  investment_goals:
    primary_goal: "growth"
    target_return: 7.0
  financial_situation:
    monthly_investment: 100000
    emergency_fund_months: 6
  preferences:
    preferred_markets: ["US", "JP"]
    sector_preferences: ["Technology", "Healthcare"]
\`\`\`

アンケート結果や個人情報から上記形式のYAMLを生成してください。`,

    app_config: `${basePrompt}

【アプリ設定形式】
\`\`\`yaml
app_config:
  display:
    default_currency: "JPY"
    decimal_places: 2
    chart_theme: "modern"
  data_sources:
    primary_api: "yahoo_finance"
    backup_apis: ["alpaca", "alpha_vantage"]
    update_frequency: "daily"
  features:
    ai_analysis: true
    real_time_data: false
    multi_currency: true
    cloud_sync: true
\`\`\`

設定画面や環境設定から上記形式のYAMLを生成してください。`,

    allocation_templates: `${basePrompt}

【配分テンプレート形式】
\`\`\`yaml
allocation_templates:
  conservative:
    name: "保守的ポートフォリオ"
    description: "安定重視の資産配分"
    allocations:
      - asset_class: "Bonds"
        percentage: 60
      - asset_class: "US_Stocks"
        percentage: 25
      - asset_class: "JP_Stocks"
        percentage: 15
  balanced:
    name: "バランス型ポートフォリオ"
    description: "成長と安定のバランス"
    allocations:
      - asset_class: "US_Stocks"
        percentage: 40
      - asset_class: "JP_Stocks"
        percentage: 30
      - asset_class: "Bonds"
        percentage: 30
\`\`\`

資産配分テンプレートから上記形式のYAMLを生成してください。`
  };

  return dataTypePrompts[dataType] || dataTypePrompts.portfolio;
};

export default AIDataImportModal;