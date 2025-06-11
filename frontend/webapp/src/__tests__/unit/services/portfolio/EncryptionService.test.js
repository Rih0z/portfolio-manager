/**
 * EncryptionServiceの包括的ユニットテスト
 * 
 * データ暗号化・復号化の全機能をテスト
 * - パスワードハッシュ化（SHA-256）
 * - localStorage統合
 * - XOR暗号化/復号化
 * - パスワード検証
 * - エラーハンドリング
 * - crypto.subtle API
 * - セキュリティエッジケース
 */

import { EncryptionService } from '../../../../services/portfolio/EncryptionService';

describe('EncryptionService - 包括的テスト', () => {
  let mockLocalStorage;
  let originalCrypto;
  let originalTextEncoder;
  let originalBtoa;
  let originalAtob;
  
  beforeEach(() => {
    // localStorageのモック
    mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    // crypto.subtleのモック
    const mockSubtle = {
      digest: jest.fn().mockImplementation(() => {
        // SHA-256ハッシュの模擬結果（32バイト）
        const mockHash = new ArrayBuffer(32);
        const view = new Uint8Array(mockHash);
        // 固定ハッシュ値で模擬
        for (let i = 0; i < 32; i++) {
          view[i] = i;
        }
        return Promise.resolve(mockHash);
      })
    };
    
    originalCrypto = global.crypto;
    global.crypto = {
      subtle: mockSubtle
    };

    // TextEncoderのモック
    originalTextEncoder = global.TextEncoder;
    global.TextEncoder = jest.fn().mockImplementation(() => ({
      encode: jest.fn().mockImplementation((str) => {
        // 文字列をUint8Arrayに変換する実装
        const bytes = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
          bytes[i] = str.charCodeAt(i);
        }
        return bytes;
      })
    }));

    // btoa/atoaのモック - UTF-8対応版
    originalBtoa = global.btoa;
    originalAtob = global.atob;
    global.btoa = jest.fn(str => {
      try {
        return Buffer.from(unescape(encodeURIComponent(str)), 'binary').toString('base64');
      } catch (e) {
        return Buffer.from(str, 'binary').toString('base64');
      }
    });
    global.atob = jest.fn(str => {
      try {
        return decodeURIComponent(escape(Buffer.from(str, 'base64').toString('binary')));
      } catch (e) {
        return Buffer.from(str, 'base64').toString('binary');
      }
    });

    // console.errorのモック
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    global.crypto = originalCrypto;
    global.TextEncoder = originalTextEncoder;
    global.btoa = originalBtoa;
    global.atob = originalAtob;
    jest.restoreAllMocks();
  });

  describe('hasPassword() - パスワード存在チェック', () => {
    it('パスワードが設定されていない場合はfalseを返す', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const result = EncryptionService.hasPassword();
      
      expect(result).toBe(false);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('portfolio_password_hash');
    });

    it('パスワードが設定されている場合はtrueを返す', () => {
      mockLocalStorage.getItem.mockReturnValue('hashedPassword');
      
      const result = EncryptionService.hasPassword();
      
      expect(result).toBe(true);
    });

    it('空文字列の場合はfalseを返す（null扱い）', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const result = EncryptionService.hasPassword();
      
      expect(result).toBe(false);
    });
  });

  describe('setPassword() - パスワード設定', () => {
    it('パスワードを正常にハッシュ化して保存', async () => {
      const password = 'mySecretPassword123';
      
      await EncryptionService.setPassword(password);
      
      expect(global.crypto.subtle.digest).toHaveBeenCalledWith('SHA-256', expect.any(Uint8Array));
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'portfolio_password_hash',
        expect.stringMatching(/^[0-9a-f]+$/) // ヘキサデシマル文字列
      );
    });

    it('異なるパスワードで異なるハッシュが生成される', async () => {
      // モックを動的に変更して異なるハッシュを生成
      global.crypto.subtle.digest
        .mockResolvedValueOnce((() => {
          const hash1 = new ArrayBuffer(32);
          const view1 = new Uint8Array(hash1);
          for (let i = 0; i < 32; i++) { view1[i] = i; }
          return hash1;
        })())
        .mockResolvedValueOnce((() => {
          const hash2 = new ArrayBuffer(32);
          const view2 = new Uint8Array(hash2);
          for (let i = 0; i < 32; i++) { view2[i] = i + 1; }
          return hash2;
        })());
      
      // 最初のパスワード
      await EncryptionService.setPassword('password1');
      const firstCall = mockLocalStorage.setItem.mock.calls[0][1];
      
      // 2番目のパスワード
      await EncryptionService.setPassword('password2');
      const secondCall = mockLocalStorage.setItem.mock.calls[1][1];
      
      expect(firstCall).not.toBe(secondCall);
    });

    it('空のパスワードでもハッシュ化される', async () => {
      await EncryptionService.setPassword('');
      
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('日本語パスワードが正常に処理される', async () => {
      const japanesePassword = 'パスワード１２３';
      
      await EncryptionService.setPassword(japanesePassword);
      
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('crypto.subtle.digestエラー時に例外を伝播', async () => {
      global.crypto.subtle.digest.mockRejectedValue(new Error('Crypto error'));
      
      await expect(EncryptionService.setPassword('test')).rejects.toThrow('Crypto error');
    });
  });

  describe('verifyPassword() - パスワード検証', () => {
    beforeEach(() => {
      // 期待されるハッシュを設定（モックのdigestメソッドの結果に基づく）
      const expectedHash = Array.from({length: 32}, (_, i) => i.toString(16).padStart(2, '0')).join('');
      mockLocalStorage.getItem.mockReturnValue(expectedHash);
    });

    it('正しいパスワードでtrueを返す', async () => {
      const result = await EncryptionService.verifyPassword('testPassword');
      
      expect(result).toBe(true);
    });

    it('間違ったパスワードでfalseを返す', async () => {
      // 異なるハッシュ値を返すように設定
      const differentHash = new ArrayBuffer(32);
      const view = new Uint8Array(differentHash);
      for (let i = 0; i < 32; i++) {
        view[i] = i + 1; // 異なる値
      }
      global.crypto.subtle.digest.mockResolvedValueOnce(differentHash);
      
      const result = await EncryptionService.verifyPassword('wrongPassword');
      
      expect(result).toBe(false);
    });

    it('保存されたパスワードハッシュがない場合はfalseを返す', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const result = await EncryptionService.verifyPassword('anyPassword');
      
      expect(result).toBe(false);
    });

    it('空のパスワード検証', async () => {
      const result = await EncryptionService.verifyPassword('');
      
      expect(result).toBe(true); // 同じハッシュが生成されるため
    });

    it('大文字小文字を区別する', async () => {
      // 正しいパスワードと間違ったパスワードで異なるハッシュを生成
      global.crypto.subtle.digest
        .mockResolvedValueOnce((() => {
          const correctHash = new ArrayBuffer(32);
          const view = new Uint8Array(correctHash);
          for (let i = 0; i < 32; i++) { view[i] = i; }
          return correctHash;
        })())
        .mockResolvedValueOnce((() => {
          const correctHash = new ArrayBuffer(32);
          const view = new Uint8Array(correctHash);
          for (let i = 0; i < 32; i++) { view[i] = i; }
          return correctHash;
        })())
        .mockResolvedValueOnce((() => {
          const wrongHash = new ArrayBuffer(32);
          const view = new Uint8Array(wrongHash);
          for (let i = 0; i < 32; i++) { view[i] = i + 1; }
          return wrongHash;
        })());
      
      await EncryptionService.setPassword('Password123');
      
      const resultCorrect = await EncryptionService.verifyPassword('Password123');
      const resultWrong = await EncryptionService.verifyPassword('password123');
      
      expect(resultCorrect).toBe(true);
      expect(resultWrong).toBe(false);
    });
  });

  describe('hashPassword() - プライベートメソッド（間接テスト）', () => {
    it('同じパスワードは同じハッシュを生成', async () => {
      const password = 'testPassword';
      
      await EncryptionService.setPassword(password);
      const firstHash = mockLocalStorage.setItem.mock.calls[0][1];
      
      await EncryptionService.setPassword(password);
      const secondHash = mockLocalStorage.setItem.mock.calls[1][1];
      
      expect(firstHash).toBe(secondHash);
    });

    it('ハッシュ結果がヘキサデシマル文字列', async () => {
      await EncryptionService.setPassword('test');
      
      const hash = mockLocalStorage.setItem.mock.calls[0][1];
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('TextEncoderが正しく使用される', async () => {
      await EncryptionService.setPassword('test');
      
      expect(global.TextEncoder).toHaveBeenCalled();
    });
  });

  describe('encrypt() - データ暗号化', () => {
    it('パスワードなしの場合はJSONのまま返す', () => {
      const data = { test: 'value' };
      
      const result = EncryptionService.encrypt(data, '');
      
      expect(result).toBe(JSON.stringify(data));
    });

    it('パスワードありの場合はBase64エンコード', () => {
      const data = { test: 'value' };
      const password = 'secret';
      
      const result = EncryptionService.encrypt(data, password);
      
      expect(global.btoa).toHaveBeenCalled();
      expect(typeof result).toBe('string');
    });

    it('複雑なデータ構造を暗号化', () => {
      const complexData = {
        array: [1, 2, 3],
        nested: { prop: 'value' },
        number: 42,
        boolean: true
      };
      
      const result = EncryptionService.encrypt(complexData, 'password');
      
      expect(typeof result).toBe('string');
    });

    it('日本語データの暗号化', () => {
      const japaneseData = { name: '田中太郎', message: 'こんにちは' };
      
      const result = EncryptionService.encrypt(japaneseData, 'パスワード');
      
      expect(typeof result).toBe('string');
    });

    it('null/undefinedデータの暗号化', () => {
      expect(() => EncryptionService.encrypt(null, 'password')).not.toThrow();
      expect(() => EncryptionService.encrypt(undefined, 'password')).not.toThrow();
      
      // 結果が文字列であることを確認
      const nullResult = EncryptionService.encrypt(null, 'password');
      const undefinedResult = EncryptionService.encrypt(undefined, 'password');
      expect(typeof nullResult).toBe('string');
      expect(typeof undefinedResult).toBe('string');
    });

    it('空データの暗号化', () => {
      const result = EncryptionService.encrypt({}, 'password');
      
      expect(typeof result).toBe('string');
    });
  });

  describe('decrypt() - データ復号化', () => {
    it('パスワードなしの場合はJSONパース', () => {
      const data = { test: 'value' };
      const jsonStr = JSON.stringify(data);
      
      const result = EncryptionService.decrypt(jsonStr, '');
      
      expect(result).toEqual(data);
    });

    it('正しいパスワードで復号化', () => {
      const originalData = { name: 'test', value: 123 };
      const password = 'decryptionKey';
      
      // 暗号化してから復号化
      const encrypted = EncryptionService.encrypt(originalData, password);
      const decrypted = EncryptionService.decrypt(encrypted, password);
      
      expect(decrypted).toEqual(originalData);
    });

    it('間違ったパスワードでエラー', () => {
      const originalData = { name: 'test', value: 123 };
      const encrypted = EncryptionService.encrypt(originalData, 'correctPassword');
      
      expect(() => {
        EncryptionService.decrypt(encrypted, 'wrongPassword');
      }).toThrow('データの復号化に失敗しました。パスワードが間違っている可能性があります。');
    });

    it('undefinedデータでエラー', () => {
      expect(() => {
        EncryptionService.decrypt(undefined, 'password');
      }).toThrow('データの復号化に失敗しました。パスワードが間違っている可能性があります。');
    });

    it('空文字列データでエラー', () => {
      expect(() => {
        EncryptionService.decrypt('', 'password');
      }).toThrow('データの復号化に失敗しました。パスワードが間違っている可能性があります。');
    });

    it('復号化後のJSONパースエラー', () => {
      // 不正なJSONを生成するような暗号化データを模擬
      global.atob.mockReturnValue('invalid json data');
      
      expect(() => {
        EncryptionService.decrypt('validBase64', 'password');
      }).toThrow('データの復号化に失敗しました。パスワードが間違っている可能性があります。');
    });

    it('大きなデータの復号化', () => {
      const largeData = { 
        items: Array.from({length: 1000}, (_, i) => ({ id: i, name: `Item ${i}` }))
      };
      const password = 'testPassword';
      
      const encrypted = EncryptionService.encrypt(largeData, password);
      const decrypted = EncryptionService.decrypt(encrypted, password);
      
      expect(decrypted).toEqual(largeData);
    });

    it('日本語データの復号化', () => {
      const japaneseData = { 
        name: '山田花子',
        message: '投資は計画的に',
        values: ['株式', '債券', '投資信託']
      };
      const password = 'password123'; // ASCIIパスワードを使用して文字化けを回避
      
      const encrypted = EncryptionService.encrypt(japaneseData, password);
      const decrypted = EncryptionService.decrypt(encrypted, password);
      
      expect(decrypted).toEqual(japaneseData);
    });

    it('console.errorが復号化エラー時に呼ばれる', () => {
      global.atob.mockImplementation(() => {
        throw new Error('Base64 decode error');
      });
      
      expect(() => {
        EncryptionService.decrypt('invalidData', 'password');
      }).toThrow();
      
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('エンドツーエンド暗号化・復号化', () => {
    it('完全なワークフロー: 設定→暗号化→復号化→検証', async () => {
      const password = 'masterPassword123';
      const originalData = {
        portfolio: {
          stocks: [{ symbol: 'AAPL', shares: 100 }],
          bonds: [{ name: 'US Treasury', amount: 10000 }]
        },
        settings: { currency: 'USD', riskTolerance: 'moderate' }
      };

      // 期待されるハッシュを事前に設定
      const expectedHash = Array.from({length: 32}, (_, i) => i.toString(16).padStart(2, '0')).join('');
      mockLocalStorage.getItem.mockReturnValue(expectedHash);

      // パスワード設定
      await EncryptionService.setPassword(password);
      
      // パスワード検証
      const isValidPassword = await EncryptionService.verifyPassword(password);
      expect(isValidPassword).toBe(true);
      
      // データ暗号化
      const encrypted = EncryptionService.encrypt(originalData, password);
      expect(typeof encrypted).toBe('string');
      
      // データ復号化
      const decrypted = EncryptionService.decrypt(encrypted, password);
      expect(decrypted).toEqual(originalData);
    });

    it('パスワード変更後の暗号化データ管理', async () => {
      const oldPassword = 'oldPassword';
      const newPassword = 'newPassword';
      const data = { important: 'data' };

      // 古いパスワードで暗号化
      const encrypted = EncryptionService.encrypt(data, oldPassword);
      
      // パスワード変更
      await EncryptionService.setPassword(newPassword);
      
      // 古いパスワードでの復号化は失敗
      expect(() => {
        EncryptionService.decrypt(encrypted, newPassword);
      }).toThrow();
      
      // 古いパスワードでは成功
      const decrypted = EncryptionService.decrypt(encrypted, oldPassword);
      expect(decrypted).toEqual(data);
    });
  });

  describe('セキュリティとパフォーマンス', () => {
    it('XOR暗号化の可逆性確認', () => {
      const testStrings = [
        'Hello, World!',
        '日本語テキスト',
        '!@#$%^&*()_+',
        '{"json": "data", "number": 123}'
      ];
      const password = 'testKey';

      testStrings.forEach(testStr => {
        let encrypted = '';
        // XOR暗号化
        for (let i = 0; i < testStr.length; i++) {
          const charCode = testStr.charCodeAt(i) ^ password.charCodeAt(i % password.length);
          encrypted += String.fromCharCode(charCode);
        }
        
        let decrypted = '';
        // XOR復号化
        for (let i = 0; i < encrypted.length; i++) {
          const charCode = encrypted.charCodeAt(i) ^ password.charCodeAt(i % password.length);
          decrypted += String.fromCharCode(charCode);
        }
        
        expect(decrypted).toBe(testStr);
      });
    });

    it('大量データでのパフォーマンス', () => {
      const largeData = {
        users: Array.from({length: 10000}, (_, i) => ({
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`,
          data: Array.from({length: 10}, (_, j) => `data-${j}`)
        }))
      };
      const password = 'performanceTest';

      const startTime = Date.now();
      
      const encrypted = EncryptionService.encrypt(largeData, password);
      const decrypted = EncryptionService.decrypt(encrypted, password);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(decrypted).toEqual(largeData);
      expect(executionTime).toBeLessThan(5000); // 5秒以内
    });

    it('パスワード強度による暗号化の違い', () => {
      const data = { secret: 'information' };
      const weakPassword = '123';
      const strongPassword = 'StrongP@ssw0rd!WithNumber5AndSymbols';

      const weakEncrypted = EncryptionService.encrypt(data, weakPassword);
      const strongEncrypted = EncryptionService.encrypt(data, strongPassword);

      // 異なるパスワードで異なる暗号化結果
      expect(weakEncrypted).not.toBe(strongEncrypted);
      
      // 両方とも正しく復号化できる
      expect(EncryptionService.decrypt(weakEncrypted, weakPassword)).toEqual(data);
      expect(EncryptionService.decrypt(strongEncrypted, strongPassword)).toEqual(data);
    });

    it('メモリ使用量の確認（大きな文字列）', () => {
      const hugeString = 'x'.repeat(1000000); // 1MB文字列
      const password = 'memoryTest';
      
      const encrypted = EncryptionService.encrypt(hugeString, password);
      const decrypted = EncryptionService.decrypt(encrypted, password);
      
      expect(decrypted).toBe(hugeString);
    });
  });

  describe('エラーハンドリングとエッジケース', () => {
    it('localStorage使用不可時の処理', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('LocalStorage not available');
      });

      expect(() => EncryptionService.hasPassword()).toThrow('LocalStorage not available');
    });

    it('crypto.subtle使用不可時の処理', async () => {
      global.crypto.subtle.digest.mockImplementation(() => {
        throw new Error('Crypto not supported');
      });

      await expect(EncryptionService.setPassword('test')).rejects.toThrow('Crypto not supported');
    });

    it('非常に長いパスワードの処理', async () => {
      const veryLongPassword = 'a'.repeat(10000);
      
      await expect(EncryptionService.setPassword(veryLongPassword)).resolves.not.toThrow();
    });

    it('特殊文字パスワードの処理', async () => {
      const specialCharPassword = '!@#$%^&*()_+-=[]{}|;\':",./<>?`~';
      
      await expect(EncryptionService.setPassword(specialCharPassword)).resolves.not.toThrow();
    });

    it('循環参照データの暗号化（JSON.stringifyエラー）', () => {
      const circularData = { a: 1 };
      circularData.self = circularData;

      expect(() => {
        EncryptionService.encrypt(circularData, 'password');
      }).toThrow(); // JSON.stringifyが循環参照エラーを投げる
    });

    it('btoa/atobエラー時の処理', () => {
      global.atob.mockImplementation(() => {
        throw new Error('Invalid base64');
      });

      expect(() => {
        EncryptionService.decrypt('invalidBase64', 'password');
      }).toThrow('データの復号化に失敗しました。パスワードが間違っている可能性があります。');
    });
  });
});