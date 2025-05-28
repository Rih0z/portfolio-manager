#!/usr/bin/env node

/**
 * Debug script for OAuth redirect URI mismatch issue
 */

const { google } = require('googleapis');

async function debugOAuthRedirect() {
  console.log('=== OAuth Redirect URI Debug Tool ===\n');
  
  // Configuration from environment
  const stage = process.env.STAGE || 'dev';
  const apiId = 'x4scpbsuv2';
  const region = process.env.AWS_REGION || 'us-west-2';
  
  // Test different redirect URI configurations
  const redirectUris = [
    {
      name: 'API Gateway URL (dev)',
      uri: `https://${apiId}.execute-api.${region}.amazonaws.com/${stage}/auth/google/drive/callback`
    },
    {
      name: 'API Gateway URL with trailing slash',
      uri: `https://${apiId}.execute-api.${region}.amazonaws.com/${stage}/auth/google/drive/callback/`
    },
    {
      name: 'Custom domain (prod)',
      uri: 'https://api.portfoliomanager.com/auth/google/drive/callback'
    },
    {
      name: 'Localhost (debug)',
      uri: 'http://localhost:3000/api/auth/google/drive/callback'
    },
    {
      name: 'Environment variable',
      uri: process.env.GOOGLE_REDIRECT_URI || 'Not set'
    }
  ];
  
  console.log('Configured Redirect URIs:\n');
  redirectUris.forEach((config, index) => {
    console.log(`${index + 1}. ${config.name}:`);
    console.log(`   URI: ${config.uri}`);
    console.log(`   Encoded: ${encodeURIComponent(config.uri)}\n`);
  });
  
  // Generate OAuth URLs for each configuration
  console.log('Generated OAuth URLs:\n');
  
  const clientId = 'dummy-client-id';
  const clientSecret = 'dummy-client-secret';
  const scopes = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.appdata'
  ];
  
  redirectUris.slice(0, 4).forEach((config, index) => {
    try {
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, config.uri);
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        state: 'test-session',
        prompt: 'consent'
      });
      
      const url = new URL(authUrl);
      console.log(`${index + 1}. ${config.name}:`);
      console.log(`   Full URL: ${authUrl.substring(0, 100)}...`);
      console.log(`   redirect_uri param: ${url.searchParams.get('redirect_uri')}\n`);
    } catch (error) {
      console.log(`${index + 1}. ${config.name}: ERROR - ${error.message}\n`);
    }
  });
  
  // Instructions for fixing the issue
  console.log('=== Troubleshooting Steps ===\n');
  console.log('1. Verify the exact redirect URI in Google Cloud Console:');
  console.log('   - Go to https://console.cloud.google.com/apis/credentials');
  console.log('   - Click on your OAuth 2.0 Client ID');
  console.log('   - Check "Authorized redirect URIs" section\n');
  
  console.log('2. Common issues to check:');
  console.log('   - Trailing slash mismatch (with vs without)');
  console.log('   - Protocol mismatch (http vs https)');
  console.log('   - Case sensitivity in the path');
  console.log('   - Extra query parameters or fragments');
  console.log('   - Whitespace in the URI\n');
  
  console.log('3. Current environment:');
  console.log(`   - STAGE: ${process.env.STAGE || 'not set (defaulting to dev)'}`);
  console.log(`   - AWS_REGION: ${process.env.AWS_REGION || 'not set (defaulting to us-west-2)'}`);
  console.log(`   - GOOGLE_REDIRECT_URI: ${process.env.GOOGLE_REDIRECT_URI || 'not set'}\n`);
  
  console.log('4. To add the correct redirect URI to Google Cloud Console:');
  console.log(`   Copy this exact URI: https://${apiId}.execute-api.${region}.amazonaws.com/${stage}/auth/google/drive/callback`);
}

debugOAuthRedirect().catch(console.error);