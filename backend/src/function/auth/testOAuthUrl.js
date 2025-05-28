/**
 * Test function to debug OAuth URL generation
 */
'use strict';

const { google } = require('googleapis');
const { getApiKeys } = require('../../utils/secretsManager');

module.exports.handler = async (event) => {
  try {
    console.log('=== OAuth URL Test Function ===');
    console.log('Event:', JSON.stringify(event, null, 2));
    
    // Get credentials
    const apiKeys = await getApiKeys();
    const clientId = apiKeys.googleClientId || process.env.GOOGLE_CLIENT_ID || process.env.REACT_APP_GOOGLE_CLIENT_ID;
    const clientSecret = apiKeys.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET || process.env.REACT_APP_GOOGLE_CLIENT_SECRET;
    
    // Construct redirect URIs
    const stage = process.env.STAGE || 'dev';
    const apiId = 'x4scpbsuv2';
    const region = process.env.AWS_REGION || 'us-west-2';
    
    const redirectUris = {
      fromCode: stage === 'prod' 
        ? `https://api.portfoliomanager.com/auth/google/drive/callback`
        : `https://${apiId}.execute-api.${region}.amazonaws.com/${stage}/auth/google/drive/callback`,
      fromEnv: process.env.GOOGLE_REDIRECT_URI,
      fromServerlessYml: process.env.GOOGLE_REDIRECT_URI || `https://${apiId}.execute-api.${region}.amazonaws.com/${stage}/auth/google/drive/callback`
    };
    
    console.log('Redirect URI configurations:', redirectUris);
    
    // Create OAuth client with each redirect URI
    const results = {};
    
    for (const [source, redirectUri] of Object.entries(redirectUris)) {
      if (!redirectUri) continue;
      
      try {
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        const authUrl = oauth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: [
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/drive.appdata'
          ],
          state: 'test-session',
          prompt: 'consent'
        });
        
        const url = new URL(authUrl);
        results[source] = {
          redirectUri,
          generatedUrl: authUrl,
          extractedRedirectUri: url.searchParams.get('redirect_uri'),
          matches: redirectUri === url.searchParams.get('redirect_uri')
        };
      } catch (error) {
        results[source] = {
          redirectUri,
          error: error.message
        };
      }
    }
    
    // Get the actual event request info
    const requestInfo = {
      method: event.httpMethod,
      path: event.path,
      host: event.headers?.Host || event.headers?.host,
      origin: event.headers?.origin || event.headers?.Origin,
      stage: event.requestContext?.stage,
      apiId: event.requestContext?.apiId,
      domainName: event.requestContext?.domainName,
      fullUrl: `https://${event.requestContext?.domainName}${event.path}`
    };
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        environment: {
          STAGE: process.env.STAGE,
          AWS_REGION: process.env.AWS_REGION,
          GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret
        },
        requestInfo,
        redirectUriTests: results,
        recommendation: `Based on your request, the redirect URI should be: ${requestInfo.fullUrl}`,
        googleConsoleInstructions: [
          'Go to https://console.cloud.google.com/apis/credentials',
          'Click on your OAuth 2.0 Client ID',
          'In "Authorized redirect URIs", add exactly:',
          requestInfo.fullUrl || redirectUris.fromCode
        ]
      }, null, 2)
    };
  } catch (error) {
    console.error('Test function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      })
    };
  }
};