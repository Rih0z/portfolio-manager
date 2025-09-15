const { chromium } = require('playwright');

(async () => {
  console.log('\n=== Portfolio Manager 全7タブ詳細検証開始 ===');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // 本番環境にアクセス
    console.log('本番環境アクセス: https://portfolio-wise.com/');
    await page.goto('https://portfolio-wise.com/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // 起動時画面の分析
    console.log('\n=== 起動時画面分析 ===');
    const title = await page.title();
    console.log('ページタイトル:', title);
    
    // 初期表示のスクリーンショット
    await page.screenshot({ 
      path: '/Users/kokiriho/Documents/Projects/pfwise/portfolio-manager/startup-screen.png', 
      fullPage: true 
    });
    
    // 全体的な文字サイズ分析
    const overallTextAnalysis = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      let textElements = [];
      let smallTextCount = 0;
      let totalTextCount = 0;
      
      elements.forEach(el => {
        const computedStyle = window.getComputedStyle(el);
        const text = el.textContent?.trim();
        
        if (text && text.length > 2 && computedStyle.display !== 'none' && computedStyle.visibility === 'visible') {
          const fontSize = parseInt(computedStyle.fontSize);
          totalTextCount++;
          
          if (fontSize < 14) smallTextCount++;
          
          if (textElements.length < 20) { // 上位20要素のみ
            textElements.push({
              tag: el.tagName,
              text: text.substring(0, 50),
              fontSize: fontSize,
              color: computedStyle.color,
              isSmall: fontSize < 14
            });
          }
        }
      });
      
      return {
        textElements,
        smallTextCount,
        totalTextCount,
        complianceRate: ((totalTextCount - smallTextCount) / totalTextCount * 100).toFixed(1)
      };
    });
    
    console.log('起動時画面 - テキスト分析:');
    overallTextAnalysis.textElements.forEach((el, i) => {
      const warning = el.isSmall ? ' ⚠️ 小さい' : '';
      console.log(`  ${i+1}. ${el.tag}: "${el.text}" - ${el.fontSize}px${warning}`);
    });
    
    console.log(`\n起動時Atlassian準拠率: ${overallTextAnalysis.complianceRate}% (小さい文字: ${overallTextAnalysis.smallTextCount}/${overallTextAnalysis.totalTextCount})`);
    
    // 全7タブの個別分析
    const tabs = [
      { name: 'Dashboard', selector: 'button:has-text("Dashboard")' },
      { name: 'AI投資戦略', selector: 'button:has-text("AI投資戦略")' },
      { name: '投資配分', selector: 'button:has-text("投資配分")' },
      { name: 'Simulation', selector: 'button:has-text("Simulation")' },
      { name: '計算機', selector: 'button:has-text("計算機")' },
      { name: 'データ同期', selector: 'button:has-text("データ同期")' },
      { name: 'Settings', selector: 'button:has-text("Settings")' }
    ];
    
    for (const tab of tabs) {
      console.log(`\n========== ${tab.name}タブ詳細分析 ==========`);
      
      try {
        // タブクリック
        const tabButton = await page.locator(tab.selector).first();
        if (await tabButton.isVisible()) {
          await tabButton.click();
          await page.waitForTimeout(2000);
          
          // スクリーンショット取得
          await page.screenshot({ 
            path: `/Users/kokiriho/Documents/Projects/pfwise/portfolio-manager/tab-${tab.name}.png`, 
            fullPage: true 
          });
          
          // タブ固有の文字サイズ分析
          const tabAnalysis = await page.evaluate(() => {
            const visibleElements = Array.from(document.querySelectorAll('*')).filter(el => {
              const rect = el.getBoundingClientRect();
              const style = window.getComputedStyle(el);
              return rect.width > 0 && rect.height > 0 && style.display !== 'none';
            });
            
            let textElements = [];
            let problems = [];
            
            visibleElements.forEach(el => {
              const computedStyle = window.getComputedStyle(el);
              const text = el.textContent?.trim();
              
              if (text && text.length > 2) {
                const fontSize = parseInt(computedStyle.fontSize);
                const color = computedStyle.color;
                
                // 問題要素の検出
                if (fontSize < 12 || 
                    color.includes('rgb(128') || 
                    color.includes('rgb(136') || 
                    color.includes('rgb(144') ||
                    computedStyle.fontWeight === '100') {
                  
                  problems.push({
                    tag: el.tagName,
                    text: text.substring(0, 40),
                    fontSize: fontSize,
                    color: color,
                    issue: fontSize < 12 ? '極小文字' : fontSize < 14 ? '小文字' : '薄色'
                  });
                }
                
                if (textElements.length < 15) {
                  textElements.push({
                    tag: el.tagName,
                    text: text.substring(0, 40),
                    fontSize: fontSize,
                    color: color
                  });
                }
              }
            });
            
            return { textElements, problems: problems.slice(0, 10) };
          });
          
          console.log(`${tab.name}タブ - 主要テキスト要素:`);
          tabAnalysis.textElements.forEach((el, i) => {
            const sizeFlag = parseInt(el.fontSize) < 14 ? ' ⚠️' : ' ✅';
            console.log(`  ${i+1}. ${el.tag}: "${el.text}" - ${el.fontSize}px${sizeFlag}`);
          });
          
          if (tabAnalysis.problems.length > 0) {
            console.log(`\n${tab.name}タブ - 問題要素 (${tabAnalysis.problems.length}件):`);
            tabAnalysis.problems.forEach((problem, i) => {
              console.log(`  ⚠️ ${i+1}. ${problem.tag}: "${problem.text}" - ${problem.issue} (${problem.fontSize}px)`);
            });
          } else {
            console.log(`\n✅ ${tab.name}タブ: 主要な問題要素は検出されませんでした`);
          }
          
          // AI投資戦略タブの特別分析
          if (tab.name === 'AI投資戦略') {
            console.log('\n--- AI投資戦略タブ 特別詳細分析 ---');
            
            const aiElements = await page.evaluate(() => {
              const aiRelated = Array.from(document.querySelectorAll('textarea, input[type="text"], button, [class*="ai"], [class*="prompt"], h1, h2, h3, p'));
              return aiRelated.slice(0, 10).map(el => {
                const style = window.getComputedStyle(el);
                return {
                  tag: el.tagName,
                  class: el.className.substring(0, 30),
                  text: el.textContent?.trim().substring(0, 50) || el.placeholder || '[フォーム要素]',
                  fontSize: parseInt(style.fontSize),
                  color: style.color,
                  visible: style.display !== 'none'
                };
              }).filter(el => el.visible);
            });
            
            console.log('AI関連重要要素分析:');
            aiElements.forEach((el, i) => {
              const readabilityFlag = el.fontSize >= 14 ? '✅' : '⚠️';
              console.log(`  ${readabilityFlag} ${i+1}. ${el.tag}: "${el.text}" - ${el.fontSize}px`);
              if (el.class) console.log(`      クラス: ${el.class}`);
            });
          }
          
        } else {
          console.log(`❌ ${tab.name}タブが見つかりません`);
        }
        
      } catch (error) {
        console.log(`❌ ${tab.name}タブエラー: ${error.message}`);
      }
    }
    
    console.log('\n=== 総合評価とユーザー指摘への回答 ===');
    
    // 全体的な問題要素の再検査
    await page.goto('https://portfolio-wise.com/');
    await page.waitForTimeout(2000);
    
    const finalAssessment = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));
      let totalVisible = 0;
      let smallText = 0;
      let criticalIssues = [];
      
      allElements.forEach(el => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const text = el.textContent?.trim();
        
        if (text && text.length > 2 && rect.width > 0 && rect.height > 0) {
          totalVisible++;
          const fontSize = parseInt(style.fontSize);
          
          if (fontSize < 14) smallText++;
          
          // 特に問題となる要素
          if (fontSize < 12 || 
              style.color.includes('rgb(128') ||
              style.color.includes('rgb(136') ||
              (fontSize < 13 && (el.tagName === 'P' || el.tagName === 'SPAN'))) {
            
            criticalIssues.push({
              tag: el.tagName,
              text: text.substring(0, 30),
              fontSize: fontSize,
              color: style.color
            });
          }
        }
      });
      
      return {
        totalVisible,
        smallText,
        complianceRate: ((totalVisible - smallText) / totalVisible * 100).toFixed(1),
        criticalIssues: criticalIssues.slice(0, 8)
      };
    });
    
    console.log('最終総合評価:');
    console.log(`  可視テキスト要素総数: ${finalAssessment.totalVisible}`);
    console.log(`  14px未満の要素数: ${finalAssessment.smallText}`);
    console.log(`  Atlassian準拠率: ${finalAssessment.complianceRate}%`);
    
    if (finalAssessment.criticalIssues.length > 0) {
      console.log('\n🔍 ユーザー指摘「見づらい」の根本原因:');
      finalAssessment.criticalIssues.forEach((issue, i) => {
        console.log(`  ${i+1}. ${issue.tag}: "${issue.text}" - ${issue.fontSize}px (${issue.color})`);
      });
      
      console.log('\n📋 改善が必要な結論:');
      console.log('  ✅ 確認: ユーザーの指摘は正当です');
      console.log('  ⚠️ 問題: まだ小さな文字やreadabilityに問題がある箇所が存在');
      console.log('  📈 準拠率: ' + (parseFloat(finalAssessment.complianceRate) >= 90 ? '良好' : '要改善'));
    } else {
      console.log('\n✅ 主要な readability 問題は解決されています');
    }
    
  } catch (error) {
    console.error('検証エラー:', error);
  } finally {
    await browser.close();
  }
  
  console.log('\n=== 全7タブ詳細検証完了 ===');
})();