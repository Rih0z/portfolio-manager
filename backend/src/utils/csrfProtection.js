const crypto = require('crypto');

/**
 * CSRFトークンの生成
 * @param {string} sessionId - セッションID
 * @param {string} secret - アプリケーションシークレット
 * @returns {string} CSRFトークン
 */
function generateCSRFToken(sessionId, secret) {
    const timestamp = Date.now();
    const data = `${sessionId}:${timestamp}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(data);
    const signature = hmac.digest('hex');
    
    // Base64エンコード（URLセーフ）
    const token = Buffer.from(`${data}:${signature}`).toString('base64url');
    return token;
}

/**
 * CSRFトークンの検証
 * @param {string} token - 検証するトークン
 * @param {string} sessionId - セッションID
 * @param {string} secret - アプリケーションシークレット
 * @param {number} maxAge - トークンの有効期限（ミリ秒）
 * @returns {boolean} 検証結果
 */
function validateCSRFToken(token, sessionId, secret, maxAge = 3600000) { // デフォルト1時間
    try {
        // Base64デコード
        const decoded = Buffer.from(token, 'base64url').toString();
        const parts = decoded.split(':');
        
        if (parts.length !== 3) {
            return false;
        }
        
        const [tokenSessionId, timestamp, signature] = parts;
        
        // セッションIDの確認
        if (tokenSessionId !== sessionId) {
            return false;
        }
        
        // タイムスタンプの確認
        const tokenTime = parseInt(timestamp);
        if (isNaN(tokenTime) || Date.now() - tokenTime > maxAge) {
            return false;
        }
        
        // 署名の検証
        const data = `${tokenSessionId}:${timestamp}`;
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(data);
        const expectedSignature = hmac.digest('hex');
        
        return signature === expectedSignature;
    } catch (error) {
        console.error('CSRF token validation error:', error);
        return false;
    }
}

/**
 * CSRFミドルウェア
 * @param {string} secret - アプリケーションシークレット
 * @returns {Function} Express/Lambda middleware
 */
function csrfMiddleware(secret) {
    return (req, res, next) => {
        // GETリクエストとOPTIONSリクエストはスキップ
        if (req.method === 'GET' || req.method === 'OPTIONS') {
            return next();
        }
        
        // セッションIDの取得
        const sessionId = req.sessionId || req.headers['x-session-id'];
        if (!sessionId) {
            return res.status(401).json({ error: 'No session found' });
        }
        
        // CSRFトークンの取得（ヘッダーまたはボディから）
        const token = req.headers['x-csrf-token'] || req.body?.csrfToken;
        if (!token) {
            return res.status(403).json({ error: 'CSRF token missing' });
        }
        
        // トークンの検証
        if (!validateCSRFToken(token, sessionId, secret)) {
            return res.status(403).json({ error: 'Invalid CSRF token' });
        }
        
        next();
    };
}

module.exports = {
    generateCSRFToken,
    validateCSRFToken,
    csrfMiddleware
};