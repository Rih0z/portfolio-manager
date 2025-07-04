/**
 * アンケート機能YAML統合サービス
 * 
 * AIAdvisorのアンケートデータとYAMLフォーマットの相互変換を提供
 * 既存のアンケート機能をYAMLベースのAIデータ取り込みシステムと統合
 * 
 * 機能:
 * - アンケートデータのYAMLエクスポート
 * - YAMLからアンケートデータへのインポート
 * - データ形式の相互変換
 * - バリデーションと整合性チェック
 * 
 * @author Claude Code
 * @since 2025-01-03
 */

import YAMLUtils from '../utils/yamlProcessor';
import { validateUserProfile } from '../utils/yamlValidators';

/**
 * アンケートYAML統合エラーのカスタムエラークラス
 */
export class SurveyYAMLError extends Error {
  constructor(message, type = 'SURVEY_YAML_ERROR', details = null) {
    super(message);
    this.name = 'SurveyYAMLError';
    this.type = type;
    this.details = details;
  }
}

/**
 * アンケートYAML統合サービスのメインクラス
 */
class SurveyYAMLService {
  
  /**
   * AIAdvisorのアンケートデータをuser_profile YAMLフォーマットに変換
   * @param {Object} surveyData - AIAdvisorのアンケートデータ
   * @returns {string} YAML文字列
   */
  exportSurveyToYAML(surveyData) {
    try {
      const userProfile = this.transformSurveyToUserProfile(surveyData);
      return YAMLUtils.stringify(userProfile);
    } catch (error) {
      throw new SurveyYAMLError(
        `アンケートデータのYAMLエクスポートに失敗: ${error.message}`,
        'EXPORT_ERROR',
        { surveyData, originalError: error }
      );
    }
  }

  /**
   * user_profile YAMLをAIAdvisorのアンケートデータ形式に変換
   * @param {string} yamlString - YAML文字列
   * @returns {Object} AIAdvisorのアンケートデータ形式
   */
  importYAMLToSurvey(yamlString) {
    try {
      const parsedData = YAMLUtils.parse(yamlString);
      
      // バリデーション
      const validationResult = validateUserProfile(parsedData);
      if (!validationResult.isValid) {
        throw new SurveyYAMLError(
          'YAMLデータのバリデーションに失敗',
          'VALIDATION_ERROR',
          { errors: validationResult.errors }
        );
      }

      return this.transformUserProfileToSurvey(parsedData.user_profile);
    } catch (error) {
      if (error instanceof SurveyYAMLError) {
        throw error;
      }
      throw new SurveyYAMLError(
        `YAMLからアンケートデータへの変換に失敗: ${error.message}`,
        'IMPORT_ERROR',
        { yamlString, originalError: error }
      );
    }
  }

  /**
   * AIAdvisorのアンケートデータをuser_profileフォーマットに変換
   * @param {Object} surveyData - AIAdvisorのアンケートデータ
   * @returns {Object} user_profileフォーマット
   */
  transformSurveyToUserProfile(surveyData) {
    return {
      user_profile: {
        basic_info: {
          age_group: this.mapAgeToAgeGroup(surveyData.age),
          experience_level: this.mapInvestmentExperience(surveyData.investmentExperience),
          investment_period: this.inferInvestmentPeriod(surveyData),
          occupation: surveyData.occupation || surveyData.occupationCustom || null,
          family_status: surveyData.familyStatus || surveyData.familyStatusCustom || null
        },
        risk_assessment: {
          risk_tolerance: this.mapRiskTolerance(surveyData.riskTolerance),
          loss_tolerance_percentage: this.inferLossTolerance(surveyData.riskTolerance),
          volatility_comfort: this.mapVolatilityComfort(surveyData.riskTolerance)
        },
        investment_goals: {
          primary_goal: this.mapPrimaryGoal(surveyData.dream),
          target_return: this.inferTargetReturn(surveyData),
          investment_horizon: this.inferInvestmentHorizon(surveyData.age),
          specific_goals: this.extractSpecificGoals(surveyData)
        },
        financial_situation: {
          monthly_investment: this.parseMonthlyInvestment(surveyData.monthlyInvestment),
          emergency_fund_months: this.inferEmergencyFund(surveyData),
          total_assets: this.inferTotalAssets(surveyData),
          debt_situation: null // 現在のアンケートでは収集していない
        },
        preferences: {
          preferred_markets: surveyData.targetMarkets || [],
          sector_preferences: this.extractSectorPreferences(surveyData),
          investment_style: this.inferInvestmentStyle(surveyData),
          values_based_investing: this.extractValues(surveyData.values),
          concerns: this.extractConcerns(surveyData.concerns)
        },
        metadata: {
          survey_completed_at: new Date().toISOString(),
          survey_version: "1.0",
          data_source: "ai_advisor_survey",
          custom_responses: {
            step0_free_text: surveyData.step0FreeText || null,
            step1_free_text: surveyData.step1FreeText || null,
            step2_free_text: surveyData.step2FreeText || null,
            step3_free_text: surveyData.step3FreeText || null,
            ideal_portfolio: surveyData.idealPortfolio || null,
            current_assets_description: surveyData.currentAssetsDescription || null
          }
        }
      }
    };
  }

  /**
   * user_profileフォーマットをAIAdvisorのアンケートデータに変換
   * @param {Object} userProfile - user_profileデータ
   * @returns {Object} AIAdvisorのアンケートデータ
   */
  transformUserProfileToSurvey(userProfile) {
    const customResponses = userProfile.metadata?.custom_responses || {};
    
    return {
      age: this.mapAgeGroupToAge(userProfile.basic_info?.age_group),
      occupation: userProfile.basic_info?.occupation || '',
      occupationCustom: '',
      familyStatus: userProfile.basic_info?.family_status || '',
      familyStatusCustom: '',
      dream: this.mapPrimaryGoalToDream(userProfile.investment_goals?.primary_goal),
      dreamCustom: '',
      targetMarkets: userProfile.preferences?.preferred_markets || [],
      investmentExperience: this.mapExperienceLevel(userProfile.basic_info?.experience_level),
      investmentExperienceCustom: '',
      riskTolerance: this.mapRiskToleranceBack(userProfile.risk_assessment?.risk_tolerance),
      riskToleranceCustom: '',
      monthlyInvestment: userProfile.financial_situation?.monthly_investment?.toString() || '',
      values: userProfile.preferences?.values_based_investing || [],
      valuesCustom: [],
      concerns: userProfile.preferences?.concerns || [],
      concernsCustom: [],
      idealPortfolio: customResponses.ideal_portfolio || '',
      currentAssetsDescription: customResponses.current_assets_description || '',
      step0FreeText: customResponses.step0_free_text || '',
      step1FreeText: customResponses.step1_free_text || '',
      step2FreeText: customResponses.step2_free_text || '',
      step3FreeText: customResponses.step3_free_text || '',
      // メタデータ
      importedAt: new Date().toISOString(),
      dataSource: 'yaml_import'
    };
  }

  // === マッピング関数群 ===

  /**
   * 年齢を年齢層にマップ
   */
  mapAgeToAgeGroup(age) {
    const numAge = parseInt(age);
    if (numAge < 30) return '20-30';
    if (numAge < 40) return '30-40';
    if (numAge < 50) return '40-50';
    if (numAge < 60) return '50-60';
    return '60+';
  }

  /**
   * 年齢層を年齢にマップ（中央値を使用）
   */
  mapAgeGroupToAge(ageGroup) {
    const ageMap = {
      '20-30': 25,
      '30-40': 35,
      '40-50': 45,
      '50-60': 55,
      '60+': 65
    };
    return ageMap[ageGroup] || 35;
  }

  /**
   * 投資経験をマップ
   */
  mapInvestmentExperience(experience) {
    const experienceMap = {
      '投資未経験': 'beginner',
      '少し経験がある': 'intermediate',
      '経験豊富': 'advanced',
      'beginner': 'beginner',
      'intermediate': 'intermediate',
      'advanced': 'advanced'
    };
    return experienceMap[experience] || 'beginner';
  }

  /**
   * 投資経験を逆マップ
   */
  mapExperienceLevel(level) {
    const levelMap = {
      'beginner': '投資未経験',
      'intermediate': '少し経験がある',
      'advanced': '経験豊富'
    };
    return levelMap[level] || '投資未経験';
  }

  /**
   * リスク許容度をマップ
   */
  mapRiskTolerance(tolerance) {
    const toleranceMap = {
      '安全重視': 'conservative',
      'バランス重視': 'moderate',
      '成長重視': 'aggressive',
      'conservative': 'conservative',
      'moderate': 'moderate',
      'aggressive': 'aggressive'
    };
    return toleranceMap[tolerance] || 'moderate';
  }

  /**
   * リスク許容度を逆マップ
   */
  mapRiskToleranceBack(tolerance) {
    const toleranceMap = {
      'conservative': '安全重視',
      'moderate': 'バランス重視',
      'aggressive': '成長重視'
    };
    return toleranceMap[tolerance] || 'バランス重視';
  }

  /**
   * 主要目標をマップ
   */
  mapPrimaryGoal(dream) {
    if (!dream) return 'growth';
    
    const dreamLower = dream.toLowerCase();
    if (dreamLower.includes('安定') || dreamLower.includes('保守')) return 'preservation';
    if (dreamLower.includes('収入') || dreamLower.includes('配当')) return 'income';
    if (dreamLower.includes('成長') || dreamLower.includes('増加')) return 'growth';
    if (dreamLower.includes('投機') || dreamLower.includes('短期')) return 'speculation';
    
    return 'growth';
  }

  /**
   * 主要目標を逆マップ
   */
  mapPrimaryGoalToDream(goal) {
    const goalMap = {
      'growth': '資産成長を重視',
      'income': '配当収入を重視',
      'preservation': '資産保全を重視',
      'speculation': '短期利益を重視'
    };
    return goalMap[goal] || '資産成長を重視';
  }

  /**
   * 損失許容率を推定
   */
  inferLossTolerance(riskTolerance) {
    const toleranceMap = {
      '安全重視': 5,
      'バランス重視': 15,
      '成長重視': 30,
      'conservative': 5,
      'moderate': 15,
      'aggressive': 30
    };
    return toleranceMap[riskTolerance] || 15;
  }

  /**
   * ボラティリティ許容度をマップ
   */
  mapVolatilityComfort(riskTolerance) {
    const comfortMap = {
      '安全重視': 'low',
      'バランス重視': 'medium',
      '成長重視': 'high',
      'conservative': 'low',
      'moderate': 'medium',
      'aggressive': 'high'
    };
    return comfortMap[riskTolerance] || 'medium';
  }

  /**
   * 投資期間を推定
   */
  inferInvestmentPeriod(surveyData) {
    const age = parseInt(surveyData.age);
    if (age < 30) return 'long_term';
    if (age < 50) return 'medium_term';
    return 'short_term';
  }

  /**
   * 投資期間を推定（年齢ベース）
   */
  inferInvestmentHorizon(age) {
    const numAge = parseInt(age);
    if (numAge < 40) return 30;
    if (numAge < 55) return 20;
    return 10;
  }

  /**
   * 目標リターンを推定
   */
  inferTargetReturn(surveyData) {
    const riskLevel = surveyData.riskTolerance;
    const returnMap = {
      '安全重視': 3,
      'バランス重視': 6,
      '成長重視': 10,
      'conservative': 3,
      'moderate': 6,
      'aggressive': 10
    };
    return returnMap[riskLevel] || 6;
  }

  /**
   * 月次投資額をパース
   */
  parseMonthlyInvestment(monthlyInvestment) {
    if (!monthlyInvestment) return null;
    const parsed = parseInt(monthlyInvestment.replace(/[^\d]/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * 緊急資金を推定
   */
  inferEmergencyFund(surveyData) {
    // 一般的に3-6ヶ月分を推定
    return 6;
  }

  /**
   * 総資産を推定
   */
  inferTotalAssets(surveyData) {
    const monthlyInvestment = this.parseMonthlyInvestment(surveyData.monthlyInvestment);
    if (monthlyInvestment) {
      // 月次投資額の20-50倍を推定
      return monthlyInvestment * 30;
    }
    return null;
  }

  /**
   * セクター選好を抽出
   */
  extractSectorPreferences(surveyData) {
    // 現在のアンケートではセクター情報を直接収集していないため、
    // 他の情報から推定またはデフォルト値を返す
    return [];
  }

  /**
   * 投資スタイルを推定
   */
  inferInvestmentStyle(surveyData) {
    const experience = surveyData.investmentExperience;
    const risk = surveyData.riskTolerance;
    
    if (experience === '投資未経験') return 'passive';
    if (risk === '成長重視') return 'active';
    return 'balanced';
  }

  /**
   * 価値観を抽出
   */
  extractValues(values) {
    return Array.isArray(values) ? values : [];
  }

  /**
   * 懸念事項を抽出
   */
  extractConcerns(concerns) {
    return Array.isArray(concerns) ? concerns : [];
  }

  /**
   * 具体的な目標を抽出
   */
  extractSpecificGoals(surveyData) {
    const goals = [];
    
    if (surveyData.dream) {
      goals.push(surveyData.dream);
    }
    
    if (surveyData.idealPortfolio) {
      goals.push(`理想的なポートフォリオ: ${surveyData.idealPortfolio}`);
    }
    
    return goals;
  }

  /**
   * アンケートデータの完全性チェック
   * @param {Object} surveyData - チェック対象のアンケートデータ
   * @returns {Object} チェック結果
   */
  validateSurveyData(surveyData) {
    const errors = [];
    const warnings = [];

    // 必須フィールドのチェック
    if (!surveyData.age || surveyData.age < 18 || surveyData.age > 100) {
      errors.push('有効な年齢が必要です (18-100歳)');
    }

    if (!surveyData.investmentExperience) {
      errors.push('投資経験の選択が必要です');
    }

    if (!surveyData.riskTolerance) {
      errors.push('リスク許容度の選択が必要です');
    }

    // 警告
    if (!surveyData.monthlyInvestment) {
      warnings.push('月次投資額が設定されていません');
    }

    if (!surveyData.targetMarkets || surveyData.targetMarkets.length === 0) {
      warnings.push('投資対象市場が選択されていません');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      completeness: this.calculateCompleteness(surveyData)
    };
  }

  /**
   * アンケートデータの完成度を計算
   */
  calculateCompleteness(surveyData) {
    const totalFields = 12; // 主要フィールド数
    let completedFields = 0;

    if (surveyData.age) completedFields++;
    if (surveyData.occupation) completedFields++;
    if (surveyData.familyStatus) completedFields++;
    if (surveyData.dream) completedFields++;
    if (surveyData.investmentExperience) completedFields++;
    if (surveyData.riskTolerance) completedFields++;
    if (surveyData.monthlyInvestment) completedFields++;
    if (surveyData.targetMarkets && surveyData.targetMarkets.length > 0) completedFields++;
    if (surveyData.values && surveyData.values.length > 0) completedFields++;
    if (surveyData.concerns && surveyData.concerns.length > 0) completedFields++;
    if (surveyData.idealPortfolio) completedFields++;
    if (surveyData.currentAssetsDescription) completedFields++;

    return Math.round((completedFields / totalFields) * 100);
  }
}

// シングルトンインスタンスをエクスポート
const surveyYAMLService = new SurveyYAMLService();

export default surveyYAMLService;