const { chromium } = require('playwright');

(async () => {
  console.log('\n📸 ユーザー指摘問題の視覚的証拠取得');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://portfolio-wise.com/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // 起動時画面の高解像度スクリーンショット
    await page.screenshot({ 
      path: '/Users/kokiriho/Documents/Projects/pfwise/portfolio-manager/startup-readability-issues.png', 
      fullPage: true 
    });
    
    console.log('✅ 起動時画面スクリーンショット取得完了: startup-readability-issues.png');
    
    // 問題のある文字要素を特定してハイライト
    await page.addStyleTag({
      content: `
        .readability-issue-12px {
          background-color: rgba(255, 0, 0, 0.3) !important;
          border: 2px solid red !important;
          position: relative;
        }
        
        .readability-issue-light-gray {
          background-color: rgba(255, 165, 0, 0.3) !important;
          border: 2px solid orange !important;
        }
        
        .readability-issue-12px::after {
          content: "12px";
          position: absolute;
          top: -20px;
          left: 0;
          background: red;
          color: white;
          font-size: 10px;
          padding: 2px 4px;
          border-radius: 3px;
          z-index: 10000;
        }
      `
    });
    
    // 問題要素にマーカーを追加
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        const text = el.textContent?.trim();
        
        if (text && text.length > 2) {
          const fontSize = parseInt(style.fontSize);
          const color = style.color;
          
          if (fontSize === 12) {
            el.classList.add('readability-issue-12px');
          }
          
          if (color.includes('rgb(165') || color.includes('rgb(193')) {
            el.classList.add('readability-issue-light-gray');
          }
        }
      });
    });
    
    // ハイライト付きスクリーンショット取得
    await page.screenshot({ 
      path: '/Users/kokiriho/Documents/Projects/pfwise/portfolio-manager/highlighted-readability-problems.png', 
      fullPage: true 
    });
    
    console.log('✅ 問題箇所ハイライトスクリーンショット取得完了: highlighted-readability-problems.png');
    
    // AI投資戦略ボタンをクリックしてタブ内容を確認
    try {
      const aiStrategyButton = await page.locator('button:has-text("Start AI Investment Strategy")');
      if (await aiStrategyButton.isVisible()) {
        await aiStrategyButton.click();
        await page.waitForTimeout(3000);
        
        await page.screenshot({ 
          path: '/Users/kokiriho/Documents/Projects/pfwise/portfolio-manager/ai-strategy-tab-content.png', 
          fullPage: true 
        });
        
        console.log('✅ AI投資戦略タブ内容スクリーンショット取得完了: ai-strategy-tab-content.png');
        
        // AI投資戦略タブ内の読みやすさ分析
        const aiTabAnalysis = await page.evaluate(() => {
          const visibleElements = Array.from(document.querySelectorAll('*')).filter(el => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return rect.width > 0 && rect.height > 0 && style.display !== 'none';
          });
          
          let aiTabIssues = [];
          
          visibleElements.forEach(el => {
            const style = window.getComputedStyle(el);
            const text = el.textContent?.trim();
            
            if (text && text.length > 2) {
              const fontSize = parseInt(style.fontSize);
              const color = style.color;
              
              if (fontSize < 14 || color.includes('rgb(165') || color.includes('rgb(193')) {
                aiTabIssues.push({
                  tag: el.tagName,
                  text: text.substring(0, 50),
                  fontSize: fontSize,
                  color: color,
                  issue: fontSize < 14 ? 'small-text' : 'light-color'
                });
              }
            }
          });
          
          return aiTabIssues.slice(0, 10);
        });
        
        console.log('\nAI投資戦略タブ内の読みやすさ問題:');
        if (aiTabAnalysis.length === 0) {
          console.log('  ✅ AI投資戦略タブには主要な読みやすさ問題は見つかりませんでした');
        } else {
          aiTabAnalysis.forEach((issue, i) => {
            console.log(`  ${i+1}. ${issue.tag}: "${issue.text}" - ${issue.fontSize}px, ${issue.color}`);
          });
        }
      }
    } catch (error) {
      console.log('❌ AI投資戦略タブアクセスエラー:', error.message);
    }
    
  } catch (error) {
    console.error('視覚的検証エラー:', error);
  } finally {
    await browser.close();
  }
  
  console.log('\n📸 視覚的証拠取得完了');
})();