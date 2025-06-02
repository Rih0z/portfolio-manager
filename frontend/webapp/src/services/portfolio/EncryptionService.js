/**
 * データ暗号化サービス
 * 
 * Single Responsibility: データの暗号化と復号化のみを担当
 */

export class EncryptionService {
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
   * パスワードをハッシュ化
   * @private
   * @param {string} password - パスワード
   * @returns {Promise<string>}
   */
  static async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * データを暗号化
   * @param {any} data - 暗号化するデータ
   * @param {string} password - パスワード
   * @returns {string} 暗号化されたデータ
   */
  static encrypt(data, password) {
    if (!password) return JSON.stringify(data);
    
    const jsonStr = JSON.stringify(data);
    let encrypted = '';
    
    for (let i = 0; i < jsonStr.length; i++) {
      const charCode = jsonStr.charCodeAt(i) ^ password.charCodeAt(i % password.length);
      encrypted += String.fromCharCode(charCode);
    }
    
    return btoa(encrypted);
  }

  /**
   * データを復号化
   * @param {string} encryptedData - 暗号化されたデータ
   * @param {string} password - パスワード
   * @returns {any} 復号化されたデータ
   */
  static decrypt(encryptedData, password) {
    if (!password) return JSON.parse(encryptedData);
    
    try {
      const decoded = atob(encryptedData);
      let decrypted = '';
      
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i) ^ password.charCodeAt(i % password.length);
        decrypted += String.fromCharCode(charCode);
      }
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('復号化エラー:', error);
      throw new Error('データの復号化に失敗しました。パスワードが間違っている可能性があります。');
    }
  }
}