/**
 * Google Drive Auth テストスクリプト
 * 
 * このスクリプトは、Google Drive認証エンドポイントの動作を確認するために使用されます。
 */
'use strict';

const axios = require('axios');

// テスト設定
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const SESSION_COOKIE = process.env.SESSION_COOKIE || ''; // セッションクッキーを環境変数から取得

async function testDriveAuth() {
  console.log('=== Google Drive Auth Test ===');
  console.log('API URL:', API_BASE_URL);
  console.log('Session Cookie:', SESSION_COOKIE ? 'SET' : 'NOT SET');
  
  try {
    // 1. OPTIONS リクエストのテスト
    console.log('\n1. Testing OPTIONS request...');
    try {
      const optionsResponse = await axios.options(`${API_BASE_URL}/auth/google/drive/initiate`, {
        headers: {
          'Origin': 'http://localhost:3001',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'content-type,cookie'
        }
      });
      console.log('OPTIONS Response Status:', optionsResponse.status);
      console.log('OPTIONS Response Headers:', optionsResponse.headers);
    } catch (error) {
      console.error('OPTIONS request failed:', error.response?.status, error.response?.data);
    }
    
    // 2. GET リクエストのテスト（セッションあり）
    if (SESSION_COOKIE) {
      console.log('\n2. Testing GET request with session...');
      try {
        const getResponse = await axios.get(`${API_BASE_URL}/auth/google/drive/initiate`, {
          headers: {
            'Cookie': `session=${SESSION_COOKIE}`,
            'Origin': 'http://localhost:3001'
          },
          withCredentials: true
        });
        console.log('GET Response Status:', getResponse.status);
        console.log('GET Response Data:', JSON.stringify(getResponse.data, null, 2));
      } catch (error) {
        console.error('GET request failed:', error.response?.status, error.response?.data);
      }
    }
    
    // 3. GET リクエストのテスト（セッションなし）
    console.log('\n3. Testing GET request without session...');
    try {
      const getResponse = await axios.get(`${API_BASE_URL}/auth/google/drive/initiate`, {
        headers: {
          'Origin': 'http://localhost:3001'
        }
      });
      console.log('GET Response Status:', getResponse.status);
      console.log('GET Response Data:', JSON.stringify(getResponse.data, null, 2));
    } catch (error) {
      console.error('GET request failed:', error.response?.status, error.response?.data);
      console.error('Error details:', error.response?.data);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// テストを実行
testDriveAuth();