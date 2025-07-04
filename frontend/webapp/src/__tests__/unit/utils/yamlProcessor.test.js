/**
 * yamlProcessor.js のユニットテスト
 * YAML処理の基盤モジュールのテスト
 */

import YAMLUtils, { 
  parseYAMLSafely, 
  stringifyToYAML, 
  detectYAMLDataType, 
  generateYAMLMetadata,
  performBasicYAMLHealthCheck,
  YAMLProcessingError 
} from '../../../utils/yamlProcessor';

describe('yamlProcessor', () => {
  describe('parseYAMLSafely', () => {
    it('有効なYAML文字列を正しく解析する', () => {
      const yamlString = `
portfolio_data:
  metadata:
    total_assets: 1000000
    currency: "JPY"
  holdings:
    - symbol: "VTI"
      name: "Vanguard Total Stock Market ETF"
      quantity: 10
`;
      const result = parseYAMLSafely(yamlString);
      
      expect(result).toBeDefined();
      expect(result.portfolio_data).toBeDefined();
      expect(result.portfolio_data.metadata.total_assets).toBe(1000000);
      expect(result.portfolio_data.metadata.currency).toBe('JPY');
      expect(result.portfolio_data.holdings).toHaveLength(1);
      expect(result.portfolio_data.holdings[0].symbol).toBe('VTI');
    });

    it('空文字列や無効な入力でエラーを投げる', () => {
      expect(() => parseYAMLSafely('')).toThrow(YAMLProcessingError);
      expect(() => parseYAMLSafely(null)).toThrow(YAMLProcessingError);
      expect(() => parseYAMLSafely(undefined)).toThrow(YAMLProcessingError);
      expect(() => parseYAMLSafely(123)).toThrow(YAMLProcessingError);
    });

    it('無効なYAML構文でエラーを投げる', () => {
      const invalidYaml = `
portfolio_data:
  metadata:
    total_assets: 1000000
  - invalid_structure
    - nested: error
`;
      expect(() => parseYAMLSafely(invalidYaml)).toThrow(YAMLProcessingError);
    });

    it('非オブジェクトの結果でエラーを投げる', () => {
      const primitiveYaml = '42';
      expect(() => parseYAMLSafely(primitiveYaml)).toThrow(YAMLProcessingError);
    });
  });

  describe('stringifyToYAML', () => {
    it('オブジェクトを正しくYAML文字列に変換する', () => {
      const data = {
        portfolio_data: {
          metadata: {
            total_assets: 1000000,
            currency: 'JPY'
          },
          holdings: [
            {
              symbol: 'VTI',
              name: 'Vanguard Total Stock Market ETF',
              quantity: 10
            }
          ]
        }
      };

      const yamlString = stringifyToYAML(data);
      
      expect(yamlString).toContain('portfolio_data:');
      expect(yamlString).toContain('total_assets: 1000000');
      expect(yamlString).toContain('currency: JPY');
      expect(yamlString).toContain('symbol: VTI');
    });

    it('無効なデータでエラーを投げる', () => {
      expect(() => stringifyToYAML(null)).toThrow(YAMLProcessingError);
      expect(() => stringifyToYAML(undefined)).toThrow(YAMLProcessingError);
      expect(() => stringifyToYAML('string')).toThrow(YAMLProcessingError);
      expect(() => stringifyToYAML(123)).toThrow(YAMLProcessingError);
    });

    it('循環参照のあるオブジェクトでエラーを投げる', () => {
      const circular = { a: 1 };
      circular.self = circular;
      
      expect(() => stringifyToYAML(circular)).toThrow(YAMLProcessingError);
    });
  });

  describe('detectYAMLDataType', () => {
    it('ポートフォリオデータを正しく検出する', () => {
      const portfolioData = {
        portfolio_data: {
          metadata: { total_assets: 1000000 },
          holdings: []
        }
      };
      
      expect(detectYAMLDataType(portfolioData)).toBe('portfolio');
    });

    it('ユーザープロファイルを正しく検出する', () => {
      const userProfileData = {
        user_profile: {
          basic_info: { age_group: '30-40' },
          risk_assessment: { risk_tolerance: 'moderate' }
        }
      };
      
      expect(detectYAMLDataType(userProfileData)).toBe('user_profile');
    });

    it('アプリ設定を正しく検出する', () => {
      const appConfigData = {
        app_config: {
          display: { default_currency: 'JPY' },
          features: { ai_analysis: true }
        }
      };
      
      expect(detectYAMLDataType(appConfigData)).toBe('app_config');
    });

    it('配分テンプレートを正しく検出する', () => {
      const allocationTemplatesData = {
        allocation_templates: {
          conservative: {
            name: '保守的ポートフォリオ',
            allocations: []
          }
        }
      };
      
      expect(detectYAMLDataType(allocationTemplatesData)).toBe('allocation_templates');
    });

    it('複合データを正しく検出する', () => {
      const compositeData = {
        portfolio_data: { metadata: {} },
        user_profile: { basic_info: {} }
      };
      
      expect(detectYAMLDataType(compositeData)).toBe('composite');
    });

    it('未知のデータタイプを返す', () => {
      const unknownData = { random_data: { value: 123 } };
      expect(detectYAMLDataType(unknownData)).toBe('unknown');
      expect(detectYAMLDataType(null)).toBe('unknown');
      expect(detectYAMLDataType(undefined)).toBe('unknown');
      expect(detectYAMLDataType('string')).toBe('unknown');
    });
  });

  describe('generateYAMLMetadata', () => {
    it('有効なメタデータを生成する', () => {
      const yamlString = `
portfolio_data:
  metadata:
    total_assets: 1000000
  holdings: []
`;
      const parsedData = { portfolio_data: { metadata: { total_assets: 1000000 }, holdings: [] } };
      
      const metadata = generateYAMLMetadata(yamlString, parsedData);
      
      expect(metadata).toHaveProperty('dataType', 'portfolio');
      expect(metadata).toHaveProperty('lineCount');
      expect(metadata).toHaveProperty('sizeInBytes');
      expect(metadata).toHaveProperty('sizeInKB');
      expect(metadata).toHaveProperty('processedAt');
      expect(metadata).toHaveProperty('hasValidStructure', true);
      expect(typeof metadata.lineCount).toBe('number');
      expect(typeof metadata.sizeInBytes).toBe('number');
      expect(typeof metadata.sizeInKB).toBe('number');
      expect(metadata.lineCount).toBeGreaterThan(0);
      expect(metadata.sizeInBytes).toBeGreaterThan(0);
    });
  });

  describe('performBasicYAMLHealthCheck', () => {
    it('健全なデータに対して正常な結果を返す', () => {
      const healthyData = {
        portfolio_data: {
          metadata: {
            total_assets: 1000000,
            currency: 'JPY'
          },
          holdings: [
            {
              symbol: 'VTI',
              name: 'Vanguard ETF',
              quantity: 10
            }
          ]
        }
      };
      
      const healthCheck = performBasicYAMLHealthCheck(healthyData);
      
      expect(healthCheck.isHealthy).toBe(true);
      expect(healthCheck.issues).toHaveLength(0);
      expect(healthCheck.metadata).toBeDefined();
      expect(healthCheck.metadata.maxNestingDepth).toBeGreaterThan(0);
      expect(healthCheck.metadata.totalKeys).toBeGreaterThan(0);
      expect(['simple', 'moderate', 'complex']).toContain(healthCheck.metadata.estimatedComplexity);
    });

    it('null値を含むデータに警告を出す', () => {
      const dataWithNulls = {
        portfolio_data: {
          metadata: {
            total_assets: null,
            currency: 'JPY'
          }
        }
      };
      
      const healthCheck = performBasicYAMLHealthCheck(dataWithNulls);
      
      expect(healthCheck.warnings.length).toBeGreaterThan(0);
      expect(healthCheck.warnings.some(w => w.includes('null値'))).toBe(true);
    });

    it('非常に深いネストに警告を出す', () => {
      const deepData = { a: { b: { c: { d: { e: { f: { g: { h: { i: { j: { k: { l: 'deep' } } } } } } } } } } } };
      
      const healthCheck = performBasicYAMLHealthCheck(deepData);
      
      expect(healthCheck.warnings.some(w => w.includes('深いネスト'))).toBe(true);
    });

    it('処理エラーを適切にハンドリングする', () => {
      // 循環参照を作成してエラーを誘発
      const circular = { a: 1 };
      circular.self = circular;
      
      const healthCheck = performBasicYAMLHealthCheck(circular);
      
      expect(healthCheck.isHealthy).toBe(false);
      expect(healthCheck.issues.length).toBeGreaterThan(0);
    });
  });

  describe('YAMLUtils オブジェクト', () => {
    it('すべての必要なメソッドを提供する', () => {
      expect(YAMLUtils).toHaveProperty('parse');
      expect(YAMLUtils).toHaveProperty('stringify');
      expect(YAMLUtils).toHaveProperty('detectType');
      expect(YAMLUtils).toHaveProperty('generateMetadata');
      expect(YAMLUtils).toHaveProperty('healthCheck');
      
      expect(typeof YAMLUtils.parse).toBe('function');
      expect(typeof YAMLUtils.stringify).toBe('function');
      expect(typeof YAMLUtils.detectType).toBe('function');
      expect(typeof YAMLUtils.generateMetadata).toBe('function');
      expect(typeof YAMLUtils.healthCheck).toBe('function');
    });

    it('メソッドが正しく動作する', () => {
      const testData = { test: 'data' };
      const yamlString = YAMLUtils.stringify(testData);
      const parsed = YAMLUtils.parse(yamlString);
      
      expect(parsed).toEqual(testData);
    });
  });

  describe('エラーハンドリング', () => {
    it('YAMLProcessingError が適切なプロパティを持つ', () => {
      const error = new YAMLProcessingError('Test message', 'TEST_TYPE', { detail: 'test' });
      
      expect(error.name).toBe('YAMLProcessingError');
      expect(error.message).toBe('Test message');
      expect(error.type).toBe('TEST_TYPE');
      expect(error.details).toEqual({ detail: 'test' });
    });
  });

  describe('パフォーマンステスト', () => {
    it('大きなデータセットを適切に処理する', () => {
      const largeData = {
        portfolio_data: {
          metadata: { total_assets: 1000000 },
          holdings: Array.from({ length: 100 }, (_, i) => ({
            symbol: `STOCK${i}`,
            name: `Stock ${i}`,
            quantity: Math.random() * 100,
            current_price: Math.random() * 200
          }))
        }
      };
      
      const startTime = Date.now();
      const yamlString = stringifyToYAML(largeData);
      const parsed = parseYAMLSafely(yamlString);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
      expect(parsed.portfolio_data.holdings).toHaveLength(100);
    });
  });
});