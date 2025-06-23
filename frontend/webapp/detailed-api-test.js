const { chromium } = require('playwright');

async function detailedApiTest() {
    console.log('🔍 詳細APIテストを開始します...');
    
    const browser = await chromium.launch({ 
        headless: false,
        devtools: true 
    });
    
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // ネットワーク通信を監視
    const networkRequests = [];
    page.on('request', request => {
        networkRequests.push({
            url: request.url(),
            method: request.method(),
            headers: request.headers(),
            timestamp: Date.now()
        });
    });
    
    const networkResponses = [];
    page.on('response', response => {
        networkResponses.push({
            url: response.url(),
            status: response.status(),
            statusText: response.statusText(),
            headers: response.headers(),
            timestamp: Date.now()
        });
    });
    
    try {
        console.log('\n📊 ネットワーク監視を開始');
        console.log('===========================');
        
        await page.goto('https://portfolio-wise.com/', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        console.log('\n🔍 API関連のネットワーク通信を分析');
        console.log('===========================');
        
        // API関連のリクエストをフィルタ
        const apiRequests = networkRequests.filter(req => 
            req.url.includes('/api') || 
            req.url.includes('execute-api') ||
            req.url.includes('/auth')
        );
        
        const apiResponses = networkResponses.filter(res => 
            res.url.includes('/api') || 
            res.url.includes('execute-api') ||
            res.url.includes('/auth')
        );
        
        console.log(`📈 総ネットワークリクエスト数: ${networkRequests.length}`);
        console.log(`🔌 API関連リクエスト数: ${apiRequests.length}`);
        console.log(`📋 API関連レスポンス数: ${apiResponses.length}`);
        
        if (apiRequests.length > 0) {
            console.log('\n📋 API リクエスト詳細:');
            apiRequests.forEach((req, index) => {
                console.log(`\n${index + 1}. ${req.method} ${req.url}`);
                console.log(`   時刻: ${new Date(req.timestamp).toLocaleTimeString()}`);
                if (req.headers['authorization']) {
                    console.log(`   認証: 有り`);
                }
                if (req.headers['content-type']) {
                    console.log(`   Content-Type: ${req.headers['content-type']}`);
                }
            });
        }
        
        if (apiResponses.length > 0) {
            console.log('\n📋 API レスポンス詳細:');
            apiResponses.forEach((res, index) => {
                console.log(`\n${index + 1}. ${res.status} ${res.statusText} - ${res.url}`);
                console.log(`   時刻: ${new Date(res.timestamp).toLocaleTimeString()}`);
                if (res.headers['access-control-allow-origin']) {
                    console.log(`   CORS Origin: ${res.headers['access-control-allow-origin']}`);
                }
                if (res.headers['access-control-allow-credentials']) {
                    console.log(`   CORS Credentials: ${res.headers['access-control-allow-credentials']}`);
                }
            });
        }
        
        console.log('\n🔧 フロントエンドの設定確認');
        console.log('===========================');
        
        const frontendConfig = await page.evaluate(() => {
            // React環境変数の確認
            const envVars = {
                API_BASE_URL: process.env.REACT_APP_API_BASE_URL,
                DEFAULT_EXCHANGE_RATE: process.env.REACT_APP_DEFAULT_EXCHANGE_RATE,
                NODE_ENV: process.env.NODE_ENV
            };
            
            // グローバル設定の確認
            const windowConfig = {
                location: {
                    origin: window.location.origin,
                    href: window.location.href
                },
                navigator: {
                    userAgent: navigator.userAgent.substring(0, 100)
                }
            };
            
            return { envVars, windowConfig };
        });
        
        console.log('🔧 環境変数:');
        Object.entries(frontendConfig.envVars).forEach(([key, value]) => {
            console.log(`   ${key}: ${value || '未設定'}`);
        });
        
        console.log('🌐 ブラウザ情報:');
        console.log(`   Origin: ${frontendConfig.windowConfig.location.origin}`);
        console.log(`   URL: ${frontendConfig.windowConfig.location.href}`);
        console.log(`   User Agent: ${frontendConfig.windowConfig.navigator.userAgent}...`);
        
        console.log('\n🧪 手動CORS テスト');
        console.log('===========================');
        
        // より簡単なCORSテスト
        const corsTestResult = await page.evaluate(async () => {
            const results = {};
            
            // 1. シンプルなGETリクエスト（CORSプリフライトなし）
            try {
                const simpleResponse = await fetch('https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod/api/health', {
                    method: 'GET'
                });
                results.simpleGet = {
                    success: true,
                    status: simpleResponse.status,
                    statusText: simpleResponse.statusText
                };
            } catch (error) {
                results.simpleGet = {
                    success: false,
                    error: error.message
                };
            }
            
            // 2. OPTIONS リクエスト（プリフライト）
            try {
                const optionsResponse = await fetch('https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod/auth/google/login', {
                    method: 'OPTIONS',
                    headers: {
                        'Access-Control-Request-Method': 'POST',
                        'Access-Control-Request-Headers': 'Content-Type'
                    }
                });
                results.optionsRequest = {
                    success: true,
                    status: optionsResponse.status,
                    headers: Object.fromEntries(optionsResponse.headers.entries())
                };
            } catch (error) {
                results.optionsRequest = {
                    success: false,
                    error: error.message
                };
            }
            
            // 3. credentials なしでPOST
            try {
                const noCookiesResponse = await fetch('https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod/auth/google/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ test: true })
                });
                results.postNoCookies = {
                    success: true,
                    status: noCookiesResponse.status
                };
            } catch (error) {
                results.postNoCookies = {
                    success: false,
                    error: error.message
                };
            }
            
            return results;
        });
        
        console.log('🧪 CORS テスト結果:');
        Object.entries(corsTestResult).forEach(([testName, result]) => {
            console.log(`\n${testName}:`);
            if (result.success) {
                console.log(`   ✅ 成功 - Status: ${result.status}`);
                if (result.headers) {
                    console.log(`   ヘッダー:`, JSON.stringify(result.headers, null, 4));
                }
            } else {
                console.log(`   ❌ 失敗 - Error: ${result.error}`);
            }
        });
        
        // 実際のフロントエンドAPI設定を確認
        console.log('\n⚙️ フロントエンドAPI設定の実際の値を確認');
        console.log('===========================');
        
        const actualApiConfig = await page.evaluate(() => {
            // ローカルストレージの確認
            const localStorage = Object.keys(window.localStorage).reduce((acc, key) => {
                acc[key] = window.localStorage.getItem(key);
                return acc;
            }, {});
            
            // セッションストレージの確認
            const sessionStorage = Object.keys(window.sessionStorage).reduce((acc, key) => {
                acc[key] = window.sessionStorage.getItem(key);
                return acc;
            }, {});
            
            return {
                localStorage: localStorage,
                sessionStorage: sessionStorage,
                cookies: document.cookie
            };
        });
        
        console.log('💾 ローカルストレージ:');
        Object.entries(actualApiConfig.localStorage).forEach(([key, value]) => {
            console.log(`   ${key}: ${value?.substring(0, 100)}${value?.length > 100 ? '...' : ''}`);
        });
        
        console.log('🍪 Cookies:', actualApiConfig.cookies || '空');
        
    } catch (error) {
        console.error('❌ 詳細テスト実行中にエラー:', error);
    } finally {
        await browser.close();
        console.log('🏁 詳細テスト完了');
    }
}

// メイン実行
detailedApiTest().catch(console.error);