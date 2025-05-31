/**
 * Google Drive OAuth2認証ハンドラー - 詳細デバッグ版
 * redirect_uri_mismatchエラーのデバッグ用
 */
'use strict';

const { google } = require('googleapis');
const { formatResponse, formatErrorResponse } = require('../../utils/responseUtils');
const { getSession } = require('../../services/googleAuthService');
const { parseCookies } = require('../../utils/cookieParser');
const { getCorsHeaders, getCorsOptionsHeaders } = require('../../utils/corsHeaders');
const { getSessionFromRequest } = require('../../utils/sessionHelper');
const { getApiKeys } = require('../../utils/secretsManager');

module.exports.initiateAuth = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      const headers = getCorsOptionsHeaders(event);
      headers['Access-Control-Allow-Headers'] = 'Content-Type, Accept, X-Requested-With, Cookie, Authorization';
      headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }
    
    // セッション情報を取得
    const sessionResult = await getSessionFromRequest(event);
    
    if (!sessionResult.success) {
      const corsHeaders = getCorsHeaders(event);
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          error: {
            code: sessionResult.error || 'NO_SESSION',
            message: sessionResult.message || 'セッションが存在しません'
          }
        })
      };
    }
    
    const session = sessionResult.session;
    const sessionId = sessionResult.source === 'cookie' ? 
      parseCookies(event.headers || {}).session : 
      session.email;
    
    // OAuth2設定の詳細をログ
    console.log('=== DETAILED OAUTH2 CONFIGURATION ===');
    
    // 環境変数の確認
    console.log('Environment variables:');
    console.log('- STAGE:', process.env.STAGE);
    console.log('- AWS_REGION:', process.env.AWS_REGION);
    console.log('- GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI || '(not set)');
    console.log('- GOOGLE_CLIENT_ID from env:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
    console.log('- GOOGLE_CLIENT_SECRET from env:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');
    
    // API Keys取得
    const apiKeys = await getApiKeys();
    const clientId = apiKeys.googleClientId || process.env.GOOGLE_CLIENT_ID || process.env.REACT_APP_GOOGLE_CLIENT_ID;
    const clientSecret = apiKeys.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET || process.env.REACT_APP_GOOGLE_CLIENT_SECRET;
    
    console.log('- Client ID source:', apiKeys.googleClientId ? 'Secrets Manager' : 'Environment');
    console.log('- Client Secret source:', apiKeys.googleClientSecret ? 'Secrets Manager' : 'Environment');
    
    // Redirect URI計算
    const stage = process.env.STAGE || 'dev';
    const apiId = 'x4scpbsuv2';
    const region = process.env.AWS_REGION || 'us-west-2';
    const defaultRedirectUri = stage === 'prod' 
      ? `https://api.portfoliomanager.com/auth/google/drive/callback`
      : `https://${apiId}.execute-api.${region}.amazonaws.com/${stage}/auth/google/drive/callback`;
    
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || defaultRedirectUri;
    
    console.log('\nRedirect URI calculation:');
    console.log('- Stage:', stage);
    console.log('- API ID:', apiId);
    console.log('- Region:', region);
    console.log('- Default redirect URI:', defaultRedirectUri);
    console.log('- Final redirect URI:', redirectUri);
    
    // OAuth2クライアント作成
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    
    // スコープ
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.appdata'
    ];
    
    // 認証URL生成
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: sessionId,
      prompt: 'consent'
    });
    
    console.log('\n=== GENERATED AUTH URL ===');
    console.log('Full URL:', authUrl);
    
    // URLをパースして詳細を表示
    const url = new URL(authUrl);
    console.log('\nURL Components:');
    console.log('- Base URL:', url.origin + url.pathname);
    console.log('- redirect_uri parameter:', url.searchParams.get('redirect_uri'));
    console.log('- client_id parameter:', url.searchParams.get('client_id'));
    console.log('- scope parameter:', url.searchParams.get('scope'));
    console.log('- state parameter:', url.searchParams.get('state'));
    
    console.log('\n=== IMPORTANT ===');
    console.log('The redirect_uri parameter above MUST be registered in Google Cloud Console');
    console.log('at: https://console.cloud.google.com/apis/credentials');
    
    const corsHeaders = getCorsHeaders(event);
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        authUrl,
        debug: {
          redirectUri,
          message: 'Check CloudWatch logs for detailed OAuth configuration'
        }
      })
    };
  } catch (error) {
    console.error('Error in detailed auth:', error);
    const corsHeaders = getCorsHeaders(event);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: {
          code: 'AUTH_URL_ERROR',
          message: error.message
        }
      })
    };
  }
};