import { apiClient } from '../services/api';

class CSRFManager {
    constructor() {
        this.token = null;
        this.tokenExpiry = null;
        this.refreshPromise = null;
    }

    /**
     * CSRFトークンを取得（必要に応じて更新）
     * @returns {Promise<string>} CSRFトークン
     */
    async getToken() {
        // トークンが有効な場合はそのまま返す
        if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.token;
        }

        // 既に更新中の場合は、その Promise を待つ
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        // 新しいトークンを取得
        this.refreshPromise = this.refreshToken();
        try {
            const token = await this.refreshPromise;
            return token;
        } finally {
            this.refreshPromise = null;
        }
    }

    /**
     * CSRFトークンを更新
     * @returns {Promise<string>} 新しいCSRFトークン
     */
    async refreshToken() {
        try {
            const sessionId = localStorage.getItem('sessionId');
            if (!sessionId) {
                throw new Error('No session found');
            }

            const response = await apiClient.post('/auth/csrf-token', {}, {
                headers: {
                    'X-Session-Id': sessionId
                }
            });

            if (response.data.csrfToken) {
                this.token = response.data.csrfToken;
                // 有効期限を設定（サーバーの期限より少し短めに）
                this.tokenExpiry = Date.now() + (response.data.expiresIn - 60) * 1000;
                return this.token;
            }

            throw new Error('Invalid CSRF token response');
        } catch (error) {
            console.error('Failed to refresh CSRF token:', error);
            throw error;
        }
    }

    /**
     * 保存されているトークンをクリア
     */
    clearToken() {
        this.token = null;
        this.tokenExpiry = null;
        this.refreshPromise = null;
    }

    /**
     * APIリクエストにCSRFトークンを追加
     * @param {Object} config - Axiosの設定オブジェクト
     * @returns {Promise<Object>} 更新された設定オブジェクト
     */
    async addTokenToRequest(config) {
        // GETリクエストにはCSRFトークンは不要
        if (config.method === 'get') {
            return config;
        }

        try {
            const token = await this.getToken();
            config.headers = config.headers || {};
            config.headers['X-CSRF-Token'] = token;
            return config;
        } catch (error) {
            // CSRFトークンの取得に失敗しても、リクエストは続行
            console.warn('Failed to add CSRF token:', error);
            return config;
        }
    }
}

// シングルトンインスタンス
const csrfManager = new CSRFManager();

export default csrfManager;