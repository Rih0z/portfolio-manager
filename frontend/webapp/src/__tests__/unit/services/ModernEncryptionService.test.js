/**
 * ModernEncryptionService のユニットテスト
 * Web Crypto APIを使用した現代的な暗号化サービスのテスト
 */

import { ModernEncryptionService } from '../../../services/portfolio/ModernEncryptionService';

// Web Crypto API のモック設定
const mockCrypto = {
  subtle: {
    importKey: jest.fn().mockResolvedValue({}),
    deriveKey: jest.fn().mockResolvedValue({}),
    deriveBits: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
    encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(48)),
    decrypt: jest.fn().mockResolvedValue(new TextEncoder().encode('{"test": "data"}'))
  },
  getRandomValues: jest.fn().mockImplementation((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  })
};

// グローバルオブジェクトにモックを設定
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
  configurable: true
});

describe('ModernEncryptionService', () => {
  beforeEach(() => {
    // モックをクリア
    jest.clearAllMocks();
    localStorage.clear();
    
    // デフォルトのモック実装を再設定
    mockCrypto.getRandomValues.mockImplementation((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    });
    
    mockCrypto.subtle.importKey.mockResolvedValue({});
    mockCrypto.subtle.deriveKey.mockResolvedValue({});
    mockCrypto.subtle.deriveBits.mockResolvedValue(new ArrayBuffer(32));
    mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(48));
    mockCrypto.subtle.decrypt.mockResolvedValue(new TextEncoder().encode('{"test": "data"}'));
  });

  describe('isAvailable', () => {
    it('Web Crypto APIが利用可能な場合はtrueを返す', () => {
      expect(ModernEncryptionService.isAvailable()).toBe(true);
    });

    it('crypto.subtleが未定義の場合はfalseを返す', () => {
      const originalCrypto = global.crypto;
      Object.defineProperty(global, 'crypto', {
        value: { subtle: undefined },
        writable: true,
        configurable: true
      });
      
      expect(ModernEncryptionService.isAvailable()).toBe(false);
      
      Object.defineProperty(global, 'crypto', {
        value: originalCrypto,
        writable: true,
        configurable: true
      });
    });

    it('cryptoが未定義の場合はfalseを返す', () => {
      const originalCrypto = global.crypto;
      Object.defineProperty(global, 'crypto', {
        value: undefined,
        writable: true,
        configurable: true
      });
      
      expect(ModernEncryptionService.isAvailable()).toBe(false);
      
      Object.defineProperty(global, 'crypto', {
        value: originalCrypto,
        writable: true,
        configurable: true
      });
    });
  });

  describe('hasPassword', () => {
    it('パスワードが設定されていない場合はfalseを返す', () => {
      expect(ModernEncryptionService.hasPassword()).toBe(false);
    });

    it('パスワードが設定されている場合はtrueを返す', () => {
      localStorage.setItem('portfolio_password_hash', 'test_hash');
      expect(ModernEncryptionService.hasPassword()).toBe(true);
    });
  });

  describe('setPassword and verifyPassword', () => {
    it('パスワードを設定して検証できる', async () => {
      const password = 'test_password_123';
      
      await ModernEncryptionService.setPassword(password);
      
      expect(localStorage.getItem('portfolio_password_hash')).toBeTruthy();
      expect(mockCrypto.subtle.importKey).toHaveBeenCalled();
      expect(mockCrypto.subtle.deriveBits).toHaveBeenCalled();
    });

    it('パスワードが設定されていない場合、検証はfalseを返す', async () => {
      const result = await ModernEncryptionService.verifyPassword('any_password');
      expect(result).toBe(false);
    });

    it('正しいパスワードの検証はtrueを返す', async () => {
      const password = 'test_password_123';
      
      // 同じハッシュを返すようにモック
      mockCrypto.subtle.deriveBits.mockResolvedValue(new ArrayBuffer(32));
      
      await ModernEncryptionService.setPassword(password);
      const result = await ModernEncryptionService.verifyPassword(password);
      
      expect(result).toBe(true);
    });

    it('間違ったパスワードの検証はfalseを返す', async () => {
      const password = 'test_password_123';
      const wrongPassword = 'wrong_password';
      
      // 異なるハッシュを返すようにモック
      mockCrypto.subtle.deriveBits
        .mockResolvedValueOnce(new ArrayBuffer(32))
        .mockResolvedValueOnce(new ArrayBuffer(16));
      
      await ModernEncryptionService.setPassword(password);
      const result = await ModernEncryptionService.verifyPassword(wrongPassword);
      
      expect(result).toBe(false);
    });
  });

  describe('encrypt', () => {
    it('パスワードなしの場合はJSONを返す', async () => {
      const data = { test: 'data' };
      const result = await ModernEncryptionService.encrypt(data, '');
      
      expect(result).toBe('{"test":"data"}');
      expect(mockCrypto.subtle.encrypt).not.toHaveBeenCalled();
    });

    it('パスワードありの場合は暗号化されたデータを返す', async () => {
      const data = { test: 'data' };
      const password = 'test_password';
      
      const result = await ModernEncryptionService.encrypt(data, password);
      
      expect(typeof result).toBe('string');
      expect(result).not.toBe('{"test":"data"}');
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();
      expect(mockCrypto.subtle.deriveKey).toHaveBeenCalled();
    });

    it('暗号化エラー時は適切なエラーを投げる', async () => {
      const data = { test: 'data' };
      const password = 'test_password';
      
      mockCrypto.subtle.encrypt.mockRejectedValue(new Error('Encryption failed'));
      
      await expect(ModernEncryptionService.encrypt(data, password))
        .rejects.toThrow('データの暗号化に失敗しました');
    });
  });

  describe('decrypt', () => {
    it('パスワードなしの場合はJSONをパースして返す', async () => {
      const encryptedData = '{"test":"data"}';
      const result = await ModernEncryptionService.decrypt(encryptedData, '');
      
      expect(result).toEqual({ test: 'data' });
      expect(mockCrypto.subtle.decrypt).not.toHaveBeenCalled();
    });

    it('パスワードありの場合は復号化されたデータを返す', async () => {
      const encryptedData = 'encrypted_base64_data';
      const password = 'test_password';
      
      const result = await ModernEncryptionService.decrypt(encryptedData, password);
      
      expect(result).toEqual({ test: 'data' });
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalled();
      expect(mockCrypto.subtle.deriveKey).toHaveBeenCalled();
    });

    it('復号化エラー時は適切なエラーを投げる', async () => {
      const encryptedData = 'encrypted_base64_data';
      const password = 'test_password';
      
      mockCrypto.subtle.decrypt.mockRejectedValue(new Error('Decryption failed'));
      
      await expect(ModernEncryptionService.decrypt(encryptedData, password))
        .rejects.toThrow('データの復号化に失敗しました。パスワードが間違っている可能性があります。');
    });
  });

  describe('arrayBufferToBase64', () => {
    it('ArrayBufferを正しくBase64に変換する', () => {
      const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const result = ModernEncryptionService.arrayBufferToBase64(data);
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('空のArrayBufferも正しく変換する', () => {
      const data = new Uint8Array([]);
      const result = ModernEncryptionService.arrayBufferToBase64(data);
      
      expect(typeof result).toBe('string');
      expect(result).toBe('');
    });

    it('大きなデータも正しく変換する', () => {
      const data = new Uint8Array(10000).fill(65); // 10000個の'A'
      const result = ModernEncryptionService.arrayBufferToBase64(data);
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('パディングが必要なデータを正しく変換する', () => {
      const data = new Uint8Array([72]); // 1バイト - パディング必要
      const result = ModernEncryptionService.arrayBufferToBase64(data);
      
      expect(result).toMatch(/==/); // パディング確認
    });
  });

  describe('base64ToArrayBuffer', () => {
    it('Base64文字列を正しくArrayBufferに変換する', () => {
      const base64 = 'SGVsbG8='; // "Hello"のBase64
      const result = ModernEncryptionService.base64ToArrayBuffer(base64);
      
      expect(result).toBeInstanceOf(Uint8Array);
      expect(Array.from(result)).toEqual([72, 101, 108, 108, 111]);
    });

    it('パディングありのBase64を正しく変換する', () => {
      const base64 = 'SGVsbG8=';
      const result = ModernEncryptionService.base64ToArrayBuffer(base64);
      
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(5);
    });

    it('パディングなしのBase64も正しく変換する', () => {
      const base64 = 'SGVsbG9Xb3JsZA'; // "HelloWorld"
      const result = ModernEncryptionService.base64ToArrayBuffer(base64);
      
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(10);
    });

    it('空のBase64文字列を正しく変換する', () => {
      const base64 = '';
      const result = ModernEncryptionService.base64ToArrayBuffer(base64);
      
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(0);
    });

    it('無効な文字が含まれるBase64も処理できる', () => {
      const base64 = 'SGVs!bG8='; // 無効文字'!'含む
      const result = ModernEncryptionService.base64ToArrayBuffer(base64);
      
      expect(result).toBeInstanceOf(Uint8Array);
      // 無効文字は無視されて処理される
    });
  });

  describe('deriveKey', () => {
    it('パスワードから暗号化キーを導出できる', async () => {
      const password = 'test_password';
      
      await ModernEncryptionService.deriveKey(password);
      
      expect(mockCrypto.subtle.importKey).toHaveBeenCalledWith(
        'raw',
        expect.any(Uint8Array),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      
      expect(mockCrypto.subtle.deriveKey).toHaveBeenCalledWith(
        {
          name: 'PBKDF2',
          salt: expect.any(Uint8Array),
          iterations: 100000,
          hash: 'SHA-256'
        },
        {},
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    });
  });

  describe('hashPassword', () => {
    it('パスワードをハッシュ化できる', async () => {
      const password = 'test_password';
      
      const result = await ModernEncryptionService.hashPassword(password);
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(mockCrypto.subtle.importKey).toHaveBeenCalled();
      expect(mockCrypto.subtle.deriveBits).toHaveBeenCalled();
    });
  });

  describe('統合テスト', () => {
    it('暗号化→復号化の完全なフローが動作する', async () => {
      // 実際の暗号化処理をモック
      const originalData = { message: 'Hello World', number: 123 };
      const password = 'test_password_123';
      
      // 暗号化用のモック設定
      mockCrypto.subtle.encrypt.mockResolvedValue(
        new TextEncoder().encode('encrypted_data_mock')
      );
      
      // 復号化用のモック設定
      mockCrypto.subtle.decrypt.mockResolvedValue(
        new TextEncoder().encode(JSON.stringify(originalData))
      );
      
      const encrypted = await ModernEncryptionService.encrypt(originalData, password);
      const decrypted = await ModernEncryptionService.decrypt(encrypted, password);
      
      expect(decrypted).toEqual(originalData);
    });

    it('複雑なオブジェクトも正しく処理できる', async () => {
      const complexData = {
        assets: [
          { id: 1, name: 'Asset 1', value: 1000.50 },
          { id: 2, name: 'Asset 2', value: 2500.75 }
        ],
        metadata: {
          lastUpdated: '2024-01-01T00:00:00Z',
          version: '1.0.0'
        },
        settings: {
          currency: 'JPY',
          notifications: true
        }
      };
      
      const password = 'complex_password_456';
      
      mockCrypto.subtle.encrypt.mockResolvedValue(
        new TextEncoder().encode('complex_encrypted_data')
      );
      mockCrypto.subtle.decrypt.mockResolvedValue(
        new TextEncoder().encode(JSON.stringify(complexData))
      );
      
      const encrypted = await ModernEncryptionService.encrypt(complexData, password);
      const decrypted = await ModernEncryptionService.decrypt(encrypted, password);
      
      expect(decrypted).toEqual(complexData);
    });
  });
});