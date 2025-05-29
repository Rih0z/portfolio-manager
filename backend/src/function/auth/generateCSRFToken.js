const AWS = require('aws-sdk');
const { generateCSRFToken } = require('../../utils/csrfProtection');
const secretsManager = new AWS.SecretsManager();

let cachedSecret = null;
let secretCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分

async function getAppSecret() {
    const now = Date.now();
    if (cachedSecret && now - secretCacheTime < CACHE_DURATION) {
        return cachedSecret;
    }

    try {
        const response = await secretsManager.getSecretValue({
            SecretId: 'portfolio-manager/app-secrets'
        }).promise();
        
        const secrets = JSON.parse(response.SecretString);
        cachedSecret = secrets.CSRF_SECRET || secrets.APP_SECRET;
        secretCacheTime = now;
        
        return cachedSecret;
    } catch (error) {
        console.error('Failed to get app secret:', error);
        throw error;
    }
}

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Content-Type,X-Session-Id,Authorization',
        'Cache-Control': 'no-store, max-age=0'
    };

    try {
        // セッションIDの取得
        const sessionId = event.headers?.['x-session-id'] || 
                         event.headers?.['X-Session-Id'] ||
                         event.requestContext?.authorizer?.sessionId;
        
        if (!sessionId) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'No session found' })
            };
        }

        // アプリケーションシークレットの取得
        const appSecret = await getAppSecret();
        
        // CSRFトークンの生成
        const csrfToken = generateCSRFToken(sessionId, appSecret);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                csrfToken,
                expiresIn: 3600 // 1時間
            })
        };
    } catch (error) {
        console.error('CSRF token generation error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to generate CSRF token' })
        };
    }
};