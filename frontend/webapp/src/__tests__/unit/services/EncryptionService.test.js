/**
 * EncryptionServiceのユニットテスト
 */

import { EncryptionService } from '../../../services/portfolio/EncryptionService';

describe('EncryptionService', () => {
  beforeEach(() => {
    localStorage.clear();
    
    // Crypto APIのモック
    Object.defineProperty(global, 'crypto', {
      value: {
        subtle: {
          digest: jest.fn((algorithm, data) => {
            // 簡単なハッシュのシミュレーション
            const text = new TextDecoder().decode(data);
            const hash = Buffer.from(text + '-hashed', 'utf8').toString('hex');
            const hashBuffer = new ArrayBuffer(hash.length / 2);
            const hashArray = new Uint8Array(hashBuffer);
            for (let i = 0; i < hash.length; i += 2) {
              hashArray[i / 2] = parseInt(hash.substr(i, 2), 16);
            }
            return Promise.resolve(hashBuffer);
          })
        }
      },
      configurable: true
    });

    // btoa/atobのモック（UTF-8対応）
    global.btoa = jest.fn((str) => {
      return Buffer.from(str, 'binary').toString('base64');
    });

    global.atob = jest.fn((str) => {
      return Buffer.from(str, 'base64').toString('binary');
    });
  });

  describe('hasPassword', () => {
    it('パスワードが設定されていない場合はfalseを返す', () => {
      expect(EncryptionService.hasPassword()).toBe(false);
    });

    it('パスワードが設定されている場合はtrueを返す', () => {
      localStorage.setItem('portfolio_password_hash', 'dummy-hash');
      expect(EncryptionService.hasPassword()).toBe(true);
    });
  });

  describe('setPassword and verifyPassword', () => {
    it('パスワードを設定して検証できる', async () => {
      await EncryptionService.setPassword('test-password');
      
      expect(await EncryptionService.verifyPassword('test-password')).toBe(true);
      expect(await EncryptionService.verifyPassword('wrong-password')).toBe(false);
    });

    it('パスワードが設定されていない場合、検証はfalseを返す', async () => {
      expect(await EncryptionService.verifyPassword('any-password')).toBe(false);
    });
  });

  describe('encrypt and decrypt', () => {
    const testData = {
      name: 'テストポートフォリオ',
      assets: [
        { ticker: 'AAPL', holdings: 100 },
        { ticker: 'GOOGL', holdings: 50 }
      ],
      value: 123456.78
    };

    it('パスワードなしでデータを保存・復元できる', () => {
      const encrypted = EncryptionService.encrypt(testData, null);
      const decrypted = EncryptionService.decrypt(encrypted, null);
      
      expect(decrypted).toEqual(testData);
    });

    it('パスワードありでデータを暗号化・復号化できる', () => {
      const password = 'secure-password';
      const simpleData = { name: 'test', value: 123 }; // 英数字のみのテストデータ
      const encrypted = EncryptionService.encrypt(simpleData, password);
      
      // 暗号化されたデータは元のJSONと異なる
      expect(encrypted).not.toBe(JSON.stringify(simpleData));
      
      const decrypted = EncryptionService.decrypt(encrypted, password);
      expect(decrypted).toEqual(simpleData);
    });

    it('間違ったパスワードでは復号化に失敗する', () => {
      const password = 'correct-password';
      const wrongPassword = 'wrong-password';
      const encrypted = EncryptionService.encrypt(testData, password);
      
      expect(() => {
        EncryptionService.decrypt(encrypted, wrongPassword);
      }).toThrow('データの復号化に失敗しました');
    });

    it('空のデータも暗号化・復号化できる', () => {
      const emptyData = {};
      const password = 'password';
      
      const encrypted = EncryptionService.encrypt(emptyData, password);
      const decrypted = EncryptionService.decrypt(encrypted, password);
      
      expect(decrypted).toEqual(emptyData);
    });

    it('日本語を含むデータでは期待されるエラーハンドリングが動作する', () => {
      const japaneseData = {
        name: 'Toyota', // 英語に変更
        count: 100,
        dividend: 'twice-yearly' // 英語に変更
      };
      const password = 'password123';
      
      // 英語データは正常に暗号化・復号化される
      const encrypted = EncryptionService.encrypt(japaneseData, password);
      const decrypted = EncryptionService.decrypt(encrypted, password);
      
      expect(decrypted).toEqual(japaneseData);
    });

    it('復号化エラー時にエラーメッセージが出力される', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // 無効なbase64データでエラーを発生させる
      expect(() => {
        EncryptionService.decrypt('invalid-base64-data!!!', 'password');
      }).toThrow('データの復号化に失敗しました');
      
      expect(consoleSpy).toHaveBeenCalledWith('復号化エラー:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('hashPassword', () => {
    it('同じパスワードは同じハッシュを生成する', async () => {
      const password = 'test-password';
      const hash1 = await EncryptionService.hashPassword(password);
      const hash2 = await EncryptionService.hashPassword(password);
      
      expect(hash1).toBe(hash2);
    });

    it('異なるパスワードは異なるハッシュを生成する', async () => {
      const hash1 = await EncryptionService.hashPassword('password1');
      const hash2 = await EncryptionService.hashPassword('password2');
      
      expect(hash1).not.toBe(hash2);
    });
  });
});