/**
 * ModernEncryptionService の拡張ユニットテスト
 * Web Crypto APIを使用した現代的な暗号化サービスの100%カバレッジテスト
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

describe('ModernEncryptionService - Enhanced Coverage', () => {
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

  describe('setPassword 詳細テスト（行24をカバー）', () => {
    it('setPasswordでlocalStorageに正しく保存される', async () => {
      const password = 'coverage_test_password';
      
      // hashPasswordが特定の値を返すようにモック
      const mockHashResult = 'mocked_hash_base64_string';
      jest.spyOn(ModernEncryptionService, 'hashPassword').mockResolvedValue(mockHashResult);
      
      await ModernEncryptionService.setPassword(password);
      
      expect(localStorage.getItem('portfolio_password_hash')).toBe(mockHashResult);
      expect(ModernEncryptionService.hashPassword).toHaveBeenCalledWith(password);
      
      // モックを復元
      ModernEncryptionService.hashPassword.mockRestore();
    });
  });

  describe('verifyPassword 詳細テスト（行36-37をカバー）', () => {
    it('パスワードが未設定の場合はfalseを返す（行34-35）', async () => {
      localStorage.removeItem('portfolio_password_hash');
      
      const result = await ModernEncryptionService.verifyPassword('any_password');
      
      expect(result).toBe(false);
    });

    it('パスワードハッシュが一致する場合はtrueを返す（行36-37）', async () => {
      const password = 'test_password';
      const hashedPassword = 'stored_hash_value';
      
      // localStorageに事前にハッシュを設定
      localStorage.setItem('portfolio_password_hash', hashedPassword);
      
      // hashPasswordが同じ値を返すようにモック
      jest.spyOn(ModernEncryptionService, 'hashPassword').mockResolvedValue(hashedPassword);
      
      const result = await ModernEncryptionService.verifyPassword(password);
      
      expect(result).toBe(true);
      
      ModernEncryptionService.hashPassword.mockRestore();
    });

    it('パスワードハッシュが一致しない場合はfalseを返す', async () => {
      const password = 'test_password';
      const storedHash = 'stored_hash_value';
      const inputHash = 'different_hash_value';
      
      localStorage.setItem('portfolio_password_hash', storedHash);
      
      jest.spyOn(ModernEncryptionService, 'hashPassword').mockResolvedValue(inputHash);
      
      const result = await ModernEncryptionService.verifyPassword(password);
      
      expect(result).toBe(false);
      
      ModernEncryptionService.hashPassword.mockRestore();
    });
  });

  describe('hashPassword 詳細テスト（行54-80をカバー）', () => {
    it('パスワードをPBKDF2でハッシュ化する（全行をカバー）', async () => {
      const password = 'test_password_for_hashing';
      
      // crypto.getRandomValuesをモック（ソルト生成用）
      const mockSalt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
      mockCrypto.getRandomValues.mockReturnValue(mockSalt);
      
      // deriveBitsの結果をモック
      const mockDerivedBits = new ArrayBuffer(32);
      const derivedArray = new Uint8Array(mockDerivedBits);
      derivedArray.fill(42); // 特定の値で埋める
      mockCrypto.subtle.deriveBits.mockResolvedValue(mockDerivedBits);
      
      const result = await ModernEncryptionService.hashPassword(password);
      
      // crypto.subtle.importKeyが正しく呼ばれることを確認
      expect(mockCrypto.subtle.importKey).toHaveBeenCalledWith(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );
      
      // crypto.subtle.deriveBitsが正しく呼ばれることを確認
      expect(mockCrypto.subtle.deriveBits).toHaveBeenCalledWith(
        {
          name: 'PBKDF2',
          salt: mockSalt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        {},
        256
      );
      
      // 結果がBase64文字列であることを確認
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('ソルトとハッシュが正しく結合される（行74-77）', async () => {
      const password = 'salt_combination_test';
      
      // 特定のソルトとハッシュ値を設定
      const mockSalt = new Uint8Array([1, 2, 3, 4]);
      const mockHash = new ArrayBuffer(8);
      const hashArray = new Uint8Array(mockHash);
      hashArray.set([5, 6, 7, 8, 9, 10, 11, 12]);
      
      mockCrypto.getRandomValues.mockReturnValue(mockSalt);
      mockCrypto.subtle.deriveBits.mockResolvedValue(mockHash);
      
      // arrayBufferToBase64をスパイ
      const base64Spy = jest.spyOn(ModernEncryptionService, 'arrayBufferToBase64');
      
      await ModernEncryptionService.hashPassword(password);
      
      // 結合された配列が正しく作成されることを確認
      expect(base64Spy).toHaveBeenCalledWith(
        expect.any(Uint8Array)
      );
      
      const calledArray = base64Spy.mock.calls[0][0];
      expect(calledArray.length).toBe(12); // salt(4) + hash(8)
      expect(Array.from(calledArray.slice(0, 4))).toEqual([1, 2, 3, 4]); // salt部分
      expect(Array.from(calledArray.slice(4))).toEqual([5, 6, 7, 8, 9, 10, 11, 12]); // hash部分
      
      base64Spy.mockRestore();
    });
  });

  describe('encrypt 詳細テスト（行101-119をカバー）', () => {
    it('パスワードありの場合の暗号化処理（全行カバー）', async () => {
      const data = { message: 'secret data', number: 12345 };
      const password = 'encryption_password';
      
      // IVをモック
      const mockIV = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      mockCrypto.getRandomValues.mockReturnValue(mockIV);
      
      // 暗号化結果をモック
      const mockEncrypted = new ArrayBuffer(32);
      mockCrypto.subtle.encrypt.mockResolvedValue(mockEncrypted);
      
      // deriveKeyをスパイ
      const deriveKeySpy = jest.spyOn(ModernEncryptionService, 'deriveKey').mockResolvedValue({});
      
      const result = await ModernEncryptionService.encrypt(data, password);
      
      // deriveKeyが正しく呼ばれることを確認
      expect(deriveKeySpy).toHaveBeenCalledWith(password);
      
      // crypto.subtle.encryptが正しく呼ばれることを確認
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalledWith(
        {
          name: 'AES-GCM',
          iv: mockIV
        },
        {},
        expect.any(Uint8Array) // JSON文字列をエンコードしたもの
      );
      
      // 結果がBase64文字列であることを確認
      expect(typeof result).toBe('string');
      
      deriveKeySpy.mockRestore();
    });

    it('暗号化エラー時の例外処理（行112-119）', async () => {
      const data = { test: 'data' };
      const password = 'error_test_password';
      
      // deriveKeyでエラーを発生させる
      const deriveKeyError = new Error('Key derivation failed');
      jest.spyOn(ModernEncryptionService, 'deriveKey').mockRejectedValue(deriveKeyError);
      
      await expect(ModernEncryptionService.encrypt(data, password))
        .rejects.toThrow('データの暗号化に失敗しました');
      
      ModernEncryptionService.deriveKey.mockRestore();
    });

    it('encrypt時のIVと暗号化データの結合（行107-109）', async () => {
      const data = { test: 'iv_combination' };
      const password = 'test_password';
      
      const mockIV = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      const mockEncrypted = new ArrayBuffer(16);
      const encryptedArray = new Uint8Array(mockEncrypted);
      encryptedArray.fill(99); // 特定の値で埋める
      
      mockCrypto.getRandomValues.mockReturnValue(mockIV);
      mockCrypto.subtle.encrypt.mockResolvedValue(mockEncrypted);
      
      // arrayBufferToBase64をスパイ
      const base64Spy = jest.spyOn(ModernEncryptionService, 'arrayBufferToBase64');
      
      await ModernEncryptionService.encrypt(data, password);
      
      // 結合された配列が正しく作成されることを確認
      const calledArray = base64Spy.mock.calls[0][0];
      expect(calledArray.length).toBe(28); // IV(12) + encrypted(16)
      expect(Array.from(calledArray.slice(0, 12))).toEqual(Array.from(mockIV));
      expect(Array.from(calledArray.slice(12))).toEqual(Array.from(encryptedArray));
      
      base64Spy.mockRestore();
    });
  });

  describe('decrypt 詳細テスト（行147-159をカバー）', () => {
    it('パスワードありの場合の復号化処理（全行カバー）', async () => {
      const encryptedData = 'base64_encrypted_data';
      const password = 'decryption_password';
      
      // base64ToArrayBufferの結果をモック
      const mockCombined = new Uint8Array(28); // IV(12) + encrypted(16)
      mockCombined.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 0); // IV
      mockCombined.set([13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28], 12); // encrypted
      
      jest.spyOn(ModernEncryptionService, 'base64ToArrayBuffer').mockReturnValue(mockCombined);
      
      // 復号化結果をモック
      const decryptedData = '{"message": "decrypted successfully"}';
      mockCrypto.subtle.decrypt.mockResolvedValue(new TextEncoder().encode(decryptedData));
      
      // deriveKeyをスパイ
      const deriveKeySpy = jest.spyOn(ModernEncryptionService, 'deriveKey').mockResolvedValue({});
      
      const result = await ModernEncryptionService.decrypt(encryptedData, password);
      
      // IVと暗号化データが正しく分離されることを確認
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalledWith(
        {
          name: 'AES-GCM',
          iv: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
        },
        {},
        new Uint8Array([13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28])
      );
      
      // 結果がJSONオブジェクトとして解析されることを確認
      expect(result).toEqual({ message: 'decrypted successfully' });
      
      deriveKeySpy.mockRestore();
      ModernEncryptionService.base64ToArrayBuffer.mockRestore();
    });

    it('復号化エラー時の例外処理（行160-163）', async () => {
      const encryptedData = 'invalid_encrypted_data';
      const password = 'error_test_password';
      
      // base64ToArrayBufferでエラーを発生させる
      const base64Error = new Error('Invalid base64 data');
      jest.spyOn(ModernEncryptionService, 'base64ToArrayBuffer').mockImplementation(() => {
        throw base64Error;
      });
      
      await expect(ModernEncryptionService.decrypt(encryptedData, password))
        .rejects.toThrow('データの復号化に失敗しました。パスワードが間違っている可能性があります。');
      
      ModernEncryptionService.base64ToArrayBuffer.mockRestore();
    });

    it('JSON.parseエラー時の例外処理', async () => {
      const encryptedData = 'valid_base64_data';
      const password = 'test_password';
      
      const mockCombined = new Uint8Array(28);
      jest.spyOn(ModernEncryptionService, 'base64ToArrayBuffer').mockReturnValue(mockCombined);
      
      // 無効なJSONを返す
      mockCrypto.subtle.decrypt.mockResolvedValue(new TextEncoder().encode('invalid json'));
      
      await expect(ModernEncryptionService.decrypt(encryptedData, password))
        .rejects.toThrow('データの復号化に失敗しました。パスワードが間違っている可能性があります。');
      
      ModernEncryptionService.base64ToArrayBuffer.mockRestore();
    });
  });

  describe('deriveKey 詳細テスト（行187をカバー）', () => {
    it('PBKDF2を使用してキーを導出する（全行カバー）', async () => {
      const password = 'key_derivation_test';
      
      const mockDerivedKey = { type: 'secret', algorithm: { name: 'AES-GCM' } };
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockDerivedKey);
      
      const result = await ModernEncryptionService.deriveKey(password);
      
      expect(mockCrypto.subtle.importKey).toHaveBeenCalledWith(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      
      expect(mockCrypto.subtle.deriveKey).toHaveBeenCalledWith(
        {
          name: 'PBKDF2',
          salt: new TextEncoder().encode('portfolio-wise-salt-2024'),
          iterations: 100000,
          hash: 'SHA-256'
        },
        {},
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      
      expect(result).toBe(mockDerivedKey);
    });
  });

  describe('エラーログテスト', () => {
    it('encrypt時のエラーログが出力される', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const encryptError = new Error('Encryption failed');
      mockCrypto.subtle.encrypt.mockRejectedValue(encryptError);
      
      await expect(ModernEncryptionService.encrypt({ test: 'data' }, 'password'))
        .rejects.toThrow('データの暗号化に失敗しました');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('暗号化エラー:', encryptError);
      
      consoleErrorSpy.mockRestore();
    });

    it('decrypt時のエラーログが出力される', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const decryptError = new Error('Decryption failed');
      mockCrypto.subtle.decrypt.mockRejectedValue(decryptError);
      
      await expect(ModernEncryptionService.decrypt('encrypted_data', 'password'))
        .rejects.toThrow('データの復号化に失敗しました。パスワードが間違っている可能性があります。');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('復号化エラー:', decryptError);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('統合テスト - 100%カバレッジ確認', () => {
    it('完全な暗号化→復号化フローですべての行をカバー', async () => {
      const originalData = { 
        message: 'complete flow test', 
        number: 42,
        array: [1, 2, 3]
      };
      const password = 'integration_test_password';
      
      // 実際の暗号化・復号化をシミュレート
      const mockIV = new Uint8Array(12).fill(1);
      const mockSalt = new Uint8Array(16).fill(2);
      const mockHash = new ArrayBuffer(32);
      const mockEncrypted = new ArrayBuffer(64);
      
      mockCrypto.getRandomValues
        .mockReturnValueOnce(mockSalt) // hashPassword用
        .mockReturnValueOnce(mockIV);  // encrypt用
      
      mockCrypto.subtle.deriveBits.mockResolvedValue(mockHash);
      mockCrypto.subtle.encrypt.mockResolvedValue(mockEncrypted);
      mockCrypto.subtle.decrypt.mockResolvedValue(
        new TextEncoder().encode(JSON.stringify(originalData))
      );
      
      // 暗号化
      const encrypted = await ModernEncryptionService.encrypt(originalData, password);
      expect(typeof encrypted).toBe('string');
      
      // 復号化
      const decrypted = await ModernEncryptionService.decrypt(encrypted, password);
      expect(decrypted).toEqual(originalData);
      
      // すべての主要メソッドが呼ばれたことを確認
      expect(mockCrypto.subtle.importKey).toHaveBeenCalled();
      expect(mockCrypto.subtle.deriveKey).toHaveBeenCalled();
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalled();
    });
  });
});