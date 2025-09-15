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
// import MarketSelectionWizard from '../components/settings/MarketSelectionWizard'; // 一時的に無効化
import PromptOrchestrator from '../components/ai/PromptOrchestrator';
import AIDataImportModal from '../components/ai/AIDataImportModal';
import SurveyYAMLManager from '../components/survey/SurveyYAMLManager';
import promptOrchestrationService from '../services/PromptOrchestrationService';
import ModernButton from '../components/common/ModernButton';
// 投資市場の定義
const INVESTMENT_MARKETS = {
  japan_stock: {
    name: '日本株',
    nameEn: 'Japanese Stocks',
    examples: ['トヨタ', 'ソニー', '三菱UFJ'],
    examplesEn: ['Toyota', 'Sony', 'Mitsubishi UFJ']
  },
  us_stock: {
    name: '米国株',
    nameEn: 'US Stocks',
    examples: ['Apple', 'Microsoft', 'Google'],
    examplesEn: ['Apple', 'Microsoft', 'Google']
  },
  global_etf: {
    name: 'グローバルETF',
    nameEn: 'Global ETF',
    examples: ['VTI', 'VOO', 'VXUS'],
    examplesEn: ['VTI', 'VOO', 'VXUS']
  },
  bonds: {
    name: '債券',
    nameEn: 'Bonds',
    examples: ['日本国債', '米国債', '社債'],
    examplesEn: ['Japanese Government Bonds', 'US Treasury', 'Corporate Bonds']
  },
  reit: {
    name: 'REIT',
    nameEn: 'REIT',
    examples: ['J-REIT', 'US REIT', 'Global REIT'],
    examplesEn: ['J-REIT', 'US REIT', 'Global REIT']
  },
  commodities: {
    name: 'コモディティ',
    nameEn: 'Commodities',
    examples: ['金', '原油', '銀'],
    examplesEn: ['Gold', 'Oil', 'Silver']
  },
  crypto: {
    name: '暗号通貨',
    nameEn: 'Cryptocurrency',
    examples: ['Bitcoin', 'Ethereum', 'BTC ETF'],
    examplesEn: ['Bitcoin', 'Ethereum', 'BTC ETF']
  }
};

import { 
  FaRobot, 
  FaCamera, 
  FaShieldAlt, 
  FaClipboardList,
  FaLightbulb,
  FaCheckCircle,
  FaCopy,
  FaExternalLinkAlt,
  FaWallet,
  FaChartPie
} from 'react-icons/fa';
import { 
  HiSparkles,
  HiChartBar,
  HiDocumentText
} from 'react-icons/hi';

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
    currentAssetsDescription: '',
    // 各ステップの自由記載欄
    step0FreeText: '', // 基本情報の補足
    step1FreeText: '', // 投資対象市場の補足
    step2FreeText: '', // 投資経験の補足
    step3FreeText: '' // 目標と価値観の補足（既存のものを統合）
  });
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [screenshotPromptType, setScreenshotPromptType] = useState('screenshot_portfolio');
  const [screenshotInstructions, setScreenshotInstructions] = useState('');
  const [generatedScreenshotPrompt, setGeneratedScreenshotPrompt] = useState(null);
  const [portfolioPromptType, setPortfolioPromptType] = useState('full_portfolio');
  const [generatedPortfolioPrompt, setGeneratedPortfolioPrompt] = useState(null);
  
  // カスタム分析項目の状態
  const [selectedAnalysisItems, setSelectedAnalysisItems] = useState([]);
  const [customAnalysisItems, setCustomAnalysisItems] = useState('');
  
  // AIデータ取り込みモーダルの状態
  const [isAIImportModalOpen, setIsAIImportModalOpen] = useState(false);
  const [importDataType, setImportDataType] = useState('portfolio');

  const isJapanese = i18n.language === 'ja';

  // 追加分析項目のオプション
  const additionalAnalysisOptions = [
    {
      id: 'esg_analysis',
      labelJa: 'ESG投資観点での評価',
      labelEn: 'ESG Investment Perspective Analysis',
      descriptionJa: '環境・社会・ガバナンス要素からポートフォリオを評価',
      descriptionEn: 'Evaluate portfolio from environmental, social, and governance factors'
    },
    {
      id: 'tax_optimization',
      labelJa: '税金最適化戦略',
      labelEn: 'Tax Optimization Strategy',
      descriptionJa: '税効率を考慮した投資戦略と損益通算の提案',
      descriptionEn: 'Tax-efficient investment strategies and loss harvesting proposals'
    },
    {
      id: 'inflation_protection',
      labelJa: 'インフレヘッジ分析',
      labelEn: 'Inflation Hedge Analysis',
      descriptionJa: 'インフレ対策としての資産配分の有効性評価',
      descriptionEn: 'Evaluate effectiveness of asset allocation for inflation protection'
    },
    {
      id: 'dividend_strategy',
      labelJa: '配当戦略分析',
      labelEn: 'Dividend Strategy Analysis',
      descriptionJa: '配当収入を重視した投資戦略の提案',
      descriptionEn: 'Investment strategy proposals focusing on dividend income'
    },
    {
      id: 'recession_resilience',
      labelJa: '不況耐性評価',
      labelEn: 'Recession Resilience Assessment',
      descriptionJa: '経済不況時のポートフォリオの安定性評価',
      descriptionEn: 'Portfolio stability assessment during economic downturns'
    },
    {
      id: 'currency_risk',
      labelJa: '為替リスク分析',
      labelEn: 'Currency Risk Analysis',
      descriptionJa: '通貨変動がポートフォリオに与える影響の分析',
      descriptionEn: 'Analysis of currency fluctuation impact on portfolio'
    },
    {
      id: 'alternative_investments',
      labelJa: 'オルタナティブ投資検討',
      labelEn: 'Alternative Investment Consideration',
      descriptionJa: 'REIT、コモディティ、仮想通貨等の追加投資機会',
      descriptionEn: 'Additional investment opportunities in REITs, commodities, crypto, etc.'
    },
    {
      id: 'life_stage_planning',
      labelJa: 'ライフステージ別戦略',
      labelEn: 'Life Stage Strategy',
      descriptionJa: '年齢や人生の段階に応じた投資戦略の調整',
      descriptionEn: 'Investment strategy adjustments based on age and life stage'
    },
    {
      id: 'market_timing',
      labelJa: 'マーケットタイミング分析',
      labelEn: 'Market Timing Analysis',
      descriptionJa: '市場サイクルを考慮した投資タイミングの提案',
      descriptionEn: 'Investment timing proposals considering market cycles'
    },
    {
      id: 'stress_testing',
      labelJa: 'ストレステスト',
      labelEn: 'Stress Testing',
      descriptionJa: '極端な市場状況でのポートフォリオのシミュレーション',
      descriptionEn: 'Portfolio simulation under extreme market conditions'
    }
  ];

  const steps = [
    { key: 'basic', titleJa: '基本情報', titleEn: 'Basic Information' },
    { key: 'markets', titleJa: '投資対象市場', titleEn: 'Investment Markets' },
    { key: 'experience', titleJa: '投資経験', titleEn: 'Investment Experience' },
    { key: 'portfolio_goals', titleJa: 'ポートフォリオ・目標設定', titleEn: 'Portfolio & Goals' },
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
      icon: <HiChartBar className="w-8 h-8" />
    },
    {
      id: 'market_data_screenshot',
      name: isJapanese ? '株価・市場データ' : 'Market Data',
      description: isJapanese ? '株価表示画面やチャート' : 'Stock prices or charts',
      icon: <HiChartBar className="w-8 h-8" />
    },
    {
      id: 'transaction_history',
      name: isJapanese ? '取引履歴' : 'Transaction History',
      description: isJapanese ? '売買履歴や約定情報' : 'Trading history',
      icon: <HiDocumentText className="w-8 h-8" />
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
` : ''}${userData.step0FreeText ? `【基本情報の補足】
${userData.step0FreeText}
` : ''}${userData.step1FreeText ? `【投資対象に関する補足】
${userData.step1FreeText}
` : ''}${userData.step2FreeText ? `【投資経験に関する補足】
${userData.step2FreeText}
` : ''}${userData.step3FreeText ? `【目標・価値観に関する補足】
${userData.step3FreeText}
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
` : ''}${userData.step0FreeText ? `【Additional Basic Information】
${userData.step0FreeText}
` : ''}${userData.step1FreeText ? `【Additional Investment Preferences】
${userData.step1FreeText}
` : ''}${userData.step2FreeText ? `【Additional Investment Experience Details】
${userData.step2FreeText}
` : ''}${userData.step3FreeText ? `【Additional Goals and Values Information】
${userData.step3FreeText}
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

  const generatePortfolioPrompt = () => {
    // PortfolioPromptServiceが存在しないため、一時的にダミーデータを設定
    const promptData = {
      prompt: `ポートフォリオ分析を行ってください。現在のポートフォリオ：${JSON.stringify({ message: '分析データの生成機能は開発中です' })}`,
      data: {}
    };
    setGeneratedPortfolioPrompt(promptData);
  };

  const copyPortfolioPromptToClipboard = async () => {
    if (generatedPortfolioPrompt) {
      try {
        await navigator.clipboard.writeText(generatedPortfolioPrompt.content);
        // Success feedback could be added here
      } catch (error) {
        console.error('コピー失敗:', error);
      }
    }
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

  // 追加分析項目の選択/解除
  const handleToggleAnalysisItem = (itemId) => {
    setSelectedAnalysisItems(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // AIデータ取り込みモーダルの処理
  const handleOpenAIImportModal = (dataType = 'portfolio') => {
    setImportDataType(dataType);
    setIsAIImportModalOpen(true);
  };

  const handleCloseAIImportModal = () => {
    setIsAIImportModalOpen(false);
  };

  const handleImportComplete = (importedData, detectedType) => {
    console.log('データ取り込み完了:', { importedData, detectedType });
    
    // データタイプに応じて適切なContextに保存
    if (detectedType === 'portfolio' && importedData.portfolio_data) {
      // ポートフォリオデータの場合、PortfolioContextに統合
      // この部分は要件に応じてさらに実装を進める
    }
    
    // 成功メッセージの表示（ToastNotificationなど）
    // この部分も後で実装
    
    setIsAIImportModalOpen(false);
  };

  // アンケートYAMLインポート処理
  const handleSurveyImport = (importedSurveyData, metadata) => {
    console.log('アンケートデータのインポート:', { importedSurveyData, metadata });
    
    // インポートされたデータでuserDataを更新
    setUserData(prev => ({
      ...prev,
      ...importedSurveyData,
      // インポート情報を記録
      lastImportedAt: metadata.importedAt,
      importSource: metadata.dataSource
    }));
    
    console.log('アンケートデータが正常にインポートされました');
  };

  return (
    <div className="min-h-screen bg-dark-100 text-white">
      <div className={`container mx-auto px-4 py-8 pb-20 ${isFirstTimeUser ? 'max-w-6xl' : ''}`}>
        
        {/* YAML管理サイドパネル */}
        {!isFirstTimeUser && (
          <div className="fixed right-4 top-20 w-80 z-40">
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-1">
              <SurveyYAMLManager
                surveyData={userData}
                onImportData={handleSurveyImport}
                isVisible={true}
                showPreview={true}
                compact={true}
              />
            </div>
          </div>
        )}
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`flex items-center justify-center gap-3 font-bold mb-4 ${isFirstTimeUser ? 'text-4xl lg:text-5xl' : 'text-3xl'}`}>
            <FaRobot className="text-primary-400" />
            <h1>{isJapanese ? 'AIアドバイザー' : 'AI Advisor'}</h1>
          </div>
          
          {/* AI Data Import Button */}
          <div className="mb-6">
            <ModernButton
              variant="secondary"
              onClick={() => handleOpenAIImportModal('portfolio')}
              className="inline-flex items-center gap-2"
            >
              <FaCamera className="w-4 h-4" />
              {isJapanese ? 'スクリーンショットからデータ取り込み' : 'Import Data from Screenshot'}
            </ModernButton>
          </div>
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
              <div className="flex items-center gap-2 text-primary-400 text-sm font-medium mb-2">
                <HiSparkles />
                <span>{isJapanese ? '初回セットアップ' : 'Initial Setup'}</span>
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
              
              {/* 基本情報の自由記載欄 */}
              <div className="mt-6">
                <label className="block text-sm font-medium mb-2">
                  {isJapanese ? 'その他、補足したいこと（任意）' : 'Additional Information (Optional)'}
                </label>
                <textarea
                  value={userData.step0FreeText}
                  onChange={(e) => setUserData(prev => ({ ...prev, step0FreeText: e.target.value }))}
                  placeholder={isJapanese 
                    ? '基本情報について補足があれば自由にご記入ください...' 
                    : 'Feel free to add any additional information about yourself...'
                  }
                  className="w-full p-3 bg-dark-300 border border-dark-400 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 1: Market Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* MarketSelectionWizard temporarily disabled */}
              <div className="bg-dark-300/50 border border-dark-400 rounded-lg p-4">
                <p className="text-gray-400 text-sm">市場選択ウィザードは一時的に無効化されています</p>
              </div>
              
              {/* 投資対象市場の自由記載欄 */}
              <div className="mt-6">
                <label className="block text-sm font-medium mb-2">
                  {isJapanese ? 'その他、投資について補足したいこと（任意）' : 'Additional Investment Preferences (Optional)'}
                </label>
                <textarea
                  value={userData.step1FreeText}
                  onChange={(e) => setUserData(prev => ({ ...prev, step1FreeText: e.target.value }))}
                  placeholder={isJapanese 
                    ? '投資対象や市場について補足があれば自由にご記入ください...' 
                    : 'Feel free to add any additional information about your investment preferences...'
                  }
                  className="w-full p-3 bg-dark-300 border border-dark-400 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
            </div>
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
              
              {/* 投資経験の自由記載欄 */}
              <div className="mt-6">
                <label className="block text-sm font-medium mb-2">
                  {isJapanese ? 'その他、投資経験について補足したいこと（任意）' : 'Additional Investment Experience Details (Optional)'}
                </label>
                <textarea
                  value={userData.step2FreeText}
                  onChange={(e) => setUserData(prev => ({ ...prev, step2FreeText: e.target.value }))}
                  placeholder={isJapanese 
                    ? '投資経験やリスク許容度について補足があれば自由にご記入ください...' 
                    : 'Feel free to add any additional information about your investment experience or risk tolerance...'
                  }
                  className="w-full p-3 bg-dark-300 border border-dark-400 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 3: Portfolio & Goals Integration */}
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


              {/* Claude推奨：一括データ入力セクション */}
              <div className="mt-8 bg-orange-500/10 border border-orange-500/30 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FaRobot className="text-orange-400 text-xl" />
                  <h3 className="text-lg font-medium text-white">
                    {isJapanese ? 'Claude推奨：AI分析結果一括設定' : 'Claude Recommended: Bulk AI Analysis Import'}
                  </h3>
                </div>
                <p className="text-gray-300 text-sm mb-4">
                  {isJapanese 
                    ? 'Claudeで分析した結果をそのまま貼り付けて、ポートフォリオ設定を一括で完了できます。画像による分析結果やスクリーンショット分析にも対応しています。'
                    : 'Paste Claude analysis results directly to complete portfolio setup in one go. Supports image-based analysis results and screenshot analysis.'
                  }
                </p>

                {/* 統合プロンプト生成 */}
                <div className="mb-6 bg-dark-300/50 rounded-lg p-4 border border-dark-400">
                  <div className="flex items-center gap-2 mb-3">
                    <FaChartPie className="text-primary-400" />
                    <h4 className="font-medium text-white">
                      {isJapanese ? 'カスタマイズ可能AI分析プロンプト' : 'Customizable AI Analysis Prompt'}
                    </h4>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">
                    {isJapanese 
                      ? 'ベースプロンプトに加えて、あなたが知りたい項目を追加で選択できます。'
                      : 'You can select additional items you want to know about, in addition to the base prompt.'
                    }
                  </p>

                  {/* 追加分析項目の選択 */}
                  <div className="mb-4">
                    <h5 className="font-medium text-white mb-3">
                      {isJapanese ? '追加で分析したい項目（複数選択可）' : 'Additional Analysis Items (Multiple Selection)'}
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {additionalAnalysisOptions.map(option => (
                        <button
                          key={option.id}
                          onClick={() => handleToggleAnalysisItem(option.id)}
                          className={`p-3 text-left rounded-lg border transition-all duration-200 text-sm ${
                            selectedAnalysisItems.includes(option.id)
                              ? 'bg-blue-500/20 border-blue-400 text-white'
                              : 'bg-dark-400 border-dark-500 text-gray-300 hover:bg-dark-300'
                          }`}
                        >
                          <div className="font-medium mb-1">
                            {isJapanese ? option.labelJa : option.labelEn}
                          </div>
                          <div className="text-xs opacity-80">
                            {isJapanese ? option.descriptionJa : option.descriptionEn}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 自由記述での追加項目 */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-white">
                      {isJapanese ? 'その他の分析希望項目（自由記述）' : 'Other Analysis Requests (Free Text)'}
                    </label>
                    <textarea
                      value={customAnalysisItems}
                      onChange={(e) => setCustomAnalysisItems(e.target.value)}
                      placeholder={isJapanese 
                        ? '例: 特定のセクターへの集中リスク、米中関係が投資に与える影響、新興技術への投資機会など...'
                        : 'e.g. Sector concentration risk, impact of US-China relations on investments, emerging technology investment opportunities, etc...'
                      }
                      className="w-full p-3 bg-dark-400 border border-dark-500 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none text-white placeholder-gray-500"
                      rows={3}
                    />
                  </div>

                  <div className="bg-dark-200 rounded-lg p-3 border border-dark-400">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-300">
                        {isJapanese ? 'カスタマイズ済み分析プロンプト' : 'Customized Analysis Prompt'}
                      </span>
                      <button
                        onClick={() => {
                          // ベースプロンプト
                          const basePrompt = `# 投資ポートフォリオ分析AIプロンプト

あなたは投資分析に特化した AI アシスタントです。
目的: ユーザーの投資ポートフォリオを分析し、最適な配分戦略と具体的な投資プランを提案すること。

### 初期情報収集
最初に以下の情報を確認してください：
- 現在の総資産額（ドル、円など、通貨単位を明記）
- 毎月の新規投資予定額
- 現状の投資ポートフォリオ構成（変更がなければ例のデータを利用します。）
- 理想的と考えるポートフォリオ構成（変更がなければ例のデータを利用します。）

### 投資ポートフォリオ構成の例
現状の投資ポートフォリオ構成：
- VOO: 43.7%（S&P 500 ETF）
- QQQ: 15%（ナスダック100 ETF）
- GLD: 8.6%（金ETF）
- LQD: 7.4%（投資適格社債ETF）
- VXUS: 3.5%（米国外株式ETF）
- VWO: 1.18%（新興国市場ETF）
- EIDO: 8.7%（インドネシアETF）
- INDIA: 7.9%（インドETF）
- IBIT: 4.1%（ビットコインETF）

理想的なポートフォリオ構成：
- VOO: 40%（S&P 500 ETF）
- QQQ: 13%（ナスダック100 ETF）
- GLD: 8.5%（金ETF）
- LQD: 8%（投資適格社債ETF）
- VXUS: 8%（米国外株式ETF）
- VWO: 6%（新興国市場ETF）
- EIDO: 6%（インドネシアETF）
- INDIA: 6%（インドETF）
- IBIT: 4.5%（ビットコインETF）

▼ 分析ガイドライン
各銘柄について：
1. 直近の市場パフォーマンスと価格動向を調査
2. マクロ経済環境と当該資産クラスへの影響を考慮
3. 今後12ヶ月の見通しを分析
4. 現状の配分比率と理想的な配分比率の両方について妥当性を評価
5. 現状比率から理想比率への移行について具体的な提案（タイミングや段階的な調整方法など）

ポートフォリオ全体について：
1. 現状比率と理想比率それぞれにおける資産クラス間の相関性とリスク分散の評価
2. 現状比率と理想比率それぞれにおける地域分散とセクター分散の分析
3. 現在の市場環境における現状ポートフォリオと理想ポートフォリオのリスク評価
4. 両ポートフォリオ構成のパフォーマンス予測と比較`;

                          // 選択された追加分析項目を追加
                          let additionalSections = '';
                          if (selectedAnalysisItems.length > 0) {
                            additionalSections += '\n\n### 追加分析項目\n';
                            selectedAnalysisItems.forEach(itemId => {
                              const item = additionalAnalysisOptions.find(opt => opt.id === itemId);
                              if (item) {
                                additionalSections += `- **${item.labelJa}**: ${item.descriptionJa}\n`;
                              }
                            });
                          }

                          // カスタム分析項目を追加
                          if (customAnalysisItems.trim()) {
                            additionalSections += '\n### カスタム分析要求\n';
                            additionalSections += customAnalysisItems.trim() + '\n';
                          }

                          const outputFormat = `\n\n▼ 出力フォーマット（Markdown）
### 投資ポートフォリオ分析
#### 個別銘柄分析
| ETF | 現状比率 | 理想比率 | 最新動向と見通し | 配分評価とコメント |
|-----|---------|---------|------------------|------------------|
| VOO | 43.7% | 40% | 記入例：S&P500は直近3ヶ月で5%上昇。テクノロジーセクターが牽引し、今後も堅調な成長が期待される。 | 現状比率について：（評価コメント）<br>理想比率について：（評価コメント）<br>調整提案：（具体的な提案） |

#### ポートフォリオ全体評価
- **リスク分散**: 
  - 現状比率のリスク分散評価：（コメント）
  - 理想比率のリスク分散評価：（コメント）
  - 比較と改善点：（コメント）
- **地域分散**: 
  - 現状比率の地域分散評価：（コメント）
  - 理想比率の地域分散評価：（コメント）
  - 比較と改善点：（コメント）
- **セクター分散**: 
  - 現状比率のセクター分散評価：（コメント）
  - 理想比率のセクター分散評価：（コメント）
  - 比較と改善点：（コメント）
- **期待リターン**: 
  - 現状比率の期待リターン評価：（コメント）
  - 理想比率の期待リターン評価：（コメント）
  - 比較と改善点：（コメント）

#### 具体的な投資プラン
- **現在の総資産額**：（ユーザー入力の総資産額）
- **毎月の投資予定額**：（ユーザー入力の毎月投資額）

##### 6ヶ月投資プラン
各月の具体的な投資配分（金額と比率）：
- 1ヶ月目：（詳細な配分）
- 2ヶ月目：（詳細な配分）
- ...
- 6ヶ月目：（詳細な配分）

##### 継続投資戦略
- 毎月の定期投資における理想的な配分：（詳細）
- リバランスの頻度と条件：（詳細）
- 資産成長の予測：（1年後、3年後、5年後の予測）

- **移行戦略**: 
  - 段階的な移行プラン：（具体的なステップとタイミング）
  - 市場環境に応じた調整方法：（コメント）
  - 税金や取引コストの考慮：（コメント）`;

                          const additionalAnalysisFormat = selectedAnalysisItems.length > 0 || customAnalysisItems.trim() 
                            ? '\n\n#### 追加分析結果\n（選択された追加項目について詳細な分析を提供）'
                            : '';

                          const processingSteps = `\n\n▼ 処理手順
1. ユーザーから現在の総資産額と毎月の投資予定額を確認
2. 各ETFの直近のパフォーマンスデータと市場動向を収集
3. マクロ経済指標と関連性を分析
4. 個別銘柄の見通しを評価
5. 現状比率と理想比率それぞれについて詳細な評価を行う
6. 両ポートフォリオ構成の比較分析を実施
7. 現状から理想比率への最適な移行戦略を立案
8. 現在の総資産と毎月の投資額を考慮した具体的な投資プランを作成
9. 指定フォーマットに整形し、分析結果を出力`;

                          const notes = `\n\n▼ 注意
- データは最新の情報を使用すること
- 分析は客観的かつ根拠に基づいたものとする
- 投資アドバイスではなく、情報提供を目的とした分析であることを明記
- 現状比率と理想比率の両方について個別に詳細なコメントを提供すること
- 両比率の違いがもたらす影響についても言及すること
- 現在の総資産額と毎月の投資予定額に基づいた実用的な投資プランを提案すること
- **すべての出力は日本語で行うこと**`;

                          const fullPrompt = basePrompt + additionalSections + outputFormat + additionalAnalysisFormat + processingSteps + notes;
                          
                          navigator.clipboard.writeText(fullPrompt);
                          alert(isJapanese ? 'カスタマイズ済みプロンプトをクリップボードにコピーしました！' : 'Customized prompt copied to clipboard!');
                        }}
                        className="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white text-xs rounded transition-colors duration-200"
                      >
                        {isJapanese ? 'プロンプト生成＆コピー' : 'Generate & Copy Prompt'}
                      </button>
                    </div>
                    <div className="text-xs text-gray-300 leading-relaxed max-h-32 overflow-y-auto">
                      <div className="mb-2">
                        <strong>{isJapanese ? 'ベース分析：' : 'Base Analysis:'}</strong>
                        {isJapanese 
                          ? 'ポートフォリオ構成、個別銘柄分析、リスク評価、投資プラン'
                          : 'Portfolio composition, individual security analysis, risk assessment, investment plan'
                        }
                      </div>
                      {selectedAnalysisItems.length > 0 && (
                        <div className="mb-2">
                          <strong>{isJapanese ? '追加分析：' : 'Additional Analysis:'}</strong>
                          {selectedAnalysisItems.map(itemId => {
                            const item = additionalAnalysisOptions.find(opt => opt.id === itemId);
                            return item ? (isJapanese ? item.labelJa : item.labelEn) : '';
                          }).join('、')}
                        </div>
                      )}
                      {customAnalysisItems.trim() && (
                        <div className="mb-2">
                          <strong>{isJapanese ? 'カスタム項目：' : 'Custom Items:'}</strong>
                          {customAnalysisItems.slice(0, 100)}...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-dark-400 p-4 rounded-lg border border-dark-500">
                    <div className="flex items-center space-x-2 mb-3">
                      <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h4 className="font-medium text-white">
                        {isJapanese ? 'AI分析結果の取り込み' : 'Import AI Analysis Results'}
                      </h4>
                    </div>
                    <p className="text-gray-300 text-sm mb-3">
                      {isJapanese 
                        ? 'Claude分析結果を「データ取り込み」ページのAI分析結果タブで貼り付けて、自動的に各項目に反映できます。'
                        : 'You can paste Claude analysis results in the "Data Import" page\'s AI Analysis Results tab to automatically populate all fields.'
                      }
                    </p>
                    <button
                      onClick={() => window.open('/data-import?tab=ai-analysis', '_blank')}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>
                        {isJapanese ? 'データ取り込みページを開く' : 'Open Data Import Page'}
                      </span>
                    </button>
                  </div>
                </div>
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
                      ? '現在保有している資産の内訳を自由に記述してください。上記のAIプロンプトで整理した結果もここに記入できます。' 
                      : 'Describe your current asset allocation freely. You can also paste AI-organized results here.'
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
                
                {/* 目標と価値観の自由記載欄 */}
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-4">
                    {isJapanese ? 'その他、目標や価値観について補足したいこと（任意）' : 'Additional Goals and Values Information (Optional)'}
                  </h3>
                  <textarea
                    value={userData.step3FreeText}
                    onChange={(e) => setUserData(prev => ({ ...prev, step3FreeText: e.target.value }))}
                    placeholder={isJapanese 
                      ? '価値観、不安、目標、投資スタイルなどについて補足があれば自由にご記入ください...' 
                      : 'Feel free to add any additional information about your goals, values, concerns, or investment style...'
                    }
                    className="w-full p-4 bg-dark-300 border border-dark-400 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
                    rows={4}
                  />
                  <p className="text-sm text-gray-400 mt-2">
                    {isJapanese 
                      ? '投資に対する考え方や特別な要望などがあれば記入してください' 
                      : 'Share your investment philosophy or any special requirements'
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
                <div className="flex items-center justify-center gap-2">
                  <FaCamera className="text-primary-400 text-2xl" />
                  <h3 className="text-xl font-semibold">
                    {isJapanese ? 'スクリーンショット分析プロンプト' : 'Screenshot Analysis Prompts'}
                  </h3>
                </div>
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
                  <FaShieldAlt className="text-blue-400 text-2xl mt-1" />
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
                      <FaRobot className="text-2xl mb-1 mx-auto" />
                      <div className="font-medium">Claude</div>
                      <div className="text-xs opacity-80">
                        {isJapanese ? '画像分析対応' : 'Image Analysis'}
                      </div>
                    </button>

                    <button
                      onClick={() => openAIWithScreenshot('gemini')}
                      className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-white text-center"
                    >
                      <FaRobot className="text-2xl mb-1 mx-auto" />
                      <div className="font-medium">Gemini</div>
                      <div className="text-xs opacity-80">
                        {isJapanese ? '画像分析対応' : 'Image Analysis'}
                      </div>
                    </button>

                    <button
                      onClick={() => openAIWithScreenshot('chatgpt')}
                      className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 text-white text-center"
                    >
                      <FaRobot className="text-2xl mb-1 mx-auto" />
                      <div className="font-medium">ChatGPT</div>
                      <div className="text-xs opacity-80">
                        {isJapanese ? '画像分析対応' : 'Image Analysis'}
                      </div>
                    </button>
                  </div>
                  
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-400 text-sm mb-2">
                      <FaLightbulb />
                      <span>{isJapanese ? '使い方' : 'How to Use'}</span>
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
                    <div className="flex items-center gap-2 text-green-400 font-medium mb-3">
                      <FaCheckCircle className="text-xl" />
                      <h4>{isJapanese ? '初期設定完了準備' : 'Initial Setup Ready'}</h4>
                    </div>
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
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between mt-8">
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
    </div>
  );
};

export default AIAdvisor;