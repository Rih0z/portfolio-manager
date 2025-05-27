#!/usr/bin/env node

/**
 * Authentication Endpoints Test Script
 * Tests all authentication endpoints with CORS validation
 */

const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = process.env.REACT_APP_MARKET_DATA_API_URL || 'https://api.portfolio-wise.com';
const API_STAGE = process.env.REACT_APP_API_STAGE || 'dev';
const TEST_TOKEN = process.env.TEST_AUTH_TOKEN || 'test-jwt-token';

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  apiBaseUrl: API_BASE_URL,
  apiStage: API_STAGE,
  endpoints: {},
  summary: {
    total: 0,
    passed: 0,
    failed: 0
  }
};

// Create axios instance with proper configuration
const client = axios.create({
  timeout: 10000,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false // For testing only
  }),
  validateStatus: () => true // Accept all status codes
});

// Helper function to log results
function logResult(endpoint, method, result) {
  const key = `${method} ${endpoint}`;
  testResults.endpoints[key] = result;
  testResults.summary.total++;
  
  if (result.success) {
    testResults.summary.passed++;
    console.log(`✅ ${key}: ${result.status} - ${result.message}`);
  } else {
    testResults.summary.failed++;
    console.error(`❌ ${key}: ${result.status || 'ERROR'} - ${result.message}`);
  }
}

// Test CORS preflight request
async function testCORSPreflight(endpoint) {
  const url = `${API_BASE_URL}/${API_STAGE}/${endpoint}`;
  console.log(`\n🔍 Testing CORS preflight for: ${url}`);
  
  try {
    const response = await client.options(url, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization,content-type'
      }
    });
    
    const result = {
      success: response.status === 200 || response.status === 204,
      status: response.status,
      message: 'CORS preflight request',
      headers: {
        'access-control-allow-origin': response.headers['access-control-allow-origin'],
        'access-control-allow-methods': response.headers['access-control-allow-methods'],
        'access-control-allow-headers': response.headers['access-control-allow-headers'],
        'access-control-allow-credentials': response.headers['access-control-allow-credentials'],
        'access-control-max-age': response.headers['access-control-max-age']
      }
    };
    
    logResult(endpoint, 'OPTIONS', result);
    return result;
  } catch (error) {
    const result = {
      success: false,
      status: error.response?.status,
      message: error.message,
      error: error.toString()
    };
    
    logResult(endpoint, 'OPTIONS', result);
    return result;
  }
}

// Test GET /auth/session endpoint
async function testSessionEndpoint() {
  const endpoint = 'auth/session';
  const url = `${API_BASE_URL}/${API_STAGE}/${endpoint}`;
  console.log(`\n🔍 Testing session endpoint: ${url}`);
  
  // Test without token
  try {
    const response = await client.get(url, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Accept': 'application/json'
      }
    });
    
    const result = {
      success: true,
      status: response.status,
      message: 'Session check without token',
      data: response.data,
      headers: {
        'access-control-allow-origin': response.headers['access-control-allow-origin'],
        'content-type': response.headers['content-type']
      }
    };
    
    logResult(endpoint, 'GET (no auth)', result);
  } catch (error) {
    const result = {
      success: false,
      status: error.response?.status,
      message: `Session check without token failed: ${error.message}`,
      error: error.toString()
    };
    
    logResult(endpoint, 'GET (no auth)', result);
  }
  
  // Test with token
  try {
    const response = await client.get(url, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Accept': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });
    
    const result = {
      success: true,
      status: response.status,
      message: 'Session check with token',
      data: response.data,
      headers: {
        'access-control-allow-origin': response.headers['access-control-allow-origin'],
        'content-type': response.headers['content-type']
      }
    };
    
    logResult(endpoint, 'GET (with auth)', result);
  } catch (error) {
    const result = {
      success: false,
      status: error.response?.status,
      message: `Session check with token failed: ${error.message}`,
      error: error.toString()
    };
    
    logResult(endpoint, 'GET (with auth)', result);
  }
}

// Test POST /auth/logout endpoint
async function testLogoutEndpoint() {
  const endpoint = 'auth/logout';
  const url = `${API_BASE_URL}/${API_STAGE}/${endpoint}`;
  console.log(`\n🔍 Testing logout endpoint: ${url}`);
  
  // Test without token
  try {
    const response = await client.post(url, {}, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    const result = {
      success: true,
      status: response.status,
      message: 'Logout without token',
      data: response.data,
      headers: {
        'access-control-allow-origin': response.headers['access-control-allow-origin'],
        'content-type': response.headers['content-type']
      }
    };
    
    logResult(endpoint, 'POST (no auth)', result);
  } catch (error) {
    const result = {
      success: false,
      status: error.response?.status,
      message: `Logout without token failed: ${error.message}`,
      error: error.toString()
    };
    
    logResult(endpoint, 'POST (no auth)', result);
  }
  
  // Test with token
  try {
    const response = await client.post(url, {}, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });
    
    const result = {
      success: true,
      status: response.status,
      message: 'Logout with token',
      data: response.data,
      headers: {
        'access-control-allow-origin': response.headers['access-control-allow-origin'],
        'content-type': response.headers['content-type']
      }
    };
    
    logResult(endpoint, 'POST (with auth)', result);
  } catch (error) {
    const result = {
      success: false,
      status: error.response?.status,
      message: `Logout with token failed: ${error.message}`,
      error: error.toString()
    };
    
    logResult(endpoint, 'POST (with auth)', result);
  }
}

// Test POST /auth/google/login endpoint
async function testGoogleLoginEndpoint() {
  const endpoint = 'auth/google/login';
  const url = `${API_BASE_URL}/${API_STAGE}/${endpoint}`;
  console.log(`\n🔍 Testing Google login endpoint: ${url}`);
  
  try {
    const response = await client.post(url, {
      code: 'test-google-auth-code',
      redirectUri: 'http://localhost:3000/auth/callback'
    }, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    const result = {
      success: true,
      status: response.status,
      message: 'Google login test',
      data: response.data,
      headers: {
        'access-control-allow-origin': response.headers['access-control-allow-origin'],
        'content-type': response.headers['content-type']
      }
    };
    
    logResult(endpoint, 'POST', result);
  } catch (error) {
    const result = {
      success: false,
      status: error.response?.status,
      message: `Google login test failed: ${error.message}`,
      error: error.toString()
    };
    
    logResult(endpoint, 'POST', result);
  }
}

// Test all endpoints with different origins
async function testWithDifferentOrigins() {
  const origins = [
    'http://localhost:3000',
    'https://localhost:3000',
    'https://portfolio-wise.com',
    'https://www.portfolio-wise.com'
  ];
  
  console.log('\n📍 Testing with different origins...');
  
  for (const origin of origins) {
    console.log(`\n🌐 Testing with origin: ${origin}`);
    
    const endpoint = 'auth/session';
    const url = `${API_BASE_URL}/${API_STAGE}/${endpoint}`;
    
    try {
      const response = await client.get(url, {
        headers: {
          'Origin': origin,
          'Accept': 'application/json'
        }
      });
      
      const corsHeader = response.headers['access-control-allow-origin'];
      console.log(`   CORS header: ${corsHeader || 'Not present'}`);
      console.log(`   Status: ${response.status}`);
      
      testResults.endpoints[`${origin} - GET ${endpoint}`] = {
        success: !!corsHeader,
        status: response.status,
        corsHeader: corsHeader,
        message: `Origin test for ${origin}`
      };
    } catch (error) {
      console.error(`   Error: ${error.message}`);
      testResults.endpoints[`${origin} - GET ${endpoint}`] = {
        success: false,
        status: error.response?.status,
        message: `Origin test failed for ${origin}: ${error.message}`
      };
    }
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Authentication Endpoint Tests');
  console.log(`📍 API Base URL: ${API_BASE_URL}`);
  console.log(`📍 API Stage: ${API_STAGE}`);
  console.log(`📍 Test started at: ${testResults.timestamp}`);
  
  // Test CORS preflight for all endpoints
  await testCORSPreflight('auth/session');
  await testCORSPreflight('auth/logout');
  await testCORSPreflight('auth/google/login');
  
  // Test actual endpoints
  await testSessionEndpoint();
  await testLogoutEndpoint();
  await testGoogleLoginEndpoint();
  
  // Test with different origins
  await testWithDifferentOrigins();
  
  // Save results to file
  const resultPath = path.join(__dirname, '..', 'auth-test-results.json');
  fs.writeFileSync(resultPath, JSON.stringify(testResults, null, 2));
  
  // Print summary
  console.log('\n📊 Test Summary:');
  console.log(`   Total tests: ${testResults.summary.total}`);
  console.log(`   ✅ Passed: ${testResults.summary.passed}`);
  console.log(`   ❌ Failed: ${testResults.summary.failed}`);
  console.log(`\n📁 Results saved to: ${resultPath}`);
  
  // Exit with appropriate code
  process.exit(testResults.summary.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});