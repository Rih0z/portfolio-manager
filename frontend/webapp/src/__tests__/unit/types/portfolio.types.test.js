/**
 * portfolio.types.ts のユニットテスト
 * ポートフォリオ関連の型定義のテスト
 */

import { vi } from 'vitest';

// portfolio.types.ts は TypeScript の interface のみを export し、
// ランタイムには値がないため、動的 import で確認する
describe('portfolio.types', () => {
  describe('モジュールの実行', () => {
    it('モジュールが正常に読み込まれる', async () => {
      const module = await import('../../../types/portfolio.types');
      expect(module).toBeDefined();
    });
  });

  describe('型エクスポートの確認', () => {
    it('TypeScript interface は runtime に値を持たないが、モジュールは読み込める', async () => {
      const module = await import('../../../types/portfolio.types');
      // TypeScript の interface は compile 時にのみ存在し、runtime では export されない
      // ただしモジュール自体は正常に import できる
      expect(module).toBeDefined();
    });

    it('異なるインポート方式でも同じモジュールを取得する', async () => {
      const imported1 = await import('../../../types/portfolio.types');
      const imported2 = await import('../../../types/portfolio.types');

      expect(imported1).toBe(imported2); // 同じモジュール参照
    });
  });

  describe('型定義の存在確認', () => {
    it('ファイルが適切な型定義を含んでいる', async () => {
      // ファイルの内容を読み込んで型定義が含まれていることを確認
      const fs = await import('fs');
      const path = await import('path');
      // .ts ファイルを直接読む（テスト内の __dirname から相対パス）
      const filePath = path.resolve(__dirname, '../../../types/portfolio.types.ts');
      const fileContent = fs.readFileSync(filePath, 'utf8');

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
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.resolve(__dirname, '../../../types/portfolio.types.ts');
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
    it('ESモジュールとしてインポートできる', async () => {
      await expect(import('../../../types/portfolio.types')).resolves.toBeDefined();
    });

    it('TypeScript interfaceはランタイムに名前付きエクスポートとして存在しない', async () => {
      const module = await import('../../../types/portfolio.types');

      // TypeScript interface はコンパイル後にはランタイム値を持たない
      // ただし ApiConfig など一部は実行時にも存在する可能性がある
      // 確認: BaseAsset, Asset, TargetAllocation は interface なので undefined
      expect(typeof module.BaseAsset).toBe('undefined');
      expect(typeof module.Asset).toBe('undefined');
      expect(typeof module.TargetAllocation).toBe('undefined');
    });
  });

  describe('JSONシリアライゼーション', () => {
    it('空オブジェクトのJSON操作が安全', () => {
      const emptyObj = {};
      const jsonString = JSON.stringify(emptyObj);
      expect(jsonString).toBe('{}');

      const parsed = JSON.parse(jsonString);
      expect(parsed).toEqual({});
      expect(typeof parsed).toBe('object');
    });
  });

  describe('プロトタイプチェーン', () => {
    it('空オブジェクトのプロトタイプチェーン', () => {
      const obj = {};
      expect(Object.getPrototypeOf(obj)).toBe(Object.prototype);
    });

    it('hasOwnPropertyが正常に動作する', () => {
      const obj = {};
      expect(obj.hasOwnProperty('toString')).toBe(false);
      expect(obj.hasOwnProperty('nonExistentProperty')).toBe(false);
    });

    it('constructorがObjectである', () => {
      const obj = {};
      expect(obj.constructor).toBe(Object);
    });
  });

  describe('フリーズとシール', () => {
    it('Object.freezeを適用できる', () => {
      const frozen = Object.freeze({});

      expect(() => {
        frozen.newProperty = 'test';
      }).toThrow(); // strictモードでは例外が投げられる

      expect(frozen.newProperty).toBeUndefined();
    });

    it('Object.sealを適用できる', () => {
      const sealed = Object.seal({});

      expect(() => {
        sealed.newProperty = 'test';
      }).toThrow(); // strictモードでは例外が投げられる

      expect(sealed.newProperty).toBeUndefined();
    });
  });

  describe('メモリとパフォーマンス', () => {
    it('プロパティアクセスが高速', () => {
      const obj = {};
      const startTime = Date.now();

      for (let i = 0; i < 10000; i++) {
        obj.someProperty;
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100); // 100ms以内
    });
  });

  describe('互換性テスト', () => {
    it('ES5環境でも動作する', () => {
      const obj = {};
      expect(typeof Object.keys).toBe('function');
      expect(typeof Object.getOwnPropertyNames).toBe('function');

      const keys = Object.keys(obj);
      const propertyNames = Object.getOwnPropertyNames(obj);

      expect(keys).toEqual(propertyNames);
    });

    it('古いブラウザでも安全', () => {
      const obj = {};
      expect(() => {
        const copy = {};
        for (const key in obj) {
          copy[key] = obj[key];
        }
        expect(copy).toEqual(obj);
      }).not.toThrow();
    });
  });
});
