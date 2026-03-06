/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/pages/AIAdvisor.tsx
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

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePortfolioContext } from '../hooks/usePortfolioContext';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import MarketSelectionWizard, { INVESTMENT_MARKETS } from '../components/settings/MarketSelectionWizard';
import PromptOrchestrator from '../components/ai/PromptOrchestrator';
import StrengthsWeaknessCard from '../components/ai/StrengthsWeaknessCard';
import AnalysisPerspectiveTabs from '../components/ai/AnalysisPerspectiveTabs';
import promptOrchestrationService from '../services/PromptOrchestrationService';
import { enrichPortfolioData } from '../utils/portfolioDataEnricher';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input, Select } from '../components/ui/input';

const AIAdvisor = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const {
    portfolio,
    currentAssets,
    targetPortfolio,
    additionalBudget,
    baseCurrency,
    exchangeRate,
  } = usePortfolioContext();
  const isPremium = useSubscriptionStore((s) => s.isPremium());

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
    familyStatus: '',
    dream: '',
    targetMarkets: [] as any[],
    investmentExperience: '',
    riskTolerance: '',
    monthlyInvestment: '',
    values: [] as any[],
    concerns: [] as any[]
  });
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [screenshotPromptType, setScreenshotPromptType] = useState('screenshot_portfolio');
  const [screenshotInstructions, setScreenshotInstructions] = useState('');
  const [generatedScreenshotPrompt, setGeneratedScreenshotPrompt] = useState<any>(null);

  const isJapanese = i18n.language === 'ja';

  // Enriched portfolio data for AI analysis
  const enrichedData = useMemo(() => {
    if (currentAssets.length === 0) return null;
    return enrichPortfolioData(
      currentAssets,
      targetPortfolio,
      isPremium,
      baseCurrency,
      exchangeRate?.rate || 150
    );
  }, [currentAssets, targetPortfolio, isPremium, baseCurrency, exchangeRate]);

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
    { value: '世界中を旅行したい', label: isJapanese ? '世界中を旅行したい' : 'Travel the World' }
  ];

  const experienceOptions = [
    { value: '初心者', label: isJapanese ? '初心者（1年未満）' : 'Beginner (Less than 1 year)' },
    { value: '初級者', label: isJapanese ? '初級者（1-3年）' : 'Novice (1-3 years)' },
    { value: '中級者', label: isJapanese ? '中級者（3-5年）' : 'Intermediate (3-5 years)' },
    { value: '上級者', label: isJapanese ? '上級者（5年以上）' : 'Advanced (5+ years)' }
  ];

  const riskToleranceOptions = [
    { value: '保守的', label: isJapanese ? '保守的（リスクを避けたい）' : 'Conservative (Avoid Risk)' },
    { value: 'バランス型', label: isJapanese ? 'バランス型（適度なリスクは取れる）' : 'Balanced (Moderate Risk)' },
    { value: '積極的', label: isJapanese ? '積極的（高いリターンのためならリスクを取る）' : 'Aggressive (Take Risk for High Returns)' }
  ];

  const valueOptions = [
    { value: '安全性重視', label: isJapanese ? '安全性重視' : 'Safety First' },
    { value: '着実な成長', label: isJapanese ? '着実な成長' : 'Steady Growth' },
    { value: '高いリターン', label: isJapanese ? '高いリターンを狙いたい' : 'Target High Returns' },
    { value: '分散投資', label: isJapanese ? '分散投資でリスクを分散' : 'Diversify Risk' },
    { value: '長期投資', label: isJapanese ? '長期投資で時間を味方に' : 'Long-term Investment' },
    { value: '定期積立', label: isJapanese ? '定期積立で習慣化' : 'Regular Investment Habit' }
  ];

  const concernOptions = [
    { value: '市場の暴落', label: isJapanese ? '市場の暴落が心配' : 'Worried about Market Crashes' },
    { value: '知識不足', label: isJapanese ? '投資の知識が足りない' : 'Lack of Investment Knowledge' },
    { value: '詐欺やリスク', label: isJapanese ? '詐欺や予想外のリスク' : 'Fraud or Unexpected Risks' },
    { value: '時間がない', label: isJapanese ? '管理する時間がない' : 'No Time to Manage' },
    { value: 'タイミング', label: isJapanese ? '始めるタイミングがわからない' : 'Don\'t Know When to Start' },
    { value: '金額設定', label: isJapanese ? '適切な投資金額がわからない' : 'Don\'t Know Appropriate Amount' }
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
    const selectedMarketNames = userData.targetMarkets.map((marketId: any) =>
      isJapanese ? (INVESTMENT_MARKETS as any)[marketId].name : (INVESTMENT_MARKETS as any)[marketId].nameEn
    ).join('、');

    const selectedMarketExamples = userData.targetMarkets.map((marketId: any) =>
      (isJapanese ? (INVESTMENT_MARKETS as any)[marketId].examples : (INVESTMENT_MARKETS as any)[marketId].examplesEn).join('/')
    ).join('、');

    const remainingYears = Math.max(0, 65 - userData.age);
    const lifeStage = userData.age < 30 ? 'キャリア形成期' :
                      userData.age < 40 ? '家族形成期' :
                      userData.age < 50 ? '教育費準備期' :
                      userData.age < 60 ? '退職準備期' : '退職後';

    const portfolioSummary = (portfolio as any)?.assets?.length > 0
      ? (portfolio as any).assets.map((asset: any) =>
          `- ${asset.name}: ${asset.quantity}口（評価額: ${asset.totalValue?.toLocaleString() || 'N/A'}円）`
        ).join('\n')
      : '- まだ投資を始めていません';

    const totalValue = (portfolio as any)?.totalValue || 0;

    if (isJapanese) {
      return `私は${userData.age}歳の${userData.occupation}です。
${userData.dream}を実現したいと考えています。

【基本情報】
- 年齢: ${userData.age}歳
- 職業: ${userData.occupation}
- 家族構成: ${userData.familyStatus}
- 退職まで: 約${remainingYears}年
- ライフステージ: ${lifeStage}

【投資対象の希望】
- 興味のある市場: ${selectedMarketNames}
- 具体的な投資先例: ${selectedMarketExamples}

【現在のポートフォリオ】
${portfolioSummary}
総資産額: ${totalValue.toLocaleString()}円

【投資経験と考え方】
- 投資経験: ${userData.investmentExperience}
- リスク許容度: ${userData.riskTolerance}
- 毎月の投資可能額: ${userData.monthlyInvestment}円

【私の価値観】
- ${userData.values.join('\n- ')}

【不安に思っていること】
- ${userData.concerns.join('\n- ')}

上記の情報を基に、以下について教えてください：

1. 私の年齢と状況に合った投資戦略は？
2. 選択した市場での最適なポートフォリオ配分は？
3. リスクとリターンのバランスはどう取るべき？
4. 今後注意すべきライフイベントと対策は？
5. 具体的なアクションプランは？

※日本在住のため、日本で購入可能な商品での提案をお願いします。
※できるだけ具体的で実行可能なアドバイスをお願いします。`;
    } else {
      return `I am a ${userData.age}-year-old ${userData.occupation}.
I want to achieve: ${userData.dream}

【Basic Information】
- Age: ${userData.age}
- Occupation: ${userData.occupation}
- Family Status: ${userData.familyStatus}
- Years to Retirement: approximately ${remainingYears} years

【Investment Preferences】
- Markets of Interest: ${selectedMarketNames}
- Specific Investment Examples: ${selectedMarketExamples}

【Current Portfolio】
${portfolioSummary}
Total Assets: ¥${totalValue.toLocaleString()}

【Investment Experience & Philosophy】
- Investment Experience: ${userData.investmentExperience}
- Risk Tolerance: ${userData.riskTolerance}
- Monthly Investment Budget: ¥${userData.monthlyInvestment}

【My Values】
- ${userData.values.join('\n- ')}

【My Concerns】
- ${userData.concerns.join('\n- ')}

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

  const openAIWithScreenshot = (aiType: any) => {
    const urls: any = {
      claude: 'https://claude.ai',
      gemini: 'https://gemini.google.com',
      chatgpt: 'https://chat.openai.com'
    };
    window.open(urls[aiType], '_blank');
  };

  const handleToggleValue = (value: any) => {
    setUserData(prev => ({
      ...prev,
      values: prev.values.includes(value)
        ? prev.values.filter((v: any) => v !== value)
        : [...prev.values, value]
    }));
  };

  const handleToggleConcern = (concern: any) => {
    setUserData(prev => ({
      ...prev,
      concerns: prev.concerns.includes(concern)
        ? prev.concerns.filter((c: any) => c !== concern)
        : [...prev.concerns, concern]
    }));
  };

  return (
    <div data-testid="ai-advisor-page" className="min-h-screen bg-background text-white">
      <div className={`container mx-auto px-4 py-8 pb-20 ${isFirstTimeUser ? 'max-w-6xl' : ''}`}>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className={`font-bold mb-4 ${isFirstTimeUser ? 'text-4xl lg:text-5xl' : 'text-3xl'}`}>
            🤖 {isJapanese ? 'AIアドバイザー' : 'AI Advisor'}
          </h1>
          <p className={`text-muted-foreground mx-auto ${isFirstTimeUser ? 'max-w-4xl text-lg' : 'max-w-2xl'}`}>
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
              <p className="text-sm text-muted-foreground">
                {isJapanese
                  ? 'ステップに従って情報を入力すると、あなた専用のAI投資アドバイザープロンプトを作成できます。'
                  : 'Follow the steps to create your personalized AI investment advisor prompts.'
                }
              </p>
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        <Card elevation="low" padding="medium" className="mb-8">
          <div className="flex justify-between items-center mb-4">
            {steps.map((step, index) => (
              <div
                key={step.key}
                className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    index <= currentStep
                      ? 'bg-primary-500 text-white shadow-lg border-2 border-primary-400'
                      : index === currentStep + 1
                      ? 'bg-primary-100 text-primary-600 border-2 border-primary-300'
                      : 'bg-neutral-200 text-neutral-500 border-2 border-neutral-300'
                  }`}
                >
                  {index < currentStep ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-2 mx-3 rounded-full transition-all duration-300 ${
                      index < currentStep
                        ? 'bg-primary-500 shadow-sm'
                        : index === currentStep
                        ? 'bg-gradient-to-r from-primary-500 to-neutral-300'
                        : 'bg-neutral-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-neutral-800 mb-1">
              {isJapanese ? steps[currentStep].titleJa : steps[currentStep].titleEn}
            </div>
            <div className="text-sm text-neutral-600">
              ステップ {currentStep + 1} / {steps.length}
            </div>
          </div>
        </Card>

        {/* Step Content */}
        <div className="max-w-4xl mx-auto">
          {/* Step 0: Basic Information */}
          {currentStep === 0 && (
            <Card elevation="medium" padding="large">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-3 text-neutral-700">
                      {isJapanese ? '年齢' : 'Age'}
                    </label>
                    <div className="space-y-3">
                      <input
                        type="range"
                        min="18"
                        max="80"
                        value={userData.age}
                        onChange={(e: any) => setUserData(prev => ({ ...prev, age: parseInt(e.target.value) }))}
                        className="w-full h-3 bg-neutral-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-400"
                        style={{
                          background: `linear-gradient(to right, #0052CC 0%, #0052CC ${((userData.age - 18) / (80 - 18)) * 100}%, #E5E7EA ${((userData.age - 18) / (80 - 18)) * 100}%, #E5E7EA 100%)`
                        }}
                      />
                      <div className="flex justify-between text-sm text-neutral-600">
                        <span>18</span>
                        <span className="text-primary-600 font-bold bg-primary-50 px-2 py-1 rounded">{userData.age}歳</span>
                        <span>80</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Select
                      label={isJapanese ? '職業' : 'Occupation'}
                      value={userData.occupation}
                      onChange={(e: any) => setUserData(prev => ({ ...prev, occupation: e.target.value }))}
                      placeholder={isJapanese ? '選択してください' : 'Please select'}
                      options={occupationOptions}
                      fullWidth
                    />
                  </div>

                  <div>
                    <Select
                      label={isJapanese ? '家族構成' : 'Family Status'}
                      value={userData.familyStatus}
                      onChange={(e: any) => setUserData(prev => ({ ...prev, familyStatus: e.target.value }))}
                      placeholder={isJapanese ? '選択してください' : 'Please select'}
                      options={familyStatusOptions}
                      fullWidth
                    />
                  </div>

                  <div>
                    <Select
                      label={isJapanese ? '実現したい夢' : 'Dream to Achieve'}
                      value={userData.dream}
                      onChange={(e: any) => setUserData(prev => ({ ...prev, dream: e.target.value }))}
                      placeholder={isJapanese ? '選択してください' : 'Please select'}
                      options={dreamOptions}
                      fullWidth
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Step 1: Market Selection */}
          {currentStep === 1 && (
            <MarketSelectionWizard
              selectedMarkets={userData.targetMarkets}
              onMarketsChange={(markets: any) => setUserData(prev => ({ ...prev, targetMarkets: markets }))}
              showTitle={false}
            />
          )}

          {/* Step 2: Investment Experience */}
          {currentStep === 2 && (
            <Card elevation="medium" padding="large">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-3 text-neutral-700">
                      {isJapanese ? '投資経験' : 'Investment Experience'}
                    </label>
                    <div className="space-y-3">
                      {experienceOptions.map(option => (
                        <Button
                          key={option.value}
                          variant={userData.investmentExperience === option.value ? "primary" : "secondary"}
                          size="large"
                          fullWidth
                          onClick={() => setUserData(prev => ({ ...prev, investmentExperience: option.value }))}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-3 text-neutral-700">
                      {isJapanese ? 'リスク許容度' : 'Risk Tolerance'}
                    </label>
                    <div className="space-y-3">
                      {riskToleranceOptions.map(option => (
                        <Button
                          key={option.value}
                          variant={userData.riskTolerance === option.value ? "primary" : "secondary"}
                          size="large"
                          fullWidth
                          onClick={() => setUserData(prev => ({ ...prev, riskTolerance: option.value }))}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-3 text-neutral-700">
                      {isJapanese ? '毎月の投資可能額' : 'Monthly Investment Budget'}
                    </label>
                    <Input
                      type="text"
                      value={userData.monthlyInvestment}
                      onChange={(e: any) => setUserData(prev => ({ ...prev, monthlyInvestment: e.target.value }))}
                      placeholder={isJapanese ? '例: 50000' : 'e.g. 50000'}
                      className="h-12"
                      helperText={isJapanese ? '円単位で入力してください' : 'Enter amount in Japanese Yen'}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Step 3: Goals & Values */}
          {currentStep === 3 && (
            <Card elevation="medium" padding="large">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-800 mb-4">
                    {isJapanese ? '大切にしている価値観（複数選択可）' : 'Important Values (Multiple Selection)'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {valueOptions.map(option => (
                      <Button
                        key={option.value}
                        variant={userData.values.includes(option.value) ? "primary" : "secondary"}
                        size="medium"
                        fullWidth
                        onClick={() => handleToggleValue(option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-neutral-800 mb-4">
                    {isJapanese ? '不安に思っていること（複数選択可）' : 'Concerns (Multiple Selection)'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {concernOptions.map(option => (
                      <Button
                        key={option.value}
                        variant={userData.concerns.includes(option.value) ? "danger" : "secondary"}
                        size="medium"
                        fullWidth
                        onClick={() => handleToggleConcern(option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Step 4: Screenshot Analysis Prompt Generation */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold mb-2">
                  📸 {isJapanese ? 'スクリーンショット分析プロンプト' : 'Screenshot Analysis Prompts'}
                </h3>
                <p className="text-muted-foreground">
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
                    <p className="text-sm text-muted-foreground">
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
                          : 'bg-muted border-border text-muted-foreground hover:bg-card'
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
                  onChange={(e: any) => setScreenshotInstructions(e.target.value)}
                  placeholder={isJapanese
                    ? '特別な要求や注意点があれば入力してください...'
                    : 'Enter any special requirements or notes...'
                  }
                  className="w-full p-3 bg-muted border border-border rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
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
                <div className="bg-muted rounded-lg p-4 border border-border">
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

                  <div className="bg-background rounded p-4 max-h-64 overflow-y-auto">
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
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
                    <ol className="text-xs text-muted-foreground space-y-1">
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
                  {isJapanese ? 'AI分析プロンプト' : 'AI Analysis Prompts'}
                </h3>
                <p className="text-muted-foreground">
                  {isJapanese
                    ? 'ポートフォリオデータに基づいた分析プロンプトを生成します。'
                    : 'Generate analysis prompts based on your portfolio data.'
                  }
                </p>
              </div>

              {/* StrengthsWeaknessCard — ポートフォリオインサイト */}
              {enrichedData && (
                <StrengthsWeaknessCard enrichedData={enrichedData} />
              )}

              {/* AnalysisPerspectiveTabs — 3分割分析プロンプト */}
              {enrichedData && (
                <AnalysisPerspectiveTabs
                  enrichedData={enrichedData}
                  userContext={{
                    age: userData.age,
                    occupation: userData.occupation,
                    familyStatus: userData.familyStatus,
                    primaryGoal: userData.dream,
                    targetMarkets: userData.targetMarkets,
                    investmentExperience: userData.investmentExperience,
                    riskTolerance: userData.riskTolerance,
                    monthlyBudget: parseInt(userData.monthlyInvestment) || 0,
                  }}
                />
              )}

              {/* 既存PromptOrchestrator — カスタムプロンプト（折りたたみ） */}
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 py-2">
                  <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {isJapanese ? 'カスタムプロンプト（従来版）' : 'Custom Prompt (Legacy)'}
                </summary>
                <div className="mt-4">
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
                      portfolio: portfolio
                    }}
                    onPromptGenerated={(prompt: any) => {
                      setGeneratedPrompt(prompt.content);
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
                        concerns: userData.concerns
                      });
                    }}
                  />
                </div>
              </details>

              {/* 初期設定完了ボタン（設定がない場合のみ表示） */}
              {isFirstTimeUser && currentStep === 5 && (
                <div className="mt-8 text-center">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
                    <h4 className="text-green-400 font-medium mb-3">
                      {isJapanese ? '初期設定完了準備' : 'Initial Setup Ready'}
                    </h4>
                    <p className="text-muted-foreground mb-4">
                      {isJapanese
                        ? 'AIプロンプトの準備ができました。設定を完了してポートフォリオ管理を始めましょう。'
                        : 'AI prompts are ready. Complete setup to start managing your portfolio.'
                      }
                    </p>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => {
                        localStorage.setItem('initialSetupCompleted', 'true');
                        navigate('/settings');
                      }}
                      className="w-full sm:w-auto"
                    >
                      {isJapanese ? '設定を完了してポートフォリオ管理を開始' : 'Complete Setup & Start Portfolio Management'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <Card elevation="low" padding="medium" className="mt-8 max-w-4xl mx-auto">
          <div className="flex justify-between items-center">
            <Button
              variant="secondary"
              size="large"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              }
              iconPosition="left"
            >
              {isJapanese ? '戻る' : 'Previous'}
            </Button>

            <div className="text-center">
              <div className="text-sm text-neutral-600">
                {currentStep + 1} / {steps.length}
              </div>
            </div>

            <Button
              variant="primary"
              size="large"
              onClick={handleNext}
              disabled={currentStep === steps.length - 1}
              icon={
                currentStep === steps.length - 2 ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )
              }
              iconPosition="right"
            >
              {currentStep === steps.length - 2
                ? (isJapanese ? 'プロンプト生成' : 'Generate Prompt')
                : (isJapanese ? '次へ' : 'Next')
              }
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AIAdvisor;
