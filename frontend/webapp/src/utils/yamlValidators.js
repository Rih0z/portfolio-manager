/**
 * YAML データバリデーション機能
 * 各データタイプに特化したエンタープライズレベルのバリデーション
 */

import { YAMLProcessingError } from './yamlProcessor';

/**
 * バリデーションエラーのカスタムエラークラス
 */
export class ValidationError extends Error {
  constructor(message, field = null, value = null, type = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
    this.type = type;
  }
}

/**
 * バリデーション結果の構造
 */
class ValidationResult {
  constructor() {
    this.isValid = true;
    this.errors = [];
    this.warnings = [];
    this.metadata = {};
  }

  addError(message, field = null, value = null) {
    this.isValid = false;
    this.errors.push({
      message,
      field,
      value,
      severity: 'error'
    });
  }

  addWarning(message, field = null, value = null) {
    this.warnings.push({
      message,
      field,
      value,
      severity: 'warning'
    });
  }

  setMetadata(key, value) {
    this.metadata[key] = value;
  }

  getResult() {
    return {
      isValid: this.isValid,
      errors: this.errors,
      warnings: this.warnings,
      metadata: this.metadata
    };
  }
}

/**
 * 基本的なフィールドバリデーション関数群
 */
const FieldValidators = {
  // 必須フィールドチェック
  required: (value, fieldName) => {
    if (value === null || value === undefined || value === '') {
      return `${fieldName}は必須フィールドです`;
    }
    return null;
  },

  // 数値範囲チェック
  numberRange: (value, min, max, fieldName) => {
    if (typeof value !== 'number' || isNaN(value)) {
      return `${fieldName}は有効な数値である必要があります`;
    }
    if (value < min || value > max) {
      return `${fieldName}は${min}から${max}の範囲で入力してください`;
    }
    return null;
  },

  // 正の数チェック
  positiveNumber: (value, fieldName) => {
    if (typeof value !== 'number' || isNaN(value) || value < 0) {
      return `${fieldName}は正の数値である必要があります`;
    }
    return null;
  },

  // 文字列長チェック
  stringLength: (value, minLength, maxLength, fieldName) => {
    if (typeof value !== 'string') {
      return `${fieldName}は文字列である必要があります`;
    }
    if (value.length < minLength || value.length > maxLength) {
      return `${fieldName}は${minLength}文字以上${maxLength}文字以下で入力してください`;
    }
    return null;
  },

  // 配列チェック
  array: (value, fieldName) => {
    if (!Array.isArray(value)) {
      return `${fieldName}は配列である必要があります`;
    }
    return null;
  },

  // 列挙値チェック
  enum: (value, allowedValues, fieldName) => {
    if (!allowedValues.includes(value)) {
      return `${fieldName}は次のいずれかの値である必要があります: ${allowedValues.join(', ')}`;
    }
    return null;
  },

  // 日付フォーマットチェック
  dateFormat: (value, fieldName) => {
    if (typeof value !== 'string') {
      return `${fieldName}は文字列である必要があります`;
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(value)) {
      return `${fieldName}はYYYY-MM-DD形式で入力してください`;
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return `${fieldName}は有効な日付である必要があります`;
    }
    return null;
  },

  // 通貨コードチェック
  currencyCode: (value, fieldName) => {
    const validCurrencies = ['JPY', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'];
    return FieldValidators.enum(value, validCurrencies, fieldName);
  },

  // ティッカーシンボルチェック
  tickerSymbol: (value, fieldName) => {
    if (typeof value !== 'string') {
      return `${fieldName}は文字列である必要があります`;
    }
    // 基本的なティッカーパターン（英数字、ピリオド、ハイフン）
    const tickerRegex = /^[A-Z0-9\.\-]{1,20}$/i;
    if (!tickerRegex.test(value)) {
      return `${fieldName}は有効なティッカーシンボル形式である必要があります`;
    }
    return null;
  }
};

/**
 * ポートフォリオデータのバリデーション
 * @param {Object} data - バリデーション対象のポートフォリオデータ
 * @returns {Object} バリデーション結果
 */
export const validatePortfolioData = (data) => {
  const result = new ValidationResult();

  if (!data || typeof data !== 'object') {
    result.addError('ポートフォリオデータが無効です');
    return result.getResult();
  }

  const portfolioData = data.portfolio_data;
  if (!portfolioData) {
    result.addError('portfolio_data セクションが必要です');
    return result.getResult();
  }

  // メタデータのバリデーション
  validatePortfolioMetadata(portfolioData.metadata, result);

  // 保有資産のバリデーション
  validateHoldings(portfolioData.holdings, result);

  // 目標配分のバリデーション
  if (portfolioData.target_allocation) {
    validateTargetAllocation(portfolioData.target_allocation, result);
  }

  // データ整合性チェック
  validatePortfolioConsistency(portfolioData, result);

  return result.getResult();
};

/**
 * ポートフォリオメタデータのバリデーション
 */
const validatePortfolioMetadata = (metadata, result) => {
  if (!metadata) {
    result.addError('metadata セクションが必要です');
    return;
  }

  // 総資産額チェック
  const totalAssetsError = FieldValidators.positiveNumber(
    metadata.total_assets, '総資産額'
  );
  if (totalAssetsError) {
    result.addError(totalAssetsError, 'metadata.total_assets', metadata.total_assets);
  }

  // 通貨チェック
  const currencyError = FieldValidators.currencyCode(
    metadata.currency, '基準通貨'
  );
  if (currencyError) {
    result.addError(currencyError, 'metadata.currency', metadata.currency);
  }

  // 最終更新日チェック
  if (metadata.last_updated) {
    const dateError = FieldValidators.dateFormat(
      metadata.last_updated, '最終更新日'
    );
    if (dateError) {
      result.addError(dateError, 'metadata.last_updated', metadata.last_updated);
    }
  }

  // 月次投資額チェック
  if (metadata.monthly_investment !== undefined) {
    const monthlyInvestmentError = FieldValidators.positiveNumber(
      metadata.monthly_investment, '月次投資額'
    );
    if (monthlyInvestmentError) {
      result.addError(monthlyInvestmentError, 'metadata.monthly_investment', metadata.monthly_investment);
    }
  }

  // 為替レートチェック
  if (metadata.exchange_rate_usd_jpy !== undefined) {
    const exchangeRateError = FieldValidators.numberRange(
      metadata.exchange_rate_usd_jpy, 50, 300, 'USD/JPY為替レート'
    );
    if (exchangeRateError) {
      result.addError(exchangeRateError, 'metadata.exchange_rate_usd_jpy', metadata.exchange_rate_usd_jpy);
    }
  }
};

/**
 * 保有資産のバリデーション
 */
const validateHoldings = (holdings, result) => {
  if (!holdings) {
    result.addError('holdings セクションが必要です');
    return;
  }

  const arrayError = FieldValidators.array(holdings, '保有資産');
  if (arrayError) {
    result.addError(arrayError, 'holdings', holdings);
    return;
  }

  if (holdings.length === 0) {
    result.addWarning('保有資産が登録されていません');
    return;
  }

  holdings.forEach((holding, index) => {
    validateSingleHolding(holding, index, result);
  });

  // 重複チェック
  const symbols = holdings.map(h => h.symbol).filter(Boolean);
  const duplicates = symbols.filter((symbol, index) => symbols.indexOf(symbol) !== index);
  if (duplicates.length > 0) {
    result.addWarning(`重複する銘柄が検出されました: ${duplicates.join(', ')}`);
  }
};

/**
 * 個別保有資産のバリデーション
 */
const validateSingleHolding = (holding, index, result) => {
  const prefix = `holdings[${index}]`;

  if (!holding || typeof holding !== 'object') {
    result.addError(`${index + 1}番目の保有資産が無効です`, prefix, holding);
    return;
  }

  // シンボルチェック
  const symbolError = FieldValidators.required(holding.symbol, 'シンボル');
  if (symbolError) {
    result.addError(symbolError, `${prefix}.symbol`, holding.symbol);
  } else {
    const tickerError = FieldValidators.tickerSymbol(holding.symbol, 'シンボル');
    if (tickerError) {
      result.addError(tickerError, `${prefix}.symbol`, holding.symbol);
    }
  }

  // 銘柄名チェック
  const nameError = FieldValidators.required(holding.name, '銘柄名');
  if (nameError) {
    result.addError(nameError, `${prefix}.name`, holding.name);
  }

  // 資産タイプチェック
  const validTypes = ['ETF', 'Stock', 'MutualFund', 'IndexFund', 'Bond', 'Commodity'];
  const typeError = FieldValidators.enum(holding.type, validTypes, '資産タイプ');
  if (typeError) {
    result.addError(typeError, `${prefix}.type`, holding.type);
  }

  // 市場チェック
  const validMarkets = ['US', 'JP', 'EU', 'UK', 'CA', 'AU', 'INTERNATIONAL', 'EMERGING', 'COMMODITY', 'CRYPTO'];
  const marketError = FieldValidators.enum(holding.market, validMarkets, '市場');
  if (marketError) {
    result.addError(marketError, `${prefix}.market`, holding.market);
  }

  // 数量チェック
  const quantityError = FieldValidators.positiveNumber(holding.quantity, '保有数量');
  if (quantityError) {
    result.addError(quantityError, `${prefix}.quantity`, holding.quantity);
  }

  // 価格チェック
  const avgCostError = FieldValidators.positiveNumber(holding.average_cost, '平均取得価格');
  if (avgCostError) {
    result.addError(avgCostError, `${prefix}.average_cost`, holding.average_cost);
  }

  const currentPriceError = FieldValidators.positiveNumber(holding.current_price, '現在価格');
  if (currentPriceError) {
    result.addError(currentPriceError, `${prefix}.current_price`, holding.current_price);
  }

  // 通貨チェック
  const currencyError = FieldValidators.currencyCode(holding.currency, '通貨');
  if (currencyError) {
    result.addError(currencyError, `${prefix}.currency`, holding.currency);
  }

  // 評価額チェック
  const currentValueError = FieldValidators.positiveNumber(holding.current_value, '現在評価額');
  if (currentValueError) {
    result.addError(currentValueError, `${prefix}.current_value`, holding.current_value);
  }

  // 配分比率チェック
  if (holding.allocation_percentage !== undefined) {
    const allocationError = FieldValidators.numberRange(
      holding.allocation_percentage, 0, 100, '現在配分比率'
    );
    if (allocationError) {
      result.addError(allocationError, `${prefix}.allocation_percentage`, holding.allocation_percentage);
    }
  }

  if (holding.target_percentage !== undefined) {
    const targetError = FieldValidators.numberRange(
      holding.target_percentage, 0, 100, '目標配分比率'
    );
    if (targetError) {
      result.addError(targetError, `${prefix}.target_percentage`, holding.target_percentage);
    }
  }
};

/**
 * 目標配分のバリデーション
 */
const validateTargetAllocation = (targetAllocation, result) => {
  const arrayError = FieldValidators.array(targetAllocation, '目標配分');
  if (arrayError) {
    result.addError(arrayError, 'target_allocation', targetAllocation);
    return;
  }

  const validAssetClasses = [
    'US_Stocks', 'JP_Stocks', 'EU_Stocks', 'International_Stocks', 'Emerging_Markets',
    'Bonds', 'Gold', 'Commodities', 'REITs', 'Cash', 'Alternative_Assets', 'Crypto'
  ];

  let totalPercentage = 0;

  targetAllocation.forEach((allocation, index) => {
    const prefix = `target_allocation[${index}]`;

    // 資産クラスチェック
    const assetClassError = FieldValidators.enum(
      allocation.asset_class, validAssetClasses, '資産クラス'
    );
    if (assetClassError) {
      result.addError(assetClassError, `${prefix}.asset_class`, allocation.asset_class);
    }

    // 配分比率チェック
    const percentageError = FieldValidators.numberRange(
      allocation.target_percentage, 0, 100, '目標配分比率'
    );
    if (percentageError) {
      result.addError(percentageError, `${prefix}.target_percentage`, allocation.target_percentage);
    } else {
      totalPercentage += allocation.target_percentage || 0;
    }
  });

  // 配分比率の合計チェック
  if (Math.abs(totalPercentage - 100) > 0.1) {
    result.addError(`目標配分比率の合計が100%になっていません（現在: ${totalPercentage.toFixed(1)}%）`);
  }
};

/**
 * ポートフォリオデータの整合性チェック
 */
const validatePortfolioConsistency = (portfolioData, result) => {
  const { metadata, holdings } = portfolioData;

  if (!holdings || !metadata) return;

  // 総資産額と個別評価額の整合性チェック
  const calculatedTotal = holdings.reduce((sum, holding) => {
    if (holding.current_value_jpy) {
      return sum + holding.current_value_jpy;
    } else if (holding.current_value && holding.currency === 'JPY') {
      return sum + holding.current_value;
    } else if (holding.current_value && holding.currency === 'USD' && metadata.exchange_rate_usd_jpy) {
      return sum + (holding.current_value * metadata.exchange_rate_usd_jpy);
    }
    return sum;
  }, 0);

  if (metadata.total_assets && calculatedTotal > 0) {
    const difference = Math.abs(metadata.total_assets - calculatedTotal);
    const tolerance = metadata.total_assets * 0.05; // 5%の許容誤差

    if (difference > tolerance) {
      result.addWarning(
        `総資産額（${metadata.total_assets.toLocaleString()}円）と個別評価額の合計（${calculatedTotal.toLocaleString()}円）に大きな差異があります`
      );
    }
  }

  // 配分比率の合計チェック
  const totalAllocation = holdings.reduce((sum, holding) => {
    return sum + (holding.allocation_percentage || 0);
  }, 0);

  if (Math.abs(totalAllocation - 100) > 1) {
    result.addWarning(`配分比率の合計が100%と異なります（現在: ${totalAllocation.toFixed(1)}%）`);
  }
};

/**
 * ユーザープロファイルデータのバリデーション
 * @param {Object} data - バリデーション対象のユーザープロファイルデータ
 * @returns {Object} バリデーション結果
 */
export const validateUserProfile = (data) => {
  const result = new ValidationResult();

  if (!data || typeof data !== 'object') {
    result.addError('ユーザープロファイルデータが無効です');
    return result.getResult();
  }

  const userProfile = data.user_profile;
  if (!userProfile) {
    result.addError('user_profile セクションが必要です');
    return result.getResult();
  }

  // 基本情報のバリデーション
  if (userProfile.basic_info) {
    validateBasicInfo(userProfile.basic_info, result);
  } else {
    result.addError('basic_info セクションが必要です');
  }

  // リスク評価のバリデーション
  if (userProfile.risk_assessment) {
    validateRiskAssessment(userProfile.risk_assessment, result);
  } else {
    result.addError('risk_assessment セクションが必要です');
  }

  // 投資目標のバリデーション
  if (userProfile.investment_goals) {
    validateInvestmentGoals(userProfile.investment_goals, result);
  } else {
    result.addError('investment_goals セクションが必要です');
  }

  // 財政状況のバリデーション
  if (userProfile.financial_situation) {
    validateFinancialSituation(userProfile.financial_situation, result);
  }

  // 投資嗜好のバリデーション
  if (userProfile.preferences) {
    validateInvestmentPreferences(userProfile.preferences, result);
  }

  return result.getResult();
};

/**
 * 基本情報のバリデーション
 */
const validateBasicInfo = (basicInfo, result) => {
  const validAgeGroups = ['20-30', '30-40', '40-50', '50-60', '60+'];
  const ageGroupError = FieldValidators.enum(
    basicInfo.age_group, validAgeGroups, '年齢層'
  );
  if (ageGroupError) {
    result.addError(ageGroupError, 'basic_info.age_group', basicInfo.age_group);
  }

  const validExperienceLevels = ['beginner', 'intermediate', 'advanced'];
  const experienceError = FieldValidators.enum(
    basicInfo.experience_level, validExperienceLevels, '投資経験レベル'
  );
  if (experienceError) {
    result.addError(experienceError, 'basic_info.experience_level', basicInfo.experience_level);
  }

  const validInvestmentPeriods = ['short_term', 'medium_term', 'long_term'];
  const periodError = FieldValidators.enum(
    basicInfo.investment_period, validInvestmentPeriods, '投資期間'
  );
  if (periodError) {
    result.addError(periodError, 'basic_info.investment_period', basicInfo.investment_period);
  }
};

/**
 * リスク評価のバリデーション
 */
const validateRiskAssessment = (riskAssessment, result) => {
  const validRiskTolerances = ['conservative', 'moderate', 'aggressive'];
  const riskToleranceError = FieldValidators.enum(
    riskAssessment.risk_tolerance, validRiskTolerances, 'リスク許容度'
  );
  if (riskToleranceError) {
    result.addError(riskToleranceError, 'risk_assessment.risk_tolerance', riskAssessment.risk_tolerance);
  }

  if (riskAssessment.loss_tolerance_percentage !== undefined) {
    const lossToleranceError = FieldValidators.numberRange(
      riskAssessment.loss_tolerance_percentage, 0, 100, '損失許容率'
    );
    if (lossToleranceError) {
      result.addError(lossToleranceError, 'risk_assessment.loss_tolerance_percentage', riskAssessment.loss_tolerance_percentage);
    }
  }

  const validVolatilityComforts = ['low', 'medium', 'high'];
  const volatilityError = FieldValidators.enum(
    riskAssessment.volatility_comfort, validVolatilityComforts, 'ボラティリティ許容度'
  );
  if (volatilityError) {
    result.addError(volatilityError, 'risk_assessment.volatility_comfort', riskAssessment.volatility_comfort);
  }
};

/**
 * 投資目標のバリデーション
 */
const validateInvestmentGoals = (investmentGoals, result) => {
  const validPrimaryGoals = ['growth', 'income', 'preservation', 'speculation'];
  const primaryGoalError = FieldValidators.enum(
    investmentGoals.primary_goal, validPrimaryGoals, '主要投資目標'
  );
  if (primaryGoalError) {
    result.addError(primaryGoalError, 'investment_goals.primary_goal', investmentGoals.primary_goal);
  }

  if (investmentGoals.target_return !== undefined) {
    const targetReturnError = FieldValidators.numberRange(
      investmentGoals.target_return, -10, 50, '目標リターン'
    );
    if (targetReturnError) {
      result.addError(targetReturnError, 'investment_goals.target_return', investmentGoals.target_return);
    }
  }
};

/**
 * 財政状況のバリデーション
 */
const validateFinancialSituation = (financialSituation, result) => {
  if (financialSituation.monthly_investment !== undefined) {
    const monthlyInvestmentError = FieldValidators.positiveNumber(
      financialSituation.monthly_investment, '月次投資額'
    );
    if (monthlyInvestmentError) {
      result.addError(monthlyInvestmentError, 'financial_situation.monthly_investment', financialSituation.monthly_investment);
    }
  }

  if (financialSituation.emergency_fund_months !== undefined) {
    const emergencyFundError = FieldValidators.numberRange(
      financialSituation.emergency_fund_months, 0, 24, '緊急資金（月数）'
    );
    if (emergencyFundError) {
      result.addError(emergencyFundError, 'financial_situation.emergency_fund_months', financialSituation.emergency_fund_months);
    }
  }
};

/**
 * 投資嗜好のバリデーション
 */
const validateInvestmentPreferences = (preferences, result) => {
  if (preferences.preferred_markets) {
    const arrayError = FieldValidators.array(preferences.preferred_markets, '選好市場');
    if (arrayError) {
      result.addError(arrayError, 'preferences.preferred_markets', preferences.preferred_markets);
    }
  }

  if (preferences.sector_preferences) {
    const arrayError = FieldValidators.array(preferences.sector_preferences, '選好セクター');
    if (arrayError) {
      result.addError(arrayError, 'preferences.sector_preferences', preferences.sector_preferences);
    }
  }
};

/**
 * アプリ設定データのバリデーション
 * @param {Object} data - バリデーション対象のアプリ設定データ
 * @returns {Object} バリデーション結果
 */
export const validateAppConfig = (data) => {
  const result = new ValidationResult();

  if (!data || typeof data !== 'object') {
    result.addError('アプリ設定データが無効です');
    return result.getResult();
  }

  const appConfig = data.app_config;
  if (!appConfig) {
    result.addError('app_config セクションが必要です');
    return result.getResult();
  }

  // 表示設定のバリデーション
  if (appConfig.display) {
    validateDisplayConfig(appConfig.display, result);
  }

  // データソース設定のバリデーション
  if (appConfig.data_sources) {
    validateDataSourcesConfig(appConfig.data_sources, result);
  }

  // 機能設定のバリデーション
  if (appConfig.features) {
    validateFeaturesConfig(appConfig.features, result);
  }

  return result.getResult();
};

/**
 * 表示設定のバリデーション
 */
const validateDisplayConfig = (display, result) => {
  if (display.default_currency) {
    const currencyError = FieldValidators.currencyCode(display.default_currency, 'デフォルト通貨');
    if (currencyError) {
      result.addError(currencyError, 'display.default_currency', display.default_currency);
    }
  }

  if (display.decimal_places !== undefined) {
    const decimalError = FieldValidators.numberRange(
      display.decimal_places, 0, 8, '小数点以下桁数'
    );
    if (decimalError) {
      result.addError(decimalError, 'display.decimal_places', display.decimal_places);
    }
  }
};

/**
 * データソース設定のバリデーション
 */
const validateDataSourcesConfig = (dataSources, result) => {
  const validAPIs = ['alpaca', 'yahoo_finance', 'manual', 'alpha_vantage'];
  
  if (dataSources.primary_api) {
    const primaryAPIError = FieldValidators.enum(
      dataSources.primary_api, validAPIs, 'プライマリAPI'
    );
    if (primaryAPIError) {
      result.addError(primaryAPIError, 'data_sources.primary_api', dataSources.primary_api);
    }
  }

  if (dataSources.backup_apis) {
    const arrayError = FieldValidators.array(dataSources.backup_apis, 'バックアップAPI');
    if (!arrayError) {
      dataSources.backup_apis.forEach((api, index) => {
        const apiError = FieldValidators.enum(api, validAPIs, `バックアップAPI[${index}]`);
        if (apiError) {
          result.addError(apiError, `data_sources.backup_apis[${index}]`, api);
        }
      });
    } else {
      result.addError(arrayError, 'data_sources.backup_apis', dataSources.backup_apis);
    }
  }
};

/**
 * 機能設定のバリデーション
 */
const validateFeaturesConfig = (features, result) => {
  const booleanFields = [
    'ai_analysis', 'real_time_data', 'multi_currency', 'cloud_sync'
  ];

  booleanFields.forEach(field => {
    if (features[field] !== undefined && typeof features[field] !== 'boolean') {
      result.addError(`${field}はboolean値である必要があります`, `features.${field}`, features[field]);
    }
  });
};

/**
 * 配分テンプレートのバリデーション
 * @param {Object} data - バリデーション対象の配分テンプレートデータ
 * @returns {Object} バリデーション結果
 */
export const validateAllocationTemplates = (data) => {
  const result = new ValidationResult();

  if (!data || typeof data !== 'object') {
    result.addError('配分テンプレートデータが無効です');
    return result.getResult();
  }

  const templates = data.allocation_templates;
  if (!templates) {
    result.addError('allocation_templates セクションが必要です');
    return result.getResult();
  }

  Object.entries(templates).forEach(([templateName, template]) => {
    validateSingleTemplate(templateName, template, result);
  });

  return result.getResult();
};

/**
 * 個別テンプレートのバリデーション
 */
const validateSingleTemplate = (templateName, template, result) => {
  const prefix = `allocation_templates.${templateName}`;

  if (!template || typeof template !== 'object') {
    result.addError(`テンプレート「${templateName}」が無効です`, prefix, template);
    return;
  }

  // 名前チェック
  const nameError = FieldValidators.required(template.name, 'テンプレート名');
  if (nameError) {
    result.addError(nameError, `${prefix}.name`, template.name);
  }

  // 配分データチェック
  if (!template.allocations) {
    result.addError(`テンプレート「${templateName}」にallocationsが必要です`, `${prefix}.allocations`);
    return;
  }

  const arrayError = FieldValidators.array(template.allocations, '配分データ');
  if (arrayError) {
    result.addError(arrayError, `${prefix}.allocations`, template.allocations);
    return;
  }

  // 配分比率の合計チェック
  let totalPercentage = 0;
  template.allocations.forEach((allocation, index) => {
    const allocationPrefix = `${prefix}.allocations[${index}]`;

    if (!allocation.asset_class) {
      result.addError('資産クラスが必要です', `${allocationPrefix}.asset_class`);
    }

    const percentageError = FieldValidators.numberRange(
      allocation.percentage, 0, 100, '配分比率'
    );
    if (percentageError) {
      result.addError(percentageError, `${allocationPrefix}.percentage`, allocation.percentage);
    } else {
      totalPercentage += allocation.percentage || 0;
    }
  });

  // 配分比率の合計チェック
  if (Math.abs(totalPercentage - 100) > 0.1) {
    result.addError(
      `テンプレート「${templateName}」の配分比率の合計が100%になっていません（現在: ${totalPercentage.toFixed(1)}%）`,
      prefix
    );
  }
};

/**
 * 複合データのバリデーション
 * @param {Object} data - バリデーション対象の複合データ
 * @returns {Object} バリデーション結果
 */
export const validateCompositeData = (data) => {
  const result = new ValidationResult();
  let hasValidData = false;

  // 各データタイプを個別にバリデーション
  if (data.portfolio_data) {
    const portfolioResult = validatePortfolioData(data);
    mergeValidationResults(result, portfolioResult, 'portfolio_data');
    hasValidData = true;
  }

  if (data.user_profile) {
    const profileResult = validateUserProfile(data);
    mergeValidationResults(result, profileResult, 'user_profile');
    hasValidData = true;
  }

  if (data.app_config) {
    const configResult = validateAppConfig(data);
    mergeValidationResults(result, configResult, 'app_config');
    hasValidData = true;
  }

  if (data.allocation_templates) {
    const templatesResult = validateAllocationTemplates(data);
    mergeValidationResults(result, templatesResult, 'allocation_templates');
    hasValidData = true;
  }

  if (!hasValidData) {
    result.addError('有効なデータセクションが見つかりません');
  }

  return result.getResult();
};

/**
 * バリデーション結果をマージする
 */
const mergeValidationResults = (mainResult, subResult, prefix) => {
  subResult.errors.forEach(error => {
    mainResult.addError(
      error.message,
      error.field ? `${prefix}.${error.field}` : prefix,
      error.value
    );
  });

  subResult.warnings.forEach(warning => {
    mainResult.addWarning(
      warning.message,
      warning.field ? `${prefix}.${warning.field}` : prefix,
      warning.value
    );
  });
};

/**
 * データタイプに応じたバリデーション関数のマップ
 */
export const ValidationFunctionMap = {
  portfolio: validatePortfolioData,
  user_profile: validateUserProfile,
  app_config: validateAppConfig,
  allocation_templates: validateAllocationTemplates,
  composite: validateCompositeData
};

/**
 * 統合バリデーション関数
 * @param {Object} data - バリデーション対象のデータ
 * @param {string} dataType - データタイプ
 * @returns {Object} バリデーション結果
 */
export const validateYAMLData = (data, dataType) => {
  const validator = ValidationFunctionMap[dataType];
  if (!validator) {
    return {
      isValid: false,
      errors: [{ message: `未対応のデータタイプです: ${dataType}` }],
      warnings: [],
      metadata: {}
    };
  }

  return validator(data);
};

export default {
  validatePortfolioData,
  validateUserProfile,
  validateAppConfig,
  validateAllocationTemplates,
  validateCompositeData,
  validateYAMLData,
  ValidationError
};