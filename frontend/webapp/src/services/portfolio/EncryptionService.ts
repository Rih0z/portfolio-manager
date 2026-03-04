/**
 * データ暗号化サービス
 *
 * Single Responsibility: データの暗号化と復号化のみを担当
 */

export class EncryptionService {
  /**
   * パスワードが設定されているかチェック
   */
  static hasPassword(): boolean {
    return localStorage.getItem('portfolio_password_hash') !== null;
  }

  /**
   * パスワードを設定
   */
  static async setPassword(password: string): Promise<void> {
    const hash = await this.hashPassword(password);
    localStorage.setItem('portfolio_password_hash', hash);
  }

  /**
   * パスワードを検証
   */
  static async verifyPassword(password: string): Promise<boolean> {
    const storedHash = localStorage.getItem('portfolio_password_hash');
    if (!storedHash) return false;

    const hash = await this.hashPassword(password);
    return hash === storedHash;
  }

  /**
   * パスワードをハッシュ化
   * @private
   */
  static async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * データを暗号化
   */
  static encrypt(data: any, password: string): string {
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
   */
  static decrypt(encryptedData: string, password: string): any {
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
