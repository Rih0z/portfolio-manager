/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/pages/AIAdvisor.tsx
 *
 * 作成者: Claude Code
 * 作成日: 2025-01-03
 * 更新日: 2026-03-09
 *
 * 説明:
 * AIアドバイザー機能のメインページ。ユーザーの情報を収集し、
 * パーソナライズされたプロンプトを生成して外部AI（Claude/Gemini）
 * との連携をサポートする。3ステップウィザード + クイック分析機能。
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { usePortfolioContext } from '../hooks/usePortfolioContext';
import { useIsPremium } from '../hooks/queries';
import MarketSelectionWizard, { INVESTMENT_MARKETS } from '../components/settings/MarketSelectionWizard';
import PromptOrchestrator from '../components/ai/PromptOrchestrator';
import StrengthsWeaknessCard from '../components/ai/StrengthsWeaknessCard';
import AnalysisPerspectiveTabs from '../components/ai/AnalysisPerspectiveTabs';
import ExternalAILinks from '../components/ai/ExternalAILinks';
import CopyToClipboard from '../components/ai/CopyToClipboard';
import promptOrchestrationService from '../services/PromptOrchestrationService';
import { enrichPortfolioData } from '../utils/portfolioDataEnricher';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input, Select } from '../components/ui/input';
import { Bot, Sparkles, Camera, Lock, BarChart3, TrendingUp, ClipboardList, Lightbulb, Zap } from 'lucide-react';
import { SEMANTIC_COLORS } from '../constants/chartColors';
import logger from '../utils/logger';

const AIAdvisor = () => {
  const navigate = useNavigate();
  const {
    currentAssets,
    targetPortfolio,
    additionalBudget,
    baseCurrency,
    exchangeRate,
    totalAssets,
    exportData,
  } = usePortfolioContext();
  const isPremium = useIsPremium();

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
    targetMarkets: [] as string[],
    investmentExperience: '',
    riskTolerance: '',
    monthlyInvestment: '',
    values: [] as string[],
    concerns: [] as string[]
  });
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [screenshotPromptType, setScreenshotPromptType] = useState('screenshot_portfolio');
  const [screenshotInstructions, setScreenshotInstructions] = useState('');
  const [generatedScreenshotPrompt, setGeneratedScreenshotPrompt] = useState<any>(null);

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

  // 3ステップ構成
  const steps = [
    { key: 'profile', title: 'プロフィール' },
    { key: 'investment', title: '投資方針' },
    { key: 'analysis', title: 'AI分析' }
  ];

  const occupationOptions = [
    { value: '会社員', label: '会社員' },
    { value: '公務員', label: '公務員' },
    { value: '自営業', label: '自営業' },
    { value: '学生', label: '学生' },
    { value: '主婦/主夫', label: '主婦/主夫' },
    { value: 'その他', label: 'その他' }
  ];

  const familyStatusOptions = [
    { value: '独身', label: '独身' },
    { value: '夫婦（子供なし）', label: '夫婦（子供なし）' },
    { value: '夫婦（子供あり）', label: '夫婦（子供あり）' },
    { value: 'その他', label: 'その他' }
  ];

  const dreamOptions = [
    { value: '経済的自由を手に入れたい', label: '経済的自由を手に入れたい' },
    { value: '老後の不安を解消したい', label: '老後の不安を解消したい' },
    { value: '子供の教育費を準備したい', label: '子供の教育費を準備したい' },
    { value: '早期リタイアしたい', label: '早期リタイアしたい' },
    { value: '住宅購入資金を貯めたい', label: '住宅購入資金を貯めたい' },
    { value: '世界中を旅行したい', label: '世界中を旅行したい' }
  ];

  const experienceOptions = [
    { value: '初心者', label: '初心者（1年未満）' },
    { value: '初級者', label: '初級者（1-3年）' },
    { value: '中級者', label: '中級者（3-5年）' },
    { value: '上級者', label: '上級者（5年以上）' }
  ];

  const riskToleranceOptions = [
    { value: '保守的', label: '保守的（リスクを避けたい）' },
    { value: 'バランス型', label: 'バランス型（適度なリスクは取れる）' },
    { value: '積極的', label: '積極的（高リターンのためリスクを取る）' }
  ];

  const valueOptions = [
    { value: '安全性重視', label: '安全性重視' },
    { value: '着実な成長', label: '着実な成長' },
    { value: '高いリターン', label: '高いリターンを狙いたい' },
    { value: '分散投資', label: '分散投資でリスクを分散' },
    { value: '長期投資', label: '長期投資で時間を味方に' },
    { value: '定期積立', label: '定期積立で習慣化' }
  ];

  const concernOptions = [
    { value: '市場の暴落', label: '市場の暴落が心配' },
    { value: '知識不足', label: '投資の知識が足りない' },
    { value: '詐欺やリスク', label: '詐欺や予想外のリスク' },
    { value: '時間がない', label: '管理する時間がない' },
    { value: 'タイミング', label: '始めるタイミングがわからない' },
    { value: '金額設定', label: '適切な投資金額がわからない' }
  ];

  const screenshotAnalysisTypes = [
    { id: 'screenshot_portfolio', name: 'ポートフォリオ画面', description: '証券会社の保有残高画面など', icon: BarChart3 },
    { id: 'market_data_screenshot', name: '株価・市場データ', description: '株価表示画面やチャート', icon: TrendingUp },
    { id: 'transaction_history', name: '取引履歴', description: '売買履歴や約定情報', icon: ClipboardList }
  ];

  const generateAIPrompt = (useDefaults = false) => {
    const data = useDefaults
      ? {
          age: 35,
          occupation: '会社員',
          familyStatus: '独身',
          dream: '経済的自由を手に入れたい',
          targetMarkets: ['US', 'JAPAN'],
          investmentExperience: '初心者',
          riskTolerance: 'バランス型',
          monthlyInvestment: '50000',
          values: ['着実な成長', '分散投資'],
          concerns: ['知識不足', '金額設定'],
        }
      : userData;

    const targetMarkets = data.targetMarkets.length > 0 ? data.targetMarkets : ['US', 'JAPAN'];
    const selectedMarketNames = targetMarkets.map((marketId: string) =>
      (INVESTMENT_MARKETS as any)[marketId]?.name || marketId
    ).join('、');

    const selectedMarketExamples = targetMarkets.map((marketId: string) =>
      (INVESTMENT_MARKETS as any)[marketId]?.examples?.join('/') || marketId
    ).join('、');

    const remainingYears = Math.max(0, 65 - data.age);
    const lifeStage = data.age < 30 ? 'キャリア形成期' :
                      data.age < 40 ? '家族形成期' :
                      data.age < 50 ? '教育費準備期' :
                      data.age < 60 ? '退職準備期' : '退職後';

    const portfolioSummary = currentAssets.length > 0
      ? currentAssets.map(asset =>
          `- ${asset.name}: ${asset.holdings.toLocaleString()}口（評価額: ${(asset.price * asset.holdings).toLocaleString() || 'N/A'}円）`
        ).join('\n')
      : '- まだ投資を始めていません';

    const totalValue = totalAssets || 0;

    return `私は${data.age}歳の${data.occupation || '会社員'}です。
${data.dream || '経済的自由を手に入れたい'}を実現したいと考えています。

【基本情報】
- 年齢: ${data.age}歳
- 職業: ${data.occupation || '未設定'}
- 家族構成: ${data.familyStatus || '未設定'}
- 退職まで: 約${remainingYears}年
- ライフステージ: ${lifeStage}

【投資対象の希望】
- 興味のある市場: ${selectedMarketNames}
- 具体的な投資先例: ${selectedMarketExamples}

【現在のポートフォリオ】
${portfolioSummary}
総資産額: ${totalValue.toLocaleString()}円

【投資経験と考え方】
- 投資経験: ${data.investmentExperience || '未設定'}
- リスク許容度: ${data.riskTolerance || '未設定'}
- 毎月の投資可能額: ${data.monthlyInvestment || '未設定'}円

【私の価値観】
- ${(data.values.length > 0 ? data.values : ['未設定']).join('\n- ')}

【不安に思っていること】
- ${(data.concerns.length > 0 ? data.concerns : ['未設定']).join('\n- ')}

上記の情報を基に、以下について教えてください：

1. 私の年齢と状況に合った投資戦略は？
2. 選択した市場での最適なポートフォリオ配分は？
3. リスクとリターンのバランスはどう取るべき？
4. 今後注意すべきライフイベントと対策は？
5. 具体的なアクションプランは？

※日本在住のため、日本で購入可能な商品での提案をお願いします。
※できるだけ具体的で実行可能なアドバイスをお願いします。`;
  };

  const handleQuickAnalysis = () => {
    const prompt = generateAIPrompt(true);
    setGeneratedPrompt(prompt);
    setShowPrompt(true);
    setCurrentStep(2); // AI分析ステップへ
  };

  const handleNext = () => {
    if (currentStep === 1) {
      // Step 2 → Step 3: プロンプト生成
      const prompt = generateAIPrompt();
      setGeneratedPrompt(prompt);
      setShowPrompt(true);
    }
    setCurrentStep(Math.min(currentStep + 1, steps.length - 1));
  };

  const handlePrevious = () => {
    setCurrentStep(Math.max(currentStep - 1, 0));
  };

  const generateScreenshotPrompt = () => {
    const prompt = promptOrchestrationService.generateDataImportPrompt(
      screenshotPromptType,
      screenshotInstructions
    );
    setGeneratedScreenshotPrompt(prompt);
  };

  const handleToggleValue = (value: string) => {
    setUserData(prev => ({
      ...prev,
      values: prev.values.includes(value)
        ? prev.values.filter(v => v !== value)
        : [...prev.values, value]
    }));
  };

  const handleToggleConcern = (concern: string) => {
    setUserData(prev => ({
      ...prev,
      concerns: prev.concerns.includes(concern)
        ? prev.concerns.filter(c => c !== concern)
        : [...prev.concerns, concern]
    }));
  };

  return (
    <div data-testid="ai-advisor-page" className="min-h-screen bg-background text-white">
      <div className={`container mx-auto px-4 py-8 pb-20 ${isFirstTimeUser ? 'max-w-6xl' : ''}`}>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className={`font-bold mb-4 ${isFirstTimeUser ? 'text-4xl lg:text-5xl' : 'text-3xl'}`}>
            <Bot size={isFirstTimeUser ? 40 : 32} className="inline-block mr-2 align-middle" /> AIアドバイザー
          </h1>
          <p className={`text-muted-foreground mx-auto ${isFirstTimeUser ? 'max-w-4xl text-lg' : 'max-w-2xl'}`}>
            {isFirstTimeUser
              ? 'Portfolio Wiseへようこそ！あなたの情報を教えてください。最適な投資戦略のためのプロンプトを生成します。'
              : 'あなたの情報を教えてください。最適な投資戦略を考えるためのプロンプトを生成します。'
            }
          </p>
          {isFirstTimeUser && (
            <div className="mt-6 p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg max-w-3xl mx-auto">
              <div className="text-primary-400 text-sm font-medium mb-2">
                <Sparkles size={16} className="inline-block mr-1 align-middle" /> 初回セットアップ
              </div>
              <p className="text-sm text-muted-foreground">
                3ステップで完了。または「クイック分析」ですぐにプロンプトを生成できます。
              </p>
            </div>
          )}

          {/* クイック分析ボタン */}
          {currentStep < 2 && (
            <div className="mt-4">
              <button
                onClick={handleQuickAnalysis}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-primary-400 hover:text-primary-300 border border-primary-500/30 hover:border-primary-500/50 rounded-lg transition-colors"
              >
                <Zap size={16} />
                クイック分析（デフォルト値で即座にプロンプト生成）
              </button>
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
              {steps[currentStep].title}
            </div>
            <div className="text-sm text-neutral-600">
              ステップ {currentStep + 1} / {steps.length}
            </div>
          </div>
        </Card>

        {/* Step Content */}
        <div className="max-w-4xl mx-auto">
          {/* Step 1: プロフィール（年齢 + 職業 + 家族 + 投資経験 + リスク許容度） */}
          {currentStep === 0 && (
            <Card elevation="medium" padding="large">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 年齢 */}
                  <div>
                    <label className="block text-sm font-medium mb-3 text-neutral-700">
                      年齢
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
                          background: `linear-gradient(to right, ${SEMANTIC_COLORS.primary} 0%, ${SEMANTIC_COLORS.primary} ${((userData.age - 18) / (80 - 18)) * 100}%, var(--border) ${((userData.age - 18) / (80 - 18)) * 100}%, var(--border) 100%)`
                        }}
                      />
                      <div className="flex justify-between text-sm text-neutral-600">
                        <span>18</span>
                        <span className="text-primary-600 font-bold bg-primary-50 px-2 py-1 rounded">{userData.age}歳</span>
                        <span>80</span>
                      </div>
                    </div>
                  </div>

                  {/* 職業 */}
                  <div>
                    <Select
                      label="職業"
                      value={userData.occupation}
                      onChange={(e: any) => setUserData(prev => ({ ...prev, occupation: e.target.value }))}
                      placeholder="選択してください"
                      options={occupationOptions}
                      fullWidth
                    />
                  </div>

                  {/* 家族構成 */}
                  <div>
                    <Select
                      label="家族構成"
                      value={userData.familyStatus}
                      onChange={(e: any) => setUserData(prev => ({ ...prev, familyStatus: e.target.value }))}
                      placeholder="選択してください"
                      options={familyStatusOptions}
                      fullWidth
                    />
                  </div>

                  {/* 投資経験 */}
                  <div>
                    <label className="block text-sm font-medium mb-3 text-neutral-700">
                      投資経験
                    </label>
                    <div className="space-y-2">
                      {experienceOptions.map(option => (
                        <Button
                          key={option.value}
                          variant={userData.investmentExperience === option.value ? "primary" : "secondary"}
                          size="medium"
                          fullWidth
                          onClick={() => setUserData(prev => ({ ...prev, investmentExperience: option.value }))}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* リスク許容度 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-3 text-neutral-700">
                      リスク許容度
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {riskToleranceOptions.map(option => (
                        <Button
                          key={option.value}
                          variant={userData.riskTolerance === option.value ? "primary" : "secondary"}
                          size="medium"
                          fullWidth
                          onClick={() => setUserData(prev => ({ ...prev, riskTolerance: option.value }))}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Step 2: 投資方針（市場 + 予算 + 夢 + 価値観 + 懸念事項） */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* 市場選択 */}
              <Card elevation="medium" padding="large">
                <h3 className="text-lg font-semibold text-neutral-800 mb-4">投資対象市場</h3>
                <MarketSelectionWizard
                  selectedMarkets={userData.targetMarkets}
                  onMarketsChange={(markets: any) => setUserData(prev => ({ ...prev, targetMarkets: markets }))}
                  showTitle={false}
                />
              </Card>

              {/* 予算 + 夢 */}
              <Card elevation="medium" padding="large">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-3 text-neutral-700">
                      毎月の投資可能額
                    </label>
                    <Input
                      type="text"
                      value={userData.monthlyInvestment}
                      onChange={(e: any) => setUserData(prev => ({ ...prev, monthlyInvestment: e.target.value }))}
                      placeholder="例: 50000"
                      className="h-12"
                      helperText="円単位で入力してください"
                    />
                  </div>
                  <div>
                    <Select
                      label="実現したい夢"
                      value={userData.dream}
                      onChange={(e: any) => setUserData(prev => ({ ...prev, dream: e.target.value }))}
                      placeholder="選択してください"
                      options={dreamOptions}
                      fullWidth
                    />
                  </div>
                </div>
              </Card>

              {/* 価値観 + 懸念事項 */}
              <Card elevation="medium" padding="large">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-800 mb-4">
                      大切にしている価値観（複数選択可）
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
                      不安に思っていること（複数選択可）
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
            </div>
          )}

          {/* Step 3: AI分析（プロンプト生成 + 外部AIリンク + スクリーンショットアコーディオン） */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* 生成されたプロンプト */}
              {showPrompt && generatedPrompt && (
                <Card elevation="medium" padding="large">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-foreground">
                      生成されたプロンプト
                    </h3>
                    <CopyToClipboard text={generatedPrompt} mode="button" />
                  </div>
                  <div className="bg-muted rounded-lg p-4 max-h-64 overflow-y-auto border border-border">
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {generatedPrompt}
                    </pre>
                  </div>

                  {/* 外部AIリンク */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-foreground mb-3">AIで分析する</h4>
                    <ExternalAILinks textToCopy={generatedPrompt} />
                  </div>
                </Card>
              )}

              {/* ポートフォリオインサイト */}
              {enrichedData && (
                <StrengthsWeaknessCard enrichedData={enrichedData} />
              )}

              {/* 分析プロンプトタブ */}
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

              {/* スクリーンショット分析（アコーディオン） */}
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 py-2">
                  <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <Camera size={14} className="inline-block" /> スクリーンショット分析プロンプト
                </summary>
                <div className="mt-4 space-y-4">
                  {/* Privacy Notice */}
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Lock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground">
                        スクリーンショットのアップロードは行いません。生成プロンプトをコピーして、外部AIで直接分析してください。
                      </p>
                    </div>
                  </div>

                  {/* Type Selection */}
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
                        <div className="mb-2"><type.icon size={24} /></div>
                        <div className="font-medium mb-1">{type.name}</div>
                        <div className="text-sm opacity-80">{type.description}</div>
                      </button>
                    ))}
                  </div>

                  {/* Additional Instructions */}
                  <textarea
                    value={screenshotInstructions}
                    onChange={(e: any) => setScreenshotInstructions(e.target.value)}
                    placeholder="特別な要求や注意点があれば入力してください..."
                    className="w-full p-3 bg-muted border border-border rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
                    rows={3}
                  />

                  <button
                    onClick={generateScreenshotPrompt}
                    className="w-full py-3 px-4 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors duration-200"
                  >
                    分析プロンプトを生成
                  </button>

                  {generatedScreenshotPrompt && (
                    <div className="bg-muted rounded-lg p-4 border border-border">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-white">生成された分析プロンプト</h4>
                        <CopyToClipboard text={generatedScreenshotPrompt.content} mode="button" />
                      </div>
                      <div className="bg-background rounded p-4 max-h-64 overflow-y-auto">
                        <pre className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {generatedScreenshotPrompt.content}
                        </pre>
                      </div>
                      <div className="mt-3">
                        <ExternalAILinks textToCopy={generatedScreenshotPrompt.content} />
                      </div>
                    </div>
                  )}
                </div>
              </details>

              {/* カスタムプロンプト（アコーディオン） */}
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 py-2">
                  <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  カスタムプロンプト（従来版）
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
                      portfolio: exportData()
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

              {/* 初期設定完了ボタン */}
              {isFirstTimeUser && (
                <div className="mt-8 text-center">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
                    <h4 className="text-green-400 font-medium mb-3">
                      初期設定完了準備
                    </h4>
                    <p className="text-muted-foreground mb-4">
                      AIプロンプトの準備ができました。設定を完了してポートフォリオ管理を始めましょう。
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
                      設定を完了してポートフォリオ管理を開始
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
              戻る
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
              {currentStep === steps.length - 2 ? 'プロンプト生成' : '次へ'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AIAdvisor;
