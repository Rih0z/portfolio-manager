/**
 * yamlValidators.js のユニットテスト
 * YAML データバリデーション機能のテスト
 */

import {
  validatePortfolioData,
  validateUserProfile,
  validateAppConfig,
  validateAllocationTemplates,
  validateCompositeData,
  validateYAMLData,
  ValidationError,
  ValidationFunctionMap
} from '../../../utils/yamlValidators';

describe('yamlValidators', () => {
  describe('validatePortfolioData', () => {
    const validPortfolioData = {
      portfolio_data: {
        metadata: {
          total_assets: 1000000,
          currency: 'JPY',
          last_updated: '2025-01-03',
          monthly_investment: 50000,
          exchange_rate_usd_jpy: 150.0
        },
        holdings: [
          {
            symbol: 'VTI',
            name: 'Vanguard Total Stock Market ETF',
            type: 'ETF',
            market: 'US',
            quantity: 10,
            average_cost: 200.0,
            current_price: 210.0,
            currency: 'USD',
            current_value: 2100.0,
            allocation_percentage: 30.0,
            target_percentage: 35.0
          }
        ],
        target_allocation: [
          {
            asset_class: 'US_Stocks',
            target_percentage: 50.0
          },
          {
            asset_class: 'JP_Stocks',
            target_percentage: 30.0
          },
          {
            asset_class: 'Bonds',
            target_percentage: 20.0
          }
        ]
      }
    };

    it('有効なポートフォリオデータを通す', () => {
      const result = validatePortfolioData(validPortfolioData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('無効なデータでエラーを返す', () => {
      const result = validatePortfolioData(null);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('ポートフォリオデータが無効');
    });

    it('portfolio_data セクションが無い場合エラーを返す', () => {
      const invalidData = { other_data: {} };
      const result = validatePortfolioData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('portfolio_data セクションが必要'))).toBe(true);
    });

    it('無効なメタデータでエラーを返す', () => {
      const invalidData = {
        portfolio_data: {
          metadata: {
            total_assets: -1000, // 負の値
            currency: 'INVALID', // 無効な通貨
            last_updated: 'invalid-date' // 無効な日付形式
          },
          holdings: []
        }
      };
      
      const result = validatePortfolioData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('無効な保有資産でエラーを返す', () => {
      const invalidData = {
        portfolio_data: {
          metadata: {
            total_assets: 1000000,
            currency: 'JPY'
          },
          holdings: [
            {
              symbol: '', // 空のシンボル
              name: 'Test',
              type: 'INVALID_TYPE', // 無効なタイプ
              market: 'INVALID_MARKET', // 無効な市場
              quantity: -10, // 負の数量
              average_cost: 0,
              current_price: -100, // 負の価格
              currency: 'INVALID_CURRENCY'
            }
          ]
        }
      };
      
      const result = validatePortfolioData(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('配分比率の合計が100%でない場合警告を出す', () => {
      const dataWithIncorrectAllocation = {
        portfolio_data: {
          metadata: { total_assets: 1000000, currency: 'JPY' },
          holdings: [
            {
              symbol: 'VTI',
              name: 'Test',
              type: 'ETF',
              market: 'US',
              quantity: 10,
              average_cost: 100,
              current_price: 110,
              currency: 'USD',
              current_value: 1100,
              allocation_percentage: 50.0 // 合計が100%にならない
            }
          ],
          target_allocation: [
            {
              asset_class: 'US_Stocks',
              target_percentage: 60.0 // 合計が100%にならない
            },
            {
              asset_class: 'Bonds',
              target_percentage: 30.0
            }
          ]
        }
      };
      
      const result = validatePortfolioData(dataWithIncorrectAllocation);
      
      expect(result.warnings.some(w => w.message.includes('配分比率'))).toBe(true);
    });
  });

  describe('validateUserProfile', () => {
    const validUserProfile = {
      user_profile: {
        basic_info: {
          age_group: '30-40',
          experience_level: 'intermediate',
          investment_period: 'long_term'
        },
        risk_assessment: {
          risk_tolerance: 'moderate',
          loss_tolerance_percentage: 20,
          volatility_comfort: 'medium'
        },
        investment_goals: {
          primary_goal: 'growth',
          target_return: 7.0
        },
        financial_situation: {
          monthly_investment: 100000,
          emergency_fund_months: 6
        },
        preferences: {
          preferred_markets: ['US', 'JP'],
          sector_preferences: ['Technology', 'Healthcare']
        }
      }
    };

    it('有効なユーザープロファイルを通す', () => {
      const result = validateUserProfile(validUserProfile);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('user_profile セクションが無い場合エラーを返す', () => {
      const invalidData = { other_data: {} };
      const result = validateUserProfile(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('user_profile セクションが必要'))).toBe(true);
    });

    it('必須セクションが無い場合エラーを返す', () => {
      const incompleteData = {
        user_profile: {
          // basic_info が無い
          risk_assessment: {
            risk_tolerance: 'moderate'
          }
        }
      };
      
      const result = validateUserProfile(incompleteData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('basic_info セクションが必要'))).toBe(true);
    });

    it('無効な列挙値でエラーを返す', () => {
      const invalidData = {
        user_profile: {
          basic_info: {
            age_group: 'invalid-age',
            experience_level: 'invalid-level',
            investment_period: 'invalid-period'
          },
          risk_assessment: {
            risk_tolerance: 'invalid-tolerance',
            volatility_comfort: 'invalid-comfort'
          },
          investment_goals: {
            primary_goal: 'invalid-goal'
          }
        }
      };
      
      const result = validateUserProfile(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('範囲外の数値でエラーを返す', () => {
      const invalidData = {
        user_profile: {
          basic_info: { age_group: '30-40' },
          risk_assessment: {
            risk_tolerance: 'moderate',
            loss_tolerance_percentage: 150 // 100%を超える
          },
          investment_goals: {
            target_return: 100 // 非現実的に高い
          }
        }
      };
      
      const result = validateUserProfile(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateAppConfig', () => {
    const validAppConfig = {
      app_config: {
        display: {
          default_currency: 'JPY',
          decimal_places: 2
        },
        data_sources: {
          primary_api: 'yahoo_finance',
          backup_apis: ['alpaca', 'alpha_vantage']
        },
        features: {
          ai_analysis: true,
          real_time_data: false,
          multi_currency: true,
          cloud_sync: true
        }
      }
    };

    it('有効なアプリ設定を通す', () => {
      const result = validateAppConfig(validAppConfig);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('無効なAPIでエラーを返す', () => {
      const invalidData = {
        app_config: {
          data_sources: {
            primary_api: 'invalid_api',
            backup_apis: ['invalid_api1', 'invalid_api2']
          }
        }
      };
      
      const result = validateAppConfig(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('無効な機能設定でエラーを返す', () => {
      const invalidData = {
        app_config: {
          features: {
            ai_analysis: 'not_boolean',
            real_time_data: 123
          }
        }
      };
      
      const result = validateAppConfig(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateAllocationTemplates', () => {
    const validAllocationTemplates = {
      allocation_templates: {
        conservative: {
          name: '保守的ポートフォリオ',
          allocations: [
            {
              asset_class: 'Bonds',
              percentage: 60
            },
            {
              asset_class: 'US_Stocks',
              percentage: 25
            },
            {
              asset_class: 'JP_Stocks',
              percentage: 15
            }
          ]
        },
        balanced: {
          name: 'バランス型ポートフォリオ',
          allocations: [
            {
              asset_class: 'US_Stocks',
              percentage: 40
            },
            {
              asset_class: 'JP_Stocks',
              percentage: 30
            },
            {
              asset_class: 'Bonds',
              percentage: 30
            }
          ]
        }
      }
    };

    it('有効な配分テンプレートを通す', () => {
      const result = validateAllocationTemplates(validAllocationTemplates);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('配分比率の合計が100%でない場合エラーを返す', () => {
      const invalidData = {
        allocation_templates: {
          invalid_template: {
            name: '無効なテンプレート',
            allocations: [
              {
                asset_class: 'US_Stocks',
                percentage: 60
              },
              {
                asset_class: 'Bonds',
                percentage: 30
              }
              // 合計90%で100%にならない
            ]
          }
        }
      };
      
      const result = validateAllocationTemplates(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('100%'))).toBe(true);
    });
  });

  describe('validateCompositeData', () => {
    it('複数のデータタイプを含む複合データを検証する', () => {
      const compositeData = {
        portfolio_data: {
          metadata: { total_assets: 1000000, currency: 'JPY' },
          holdings: []
        },
        user_profile: {
          basic_info: { age_group: '30-40' },
          risk_assessment: { risk_tolerance: 'moderate' },
          investment_goals: { primary_goal: 'growth' }
        }
      };
      
      const result = validateCompositeData(compositeData);
      
      expect(result.isValid).toBe(true);
    });

    it('有効なデータセクションが無い場合エラーを返す', () => {
      const emptyData = { random_data: {} };
      const result = validateCompositeData(emptyData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('有効なデータセクション'))).toBe(true);
    });
  });

  describe('validateYAMLData', () => {
    it('データタイプに応じた適切なバリデーターを呼び出す', () => {
      const portfolioData = {
        portfolio_data: {
          metadata: { total_assets: 1000000, currency: 'JPY' },
          holdings: []
        }
      };
      
      const result = validateYAMLData(portfolioData, 'portfolio');
      
      expect(result.isValid).toBe(true);
    });

    it('未対応のデータタイプでエラーを返す', () => {
      const data = { test: 'data' };
      const result = validateYAMLData(data, 'unknown_type');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('未対応のデータタイプ'))).toBe(true);
    });
  });

  describe('ValidationFunctionMap', () => {
    it('すべての必要なバリデーション関数を含む', () => {
      expect(ValidationFunctionMap).toHaveProperty('portfolio');
      expect(ValidationFunctionMap).toHaveProperty('user_profile');
      expect(ValidationFunctionMap).toHaveProperty('app_config');
      expect(ValidationFunctionMap).toHaveProperty('allocation_templates');
      expect(ValidationFunctionMap).toHaveProperty('composite');
      
      expect(typeof ValidationFunctionMap.portfolio).toBe('function');
      expect(typeof ValidationFunctionMap.user_profile).toBe('function');
      expect(typeof ValidationFunctionMap.app_config).toBe('function');
      expect(typeof ValidationFunctionMap.allocation_templates).toBe('function');
      expect(typeof ValidationFunctionMap.composite).toBe('function');
    });
  });

  describe('ValidationError', () => {
    it('適切なプロパティを持つ', () => {
      const error = new ValidationError('Test message', 'test_field', 'test_value', 'TEST_TYPE');
      
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Test message');
      expect(error.field).toBe('test_field');
      expect(error.value).toBe('test_value');
      expect(error.type).toBe('TEST_TYPE');
    });

    it('デフォルト値が正しく設定される', () => {
      const error = new ValidationError('Test message');
      
      expect(error.field).toBe(null);
      expect(error.value).toBe(null);
      expect(error.type).toBe('VALIDATION_ERROR');
    });
  });

  describe('エッジケースとパフォーマンス', () => {
    it('大量のデータを効率的に処理する', () => {
      const largePortfolioData = {
        portfolio_data: {
          metadata: { total_assets: 1000000, currency: 'JPY' },
          holdings: Array.from({ length: 1000 }, (_, i) => ({
            symbol: `STOCK${i}`,
            name: `Stock ${i}`,
            type: 'Stock',
            market: 'US',
            quantity: 10,
            average_cost: 100,
            current_price: 110,
            currency: 'USD',
            current_value: 1100,
            allocation_percentage: 0.1
          }))
        }
      };
      
      const startTime = Date.now();
      const result = validatePortfolioData(largePortfolioData);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(2000); // 2秒以内
      expect(result).toBeDefined();
    });

    it('null や undefined 値を適切に処理する', () => {
      const dataWithNulls = {
        portfolio_data: {
          metadata: {
            total_assets: null,
            currency: undefined,
            last_updated: ''
          },
          holdings: []
        }
      };
      
      const result = validatePortfolioData(dataWithNulls);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});