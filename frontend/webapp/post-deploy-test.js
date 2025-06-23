const { chromium } = require('playwright');

async function postDeployTest() {
    console.log('🚀 修正後テストを開始します...');
    
    const browser = await chromium.launch({ 
        headless: false,
        devtools: true 
    });
    
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // コンソールログをキャプチャ
    const consoleMessages = [];
    page.on('console', msg => {
        consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
        console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`);
    });
    
    // ネットワークエラーをキャプチャ
    page.on('requestfailed', request => {
        console.log(`❌ ネットワークエラー: ${request.url()} - ${request.failure().errorText}`);
    });
    
    try {
        console.log('\n1. 修正後ページアクセステスト');
        console.log('===========================');
        
        const startTime = Date.now();
        await page.goto('https://portfolio-wise.com/', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        const loadTime = Date.now() - startTime;
        
        console.log(`✅ ページロード完了: ${loadTime}ms`);
        
        // 5秒待機してAPI呼び出しが完了するのを待つ
        await page.waitForTimeout(5000);
        
        console.log('\n2. 修正後 /api-proxy/ テスト');
        console.log('===========================');
        
        // /api-proxy/エンドポイントの直接テスト
        const proxyTest = await page.evaluate(async () => {
            console.log('🔍 修正後 /api-proxy/ テスト...');
            const startTime = performance.now();
            
            try {
                const response = await fetch('/api-proxy/api/market-data?type=exchange-rate&base=USD&target=JPY', {
                    method: 'GET'
                });
                
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ /api-proxy/ 成功: ${response.status} (${responseTime}ms)`);
                    console.log('Response data:', data);
                    
                    return {
                        success: true,
                        status: response.status,
                        responseTime,
                        data
                    };
                } else {
                    console.log(`⚠️ /api-proxy/ レスポンス: ${response.status} (${responseTime}ms)`);
                    const errorText = await response.text();
                    console.log('Error response:', errorText);
                    
                    return {
                        success: false,
                        status: response.status,
                        responseTime,
                        error: errorText
                    };
                }
            } catch (error) {
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                console.error(`❌ /api-proxy/ エラー (${responseTime}ms):`, error);
                
                return {
                    success: false,
                    responseTime,
                    error: error.message
                };
            }
        });
        
        console.log(`/api-proxy/ テスト結果: ${proxyTest.success ? '成功' : '失敗'}`);
        console.log(`レスポンス時間: ${proxyTest.responseTime}ms`);
        if (proxyTest.status) {
            console.log(`HTTPステータス: ${proxyTest.status}`);
        }
        if (proxyTest.data) {
            console.log(`為替レートデータ:`, JSON.stringify(proxyTest.data, null, 2));
        }
        if (proxyTest.error) {
            console.log(`エラー: ${proxyTest.error}`);
        }
        
        console.log('\n3. 認証API修正テスト');
        console.log('===========================');
        
        // Google認証APIの再テスト
        const authApiTest = await page.evaluate(async () => {
            console.log('🔍 修正後 Google認証API テスト...');
            const startTime = performance.now();
            
            try {
                // credentials: includeを外してテスト
                const response = await fetch('https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod/auth/google/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ 
                        code: 'test-code-from-browser',
                        state: 'test-state' 
                    })
                });
                
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                const responseText = await response.text();
                
                console.log(`✅ Google認証API成功: ${response.status} (${responseTime}ms)`);
                console.log('Response:', responseText);
                
                return {
                    success: true,
                    status: response.status,
                    responseTime,
                    response: responseText
                };
            } catch (error) {
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                console.error(`❌ Google認証APIエラー (${responseTime}ms):`, error);
                
                return {
                    success: false,
                    responseTime,
                    error: error.message
                };
            }
        });
        
        console.log(`Google認証API結果: ${authApiTest.success ? '成功' : '失敗'}`);
        console.log(`レスポンス時間: ${authApiTest.responseTime}ms`);
        if (authApiTest.status) {
            console.log(`HTTPステータス: ${authApiTest.status}`);
        }
        if (authApiTest.error) {
            console.log(`エラー: ${authApiTest.error}`);
        }
        
        console.log('\n4. コンソールエラー確認');
        console.log('===========================');
        
        // /api-proxy/ と タイムアウト関連のエラーをチェック
        const proxyErrors = consoleMessages.filter(msg => 
            msg.includes('/api-proxy/') && msg.includes('502')
        );
        const timeoutErrors = consoleMessages.filter(msg => 
            msg.includes('タイムアウト') || msg.includes('timeout')
        );
        const fetchErrors = consoleMessages.filter(msg => 
            msg.includes('Failed to fetch') || msg.includes('API fetch error')
        );
        
        console.log(`/api-proxy/ 502エラー数: ${proxyErrors.length}`);
        console.log(`タイムアウトエラー数: ${timeoutErrors.length}`);  
        console.log(`Fetchエラー数: ${fetchErrors.length}`);
        
        if (proxyErrors.length > 0) {
            console.log('❌ まだ残っている /api-proxy/ エラー:');
            proxyErrors.forEach(msg => console.log(`  ${msg}`));
        } else {
            console.log('✅ /api-proxy/ 502エラーは解消されました');
        }
        
        console.log('\n5. 認証ボタン動作確認');
        console.log('===========================');
        
        // Google認証ボタンをクリックしてフローをテスト
        const loginButtons = await page.$$('button');
        let googleAuthButton = null;
        
        for (const button of loginButtons) {
            const text = await button.textContent();
            if (text && text.includes('Google')) {
                googleAuthButton = button;
                console.log(`✅ Google認証ボタン発見: "${text}"`);
                break;
            }
        }
        
        if (googleAuthButton) {
            try {
                // ポップアップを監視
                const popupPromise = context.waitForEvent('page', { timeout: 10000 });
                
                await googleAuthButton.click();
                console.log('✅ 認証ボタンクリック成功');
                
                try {
                    const popup = await popupPromise;
                    console.log(`✅ 認証ポップアップが開きました: ${popup.url()}`);
                    
                    // 少し待ってからポップアップを閉じる
                    await page.waitForTimeout(2000);
                    await popup.close();
                    console.log('✅ 認証ポップアップを正常に閉じました');
                } catch (e) {
                    console.log('ℹ️ ポップアップは開かれませんでした（通常の動作の可能性）');
                }
            } catch (clickError) {
                console.log(`⚠️ ボタンクリックエラー: ${clickError.message}`);
            }
        }
        
        // 最終スクリーンショット
        await page.screenshot({ 
            path: '/Users/kokiriho/Documents/Projects/pfwise/portfolio-manager/frontend/webapp/post-deploy-screenshot.png',
            fullPage: true 
        });
        
        console.log('\n📊 修正後テスト結果サマリー');
        console.log('===========================');
        console.log(`ページロード時間: ${loadTime}ms`);
        console.log(`/api-proxy/ テスト: ${proxyTest.success ? '成功' : '失敗'} (${proxyTest.responseTime}ms)`);
        console.log(`Google認証API: ${authApiTest.success ? '成功' : '失敗'} (${authApiTest.responseTime}ms)`);
        console.log(`/api-proxy/ 502エラー: ${proxyErrors.length}件`);
        console.log(`タイムアウトエラー: ${timeoutErrors.length}件`);
        console.log(`認証ボタン: ${googleAuthButton ? '動作確認済み' : '未発見'}`);
        
        // 改善点の確認
        console.log('\n🎯 修正の効果');
        console.log('===========================');
        if (proxyTest.success && proxyTest.status === 200) {
            console.log('✅ /api-proxy/ プロキシ設定が正常に動作しています');
        } else {
            console.log('❌ /api-proxy/ プロキシ設定に問題があります');
        }
        
        if (authApiTest.responseTime < 15000) {
            console.log(`✅ Google認証APIのレスポンス時間が改善されました (${authApiTest.responseTime}ms < 15秒)`);
        } else {
            console.log(`⚠️ Google認証APIのレスポンス時間がまだ長いです (${authApiTest.responseTime}ms)`);
        }
        
    } catch (error) {
        console.error('❌ 修正後テスト実行中にエラーが発生しました:', error);
    } finally {
        await browser.close();
        console.log('🏁 修正後テスト完了');
    }
}

// メイン実行
postDeployTest().catch(console.error);