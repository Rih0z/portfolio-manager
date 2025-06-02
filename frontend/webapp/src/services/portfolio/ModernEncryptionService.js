/**
 * 現代的な暗号化サービス
 * 
 * Web Crypto APIを使用した安全な暗号化実装
 * atob/btoaの代わりにTextEncoder/TextDecoderを使用
 * AES-GCMアルゴリズムによる強固な暗号化
 */

export class ModernEncryptionService {
  /**
   * パスワードが設定されているかチェック
   * @returns {boolean}
   */
  static hasPassword() {
    return localStorage.getItem('portfolio_password_hash') !== null;
  }

  /**
   * パスワードを設定
   * @param {string} password - パスワード
   */
  static async setPassword(password) {
    const hash = await this.hashPassword(password);
    localStorage.setItem('portfolio_password_hash', hash);
  }

  /**
   * パスワードを検証
   * @param {string} password - パスワード
   * @returns {boolean}
   */
  static async verifyPassword(password) {
    const storedHash = localStorage.getItem('portfolio_password_hash');
    if (!storedHash) return false;
    
    const hash = await this.hashPassword(password);
    return hash === storedHash;
  }

  /**
   * パスワードをハッシュ化（PBKDF2使用）
   * @private
   * @param {string} password - パスワード
   * @returns {Promise<string>}
   */
  static async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    
    // ソルトを生成
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    // PBKDF2でハッシュ化
    const key = await crypto.subtle.importKey(
      'raw',
      data,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      key,
      256
    );
    
    // ソルトとハッシュを結合
    const hashArray = new Uint8Array(derivedBits);
    const combined = new Uint8Array(salt.length + hashArray.length);
    combined.set(salt);
    combined.set(hashArray, salt.length);
    
    // Base64エンコード（Unicode対応）
    return this.arrayBufferToBase64(combined);
  }

  /**
   * データを暗号化（AES-GCM使用）
   * @param {any} data - 暗号化するデータ
   * @param {string} password - パスワード
   * @returns {Promise<string>} 暗号化されたデータ
   */
  static async encrypt(data, password) {
    if (!password) return JSON.stringify(data);
    
    try {
      const jsonStr = JSON.stringify(data);
      const encoder = new TextEncoder();
      const plaintext = encoder.encode(jsonStr);
      
      // パスワードから暗号化キーを導出
      const key = await this.deriveKey(password);
      
      // 初期化ベクトル（IV）を生成
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // AES-GCMで暗号化
      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        plaintext
      );
      
      // IVと暗号化データを結合
      const encryptedArray = new Uint8Array(encrypted);
      const combined = new Uint8Array(iv.length + encryptedArray.length);
      combined.set(iv);
      combined.set(encryptedArray, iv.length);
      
      return this.arrayBufferToBase64(combined);
    } catch (error) {
      console.error('暗号化エラー:', error);
      throw new Error('データの暗号化に失敗しました');
    }
  }

  /**
   * データを復号化
   * @param {string} encryptedData - 暗号化されたデータ
   * @param {string} password - パスワード
   * @returns {Promise<any>} 復号化されたデータ
   */
  static async decrypt(encryptedData, password) {
    if (!password) return JSON.parse(encryptedData);
    
    try {
      // Base64デコード
      const combined = this.base64ToArrayBuffer(encryptedData);
      
      // IVと暗号化データを分離
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      // パスワードから復号化キーを導出
      const key = await this.deriveKey(password);
      
      // AES-GCMで復号化
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encrypted
      );
      
      const decoder = new TextDecoder();
      const jsonStr = decoder.decode(decrypted);
      
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('復号化エラー:', error);
      throw new Error('データの復号化に失敗しました。パスワードが間違っている可能性があります。');
    }
  }

  /**
   * パスワードから暗号化キーを導出
   * @private
   * @param {string} password - パスワード
   * @returns {Promise<CryptoKey>}
   */
  static async deriveKey(password) {
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    
    // 固定ソルト（実際のアプリケーションではより安全な方法を使用）
    const salt = encoder.encode('portfolio-wise-salt-2024');
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordData,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * ArrayBufferをBase64に変換（現代的な実装）
   * @private
   * @param {ArrayBuffer|Uint8Array} buffer
   * @returns {string}
   */
  static arrayBufferToBase64(buffer) {
    const uint8Array = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    
    // Base64文字セット
    const base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    
    // 3バイトずつ処理
    for (let i = 0; i < uint8Array.length; i += 3) {
      const triplet = (uint8Array[i] << 16) | 
                     ((uint8Array[i + 1] || 0) << 8) | 
                     (uint8Array[i + 2] || 0);
      
      result += base64chars[(triplet >> 18) & 63];
      result += base64chars[(triplet >> 12) & 63];
      result += base64chars[(triplet >> 6) & 63];
      result += base64chars[triplet & 63];
    }
    
    // パディング処理
    const padding = uint8Array.length % 3;
    if (padding === 1) {
      result = result.slice(0, -2) + '==';
    } else if (padding === 2) {
      result = result.slice(0, -1) + '=';
    }
    
    return result;
  }

  /**
   * Base64をArrayBufferに変換（現代的な実装）
   * @private
   * @param {string} base64
   * @returns {Uint8Array}
   */
  static base64ToArrayBuffer(base64) {
    // Base64文字からインデックスへのマッピング
    const base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const lookup = new Array(256).fill(-1);
    for (let i = 0; i < base64chars.length; i++) {
      lookup[base64chars.charCodeAt(i)] = i;
    }
    
    // パディングを除去
    const cleanBase64 = base64.replace(/[^A-Za-z0-9+/]/g, '');
    let paddingLength = 0;
    if (base64.endsWith('==')) paddingLength = 2;
    else if (base64.endsWith('=')) paddingLength = 1;
    
    const outputLength = Math.floor(cleanBase64.length * 3 / 4) - paddingLength;
    const bytes = new Uint8Array(outputLength);
    
    let byteIndex = 0;
    for (let i = 0; i < cleanBase64.length; i += 4) {
      const a = lookup[cleanBase64.charCodeAt(i)] || 0;
      const b = lookup[cleanBase64.charCodeAt(i + 1)] || 0;
      const c = lookup[cleanBase64.charCodeAt(i + 2)] || 0;
      const d = lookup[cleanBase64.charCodeAt(i + 3)] || 0;
      
      const bitmap = (a << 18) | (b << 12) | (c << 6) | d;
      
      if (byteIndex < outputLength) bytes[byteIndex++] = (bitmap >> 16) & 255;
      if (byteIndex < outputLength) bytes[byteIndex++] = (bitmap >> 8) & 255;
      if (byteIndex < outputLength) bytes[byteIndex++] = bitmap & 255;
    }
    
    return bytes;
  }

  /**
   * 暗号化機能が利用可能かチェック
   * @returns {boolean}
   */
  static isAvailable() {
    return (
      typeof crypto !== 'undefined' &&
      crypto.subtle &&
      typeof crypto.subtle.encrypt === 'function' &&
      typeof crypto.subtle.decrypt === 'function'
    );
  }
}