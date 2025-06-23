const { chromium } = require('playwright');

async function testGoogleAuthFlow() {
    console.log('🚀 Google認証フローテストを開始します...');
    
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
        console.log('\n1. ページアクセステスト');
        console.log('===========================');
        
        const startTime = Date.now();
        await page.goto('https://portfolio-wise.com/', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        const loadTime = Date.now() - startTime;
        
        console.log(`✅ ページロード完了: ${loadTime}ms`);
        
        // ページタイトル確認
        const title = await page.title();
        console.log(`📄 ページタイトル: ${title}`);
        
        console.log('\n2. Google認証APIテスト');
        console.log('===========================');
        
        // Google認証API直接テスト
        const authApiResult = await page.evaluate(async () => {
            console.log('=== Google認証API直接テスト ===');
            const startTime = performance.now();
            
            try {
                const response = await fetch('https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod/auth/google/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    credentials: 'include',
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
        
        console.log(`Google認証API結果: ${authApiResult.success ? '成功' : '失敗'}`);
        console.log(`レスポンス時間: ${authApiResult.responseTime}ms`);
        if (authApiResult.status) {
            console.log(`HTTPステータス: ${authApiResult.status}`);
        }
        if (authApiResult.error) {
            console.log(`エラー: ${authApiResult.error}`);
        }
        
        console.log('\n3. 為替レートAPIテスト');
        console.log('===========================');
        
        // 為替レートAPI直接テスト
        const exchangeApiResult = await page.evaluate(async () => {
            console.log('=== 為替レートAPI直接テスト ===');
            const startTime2 = performance.now();
            
            try {
                const response = await fetch('https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod/api/market-data?type=exchange-rate&base=USD&target=JPY', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });
                
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime2);
                const responseData = await response.json();
                
                console.log(`✅ 為替レートAPI成功: ${response.status} (${responseTime}ms)`);
                console.log('Exchange rate data:', responseData);
                
                return {
                    success: true,
                    status: response.status,
                    responseTime,
                    data: responseData
                };
            } catch (error) {
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime2);
                console.error(`❌ 為替レートAPIエラー (${responseTime}ms):`, error);
                
                return {
                    success: false,
                    responseTime,
                    error: error.message
                };
            }
        });
        
        console.log(`為替レートAPI結果: ${exchangeApiResult.success ? '成功' : '失敗'}`);
        console.log(`レスポンス時間: ${exchangeApiResult.responseTime}ms`);
        if (exchangeApiResult.status) {
            console.log(`HTTPステータス: ${exchangeApiResult.status}`);
        }
        if (exchangeApiResult.error) {
            console.log(`エラー: ${exchangeApiResult.error}`);
        }
        if (exchangeApiResult.data) {
            console.log(`為替レートデータ:`, JSON.stringify(exchangeApiResult.data, null, 2));
        }
        
        console.log('\n4. 実際の認証ボタンテスト');
        console.log('===========================');
        
        // Google認証ボタンを探す
        const loginButtons = await page.$$('button');
        let googleAuthButton = null;
        
        for (const button of loginButtons) {
            const text = await button.textContent();
            if (text && (text.includes('Google') || text.includes('ログイン') || text.includes('サインイン'))) {
                googleAuthButton = button;
                console.log(`✅ Google認証ボタン発見: "${text}"`);
                break;
            }
        }
        
        if (!googleAuthButton) {
            // ボタンが見つからない場合、他の要素も検索
            const allElements = await page.$$('*');
            for (const element of allElements) {
                const text = await element.textContent();
                if (text && text.includes('Google')) {
                    googleAuthButton = element;
                    console.log(`✅ Google認証要素発見: "${text}"`);
                    break;
                }
            }
        }
        
        if (googleAuthButton) {
            console.log('🔘 認証ボタンをクリックしてフローをテスト...');
            
            // ポップアップウィンドウを監視
            const popupPromise = context.waitForEvent('page', { timeout: 10000 });
            
            try {
                await googleAuthButton.click();
                console.log('✅ 認証ボタンクリック成功');
                
                // ポップアップが開くかチェック
                try {
                    const popup = await popupPromise;
                    console.log(`✅ 認証ポップアップが開きました: ${popup.url()}`);
                    await popup.close();
                } catch (e) {
                    console.log('ℹ️ ポップアップは開かれませんでした（通常の動作の可能性）');
                }
                
            } catch (clickError) {
                console.log(`⚠️ ボタンクリックエラー: ${clickError.message}`);
            }
        } else {
            console.log('❌ Google認証ボタンが見つかりませんでした');
        }
        
        console.log('\n5. コンソールエラーチェック');
        console.log('===========================');
        
        // ページの最終状態をチェック
        await page.waitForTimeout(3000);
        
        const errorMessages = consoleMessages.filter(msg => 
            msg.includes('[error]') || 
            msg.includes('タイムアウト') || 
            msg.includes('/api-proxy/') ||
            msg.includes('Failed to fetch')
        );
        
        if (errorMessages.length > 0) {
            console.log('❌ 発見されたエラー:');
            errorMessages.forEach(msg => console.log(`  ${msg}`));
        } else {
            console.log('✅ 重要なエラーは発見されませんでした');
        }
        
        console.log('\n📊 テスト結果サマリー');
        console.log('===========================');
        console.log(`ページロード時間: ${loadTime}ms`);
        console.log(`Google認証API: ${authApiResult.success ? '成功' : '失敗'} (${authApiResult.responseTime}ms)`);
        console.log(`為替レートAPI: ${exchangeApiResult.success ? '成功' : '失敗'} (${exchangeApiResult.responseTime}ms)`);
        console.log(`認証ボタン: ${googleAuthButton ? '発見' : '未発見'}`);
        console.log(`コンソールエラー: ${errorMessages.length}件`);
        
        // 最終的なスクリーンショットを撮影
        await page.screenshot({ 
            path: '/Users/kokiriho/Documents/Projects/pfwise/portfolio-manager/frontend/webapp/test-screenshot.png',
            fullPage: true 
        });
        console.log('📸 スクリーンショットを保存しました: test-screenshot.png');
        
    } catch (error) {
        console.error('❌ テスト実行中にエラーが発生しました:', error);
    } finally {
        await browser.close();
        console.log('🏁 テスト完了');
    }
}

// メイン実行
testGoogleAuthFlow().catch(console.error);