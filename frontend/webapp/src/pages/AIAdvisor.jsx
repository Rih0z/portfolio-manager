/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/pages/AIAdvisor.jsx
 * 
 * 作成者: Claude Code
 * 作成日: 2025-01-03
 * 
 * 説明:
 * AIアドバイザー機能のメインページ。ユーザーの情報を収集し、
 * パーソナライズされたプロンプトを生成して外部AI（Claude/Gemini）
 * との連携をサポートする。アプリは情報収集のみ行い、投資アドバイス
 * そのものは外部AIに委託する。
 */

import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PortfolioContext } from '../context/PortfolioContext';
import MarketSelectionWizard, { INVESTMENT_MARKETS } from '../components/settings/MarketSelectionWizard';
import PromptOrchestrator from '../components/ai/PromptOrchestrator';
import promptOrchestrationService from '../services/PromptOrchestrationService';
import ModernButton from '../components/common/ModernButton';

const AIAdvisor = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { 
    portfolio, 
    currentAssets,
    targetPortfolio,
    additionalBudget
  } = useContext(PortfolioContext);

  // 設定がない場合の判定
  const hasNoSettings = 
    currentAssets.length === 0 && 
    targetPortfolio.length === 0 &&
    (!additionalBudget || additionalBudget.amount === 0);
  
  const initialSetupCompleted = localStorage.getItem('initialSetupCompleted');
  const isFirstTimeUser = hasNoSettings && !initialSetupCompleted;
  const [currentStep, setCurrentStep] = useState(0);
  const [userData, setUserData] = useState({
    age: 35,
    occupation: '',
    occupationCustom: '',
    familyStatus: '',
    familyStatusCustom: '',
    dream: '',
    dreamCustom: '',
    targetMarkets: [],
    investmentExperience: '',
    investmentExperienceCustom: '',
    riskTolerance: '',
    riskToleranceCustom: '',
    monthlyInvestment: '',
    values: [],
    valuesCustom: [],
    concerns: [],
    concernsCustom: [],
    idealPortfolio: '',
    currentAssetsDescription: ''
  });
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [screenshotPromptType, setScreenshotPromptType] = useState('screenshot_portfolio');
  const [screenshotInstructions, setScreenshotInstructions] = useState('');
  const [generatedScreenshotPrompt, setGeneratedScreenshotPrompt] = useState(null);

  const isJapanese = i18n.language === 'ja';

  const steps = [
    { key: 'basic', titleJa: '基本情報', titleEn: 'Basic Information' },
    { key: 'markets', titleJa: '投資対象市場', titleEn: 'Investment Markets' },
    { key: 'experience', titleJa: '投資経験', titleEn: 'Investment Experience' },
    { key: 'goals', titleJa: '目標と価値観', titleEn: 'Goals & Values' },
    { key: 'screenshot', titleJa: 'スクリーンショット分析', titleEn: 'Screenshot Analysis' },
    { key: 'prompt', titleJa: 'AIプロンプト', titleEn: 'AI Prompt' }
  ];

  const occupationOptions = [
    { value: '会社員', label: isJapanese ? '会社員' : 'Company Employee' },
    { value: '公務員', label: isJapanese ? '公務員' : 'Government Employee' },
    { value: '自営業', label: isJapanese ? '自営業' : 'Self-employed' },
    { value: '学生', label: isJapanese ? '学生' : 'Student' },
    { value: '主婦/主夫', label: isJapanese ? '主婦/主夫' : 'Homemaker' },
    { value: 'その他', label: isJapanese ? 'その他' : 'Other' }
  ];

  const familyStatusOptions = [
    { value: '独身', label: isJapanese ? '独身' : 'Single' },
    { value: '夫婦（子供なし）', label: isJapanese ? '夫婦（子供なし）' : 'Married (No Children)' },
    { value: '夫婦（子供あり）', label: isJapanese ? '夫婦（子供あり）' : 'Married (With Children)' },
    { value: 'その他', label: isJapanese ? 'その他' : 'Other' }
  ];

  const dreamOptions = [
    { value: '経済的自由を手に入れたい', label: isJapanese ? '経済的自由を手に入れたい' : 'Achieve Financial Freedom' },
    { value: '老後の不安を解消したい', label: isJapanese ? '老後の不安を解消したい' : 'Eliminate Retirement Anxiety' },
    { value: '子供の教育費を準備したい', label: isJapanese ? '子供の教育費を準備したい' : 'Prepare for Children\'s Education' },
    { value: '早期リタイアしたい', label: isJapanese ? '早期リタイアしたい' : 'Retire Early' },
    { value: '住宅購入資金を貯めたい', label: isJapanese ? '住宅購入資金を貯めたい' : 'Save for Home Purchase' },
    { value: '世界中を旅行したい', label: isJapanese ? '世界中を旅行したい' : 'Travel the World' },
    { value: 'その他', label: isJapanese ? 'その他' : 'Other' }
  ];

  const experienceOptions = [
    { value: '初心者', label: isJapanese ? '初心者（1年未満）' : 'Beginner (Less than 1 year)' },
    { value: '初級者', label: isJapanese ? '初級者（1-3年）' : 'Novice (1-3 years)' },
    { value: '中級者', label: isJapanese ? '中級者（3-5年）' : 'Intermediate (3-5 years)' },
    { value: '上級者', label: isJapanese ? '上級者（5年以上）' : 'Advanced (5+ years)' },
    { value: 'その他', label: isJapanese ? 'その他' : 'Other' }
  ];

  const riskToleranceOptions = [
    { value: '保守的', label: isJapanese ? '保守的（リスクを避けたい）' : 'Conservative (Avoid Risk)' },
    { value: 'バランス型', label: isJapanese ? 'バランス型（適度なリスクは取れる）' : 'Balanced (Moderate Risk)' },
    { value: '積極的', label: isJapanese ? '積極的（高いリターンのためならリスクを取る）' : 'Aggressive (Take Risk for High Returns)' },
    { value: 'その他', label: isJapanese ? 'その他' : 'Other' }
  ];

  const valueOptions = [
    { value: '安全性重視', label: isJapanese ? '安全性重視' : 'Safety First' },
    { value: '着実な成長', label: isJapanese ? '着実な成長' : 'Steady Growth' },
    { value: '高いリターン', label: isJapanese ? '高いリターンを狙いたい' : 'Target High Returns' },
    { value: '分散投資', label: isJapanese ? '分散投資でリスクを分散' : 'Diversify Risk' },
    { value: '長期投資', label: isJapanese ? '長期投資で時間を味方に' : 'Long-term Investment' },
    { value: '定期積立', label: isJapanese ? '定期積立で習慣化' : 'Regular Investment Habit' },
    { value: 'その他', label: isJapanese ? 'その他' : 'Other' }
  ];

  const concernOptions = [
    { value: '市場の暴落', label: isJapanese ? '市場の暴落が心配' : 'Worried about Market Crashes' },
    { value: '知識不足', label: isJapanese ? '投資の知識が足りない' : 'Lack of Investment Knowledge' },
    { value: '詐欺やリスク', label: isJapanese ? '詐欺や予想外のリスク' : 'Fraud or Unexpected Risks' },
    { value: '時間がない', label: isJapanese ? '管理する時間がない' : 'No Time to Manage' },
    { value: 'タイミング', label: isJapanese ? '始めるタイミングがわからない' : 'Don\'t Know When to Start' },
    { value: '金額設定', label: isJapanese ? '適切な投資金額がわからない' : 'Don\'t Know Appropriate Amount' },
    { value: 'その他', label: isJapanese ? 'その他' : 'Other' }
  ];

  const screenshotAnalysisTypes = [
    {
      id: 'screenshot_portfolio',
      name: isJapanese ? 'ポートフォリオ画面' : 'Portfolio Screen',
      description: isJapanese ? '証券会社の保有残高画面など' : 'Brokerage holdings screen',
      icon: '📊'
    },
    {
      id: 'market_data_screenshot',
      name: isJapanese ? '株価・市場データ' : 'Market Data',
      description: isJapanese ? '株価表示画面やチャート' : 'Stock prices or charts',
      icon: '📈'
    },
    {
      id: 'transaction_history',
      name: isJapanese ? '取引履歴' : 'Transaction History',
      description: isJapanese ? '売買履歴や約定情報' : 'Trading history',
      icon: '📋'
    }
  ];

  const generateAIPrompt = () => {
    const selectedMarketNames = userData.targetMarkets.map(marketId => 
      isJapanese ? INVESTMENT_MARKETS[marketId].name : INVESTMENT_MARKETS[marketId].nameEn
    ).join('、');

    const selectedMarketExamples = userData.targetMarkets.map(marketId => 
      (isJapanese ? INVESTMENT_MARKETS[marketId].examples : INVESTMENT_MARKETS[marketId].examplesEn).join('/')
    ).join('、');

    const remainingYears = Math.max(0, 65 - userData.age);
    const lifeStage = userData.age < 30 ? 'キャリア形成期' :
                      userData.age < 40 ? '家族形成期' :
                      userData.age < 50 ? '教育費準備期' :
                      userData.age < 60 ? '退職準備期' : '退職後';

    const portfolioSummary = portfolio?.assets?.length > 0 
      ? portfolio.assets.map(asset => 
          `- ${asset.name}: ${asset.quantity}口（評価額: ${asset.totalValue?.toLocaleString() || 'N/A'}円）`
        ).join('\n')
      : '- まだ投資を始めていません';

    const totalValue = portfolio?.totalValue || 0;

    // 職業の表示（カスタム入力があれば使用）
    const occupationDisplay = userData.occupation === 'その他' && userData.occupationCustom 
      ? userData.occupationCustom 
      : userData.occupation;
    
    // 家族構成の表示（カスタム入力があれば使用）
    const familyStatusDisplay = userData.familyStatus === 'その他' && userData.familyStatusCustom 
      ? userData.familyStatusCustom 
      : userData.familyStatus;
    
    // 夢の表示（カスタム入力があれば使用）
    const dreamDisplay = userData.dream === 'その他' && userData.dreamCustom 
      ? userData.dreamCustom 
      : userData.dream;
    
    // 投資経験の表示（カスタム入力があれば使用）
    const experienceDisplay = userData.investmentExperience === 'その他' && userData.investmentExperienceCustom 
      ? userData.investmentExperienceCustom 
      : userData.investmentExperience;
    
    // リスク許容度の表示（カスタム入力があれば使用）
    const riskToleranceDisplay = userData.riskTolerance === 'その他' && userData.riskToleranceCustom 
      ? userData.riskToleranceCustom 
      : userData.riskTolerance;
    
    // 価値観の表示（カスタム入力があれば含める）
    const allValues = [...userData.values];
    if (userData.values.includes('その他') && userData.valuesCustom.length > 0) {
      allValues.push(...userData.valuesCustom);
    }
    const valuesText = allValues.filter(val => val !== 'その他').join('\n- ');
    
    // 不安の表示（カスタム入力があれば含める）
    const allConcerns = [...userData.concerns];
    if (userData.concerns.includes('その他') && userData.concernsCustom.length > 0) {
      allConcerns.push(...userData.concernsCustom);
    }
    const concernsText = allConcerns.filter(concern => concern !== 'その他').join('\n- ');

    if (isJapanese) {
      return `私は${userData.age}歳の${occupationDisplay}です。
${dreamDisplay}を実現したいと考えています。

【基本情報】
- 年齢: ${userData.age}歳
- 職業: ${occupationDisplay}
- 家族構成: ${familyStatusDisplay}
- 退職まで: 約${remainingYears}年
- ライフステージ: ${lifeStage}

【投資対象の希望】
- 興味のある市場: ${selectedMarketNames}
- 具体的な投資先例: ${selectedMarketExamples}

【現在のポートフォリオ】
${portfolioSummary}
総資産額: ${totalValue.toLocaleString()}円

【投資経験と考え方】
- 投資経験: ${experienceDisplay}
- リスク許容度: ${riskToleranceDisplay}
- 毎月の投資可能額: ${userData.monthlyInvestment}円

【私の価値観】
- ${valuesText}

【不安に思っていること】
- ${concernsText}

${userData.currentAssetsDescription ? `【現在の資産状況】
${userData.currentAssetsDescription}
` : ''}${userData.idealPortfolio ? `【理想のポートフォリオ】
${userData.idealPortfolio}
` : ''}

上記の情報を基に、以下について教えてください：

1. 私の年齢と状況に合った投資戦略は？
2. 選択した市場での最適なポートフォリオ配分は？
3. リスクとリターンのバランスはどう取るべき？
4. 今後注意すべきライフイベントと対策は？
5. 具体的なアクションプランは？

※日本在住のため、日本で購入可能な商品での提案をお願いします。
※できるだけ具体的で実行可能なアドバイスをお願いします。`;
    } else {
      return `I am a ${userData.age}-year-old ${occupationDisplay}.
I want to achieve: ${dreamDisplay}

【Basic Information】
- Age: ${userData.age}
- Occupation: ${occupationDisplay}
- Family Status: ${familyStatusDisplay}
- Years to Retirement: approximately ${remainingYears} years

【Investment Preferences】
- Markets of Interest: ${selectedMarketNames}
- Specific Investment Examples: ${selectedMarketExamples}

【Current Portfolio】
${portfolioSummary}
Total Assets: ¥${totalValue.toLocaleString()}

【Investment Experience & Philosophy】
- Investment Experience: ${experienceDisplay}
- Risk Tolerance: ${riskToleranceDisplay}
- Monthly Investment Budget: ¥${userData.monthlyInvestment}

【My Values】
- ${valuesText}

【My Concerns】
- ${concernsText}

${userData.currentAssetsDescription ? `【Current Asset Situation】
${userData.currentAssetsDescription}
` : ''}${userData.idealPortfolio ? `【Ideal Portfolio】
${userData.idealPortfolio}
` : ''}

Based on the above information, please advise me on:

1. What investment strategy suits my age and situation?
2. What's the optimal portfolio allocation for my selected markets?
3. How should I balance risk and returns?
4. What life events should I prepare for and how?
5. What specific action plan do you recommend?

※I live in Japan, so please suggest products available for purchase in Japan.
※Please provide specific and actionable advice.`;
    }
  };

  const handleNext = () => {
    if (currentStep === steps.length - 2) {
      const prompt = generateAIPrompt();
      setGeneratedPrompt(prompt);
      setShowPrompt(true);
    }
    setCurrentStep(Math.min(currentStep + 1, steps.length - 1));
  };

  const handlePrevious = () => {
    setCurrentStep(Math.max(currentStep - 1, 0));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
    // Toast notification would be nice here
  };

  const openClaude = () => {
    window.open('https://claude.ai', '_blank');
  };

  const openGemini = () => {
    window.open('https://gemini.google.com', '_blank');
  };

  const generateScreenshotPrompt = () => {
    const prompt = promptOrchestrationService.generateDataImportPrompt(
      screenshotPromptType,
      screenshotInstructions
    );
    setGeneratedScreenshotPrompt(prompt);
  };

  const copyScreenshotPromptToClipboard = async () => {
    if (generatedScreenshotPrompt) {
      try {
        await navigator.clipboard.writeText(generatedScreenshotPrompt.content);
        // Success feedback could be added here
      } catch (error) {
        console.error('コピー失敗:', error);
      }
    }
  };

  const openAIWithScreenshot = (aiType) => {
    const urls = {
      claude: 'https://claude.ai',
      gemini: 'https://gemini.google.com',
      chatgpt: 'https://chat.openai.com'
    };
    window.open(urls[aiType], '_blank');
  };

  const handleToggleValue = (value) => {
    setUserData(prev => ({
      ...prev,
      values: prev.values.includes(value)
        ? prev.values.filter(v => v !== value)
        : [...prev.values, value]
    }));
  };

  const handleToggleConcern = (concern) => {
    setUserData(prev => ({
      ...prev,
      concerns: prev.concerns.includes(concern)
        ? prev.concerns.filter(c => c !== concern)
        : [...prev.concerns, concern]
    }));
  };

  return (
    <div className="min-h-screen bg-dark-100 text-white">
      <div className={`container mx-auto px-4 py-8 pb-20 ${isFirstTimeUser ? 'max-w-6xl' : ''}`}>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className={`font-bold mb-4 ${isFirstTimeUser ? 'text-4xl lg:text-5xl' : 'text-3xl'}`}>
            🤖 {isJapanese ? 'AIアドバイザー' : 'AI Advisor'}
          </h1>
          <p className={`text-gray-400 mx-auto ${isFirstTimeUser ? 'max-w-4xl text-lg' : 'max-w-2xl'}`}>
            {isFirstTimeUser ? (
              isJapanese 
                ? 'Portfolio Wiseへようこそ！まずはあなたの情報を教えてください。最適な投資戦略を考えるためのパーソナライズされたプロンプトを生成し、外部AIで分析できるようにサポートします。'
                : 'Welcome to Portfolio Wise! Start by telling us about yourself. We\'ll generate personalized prompts to help you get optimal investment strategy advice from external AI services.'
            ) : (
              isJapanese 
                ? 'あなたの情報を教えてください。最適な投資戦略を考えるためのプロンプトを生成します。'
                : 'Tell us about yourself. We\'ll generate a prompt to help you get optimal investment strategy advice.'
            )}
          </p>
          {isFirstTimeUser && (
            <div className="mt-6 p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg max-w-3xl mx-auto">
              <div className="text-primary-400 text-sm font-medium mb-2">
                ✨ {isJapanese ? '初回セットアップ' : 'Initial Setup'}
              </div>
              <p className="text-sm text-gray-300">
                {isJapanese 
                  ? 'ステップに従って情報を入力すると、あなた専用のAI投資アドバイザープロンプトを作成できます。'
                  : 'Follow the steps to create your personalized AI investment advisor prompts.'
                }
              </p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            {steps.map((step, index) => (
              <div
                key={step.key}
                className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-200 ${
                    index <= currentStep
                      ? 'bg-primary-500 text-white'
                      : 'bg-dark-300 text-gray-400'
                  }`}
                >
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded transition-colors duration-200 ${
                      index < currentStep ? 'bg-primary-500' : 'bg-dark-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center text-sm text-gray-400">
            {isJapanese ? steps[currentStep].titleJa : steps[currentStep].titleEn}
          </div>
        </div>

        {/* Step Content */}
        <div className="max-w-4xl mx-auto">
          {/* Step 0: Basic Information */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {isJapanese ? '年齢' : 'Age'}
                  </label>
                  <input
                    type="range"
                    min="18"
                    max="80"
                    value={userData.age}
                    onChange={(e) => setUserData(prev => ({ ...prev, age: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-dark-300 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-sm text-gray-400 mt-1">
                    <span>18</span>
                    <span className="text-primary-400 font-bold">{userData.age}歳</span>
                    <span>80</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {isJapanese ? '職業' : 'Occupation'}
                  </label>
                  <select
                    value={userData.occupation}
                    onChange={(e) => setUserData(prev => ({ ...prev, occupation: e.target.value }))}
                    className="w-full p-3 bg-dark-300 border border-dark-400 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                  >
                    <option value="">{isJapanese ? '選択してください' : 'Please select'}</option>
                    {occupationOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {userData.occupation === 'その他' && (
                    <div className="mt-3">
                      <input
                        type="text"
                        value={userData.occupationCustom}
                        onChange={(e) => setUserData(prev => ({ ...prev, occupationCustom: e.target.value }))}
                        placeholder={isJapanese ? '職業を入力してください' : 'Enter your occupation'}
                        className="w-full p-3 bg-dark-300 border border-dark-400 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {isJapanese ? '家族構成' : 'Family Status'}
                  </label>
                  <select
                    value={userData.familyStatus}
                    onChange={(e) => setUserData(prev => ({ ...prev, familyStatus: e.target.value }))}
                    className="w-full p-3 bg-dark-300 border border-dark-400 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                  >
                    <option value="">{isJapanese ? '選択してください' : 'Please select'}</option>
                    {familyStatusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {userData.familyStatus === 'その他' && (
                    <div className="mt-3">
                      <input
                        type="text"
                        value={userData.familyStatusCustom}
                        onChange={(e) => setUserData(prev => ({ ...prev, familyStatusCustom: e.target.value }))}
                        placeholder={isJapanese ? '家族構成を入力してください' : 'Enter your family status'}
                        className="w-full p-3 bg-dark-300 border border-dark-400 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {isJapanese ? '実現したい夢' : 'Dream to Achieve'}
                  </label>
                  <select
                    value={userData.dream}
                    onChange={(e) => setUserData(prev => ({ ...prev, dream: e.target.value }))}
                    className="w-full p-3 bg-dark-300 border border-dark-400 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                  >
                    <option value="">{isJapanese ? '選択してください' : 'Please select'}</option>
                    {dreamOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {userData.dream === 'その他' && (
                    <div className="mt-3">
                      <input
                        type="text"
                        value={userData.dreamCustom}
                        onChange={(e) => setUserData(prev => ({ ...prev, dreamCustom: e.target.value }))}
                        placeholder={isJapanese ? '実現したい夢を入力してください' : 'Enter your dream to achieve'}
                        className="w-full p-3 bg-dark-300 border border-dark-400 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Market Selection */}
          {currentStep === 1 && (
            <MarketSelectionWizard
              selectedMarkets={userData.targetMarkets}
              onMarketsChange={(markets) => setUserData(prev => ({ ...prev, targetMarkets: markets }))}
              showTitle={false}
            />
          )}

          {/* Step 2: Investment Experience */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {isJapanese ? '投資経験' : 'Investment Experience'}
                  </label>
                  <div className="space-y-2">
                    {experienceOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => setUserData(prev => ({ ...prev, investmentExperience: option.value }))}
                        className={`w-full p-3 text-left rounded-lg border transition-colors duration-200 ${
                          userData.investmentExperience === option.value
                            ? 'bg-primary-500 border-primary-400 text-white'
                            : 'bg-dark-300 border-dark-400 text-gray-300 hover:bg-dark-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {userData.investmentExperience === 'その他' && (
                    <div className="mt-3">
                      <input
                        type="text"
                        value={userData.investmentExperienceCustom}
                        onChange={(e) => setUserData(prev => ({ ...prev, investmentExperienceCustom: e.target.value }))}
                        placeholder={isJapanese ? '投資経験を入力してください' : 'Enter your investment experience'}
                        className="w-full p-3 bg-dark-300 border border-dark-400 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {isJapanese ? 'リスク許容度' : 'Risk Tolerance'}
                  </label>
                  <div className="space-y-2">
                    {riskToleranceOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => setUserData(prev => ({ ...prev, riskTolerance: option.value }))}
                        className={`w-full p-3 text-left rounded-lg border transition-colors duration-200 ${
                          userData.riskTolerance === option.value
                            ? 'bg-primary-500 border-primary-400 text-white'
                            : 'bg-dark-300 border-dark-400 text-gray-300 hover:bg-dark-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {userData.riskTolerance === 'その他' && (
                    <div className="mt-3">
                      <input
                        type="text"
                        value={userData.riskToleranceCustom}
                        onChange={(e) => setUserData(prev => ({ ...prev, riskToleranceCustom: e.target.value }))}
                        placeholder={isJapanese ? 'リスク許容度を入力してください' : 'Enter your risk tolerance'}
                        className="w-full p-3 bg-dark-300 border border-dark-400 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    {isJapanese ? '毎月の投資可能額' : 'Monthly Investment Budget'}
                  </label>
                  <input
                    type="text"
                    value={userData.monthlyInvestment}
                    onChange={(e) => setUserData(prev => ({ ...prev, monthlyInvestment: e.target.value }))}
                    placeholder={isJapanese ? '例: 50000' : 'e.g. 50000'}
                    className="w-full p-3 bg-dark-300 border border-dark-400 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-400 mt-1">
                    {isJapanese ? '円単位で入力してください' : 'Enter amount in Japanese Yen'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Goals & Values */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">
                  {isJapanese ? '大切にしている価値観（複数選択可）' : 'Important Values (Multiple Selection)'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {valueOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => handleToggleValue(option.value)}
                      className={`p-3 text-left rounded-lg border transition-colors duration-200 ${
                        userData.values.includes(option.value)
                          ? 'bg-primary-500 border-primary-400 text-white'
                          : 'bg-dark-300 border-dark-400 text-gray-300 hover:bg-dark-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {userData.values.includes('その他') && (
                  <div className="mt-4">
                    <input
                      type="text"
                      value={userData.valuesCustom.join(', ')}
                      onChange={(e) => setUserData(prev => ({ 
                        ...prev, 
                        valuesCustom: e.target.value.split(', ').filter(val => val.trim() !== '') 
                      }))}
                      placeholder={isJapanese ? 'その他の価値観を入力してください（カンマ区切り）' : 'Enter other values (comma separated)'}
                      className="w-full p-3 bg-dark-300 border border-dark-400 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">
                  {isJapanese ? '不安に思っていること（複数選択可）' : 'Concerns (Multiple Selection)'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {concernOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => handleToggleConcern(option.value)}
                      className={`p-3 text-left rounded-lg border transition-colors duration-200 ${
                        userData.concerns.includes(option.value)
                          ? 'bg-red-500 border-red-400 text-white'
                          : 'bg-dark-300 border-dark-400 text-gray-300 hover:bg-dark-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {userData.concerns.includes('その他') && (
                  <div className="mt-4">
                    <input
                      type="text"
                      value={userData.concernsCustom.join(', ')}
                      onChange={(e) => setUserData(prev => ({ 
                        ...prev, 
                        concernsCustom: e.target.value.split(', ').filter(val => val.trim() !== '') 
                      }))}
                      placeholder={isJapanese ? 'その他の不安を入力してください（カンマ区切り）' : 'Enter other concerns (comma separated)'}
                      className="w-full p-3 bg-dark-300 border border-dark-400 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              {/* 現在の資産と理想のポートフォリオ */}
              <div className="mt-8 space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">
                    {isJapanese ? '現在の資産状況（任意）' : 'Current Assets (Optional)'}
                  </h3>
                  <textarea
                    value={userData.currentAssetsDescription}
                    onChange={(e) => setUserData(prev => ({ ...prev, currentAssetsDescription: e.target.value }))}
                    placeholder={isJapanese 
                      ? '例: 現金 500万円、日本株 300万円（トヨタ、ソニー等）、米国ETF 200万円（VTI、VOO）...' 
                      : 'e.g. Cash 5M JPY, Japanese stocks 3M JPY (Toyota, Sony, etc.), US ETFs 2M JPY (VTI, VOO)...'
                    }
                    className="w-full p-4 bg-dark-300 border border-dark-400 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
                    rows={4}
                  />
                  <p className="text-sm text-gray-400 mt-2">
                    {isJapanese 
                      ? '現在保有している資産の内訳を自由に記述してください' 
                      : 'Describe your current asset allocation freely'
                    }
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">
                    {isJapanese ? 'あなたが考える理想のポートフォリオ（任意）' : 'Your Ideal Portfolio (Optional)'}
                  </h3>
                  <textarea
                    value={userData.idealPortfolio}
                    onChange={(e) => setUserData(prev => ({ ...prev, idealPortfolio: e.target.value }))}
                    placeholder={isJapanese 
                      ? '例: 日本株 40%（高配当株中心）、米国株 30%（グロース株）、債券 20%、現金 10%...' 
                      : 'e.g. Japanese stocks 40% (focus on high dividend), US stocks 30% (growth stocks), Bonds 20%, Cash 10%...'
                    }
                    className="w-full p-4 bg-dark-300 border border-dark-400 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
                    rows={4}
                  />
                  <p className="text-sm text-gray-400 mt-2">
                    {isJapanese 
                      ? '理想とする資産配分や投資戦略を自由に記述してください' 
                      : 'Describe your ideal asset allocation and investment strategy freely'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Screenshot Analysis Prompt Generation */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold mb-2">
                  📸 {isJapanese ? 'スクリーンショット分析プロンプト' : 'Screenshot Analysis Prompts'}
                </h3>
                <p className="text-gray-400">
                  {isJapanese 
                    ? 'スクリーンショットをAIで分析するためのプロンプトを生成します。'
                    : 'Generate prompts for AI screenshot analysis.'
                  }
                </p>
              </div>

              {/* Privacy Notice */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">🔒</div>
                  <div>
                    <h5 className="text-blue-400 font-medium mb-2">
                      {isJapanese ? 'プライバシー保護について' : 'Privacy Protection'}
                    </h5>
                    <p className="text-sm text-gray-300">
                      {isJapanese 
                        ? 'このアプリではスクリーンショットのアップロードは行いません。生成されたプロンプトをコピーして、外部AI（Claude、Gemini、ChatGPT等）で直接分析してください。'
                        : 'This app does not upload screenshots. Copy the generated prompt and analyze directly with external AI (Claude, Gemini, ChatGPT, etc.).'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Analysis Type Selection */}
              <div>
                <h4 className="font-medium text-white mb-3">
                  {isJapanese ? '分析タイプを選択' : 'Select Analysis Type'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {screenshotAnalysisTypes.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setScreenshotPromptType(type.id)}
                      className={`p-4 rounded-lg border transition-all duration-200 text-left ${
                        screenshotPromptType === type.id
                          ? 'bg-primary-500/20 border-primary-400 text-white'
                          : 'bg-dark-300 border-dark-400 text-gray-300 hover:bg-dark-200'
                      }`}
                    >
                      <div className="text-2xl mb-2">{type.icon}</div>
                      <div className="font-medium mb-1">{type.name}</div>
                      <div className="text-sm opacity-80">{type.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Instructions */}
              <div>
                <h4 className="font-medium text-white mb-3">
                  {isJapanese ? '追加指示（オプション）' : 'Additional Instructions (Optional)'}
                </h4>
                <textarea
                  value={screenshotInstructions}
                  onChange={(e) => setScreenshotInstructions(e.target.value)}
                  placeholder={isJapanese 
                    ? '特別な要求や注意点があれば入力してください...'
                    : 'Enter any special requirements or notes...'
                  }
                  className="w-full p-3 bg-dark-300 border border-dark-400 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>

              {/* Generate Prompt Button */}
              <div>
                <button
                  onClick={generateScreenshotPrompt}
                  className="w-full py-3 px-4 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors duration-200"
                >
                  {isJapanese ? '分析プロンプトを生成' : 'Generate Analysis Prompt'}
                </button>
              </div>

              {/* Generated Prompt Display */}
              {generatedScreenshotPrompt && (
                <div className="bg-dark-300 rounded-lg p-4 border border-dark-400">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-white">
                      {isJapanese ? '生成された分析プロンプト' : 'Generated Analysis Prompt'}
                    </h4>
                    <button
                      onClick={copyScreenshotPromptToClipboard}
                      className="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white text-sm rounded transition-colors duration-200"
                    >
                      {isJapanese ? 'コピー' : 'Copy'}
                    </button>
                  </div>
                  
                  <div className="bg-dark-100 rounded p-4 max-h-64 overflow-y-auto">
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {generatedScreenshotPrompt.content}
                    </pre>
                  </div>
                </div>
              )}

              {/* AI Service Links */}
              {generatedScreenshotPrompt && (
                <div>
                  <h4 className="font-medium text-white mb-3">
                    {isJapanese ? 'AIで画像を分析' : 'Analyze with AI'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <button
                      onClick={() => openAIWithScreenshot('claude')}
                      className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 text-white text-center"
                    >
                      <div className="text-lg mb-1">🎯</div>
                      <div className="font-medium">Claude</div>
                      <div className="text-xs opacity-80">
                        {isJapanese ? '画像分析対応' : 'Image Analysis'}
                      </div>
                    </button>

                    <button
                      onClick={() => openAIWithScreenshot('gemini')}
                      className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-white text-center"
                    >
                      <div className="text-lg mb-1">🔍</div>
                      <div className="font-medium">Gemini</div>
                      <div className="text-xs opacity-80">
                        {isJapanese ? '画像分析対応' : 'Image Analysis'}
                      </div>
                    </button>

                    <button
                      onClick={() => openAIWithScreenshot('chatgpt')}
                      className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 text-white text-center"
                    >
                      <div className="text-lg mb-1">💬</div>
                      <div className="font-medium">ChatGPT</div>
                      <div className="text-xs opacity-80">
                        {isJapanese ? '画像分析対応' : 'Image Analysis'}
                      </div>
                    </button>
                  </div>
                  
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="text-blue-400 text-sm mb-2">
                      💡 {isJapanese ? '使い方' : 'How to Use'}
                    </div>
                    <ol className="text-xs text-gray-300 space-y-1">
                      <li>1. {isJapanese ? '上記プロンプトをコピー' : 'Copy the prompt above'}</li>
                      <li>2. {isJapanese ? 'AIサービスを開く' : 'Open AI service'}</li>
                      <li>3. {isJapanese ? '画像とプロンプトを貼り付け' : 'Paste image and prompt'}</li>
                      <li>4. {isJapanese ? 'AI応答を「データ取り込み」タブに貼り付け' : 'Paste AI response in "Data Import" tab'}</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Advanced Prompt Orchestration */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold mb-2">
                  {isJapanese ? 'パーソナライズドAIプロンプト' : 'Personalized AI Prompt'}
                </h3>
                <p className="text-gray-400">
                  {isJapanese 
                    ? 'あなたの状況と感情に最適化されたプロンプトを生成します。'
                    : 'Generate prompts optimized for your situation and emotional state.'
                  }
                </p>
              </div>

              <PromptOrchestrator
                promptType="portfolio_analysis"
                userContext={{
                  age: userData.age,
                  occupation: userData.occupation,
                  familyStatus: userData.familyStatus,
                  primaryGoal: userData.dream,
                  targetMarkets: userData.targetMarkets,
                  investmentExperience: userData.investmentExperience,
                  riskTolerance: userData.riskTolerance,
                  monthlyBudget: parseInt(userData.monthlyInvestment) || 0,
                  values: userData.values,
                  concerns: userData.concerns,
                  portfolio: portfolio,
                  currentAssetsDescription: userData.currentAssetsDescription,
                  idealPortfolio: userData.idealPortfolio
                }}
                onPromptGenerated={(prompt) => {
                  setGeneratedPrompt(prompt.content);
                  // プロンプトオーケストレーションサービスに学習データを送信
                  promptOrchestrationService.updateUserContext({
                    age: userData.age,
                    occupation: userData.occupation,
                    familyStatus: userData.familyStatus,
                    primaryGoal: userData.dream,
                    targetMarkets: userData.targetMarkets,
                    investmentExperience: userData.investmentExperience,
                    riskTolerance: userData.riskTolerance,
                    monthlyBudget: parseInt(userData.monthlyInvestment) || 0,
                    values: userData.values,
                    concerns: userData.concerns,
                    currentAssetsDescription: userData.currentAssetsDescription,
                    idealPortfolio: userData.idealPortfolio
                  });
                }}
              />
              
              {/* 初期設定完了ボタン（設定がない場合のみ表示） */}
              {isFirstTimeUser && currentStep === 5 && (
                <div className="mt-8 text-center">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
                    <h4 className="text-green-400 font-medium mb-3">
                      🎉 {isJapanese ? '初期設定完了準備' : 'Initial Setup Ready'}
                    </h4>
                    <p className="text-gray-300 mb-4">
                      {isJapanese 
                        ? 'AIプロンプトの準備ができました。設定を完了してポートフォリオ管理を始めましょう。'
                        : 'AI prompts are ready. Complete setup to start managing your portfolio.'
                      }
                    </p>
                    <ModernButton
                      variant="primary"
                      onClick={() => {
                        // 最小限の設定を保存（初期設定完了フラグ）
                        localStorage.setItem('initialSetupCompleted', 'true');
                        navigate('/settings');
                      }}
                      className="w-full sm:w-auto"
                    >
                      {isJapanese ? '設定を完了してポートフォリオ管理を開始' : 'Complete Setup & Start Portfolio Management'}
                    </ModernButton>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 max-w-4xl mx-auto">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={`px-6 py-2 rounded-lg transition-colors duration-200 ${
              currentStep === 0
                ? 'bg-dark-300 text-gray-500 cursor-not-allowed'
                : 'bg-dark-300 hover:bg-dark-200 text-white'
            }`}
          >
            {isJapanese ? '戻る' : 'Previous'}
          </button>

          <button
            onClick={handleNext}
            disabled={currentStep === steps.length - 1}
            className={`px-6 py-2 rounded-lg transition-colors duration-200 ${
              currentStep === steps.length - 1
                ? 'bg-dark-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary-500 hover:bg-primary-600 text-white'
            }`}
          >
            {currentStep === steps.length - 2 
              ? (isJapanese ? 'プロンプト生成' : 'Generate Prompt')
              : (isJapanese ? '次へ' : 'Next')
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAdvisor;