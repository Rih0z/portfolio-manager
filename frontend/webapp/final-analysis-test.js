const { chromium } = require('playwright');

async function finalAnalysisTest() {
    console.log('🎯 最終分析テストを開始します...');
    
    const browser = await chromium.launch({ 
        headless: false,
        devtools: true 
    });
    
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    try {
        await page.goto('https://portfolio-wise.com/', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        console.log('\n🔍 問題の根本原因を特定');
        console.log('===========================');
        
        // 1. /api-proxy/ の問題を詳しく調査
        const proxyProblem = await page.evaluate(async () => {
            console.log('🔍 /api-proxy/ 問題を調査中...');
            
            // 実際にapi-proxyエンドポイントをテスト
            try {
                const proxyResponse = await fetch('/api-proxy/api/market-data?type=exchange-rate&base=USD&target=JPY', {
                    method: 'GET'
                });
                
                return {
                    success: true,
                    status: proxyResponse.status,
                    statusText: proxyResponse.statusText,
                    url: proxyResponse.url
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });
        
        console.log('🔍 /api-proxy/ テスト結果:');
        console.log(`   成功: ${proxyProblem.success}`);
        if (proxyProblem.success) {
            console.log(`   ステータス: ${proxyProblem.status}`);
            console.log(`   URL: ${proxyProblem.url}`);
        } else {
            console.log(`   エラー: ${proxyProblem.error}`);
        }
        
        // 2. 直接AWS APIへのアクセステスト（CORSの詳細確認）
        const directApiTest = await page.evaluate(async () => {
            console.log('🔍 直接AWS API接続テスト...');
            
            const tests = {};
            
            // HEALTHエンドポイント（認証不要）
            try {
                const healthResponse = await fetch('https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod/api/health');
                tests.health = {
                    success: true,
                    status: healthResponse.status,
                    headers: Object.fromEntries(healthResponse.headers.entries())
                };
            } catch (error) {
                tests.health = {
                    success: false,
                    error: error.message
                };
            }
            
            // CONFIGエンドポイント（正常に動作することを確認済み）
            try {
                const configResponse = await fetch('https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod/config/public');
                const configData = await configResponse.json();
                tests.config = {
                    success: true,
                    status: configResponse.status,
                    data: configData
                };
            } catch (error) {
                tests.config = {
                    success: false,
                    error: error.message
                };
            }
            
            return tests;
        });
        
        console.log('\n🔍 直接AWS API テスト結果:');
        Object.entries(directApiTest).forEach(([testName, result]) => {
            console.log(`\n${testName.toUpperCase()}:`);
            if (result.success) {
                console.log(`   ✅ 成功 - Status: ${result.status}`);
                if (result.data) {
                    console.log(`   データ:`, JSON.stringify(result.data, null, 2));
                }
                if (result.headers) {
                    console.log(`   CORS ヘッダー:`);
                    const corsHeaders = ['access-control-allow-origin', 'access-control-allow-credentials', 'access-control-allow-methods'];
                    corsHeaders.forEach(header => {
                        if (result.headers[header]) {
                            console.log(`     ${header}: ${result.headers[header]}`);
                        }
                    });
                }
            } else {
                console.log(`   ❌ 失敗 - Error: ${result.error}`);
            }
        });
        
        // 3. 実際のフロントエンドのAPI設定を確認
        const frontendApiSettings = await page.evaluate(() => {
            // React環境変数の確認（window.envから）
            const reactEnv = typeof window.env !== 'undefined' ? window.env : {};
            
            // APIクライアントの設定確認
            let apiClientConfig;
            try {
                // グローバルスコープでAPIクライアントの設定を確認
                apiClientConfig = {
                    found: 'API client configuration details not directly accessible'
                };
            } catch (e) {
                apiClientConfig = { error: e.message };
            }
            
            return {
                reactEnv,
                apiClientConfig,
                location: {
                    origin: window.location.origin,
                    pathname: window.location.pathname
                }
            };
        });
        
        console.log('\n⚙️ フロントエンド設定:');
        console.log('React環境:', frontendApiSettings.reactEnv);
        console.log('Location:', frontendApiSettings.location);
        
        // 4. 認証フローの詳細確認
        console.log('\n🔐 認証フロー詳細確認');
        console.log('===========================');
        
        // Google認証ボタンを見つけて詳細確認
        const authButtonInfo = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const authButton = buttons.find(btn => 
                btn.textContent.includes('Google') || 
                btn.textContent.includes('ログイン')
            );
            
            if (authButton) {
                return {
                    found: true,
                    text: authButton.textContent,
                    disabled: authButton.disabled,
                    className: authButton.className,
                    onclick: authButton.onclick ? authButton.onclick.toString() : null
                };
            }
            
            return { found: false };
        });
        
        console.log('🔘 認証ボタン情報:');
        if (authButtonInfo.found) {
            console.log(`   テキスト: "${authButtonInfo.text}"`);
            console.log(`   無効化: ${authButtonInfo.disabled}`);
            console.log(`   クラス: ${authButtonInfo.className}`);
        } else {
            console.log('   ❌ 認証ボタンが見つかりません');
        }
        
        // 5. 最終的な問題特定
        console.log('\n🎯 問題の特定と推奨解決策');
        console.log('===========================');
        
        const issues = [];
        const solutions = [];
        
        if (!proxyProblem.success || proxyProblem.status === 502) {
            issues.push('❌ /api-proxy/ エンドポイントが502エラー');
            solutions.push('✅ Cloudflare Pages の _redirects ファイルでプロキシ設定を修正');
        }
        
        if (!directApiTest.health || !directApiTest.health.success) {
            issues.push('❌ 直接AWS APIアクセスがCORSエラー');
            solutions.push('✅ AWS API Gateway のCORS設定を credentials: include に対応するよう修正');
        }
        
        if (directApiTest.config && directApiTest.config.success) {
            issues.push('✅ Config API は正常動作（CORS設定が正しい）');
        }
        
        console.log('\n🔍 発見された問題:');
        issues.forEach(issue => console.log(`   ${issue}`));
        
        console.log('\n💡 推奨解決策:');
        solutions.forEach(solution => console.log(`   ${solution}`));
        
        // 最終スクリーンショット
        await page.screenshot({ 
            path: '/Users/kokiriho/Documents/Projects/pfwise/portfolio-manager/frontend/webapp/final-analysis-screenshot.png',
            fullPage: true 
        });
        
        console.log('\n📊 最終テスト結果サマリー');
        console.log('===========================');
        console.log(`✅ ページ正常ロード: 正常`);
        console.log(`✅ Config API: ${directApiTest.config?.success ? '成功' : '失敗'}`);
        console.log(`❌ Market Data (proxy): ${proxyProblem.success && proxyProblem.status === 200 ? '成功' : '失敗'}`);
        console.log(`❌ Direct API CORS: ${directApiTest.health?.success ? '成功' : '失敗'}`);
        console.log(`✅ 認証ボタン: ${authButtonInfo.found ? '発見' : '未発見'}`);
        
    } catch (error) {
        console.error('❌ 最終分析テスト実行中にエラー:', error);
    } finally {
        await browser.close();
        console.log('🏁 最終分析テスト完了');
    }
}

// メイン実行
finalAnalysisTest().catch(console.error);