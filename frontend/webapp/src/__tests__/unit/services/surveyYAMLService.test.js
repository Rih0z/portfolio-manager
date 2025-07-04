/**
 * surveyYAMLService.js のユニットテスト
 * アンケート機能YAML統合サービスのテスト
 */

// yamlProcessorとvalidatorsをモック
jest.mock('../../../utils/yamlProcessor', () => ({
  default: {
    parse: jest.fn(),
    stringify: jest.fn()
  }
}));

jest.mock('../../../utils/yamlValidators', () => ({
  validateUserProfile: jest.fn()
}));

import surveyYAMLService, { SurveyYAMLError } from '../../../services/surveyYAMLService';
import YAMLUtils from '../../../utils/yamlProcessor';
import { validateUserProfile } from '../../../utils/yamlValidators';

describe('surveyYAMLService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exportSurveyToYAML', () => {
    const mockSurveyData = {
      age: 35,
      occupation: '会社員',
      familyStatus: '独身',
      dream: '資産成長を重視',
      targetMarkets: ['US', 'JP'],
      investmentExperience: '少し経験がある',
      riskTolerance: 'バランス重視',
      monthlyInvestment: '100000',
      values: ['ESG投資'],
      concerns: ['インフレリスク'],
      idealPortfolio: '米国株50%、日本株30%、債券20%',
      currentAssetsDescription: '銀行預金が中心',
      step0FreeText: '基本情報の補足',
      step1FreeText: '市場選択の補足',
      step2FreeText: '投資経験の補足',
      step3FreeText: '目標の補足'
    };

    it('アンケートデータを正しくYAMLに変換する', () => {
      const mockYamlString = 'user_profile:\n  basic_info:\n    age_group: "30-40"';
      YAMLUtils.stringify.mockReturnValue(mockYamlString);

      const result = surveyYAMLService.exportSurveyToYAML(mockSurveyData);

      expect(YAMLUtils.stringify).toHaveBeenCalledWith(
        expect.objectContaining({
          user_profile: expect.objectContaining({
            basic_info: expect.objectContaining({
              age_group: '30-40',
              experience_level: 'intermediate',
              occupation: '会社員'
            }),
            risk_assessment: expect.objectContaining({
              risk_tolerance: 'moderate'
            }),
            investment_goals: expect.objectContaining({
              primary_goal: 'growth'
            }),
            financial_situation: expect.objectContaining({
              monthly_investment: 100000
            }),
            preferences: expect.objectContaining({
              preferred_markets: ['US', 'JP'],
              values_based_investing: ['ESG投資'],
              concerns: ['インフレリスク']
            }),
            metadata: expect.objectContaining({
              survey_completed_at: expect.any(String),
              survey_version: '1.0',
              data_source: 'ai_advisor_survey',
              custom_responses: expect.objectContaining({
                step0_free_text: '基本情報の補足',
                ideal_portfolio: '米国株50%、日本株30%、債券20%'
              })
            })
          })
        })
      );

      expect(result).toBe(mockYamlString);
    });

    it('YAMLUtils.stringify エラーを適切にハンドリングする', () => {
      YAMLUtils.stringify.mockImplementation(() => {
        throw new Error('stringify error');
      });

      expect(() => surveyYAMLService.exportSurveyToYAML(mockSurveyData))
        .toThrow(SurveyYAMLError);
    });
  });

  describe('importYAMLToSurvey', () => {
    const mockYamlString = `
user_profile:
  basic_info:
    age_group: "30-40"
    experience_level: "intermediate"
    occupation: "会社員"
  risk_assessment:
    risk_tolerance: "moderate"
  investment_goals:
    primary_goal: "growth"
  financial_situation:
    monthly_investment: 100000
  preferences:
    preferred_markets: ["US", "JP"]
`;

    const mockParsedData = {
      user_profile: {
        basic_info: {
          age_group: '30-40',
          experience_level: 'intermediate',
          occupation: '会社員'
        },
        risk_assessment: {
          risk_tolerance: 'moderate'
        },
        investment_goals: {
          primary_goal: 'growth'
        },
        financial_situation: {
          monthly_investment: 100000
        },
        preferences: {
          preferred_markets: ['US', 'JP']
        }
      }
    };

    it('YAMLを正しくアンケートデータに変換する', () => {
      YAMLUtils.parse.mockReturnValue(mockParsedData);
      validateUserProfile.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      const result = surveyYAMLService.importYAMLToSurvey(mockYamlString);

      expect(YAMLUtils.parse).toHaveBeenCalledWith(mockYamlString);
      expect(validateUserProfile).toHaveBeenCalledWith(mockParsedData);
      
      expect(result).toMatchObject({
        age: 35, // age_group '30-40' の中央値
        occupation: '会社員',
        investmentExperience: '少し経験がある', // intermediate のマッピング
        riskTolerance: 'バランス重視', // moderate のマッピング
        monthlyInvestment: '100000',
        targetMarkets: ['US', 'JP'],
        importedAt: expect.any(String),
        dataSource: 'yaml_import'
      });
    });

    it('バリデーションエラーでSurveyYAMLErrorを投げる', () => {
      YAMLUtils.parse.mockReturnValue(mockParsedData);
      validateUserProfile.mockReturnValue({
        isValid: false,
        errors: [{ message: 'バリデーションエラー' }],
        warnings: []
      });

      expect(() => surveyYAMLService.importYAMLToSurvey(mockYamlString))
        .toThrow(SurveyYAMLError);
    });

    it('YAML解析エラーを適切にハンドリングする', () => {
      YAMLUtils.parse.mockImplementation(() => {
        throw new Error('parse error');
      });

      expect(() => surveyYAMLService.importYAMLToSurvey(mockYamlString))
        .toThrow(SurveyYAMLError);
    });
  });

  describe('マッピング関数群', () => {
    describe('mapAgeToAgeGroup', () => {
      it('年齢を正しい年齢層にマップする', () => {
        expect(surveyYAMLService.mapAgeToAgeGroup(25)).toBe('20-30');
        expect(surveyYAMLService.mapAgeToAgeGroup(35)).toBe('30-40');
        expect(surveyYAMLService.mapAgeToAgeGroup(45)).toBe('40-50');
        expect(surveyYAMLService.mapAgeToAgeGroup(55)).toBe('50-60');
        expect(surveyYAMLService.mapAgeToAgeGroup(65)).toBe('60+');
      });
    });

    describe('mapAgeGroupToAge', () => {
      it('年齢層を代表年齢にマップする', () => {
        expect(surveyYAMLService.mapAgeGroupToAge('20-30')).toBe(25);
        expect(surveyYAMLService.mapAgeGroupToAge('30-40')).toBe(35);
        expect(surveyYAMLService.mapAgeGroupToAge('40-50')).toBe(45);
        expect(surveyYAMLService.mapAgeGroupToAge('50-60')).toBe(55);
        expect(surveyYAMLService.mapAgeGroupToAge('60+')).toBe(65);
        expect(surveyYAMLService.mapAgeGroupToAge('unknown')).toBe(35); // デフォルト
      });
    });

    describe('mapInvestmentExperience', () => {
      it('投資経験を正しくマップする', () => {
        expect(surveyYAMLService.mapInvestmentExperience('投資未経験')).toBe('beginner');
        expect(surveyYAMLService.mapInvestmentExperience('少し経験がある')).toBe('intermediate');
        expect(surveyYAMLService.mapInvestmentExperience('経験豊富')).toBe('advanced');
        expect(surveyYAMLService.mapInvestmentExperience('beginner')).toBe('beginner');
        expect(surveyYAMLService.mapInvestmentExperience('unknown')).toBe('beginner'); // デフォルト
      });
    });

    describe('mapRiskTolerance', () => {
      it('リスク許容度を正しくマップする', () => {
        expect(surveyYAMLService.mapRiskTolerance('安全重視')).toBe('conservative');
        expect(surveyYAMLService.mapRiskTolerance('バランス重視')).toBe('moderate');
        expect(surveyYAMLService.mapRiskTolerance('成長重視')).toBe('aggressive');
        expect(surveyYAMLService.mapRiskTolerance('conservative')).toBe('conservative');
        expect(surveyYAMLService.mapRiskTolerance('unknown')).toBe('moderate'); // デフォルト
      });
    });

    describe('mapPrimaryGoal', () => {
      it('主要目標を正しくマップする', () => {
        expect(surveyYAMLService.mapPrimaryGoal('安定した資産保全')).toBe('preservation');
        expect(surveyYAMLService.mapPrimaryGoal('配当収入を重視')).toBe('income');
        expect(surveyYAMLService.mapPrimaryGoal('資産成長を重視')).toBe('growth');
        expect(surveyYAMLService.mapPrimaryGoal('短期利益を追求')).toBe('speculation');
        expect(surveyYAMLService.mapPrimaryGoal('その他')).toBe('growth'); // デフォルト
      });
    });

    describe('inferLossTolerance', () => {
      it('リスク許容度から損失許容率を推定する', () => {
        expect(surveyYAMLService.inferLossTolerance('安全重視')).toBe(5);
        expect(surveyYAMLService.inferLossTolerance('バランス重視')).toBe(15);
        expect(surveyYAMLService.inferLossTolerance('成長重視')).toBe(30);
        expect(surveyYAMLService.inferLossTolerance('conservative')).toBe(5);
        expect(surveyYAMLService.inferLossTolerance('unknown')).toBe(15); // デフォルト
      });
    });

    describe('parseMonthlyInvestment', () => {
      it('月次投資額を正しく解析する', () => {
        expect(surveyYAMLService.parseMonthlyInvestment('100000')).toBe(100000);
        expect(surveyYAMLService.parseMonthlyInvestment('10万円')).toBe(10);
        expect(surveyYAMLService.parseMonthlyInvestment('50,000')).toBe(50000);
        expect(surveyYAMLService.parseMonthlyInvestment('')).toBe(null);
        expect(surveyYAMLService.parseMonthlyInvestment(null)).toBe(null);
        expect(surveyYAMLService.parseMonthlyInvestment('abc')).toBe(null);
      });
    });
  });

  describe('transformSurveyToUserProfile', () => {
    const mockSurveyData = {
      age: 35,
      occupation: '会社員',
      familyStatus: '独身',
      dream: '資産成長を重視',
      targetMarkets: ['US', 'JP'],
      investmentExperience: '少し経験がある',
      riskTolerance: 'バランス重視',
      monthlyInvestment: '100000',
      values: ['ESG投資'],
      concerns: ['インフレリスク'],
      idealPortfolio: '米国株中心',
      currentAssetsDescription: '預金のみ'
    };

    it('アンケートデータをuser_profileフォーマットに変換する', () => {
      const result = surveyYAMLService.transformSurveyToUserProfile(mockSurveyData);

      expect(result).toMatchObject({
        user_profile: {
          basic_info: {
            age_group: '30-40',
            experience_level: 'intermediate',
            investment_period: 'long_term',
            occupation: '会社員',
            family_status: '独身'
          },
          risk_assessment: {
            risk_tolerance: 'moderate',
            loss_tolerance_percentage: 15,
            volatility_comfort: 'medium'
          },
          investment_goals: {
            primary_goal: 'growth',
            target_return: 6,
            investment_horizon: 30,
            specific_goals: expect.arrayContaining(['資産成長を重視'])
          },
          financial_situation: {
            monthly_investment: 100000,
            emergency_fund_months: 6
          },
          preferences: {
            preferred_markets: ['US', 'JP'],
            values_based_investing: ['ESG投資'],
            concerns: ['インフレリスク']
          },
          metadata: {
            survey_completed_at: expect.any(String),
            survey_version: '1.0',
            data_source: 'ai_advisor_survey',
            custom_responses: expect.objectContaining({
              ideal_portfolio: '米国株中心',
              current_assets_description: '預金のみ'
            })
          }
        }
      });
    });
  });

  describe('transformUserProfileToSurvey', () => {
    const mockUserProfile = {
      basic_info: {
        age_group: '30-40',
        experience_level: 'intermediate',
        occupation: '会社員',
        family_status: '独身'
      },
      risk_assessment: {
        risk_tolerance: 'moderate'
      },
      investment_goals: {
        primary_goal: 'growth'
      },
      financial_situation: {
        monthly_investment: 100000
      },
      preferences: {
        preferred_markets: ['US', 'JP'],
        values_based_investing: ['ESG投資'],
        concerns: ['インフレリスク']
      },
      metadata: {
        custom_responses: {
          ideal_portfolio: '米国株中心',
          current_assets_description: '預金のみ'
        }
      }
    };

    it('user_profileをアンケートデータに変換する', () => {
      const result = surveyYAMLService.transformUserProfileToSurvey(mockUserProfile);

      expect(result).toMatchObject({
        age: 35,
        occupation: '会社員',
        familyStatus: '独身',
        dream: '資産成長を重視',
        targetMarkets: ['US', 'JP'],
        investmentExperience: '少し経験がある',
        riskTolerance: 'バランス重視',
        monthlyInvestment: '100000',
        values: ['ESG投資'],
        concerns: ['インフレリスク'],
        idealPortfolio: '米国株中心',
        currentAssetsDescription: '預金のみ',
        importedAt: expect.any(String),
        dataSource: 'yaml_import'
      });
    });
  });

  describe('validateSurveyData', () => {
    const validSurveyData = {
      age: 35,
      investmentExperience: '少し経験がある',
      riskTolerance: 'バランス重視',
      monthlyInvestment: '50000',
      targetMarkets: ['US', 'JP']
    };

    it('有効なアンケートデータを通す', () => {
      const result = surveyYAMLService.validateSurveyData(validSurveyData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.completeness).toBeGreaterThan(0);
    });

    it('無効な年齢でエラーを返す', () => {
      const invalidData = { ...validSurveyData, age: 10 };
      const result = surveyYAMLService.validateSurveyData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('有効な年齢'))).toBe(true);
    });

    it('必須フィールドが無い場合エラーを返す', () => {
      const incompleteData = { age: 35 }; // 他の必須フィールドが無い
      const result = surveyYAMLService.validateSurveyData(incompleteData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('警告を適切に生成する', () => {
      const dataWithWarnings = {
        age: 35,
        investmentExperience: '少し経験がある',
        riskTolerance: 'バランス重視'
        // monthlyInvestment と targetMarkets が無い
      };

      const result = surveyYAMLService.validateSurveyData(dataWithWarnings);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('月次投資額'))).toBe(true);
      expect(result.warnings.some(w => w.includes('投資対象市場'))).toBe(true);
    });
  });

  describe('calculateCompleteness', () => {
    it('完成度を正しく計算する', () => {
      const fullData = {
        age: 35,
        occupation: '会社員',
        familyStatus: '独身',
        dream: '成長重視',
        investmentExperience: '中級',
        riskTolerance: 'バランス',
        monthlyInvestment: '50000',
        targetMarkets: ['US'],
        values: ['ESG'],
        concerns: ['リスク'],
        idealPortfolio: '分散投資',
        currentAssetsDescription: '預金'
      };

      const completeness = surveyYAMLService.calculateCompleteness(fullData);
      expect(completeness).toBe(100);

      const partialData = {
        age: 35,
        investmentExperience: '中級',
        riskTolerance: 'バランス'
      };

      const partialCompleteness = surveyYAMLService.calculateCompleteness(partialData);
      expect(partialCompleteness).toBeLessThan(50);
    });
  });

  describe('エラーハンドリング', () => {
    it('SurveyYAMLError が適切なプロパティを持つ', () => {
      const error = new SurveyYAMLError('Test message', 'TEST_TYPE', { detail: 'test' });

      expect(error.name).toBe('SurveyYAMLError');
      expect(error.message).toBe('Test message');
      expect(error.type).toBe('TEST_TYPE');
      expect(error.details).toEqual({ detail: 'test' });
    });

    it('デフォルト値が正しく設定される', () => {
      const error = new SurveyYAMLError('Test message');

      expect(error.type).toBe('SURVEY_YAML_ERROR');
      expect(error.details).toBe(null);
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量のデータを効率的に処理する', () => {
      const largeData = {
        age: 35,
        investmentExperience: '中級',
        riskTolerance: 'バランス',
        values: Array.from({ length: 100 }, (_, i) => `value_${i}`),
        concerns: Array.from({ length: 100 }, (_, i) => `concern_${i}`)
      };

      YAMLUtils.stringify.mockReturnValue('large_yaml_string');

      const startTime = Date.now();
      const result = surveyYAMLService.exportSurveyToYAML(largeData);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
      expect(result).toBeDefined();
    });
  });
});