/**
 * portfolio.types.js のユニットテスト
 * ポートフォリオ関連の型定義のテスト
 */

import portfolioTypes from '../../../types/portfolio.types';

describe('portfolio.types', () => {
  describe('モジュールの実行', () => {
    it('モジュールが正常に読み込まれる', () => {
      // モジュールを明示的に要求して実行を確認
      const module = require('../../../types/portfolio.types');
      expect(module).toBeDefined();
      expect(module.default).toBeDefined();
    });
  });

  describe('デフォルトエクスポート', () => {
    it('デフォルトエクスポートが存在する', () => {
      expect(portfolioTypes).toBeDefined();
    });

    it('デフォルトエクスポートがオブジェクトである', () => {
      expect(typeof portfolioTypes).toBe('object');
      expect(portfolioTypes).not.toBeNull();
    });

    it('デフォルトエクスポートが空オブジェクトである', () => {
      expect(portfolioTypes).toEqual({});
      expect(Object.keys(portfolioTypes)).toHaveLength(0);
    });

    it('デフォルトエクスポートに対して安全にプロパティアクセスできる', () => {
      expect(() => {
        portfolioTypes.someProperty;
      }).not.toThrow();
      
      expect(portfolioTypes.someProperty).toBeUndefined();
    });
  });

  describe('型定義の存在確認', () => {
    it('ファイルがJSDocコメントを含んでいる', async () => {
      // ファイルの内容を読み込んで@typedefが含まれていることを確認
      const fs = require('fs');
      const path = require('path');
      const filePath = path.resolve(__dirname, '../../../types/portfolio.types.js');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      expect(fileContent).toContain('@typedef');
      expect(fileContent).toContain('BaseAsset');
      expect(fileContent).toContain('Asset');
      expect(fileContent).toContain('TargetAllocation');
      expect(fileContent).toContain('ExchangeRate');
      expect(fileContent).toContain('AdditionalBudget');
      expect(fileContent).toContain('Notification');
      expect(fileContent).toContain('SimulationResult');
      expect(fileContent).toContain('ImportResult');
      expect(fileContent).toContain('ValidationChanges');
    });

    it('重要な型定義が含まれている', async () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.resolve(__dirname, '../../../types/portfolio.types.js');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // BaseAsset型の主要プロパティ
      expect(fileContent).toContain('id');
      expect(fileContent).toContain('ticker');
      expect(fileContent).toContain('name');
      expect(fileContent).toContain('price');
      expect(fileContent).toContain('holdings');
      expect(fileContent).toContain('currency');
      
      // Asset型の追加プロパティ
      expect(fileContent).toContain('fundType');
      expect(fileContent).toContain('annualFee');
      
      // ExchangeRate型のプロパティ
      expect(fileContent).toContain('rate');
      expect(fileContent).toContain('source');
      expect(fileContent).toContain('lastUpdated');
    });
  });

  describe('インポート動作', () => {
    it('ESモジュールとしてインポートできる', () => {
      expect(() => {
        const imported = require('../../../types/portfolio.types');
        expect(imported.default).toBeDefined();
      }).not.toThrow();
    });

    it('名前付きインポートは存在しない', () => {
      const module = require('../../../types/portfolio.types');
      
      // デフォルトエクスポートのみ存在する
      expect(module.default).toBeDefined();
      
      // その他のプロパティはundefined
      expect(module.BaseAsset).toBeUndefined();
      expect(module.Asset).toBeUndefined();
      expect(module.TargetAllocation).toBeUndefined();
    });

    it('異なるインポート方式でも同じオブジェクトを取得する', () => {
      const imported1 = require('../../../types/portfolio.types').default;
      const imported2 = require('../../../types/portfolio.types').default;
      
      expect(imported1).toEqual(imported2);
      expect(imported1).toBe(imported2); // 同じ参照
    });
  });

  describe('型安全性', () => {
    it('オブジェクトのプロパティを安全に設定できる', () => {
      expect(() => {
        portfolioTypes.testProperty = 'test';
      }).not.toThrow();
      
      expect(portfolioTypes.testProperty).toBe('test');
      
      // クリーンアップ
      delete portfolioTypes.testProperty;
    });

    it('プロパティの削除が可能', () => {
      portfolioTypes.tempProperty = 'temporary';
      expect(portfolioTypes.tempProperty).toBe('temporary');
      
      delete portfolioTypes.tempProperty;
      expect(portfolioTypes.tempProperty).toBeUndefined();
    });

    it('Object.keysで列挙できる', () => {
      const keys = Object.keys(portfolioTypes);
      expect(Array.isArray(keys)).toBe(true);
      expect(keys).toHaveLength(0); // 空オブジェクト
    });

    it('for...in ループが安全に動作する', () => {
      let propertyCount = 0;
      
      expect(() => {
        for (const key in portfolioTypes) {
          propertyCount++;
        }
      }).not.toThrow();
      
      expect(propertyCount).toBe(0); // 空オブジェクト
    });
  });

  describe('JSONシリアライゼーション', () => {
    it('JSON.stringifyで正しくシリアライズされる', () => {
      const jsonString = JSON.stringify(portfolioTypes);
      expect(jsonString).toBe('{}');
    });

    it('JSON.parseで復元できる', () => {
      const jsonString = JSON.stringify(portfolioTypes);
      const parsed = JSON.parse(jsonString);
      
      expect(parsed).toEqual(portfolioTypes);
      expect(typeof parsed).toBe('object');
    });
  });

  describe('プロトタイプチェーン', () => {
    it('Objectのプロトタイプを持つ', () => {
      expect(Object.getPrototypeOf(portfolioTypes)).toBe(Object.prototype);
    });

    it('hasOwnPropertyが正常に動作する', () => {
      expect(portfolioTypes.hasOwnProperty('toString')).toBe(false);
      expect(portfolioTypes.hasOwnProperty('nonExistentProperty')).toBe(false);
    });

    it('constructorがObjectである', () => {
      expect(portfolioTypes.constructor).toBe(Object);
    });
  });

  describe('フリーズとシール', () => {
    it('Object.freezeを適用できる', () => {
      const frozen = Object.freeze({...portfolioTypes});
      
      expect(() => {
        frozen.newProperty = 'test';
      }).toThrow(); // strictモードでは例外が投げられる
      
      expect(frozen.newProperty).toBeUndefined(); // 追加はされない
    });

    it('Object.sealを適用できる', () => {
      const sealed = Object.seal({...portfolioTypes});
      
      expect(() => {
        sealed.newProperty = 'test';
      }).toThrow(); // strictモードでは例外が投げられる
      
      expect(sealed.newProperty).toBeUndefined();
    });
  });

  describe('エラーハンドリング', () => {
    it('型定義ファイルとして想定される使用方法', () => {
      // このファイルは型定義のみで実行時には空オブジェクトとして動作する
      expect(() => {
        // JSDocの型を実行時に使用しようとしても安全
        const asset = portfolioTypes.Asset || {};
        const targetAllocation = portfolioTypes.TargetAllocation || {};
        
        expect(asset).toEqual({});
        expect(targetAllocation).toEqual({});
      }).not.toThrow();
    });

    it('存在しないプロパティへのアクセスが安全', () => {
      expect(() => {
        const undefinedProp = portfolioTypes.someRandomProperty;
        expect(undefinedProp).toBeUndefined();
      }).not.toThrow();
    });
  });

  describe('メモリとパフォーマンス', () => {
    it('軽量なオブジェクトである', () => {
      const sizeInBytes = JSON.stringify(portfolioTypes).length;
      expect(sizeInBytes).toBeLessThan(10); // 非常に小さい
    });

    it('プロパティアクセスが高速', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 10000; i++) {
        portfolioTypes.someProperty;
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100); // 100ms以内
    });
  });

  describe('互換性テスト', () => {
    it('ES5環境でも動作する', () => {
      // Object.keysなどのES5メソッドが使用可能
      expect(typeof Object.keys).toBe('function');
      expect(typeof Object.getOwnPropertyNames).toBe('function');
      
      const keys = Object.keys(portfolioTypes);
      const propertyNames = Object.getOwnPropertyNames(portfolioTypes);
      
      expect(keys).toEqual(propertyNames);
    });

    it('古いブラウザでも安全', () => {
      // 基本的なオブジェクト操作のみ使用
      expect(() => {
        const copy = {};
        for (const key in portfolioTypes) {
          copy[key] = portfolioTypes[key];
        }
        expect(copy).toEqual(portfolioTypes);
      }).not.toThrow();
    });
  });
});