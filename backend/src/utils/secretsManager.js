/**
 * AWS Secrets Manager を使用した機密情報管理
 */
'use strict';

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const logger = require('./logger');

let client;
let secretsCache = {};
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24時間キャッシュ（コスト削減）

const getSecretsManagerClient = () => {
  if (!client) {
    client = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-west-2'
    });
  }
  return client;
};

/**
 * Secrets Manager から機密情報を取得
 * @param {string} secretName - シークレット名
 * @param {string} key - JSON内のキー名（オプション）
 * @returns {Promise<string|Object>} シークレット値
 */
const getSecret = async (secretName, key = null) => {
  const cacheKey = key ? `${secretName}:${key}` : secretName;
  
  // キャッシュから取得
  if (secretsCache[cacheKey] && 
      Date.now() - secretsCache[cacheKey].timestamp < CACHE_TTL) {
    return secretsCache[cacheKey].value;
  }
  
  try {
    const client = getSecretsManagerClient();
    const command = new GetSecretValueCommand({
      SecretId: secretName
    });
    
    const response = await client.send(command);
    let secretValue;
    
    if (response.SecretString) {
      try {
        const parsed = JSON.parse(response.SecretString);
        secretValue = key ? parsed[key] : parsed;
      } catch (parseError) {
        // JSONでない場合は文字列として扱う
        secretValue = response.SecretString;
      }
    } else {
      throw new Error('Secret binary data not supported');
    }
    
    // キャッシュに保存
    secretsCache[cacheKey] = {
      value: secretValue,
      timestamp: Date.now()
    };
    
    return secretValue;
  } catch (error) {
    logger.error(`Failed to get secret ${secretName}:`, error.message);
    
    // フォールバック: 環境変数から取得
    const envKey = secretName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const envValue = process.env[envKey];
    
    if (envValue) {
      logger.warn(`Using environment variable fallback for ${secretName}`);
      return envValue;
    }
    
    throw error;
  }
};

/**
 * 安全な API キー取得
 */
const getApiKeys = async () => {
  try {
    // 各シークレットを個別に取得（エラーハンドリングのため）
    let googleOAuth = {};
    let credentials = {};
    let externalApis = {};
    let githubTokenData = {};
    
    // Google OAuth クレデンシャル
    try {
      googleOAuth = await getSecret('pfwise-api/google-oauth');
    } catch (error) {
      logger.warn('pfwise-api/google-oauth not found');
    }
    
    // 認証情報
    try {
      credentials = await getSecret('pfwise-api/credentials');
    } catch (error) {
      logger.warn('pfwise-api/credentials not found');
    }
    
    // 外部API認証情報
    try {
      externalApis = await getSecret('pfwise-api/external-apis');
    } catch (error) {
      logger.warn('pfwise-api/external-apis not found');
    }
    
    // GitHub トークン
    try {
      githubTokenData = await getSecret('pfwise-api/github-token');
    } catch (error) {
      logger.warn('pfwise-api/github-token not found');
    }
    
    return {
      // 外部APIキー
      alphaVantage: externalApis.ALPHA_VANTAGE_API_KEY || process.env.ALPHA_VANTAGE_API_KEY,
      alpacaKey: externalApis.ALPACA_API_KEY || process.env.ALPACA_API_KEY,
      alpacaSecret: externalApis.ALPACA_API_SECRET || process.env.ALPACA_API_SECRET,
      openExchangeRates: externalApis.OPEN_EXCHANGE_RATES_APP_ID || process.env.OPEN_EXCHANGE_RATES_APP_ID,
      fixerApi: externalApis.FIXER_API_KEY || process.env.FIXER_API_KEY,
      
      // Google OAuth
      googleClientId: googleOAuth.clientId || process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: googleOAuth.clientSecret || process.env.GOOGLE_CLIENT_SECRET,
      googleRedirectUri: googleOAuth.redirectUri || process.env.GOOGLE_REDIRECT_URI,
      
      // GitHub
      githubToken: githubTokenData.token || process.env.GITHUB_TOKEN,
      
      // 管理者認証
      adminApiKey: credentials.ADMIN_API_KEY || process.env.ADMIN_API_KEY,
      adminEmail: credentials.ADMIN_EMAIL || process.env.ADMIN_EMAIL,
      cronSecret: credentials.CRON_SECRET || process.env.CRON_SECRET,
      
      // ユーザー認証（将来用）
      userApiKey: credentials.USER_API_KEY || process.env.USER_API_KEY
    };
  } catch (error) {
    logger.warn('Secrets Manager error, using environment variables:', error.message);
    return {
      // 環境変数フォールバック
      alphaVantage: process.env.ALPHA_VANTAGE_API_KEY,
      alpacaKey: process.env.ALPACA_API_KEY,
      alpacaSecret: process.env.ALPACA_API_SECRET,
      githubToken: process.env.GITHUB_TOKEN,
      openExchangeRates: process.env.OPEN_EXCHANGE_RATES_APP_ID,
      fixerApi: process.env.FIXER_API_KEY,
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
      googleRedirectUri: process.env.GOOGLE_REDIRECT_URI,
      adminApiKey: process.env.ADMIN_API_KEY,
      adminEmail: process.env.ADMIN_EMAIL,
      cronSecret: process.env.CRON_SECRET,
      userApiKey: process.env.USER_API_KEY
    };
  }
};

/**
 * Google Client ID を取得
 */
const getGoogleClientId = async () => {
  try {
    const apiKeys = await getApiKeys();
    return apiKeys.googleClientId || '';
  } catch (error) {
    logger.error('Failed to get Google Client ID:', error.message);
    return '';
  }
};

module.exports = {
  getSecret,
  getApiKeys,
  getGoogleClientId
};