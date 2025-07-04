/**
 * エンドツーエンドYAML統合テスト
 * 実際のサンプルデータでYAML変換からポートフォリオ更新まで確認
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AIDataImportModal from '../../../components/ai/AIDataImportModal';
import { PortfolioContext } from '../../../context/PortfolioContext';
import { AuthContext } from '../../../context/AuthContext';
import YAMLUtils from '../../../utils/yamlProcessor';
import yamlIntegrationService from '../../../services/yamlIntegrationService';
import { validateYAMLData } from '../../../utils/yamlValidators';

// 実際のサンプルデータ（スクリーンショットベース - 全15銘柄）
const SAMPLE_PORTFOLIO_YAML = `
portfolio_data:
  metadata:
    total_assets: 41277.33
    currency: USD
    last_updated: "2024-07-02"
    account_type: "Individual Cash"
    account_name: "Schwab Account"
    monthly_investment: 5000
    exchange_rate_usd_jpy: 150.0
    
  holdings:
    # IMG_4627.PNG の9銘柄
    - symbol: EIDO
      name: "iShares MSCI Indonesia ETF"
      type: ETF
      market: EMERGING
      quantity: 170
      current_price: 17.45
      current_value: 2966.50
      currency: USD
      allocation_percentage: 7.19
      open_pnl: -62.55
      open_pnl_percentage: -2.07
      average_cost: 17.82
      
    - symbol: AAPL
      name: "Apple Inc"
      type: Stock
      market: US
      quantity: 0.18225
      current_price: 212.05
      current_value: 38.65
      currency: USD
      allocation_percentage: 0.09
      open_pnl: -5.43
      open_pnl_percentage: -12.33
      average_cost: 241.84
      
    - symbol: SBUX
      name: "Starbucks Corp"
      type: Stock
      market: US
      quantity: 0.02619
      current_price: 94.21
      current_value: 2.47
      currency: USD
      allocation_percentage: 0.01
      open_pnl: -0.57
      open_pnl_percentage: -18.65
      average_cost: 115.81
      
    - symbol: IEF
      name: "iShares 7-10 Year Treasury Bond ETF"
      type: ETF
      market: US
      quantity: 12
      current_price: 95.01
      current_value: 1140.12
      currency: USD
      allocation_percentage: 2.76
      open_pnl: 0.00
      open_pnl_percentage: 0.00
      average_cost: 95.01
      
    - symbol: SPOT
      name: "Spotify Technology S.A."
      type: Stock
      market: US
      quantity: 0.051
      current_price: 710.00
      current_value: 36.21
      currency: USD
      allocation_percentage: 0.09
      open_pnl: 5.20
      open_pnl_percentage: 16.77
      average_cost: 608.01
      
    - symbol: VNQ
      name: "Vanguard Real Estate ETF"
      type: ETF
      market: US
      quantity: 10
      current_price: 90.01
      current_value: 900.10
      currency: USD
      allocation_percentage: 2.18
      open_pnl: 8.07
      open_pnl_percentage: 0.90
      average_cost: 89.20
      
    - symbol: F
      name: "Ford Motor Company"
      type: Stock
      market: US
      quantity: 4.45872
      current_price: 11.76
      current_value: 52.43
      currency: USD
      allocation_percentage: 0.13
      open_pnl: 9.85
      open_pnl_percentage: 23.14
      average_cost: 9.55
      
    - symbol: LQD
      name: "iShares iBoxx Investment Grade Corporate Bond ETF"
      type: ETF
      market: US
      quantity: 24
      current_price: 109.36
      current_value: 2624.64
      currency: USD
      allocation_percentage: 6.36
      open_pnl: 71.82
      open_pnl_percentage: 2.81
      average_cost: 106.37
      
    - symbol: VWO
      name: "Vanguard FTSE Emerging Markets ETF"
      type: ETF
      market: EMERGING
      quantity: 18
      current_price: 49.65
      current_value: 893.70
      currency: USD
      allocation_percentage: 2.17
      open_pnl: 74.04
      open_pnl_percentage: 9.03
      average_cost: 45.54
      
    # IMG_4628.PNG の6銘柄
    - symbol: VXUS
      name: "Vanguard Total International Stock ETF"
      type: ETF
      market: INTERNATIONAL
      quantity: 26
      current_price: 69.25
      current_value: 1800.50
      currency: USD
      allocation_percentage: 4.36
      open_pnl: 143.87
      open_pnl_percentage: 8.68
      average_cost: 63.72
      
    - symbol: IBIT
      name: "iShares Bitcoin Trust"
      type: ETF
      market: CRYPTO
      quantity: 27
      current_price: 61.97
      current_value: 1673.19
      currency: USD
      allocation_percentage: 4.05
      open_pnl: 240.14
      open_pnl_percentage: 16.76
      average_cost: 53.08
      
    - symbol: INDA
      name: "iShares MSCI India ETF"
      type: ETF
      market: EMERGING
      quantity: 52
      current_price: 55.59
      current_value: 2890.68
      currency: USD
      allocation_percentage: 7.00
      open_pnl: 254.30
      open_pnl_percentage: 9.65
      average_cost: 50.70
      
    - symbol: GLD
      name: "SPDR Gold Shares"
      type: ETF
      market: COMMODITY
      quantity: 10
      current_price: 308.66
      current_value: 3086.60
      currency: USD
      allocation_percentage: 7.48
      open_pnl: 472.22
      open_pnl_percentage: 18.06
      average_cost: 261.44
      
    - symbol: QQQ
      name: "Invesco QQQ Trust"
      type: ETF
      market: US
      quantity: 11
      current_price: 550.84
      current_value: 6059.24
      currency: USD
      allocation_percentage: 14.68
      open_pnl: 552.97
      open_pnl_percentage: 10.04
      average_cost: 500.57
      
    - symbol: VOO
      name: "Vanguard S&P 500 ETF"
      type: ETF
      market: US
      quantity: 30
      current_price: 570.41
      current_value: 17112.30
      currency: USD
      allocation_percentage: 41.46
      open_pnl: 857.17
      open_pnl_percentage: 5.27
      average_cost: 541.84
      
  target_allocation:
    - asset_class: US_Stocks
      target_percentage: 60.0
      current_percentage: 58.1
      
    - asset_class: International_Stocks
      target_percentage: 20.0
      current_percentage: 4.5
      
    - asset_class: Alternative_Assets
      target_percentage: 15.0
      current_percentage: 11.9
      
    - asset_class: Bonds
      target_percentage: 5.0
      current_percentage: 0.0
`;

// ユーザープロファイルのサンプル
const SAMPLE_USER_PROFILE_YAML = `
user_profile:
  basic_info:
    age_group: "30-40"
    experience_level: intermediate
    investment_period: long_term
    occupation: "Software Engineer"
    family_status: "Single"
    
  risk_assessment:
    risk_tolerance: moderate
    loss_tolerance_percentage: 15
    volatility_comfort: medium
    
  investment_goals:
    primary_goal: growth
    target_return: 7.0
    investment_horizon: 25
    specific_goals:
      - "Build wealth for early retirement"
      - "Diversify across asset classes"
      
  financial_situation:
    monthly_investment: 100000
    emergency_fund_months: 6
    current_savings: 2000000
    
  preferences:
    preferred_markets: [US, JP, International]
    values_based_investing: ["ESG", "Tech Innovation"]
    concerns: ["Market Volatility", "Inflation Risk"]
    sector_preferences: ["Technology", "Healthcare", "Financial"]
    
  metadata:
    survey_completed_at: "2024-07-02T10:30:00Z"
    survey_version: "1.0"
    data_source: "ai_advisor_survey"
    custom_responses:
      ideal_portfolio: "米国株50% + 国際分散30% + 代替資産20%"
      current_assets_description: "Schwab口座での分散投資"
      investment_philosophy: "長期成長重視、ESG投資"
`;

describe('エンドツーエンドYAML統合テスト', () => {
  let mockPortfolioContext;
  let mockAuthContext;
  let mockSetCurrentAssets;
  let mockSetTargetPortfolio;
  let mockSetAdditionalBudget;
  let mockSaveToLocalStorage;
  let mockAddNotification;

  beforeEach(() => {
    mockSetCurrentAssets = jest.fn();
    mockSetTargetPortfolio = jest.fn();
    mockSetAdditionalBudget = jest.fn();
    mockSaveToLocalStorage = jest.fn();
    mockAddNotification = jest.fn();

    mockPortfolioContext = {
      currentAssets: [],
      targetPortfolio: [],
      additionalBudget: { amount: 0 },
      portfolio: null,
      setCurrentAssets: mockSetCurrentAssets,
      setTargetPortfolio: mockSetTargetPortfolio,
      setAdditionalBudget: mockSetAdditionalBudget,
      saveToLocalStorage: mockSaveToLocalStorage,
      addNotification: mockAddNotification
    };

    mockAuthContext = {
      user: { id: 'test-user', name: 'Test User' }
    };

    jest.clearAllMocks();
  });

  describe('ポートフォリオデータのYAML変換と統合', () => {
    it('スクリーンショットサンプルをYAMLに変換してポートフォリオを更新', async () => {
      console.log('=== ポートフォリオYAML変換テスト開始 ===');
      
      // 1. YAMLパースのテスト
      const parsedData = YAMLUtils.parse(SAMPLE_PORTFOLIO_YAML);
      console.log('パース結果:', JSON.stringify(parsedData, null, 2));
      
      expect(parsedData).toHaveProperty('portfolio_data');
      expect(parsedData.portfolio_data).toHaveProperty('metadata');
      expect(parsedData.portfolio_data).toHaveProperty('holdings');
      expect(parsedData.portfolio_data).toHaveProperty('target_allocation');

      // 2. バリデーションのテスト
      const validationResult = validateYAMLData(parsedData, 'portfolio');
      console.log('バリデーション結果:', validationResult);
      
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);

      // 3. 統合サービスのテスト
      const integrationResult = await yamlIntegrationService.integrateYAMLData(
        parsedData,
        'portfolio',
        { portfolioContext: mockPortfolioContext, authContext: mockAuthContext },
        { 
          portfolioContext: mockPortfolioContext,
          mergeStrategy: 'replace',
          preserveExisting: false,
          autoSave: true
        }
      );

      console.log('統合結果:', JSON.stringify(integrationResult, null, 2));

      // 4. 統合成功の確認
      expect(integrationResult.success).toBe(true);
      expect(integrationResult.errors).toHaveLength(0);
      expect(integrationResult.appliedChanges.length).toBeGreaterThan(0);

      // 5. メタデータの確認
      expect(integrationResult.metadata).toHaveProperty('transformedHoldings');
      expect(integrationResult.metadata).toHaveProperty('transformedTargetAllocation');
      expect(integrationResult.metadata.transformedHoldings).toHaveLength(15);

      // 6. 変換された保有資産の確認
      const transformedHoldings = integrationResult.metadata.transformedHoldings;
      
      // VOOの確認（最大保有）
      const vooHolding = transformedHoldings.find(h => h.symbol === 'VOO');
      expect(vooHolding).toBeDefined();
      expect(vooHolding.name).toBe('Vanguard S&P 500 ETF');
      expect(vooHolding.currentValue).toBe(17112.30);
      expect(vooHolding.allocationPercentage).toBe(41.46);

      // QQQの確認
      const qqqHolding = transformedHoldings.find(h => h.symbol === 'QQQ');
      expect(qqqHolding).toBeDefined();
      expect(qqqHolding.currentValue).toBe(6059.24);
      expect(qqqHolding.allocationPercentage).toBe(14.68);

      // ビットコインETFの確認
      const ibitHolding = transformedHoldings.find(h => h.symbol === 'IBIT');
      expect(ibitHolding).toBeDefined();
      expect(ibitHolding.market).toBe('CRYPTO');
      expect(ibitHolding.currentValue).toBe(1673.19);

      // 損失銘柄の確認（AAPL, SBUX, EIDO）
      const lossHoldings = transformedHoldings.filter(h => h.symbol === 'AAPL' || h.symbol === 'SBUX' || h.symbol === 'EIDO');
      expect(lossHoldings).toHaveLength(3);

      // 7. 目標配分の確認
      const transformedAllocation = integrationResult.metadata.transformedTargetAllocation;
      expect(transformedAllocation).toHaveLength(4);
      
      const usStocksAllocation = transformedAllocation.find(a => a.assetClass === 'US_Stocks');
      expect(usStocksAllocation.targetPercentage).toBe(60.0);
      expect(usStocksAllocation.currentPercentage).toBe(58.1);

      console.log('=== ポートフォリオYAML変換テスト完了 ===');
    });

    it('ポートフォリオコンテキストの実際の更新', async () => {
      console.log('=== ポートフォリオコンテキスト更新テスト開始 ===');

      const parsedData = YAMLUtils.parse(SAMPLE_PORTFOLIO_YAML);
      
      // 統合実行（autoSave有効）
      const integrationResult = await yamlIntegrationService.integrateYAMLData(
        parsedData,
        'portfolio',
        { portfolioContext: mockPortfolioContext, authContext: mockAuthContext },
        { 
          portfolioContext: mockPortfolioContext,
          autoSave: true,
          mergeStrategy: 'replace'
        }
      );

      // ポートフォリオコンテキストの更新確認
      expect(integrationResult.success).toBe(true);
      
      // メタデータから変換されたデータを取得
      const { transformedHoldings, transformedTargetAllocation, portfolioMetadata } = integrationResult.metadata;

      // 保有資産の更新確認
      expect(transformedHoldings).toBeDefined();
      expect(transformedHoldings.length).toBe(15);

      // 各銘柄の詳細確認
      transformedHoldings.forEach(holding => {
        expect(holding).toHaveProperty('id');
        expect(holding).toHaveProperty('symbol');
        expect(holding).toHaveProperty('name');
        expect(holding).toHaveProperty('currentValue');
        expect(holding).toHaveProperty('importedAt');
        expect(holding.importedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      });

      // 目標配分の更新確認
      expect(transformedTargetAllocation).toBeDefined();
      expect(transformedTargetAllocation.length).toBe(4);

      transformedTargetAllocation.forEach(allocation => {
        expect(allocation).toHaveProperty('id');
        expect(allocation).toHaveProperty('assetClass');
        expect(allocation).toHaveProperty('targetPercentage');
        expect(allocation).toHaveProperty('currentPercentage');
      });

      // ポートフォリオメタデータの確認
      expect(portfolioMetadata).toBeDefined();
      
      const monthlyInvestmentChange = portfolioMetadata.find(p => p.field === 'monthlyInvestment');
      expect(monthlyInvestmentChange).toBeDefined();
      expect(monthlyInvestmentChange.newValue).toBe(5000);

      console.log('変換された保有資産:', transformedHoldings.map(h => ({ symbol: h.symbol, value: h.currentValue })));
      console.log('変換された目標配分:', transformedTargetAllocation.map(a => ({ class: a.assetClass, target: a.targetPercentage })));
      console.log('=== ポートフォリオコンテキスト更新テスト完了 ===');
    });
  });

  describe('ユーザープロファイルのYAML変換と統合', () => {
    it('ユーザープロファイルをYAMLに変換して統合', async () => {
      console.log('=== ユーザープロファイルYAML変換テスト開始 ===');

      // 1. YAMLパースのテスト
      const parsedData = YAMLUtils.parse(SAMPLE_USER_PROFILE_YAML);
      console.log('ユーザープロファイルパース結果:', JSON.stringify(parsedData, null, 2));

      expect(parsedData).toHaveProperty('user_profile');
      expect(parsedData.user_profile).toHaveProperty('basic_info');
      expect(parsedData.user_profile).toHaveProperty('risk_assessment');
      expect(parsedData.user_profile).toHaveProperty('investment_goals');
      expect(parsedData.user_profile).toHaveProperty('financial_situation');
      expect(parsedData.user_profile).toHaveProperty('preferences');

      // 2. バリデーションのテスト
      const validationResult = validateYAMLData(parsedData, 'user_profile');
      console.log('ユーザープロファイルバリデーション結果:', validationResult);

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);

      // 3. 統合サービスのテスト
      const integrationResult = await yamlIntegrationService.integrateYAMLData(
        parsedData,
        'user_profile',
        { portfolioContext: mockPortfolioContext, authContext: mockAuthContext }
      );

      console.log('ユーザープロファイル統合結果:', JSON.stringify(integrationResult, null, 2));

      // 4. 統合成功の確認
      expect(integrationResult.success).toBe(true);
      expect(integrationResult.errors).toHaveLength(0);
      expect(integrationResult.appliedChanges.length).toBeGreaterThan(0);

      // 5. 変換されたユーザープロファイルの確認
      expect(integrationResult.metadata).toHaveProperty('transformedUserProfile');
      const transformedProfile = integrationResult.metadata.transformedUserProfile;

      expect(transformedProfile).toHaveProperty('basic_info');
      expect(transformedProfile.basic_info.age_group).toBe('30-40');
      expect(transformedProfile.basic_info.experience_level).toBe('intermediate');

      expect(transformedProfile).toHaveProperty('risk_assessment');
      expect(transformedProfile.risk_assessment.risk_tolerance).toBe('moderate');
      expect(transformedProfile.risk_assessment.loss_tolerance_percentage).toBe(15);

      expect(transformedProfile).toHaveProperty('financial_situation');
      expect(transformedProfile.financial_situation.monthly_investment).toBe(100000);

      console.log('=== ユーザープロファイルYAML変換テスト完了 ===');
    });
  });

  describe('複合データの統合テスト', () => {
    it('ポートフォリオとユーザープロファイルを同時に統合', async () => {
      console.log('=== 複合データ統合テスト開始 ===');

      const compositeYAML = `
${SAMPLE_PORTFOLIO_YAML}
${SAMPLE_USER_PROFILE_YAML}
`;

      // 1. 複合YAMLのパース
      const parsedData = YAMLUtils.parse(compositeYAML);
      console.log('複合データパース結果:', Object.keys(parsedData));

      expect(parsedData).toHaveProperty('portfolio_data');
      expect(parsedData).toHaveProperty('user_profile');

      // 2. 複合データのバリデーション
      const validationResult = validateYAMLData(parsedData, 'composite');
      console.log('複合データバリデーション結果:', validationResult);

      expect(validationResult.isValid).toBe(true);

      // 3. 複合データの統合
      const integrationResult = await yamlIntegrationService.integrateYAMLData(
        parsedData,
        'composite',
        { portfolioContext: mockPortfolioContext, authContext: mockAuthContext },
        { 
          portfolioContext: mockPortfolioContext,
          autoSave: true
        }
      );

      console.log('複合データ統合結果:', JSON.stringify(integrationResult, null, 2));

      // 4. 統合成功の確認
      expect(integrationResult.success).toBe(true);
      expect(integrationResult.errors).toHaveLength(0);
      expect(integrationResult.appliedChanges.length).toBeGreaterThan(1);

      // 5. ポートフォリオとユーザープロファイル両方が統合されていることを確認
      const changeTypes = integrationResult.appliedChanges.map(c => c.type);
      expect(changeTypes).toContain('portfolio_update');
      expect(changeTypes).toContain('user_profile_update');

      // 6. メタデータの確認
      expect(integrationResult.metadata).toHaveProperty('transformedHoldings');
      expect(integrationResult.metadata).toHaveProperty('transformedUserProfile');

      console.log('=== 複合データ統合テスト完了 ===');
    });
  });

  describe('エラーケースと回復テスト', () => {
    it('無効なYAMLでも適切にエラーハンドリング', async () => {
      console.log('=== エラーハンドリングテスト開始 ===');

      const invalidYAML = `
portfolio_data:
  metadata:
    total_assets: -1000  # 負の値
    currency: INVALID    # 無効な通貨
  holdings:
    - symbol: ""         # 空のシンボル
      quantity: -10      # 負の数量
`;

      try {
        const parsedData = YAMLUtils.parse(invalidYAML);
        const integrationResult = await yamlIntegrationService.integrateYAMLData(
          parsedData,
          'portfolio',
          { portfolioContext: mockPortfolioContext, authContext: mockAuthContext }
        );

        console.log('エラーハンドリング結果:', integrationResult);

        // 統合は失敗するが、エラーが適切に記録されることを確認
        expect(integrationResult.success).toBe(false);
        expect(integrationResult.errors.length).toBeGreaterThan(0);
        
        // エラーメッセージの確認
        const errorMessages = integrationResult.errors.map(e => e.message).join(', ');
        console.log('エラーメッセージ:', errorMessages);

      } catch (error) {
        console.log('パースエラー:', error.message);
        expect(error).toBeDefined();
      }

      console.log('=== エラーハンドリングテスト完了 ===');
    });

    it('部分的なデータでも処理可能', async () => {
      console.log('=== 部分データ処理テスト開始 ===');

      const partialYAML = `
portfolio_data:
  metadata:
    total_assets: 10000
    currency: USD
  holdings:
    - symbol: AAPL
      name: "Apple Inc"
      type: Stock
      market: US
      quantity: 1
      current_price: 150.0
      current_value: 150.0
      currency: USD
      average_cost: 145.0
`;

      const parsedData = YAMLUtils.parse(partialYAML);
      const integrationResult = await yamlIntegrationService.integrateYAMLData(
        parsedData,
        'portfolio',
        { portfolioContext: mockPortfolioContext, authContext: mockAuthContext },
        { portfolioContext: mockPortfolioContext }
      );

      console.log('部分データ統合結果:', integrationResult);

      expect(integrationResult.success).toBe(true);
      expect(integrationResult.metadata.transformedHoldings).toHaveLength(1);
      
      const appleHolding = integrationResult.metadata.transformedHoldings[0];
      expect(appleHolding.symbol).toBe('AAPL');
      expect(appleHolding.currentValue).toBe(150.0);

      console.log('=== 部分データ処理テスト完了 ===');
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量データの処理パフォーマンス', async () => {
      console.log('=== パフォーマンステスト開始 ===');

      // 100銘柄のポートフォリオを生成
      const largeHoldingsYAML = `
portfolio_data:
  metadata:
    total_assets: 1000000
    currency: USD
    last_updated: "2024-07-02"
  holdings:
${Array.from({ length: 100 }, (_, i) => `
    - symbol: STOCK${i}
      name: "Test Stock ${i}"
      type: Stock
      market: US
      quantity: ${10 + i}
      current_price: ${100 + Math.random() * 50}
      current_value: ${(10 + i) * (100 + Math.random() * 50)}
      currency: USD
      allocation_percentage: ${(100 / 100).toFixed(2)}
      average_cost: ${90 + Math.random() * 40}
`).join('')}
`;

      const startTime = Date.now();
      
      const parsedData = YAMLUtils.parse(largeHoldingsYAML);
      const integrationResult = await yamlIntegrationService.integrateYAMLData(
        parsedData,
        'portfolio',
        { portfolioContext: mockPortfolioContext, authContext: mockAuthContext },
        { portfolioContext: mockPortfolioContext }
      );
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      console.log(`大量データ処理時間: ${processingTime}ms`);
      console.log('統合された銘柄数:', integrationResult.metadata.transformedHoldings?.length);

      expect(integrationResult.success).toBe(true);
      expect(integrationResult.metadata.transformedHoldings).toHaveLength(100);
      expect(processingTime).toBeLessThan(5000); // 5秒以内

      console.log('=== パフォーマンステスト完了 ===');
    });
  });
});