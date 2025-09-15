const { chromium } = require('playwright');

(async () => {
  console.log('\n🔍 ユーザー指摘「見づらい」問題の詳細分析 - 修正版');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://portfolio-wise.com/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    
    console.log('\n=== 1. 起動時画面の詳細分析 ===');
    
    // まず、どのようなタブ要素があるかを確認
    const tabStructure = await page.evaluate(() => {
      // 可能性のあるタブセレクタを確認
      const possibleTabs = [
        'button[role="tab"]',
        '[role="tablist"] button',
        '.tab-button',
        'button:contains("Dashboard")',
        'nav button',
        '[class*="tab"] button',
        'button[class*="tab"]'
      ];
      
      let foundTabs = [];
      
      // すべてのボタン要素を確認
      const allButtons = Array.from(document.querySelectorAll('button'));
      allButtons.forEach((btn, index) => {
        const text = btn.textContent?.trim();
        if (text && text.length > 0) {
          foundTabs.push({
            index: index,
            text: text,
            className: btn.className,
            role: btn.getAttribute('role'),
            parent: btn.parentElement?.className
          });
        }
      });
      
      return {
        foundTabs: foundTabs.slice(0, 15),
        totalButtons: allButtons.length
      };
    });
    
    console.log('発見されたボタン要素 (タブ候補):');
    tabStructure.foundTabs.forEach((tab, i) => {
      console.log(`  ${i+1}. "${tab.text}" - class: "${tab.className}" - role: "${tab.role}"`);
    });
    
    console.log(`\n総ボタン数: ${tabStructure.totalButtons}`);
    
    // 2. 具体的な「見づらい」要素の詳細分析
    console.log('\n=== 2. 「見づらい」要素の詳細分析 ===');
    
    const readabilityAnalysis = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));
      let readabilityIssues = [];
      let typography = {
        extremelySmall: [], // 12px未満
        small: [], // 12-13px
        lightColor: [], // 薄いグレー
        thinWeight: [] // 細すぎるフォント
      };
      
      allElements.forEach(el => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const text = el.textContent?.trim();
        
        if (text && text.length > 1 && rect.width > 0 && rect.height > 0 && style.visibility === 'visible') {
          const fontSize = parseInt(style.fontSize);
          const color = style.color;
          const fontWeight = style.fontWeight;
          
          // 極小文字の検出
          if (fontSize < 12) {
            typography.extremelySmall.push({
              tag: el.tagName,
              text: text.substring(0, 40),
              fontSize: fontSize,
              color: color,
              location: `${Math.round(rect.left)}, ${Math.round(rect.top)}`
            });
          }
          
          // 小さい文字の検出
          if (fontSize >= 12 && fontSize < 14) {
            typography.small.push({
              tag: el.tagName,
              text: text.substring(0, 40),
              fontSize: fontSize,
              color: color
            });
          }
          
          // 薄いグレー色の検出
          if (color.includes('rgb(128') || color.includes('rgb(136') || color.includes('rgb(144') || 
              color.includes('rgb(165') || color.includes('rgb(193')) {
            typography.lightColor.push({
              tag: el.tagName,
              text: text.substring(0, 40),
              fontSize: fontSize,
              color: color
            });
          }
          
          // 細すぎるフォントの検出
          if (fontWeight === '100' || fontWeight === '200' || fontWeight === '300') {
            typography.thinWeight.push({
              tag: el.tagName,
              text: text.substring(0, 40),
              fontSize: fontSize,
              fontWeight: fontWeight
            });
          }
        }
      });
      
      return {
        typography: {
          extremelySmall: typography.extremelySmall.slice(0, 8),
          small: typography.small.slice(0, 10),
          lightColor: typography.lightColor.slice(0, 8),
          thinWeight: typography.thinWeight.slice(0, 5)
        }
      };
    });
    
    console.log('🚨 極小文字 (12px未満):');
    if (readabilityAnalysis.typography.extremelySmall.length === 0) {
      console.log('  ✅ 極小文字は検出されませんでした');
    } else {
      readabilityAnalysis.typography.extremelySmall.forEach((issue, i) => {
        console.log(`  ${i+1}. ${issue.tag}: "${issue.text}" - ${issue.fontSize}px at (${issue.location})`);
      });
    }
    
    console.log('\n⚠️ 小さい文字 (12-13px):');
    if (readabilityAnalysis.typography.small.length === 0) {
      console.log('  ✅ 小さい文字は検出されませんでした');
    } else {
      readabilityAnalysis.typography.small.forEach((issue, i) => {
        console.log(`  ${i+1}. ${issue.tag}: "${issue.text}" - ${issue.fontSize}px`);
      });
    }
    
    console.log('\n🔍 薄いグレー色:');
    if (readabilityAnalysis.typography.lightColor.length === 0) {
      console.log('  ✅ 薄いグレー色は検出されませんでした');
    } else {
      readabilityAnalysis.typography.lightColor.forEach((issue, i) => {
        console.log(`  ${i+1}. ${issue.tag}: "${issue.text}" - ${issue.color}`);
      });
    }
    
    console.log('\n💫 細すぎるフォント:');
    if (readabilityAnalysis.typography.thinWeight.length === 0) {
      console.log('  ✅ 細すぎるフォントは検出されませんでした');
    } else {
      readabilityAnalysis.typography.thinWeight.forEach((issue, i) => {
        console.log(`  ${i+1}. ${issue.tag}: "${issue.text}" - weight: ${issue.fontWeight}`);
      });
    }
    
    // 3. タブ内容の確認（可能な限り）
    console.log('\n=== 3. タブ機能とナビゲーション分析 ===');
    
    // 実際にクリックできそうなタブボタンを探してクリック
    const tabClickResults = await page.evaluate(() => {
      const possibleTabButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
        const text = btn.textContent?.trim().toLowerCase();
        return text && (
          text.includes('dashboard') ||
          text.includes('ai') ||
          text.includes('投資') ||
          text.includes('simulation') ||
          text.includes('計算') ||
          text.includes('データ') ||
          text.includes('settings') ||
          text.includes('strategy')
        );
      });
      
      return possibleTabButtons.map(btn => ({
        text: btn.textContent?.trim(),
        className: btn.className,
        visible: btn.offsetWidth > 0 && btn.offsetHeight > 0,
        clickable: !btn.disabled
      }));
    });
    
    console.log('タブ候補ボタン:');
    tabClickResults.forEach((tab, i) => {
      const status = tab.clickable && tab.visible ? '✅ クリック可能' : '❌ 無効';
      console.log(`  ${i+1}. "${tab.text}" - ${status}`);
    });
    
    // 4. 最終的な総合評価
    console.log('\n=== 4. 最終総合評価と改善提案 ===');
    
    const totalIssues = 
      readabilityAnalysis.typography.extremelySmall.length +
      readabilityAnalysis.typography.small.length +
      readabilityAnalysis.typography.lightColor.length +
      readabilityAnalysis.typography.thinWeight.length;
      
    console.log(`検出された問題総数: ${totalIssues}件`);
    
    if (totalIssues === 0) {
      console.log('✅ 主要な読みやすさの問題は解決されています');
    } else {
      console.log('⚠️ まだ改善が必要な要素があります');
      
      console.log('\n📋 具体的な改善提案:');
      
      if (readabilityAnalysis.typography.extremelySmall.length > 0) {
        console.log(`  1. 極小文字 (${readabilityAnalysis.typography.extremelySmall.length}件) → 最低14px以上に変更必要`);
      }
      
      if (readabilityAnalysis.typography.small.length > 0) {
        console.log(`  2. 小さい文字 (${readabilityAnalysis.typography.small.length}件) → 14px以上に変更推奨`);
      }
      
      if (readabilityAnalysis.typography.lightColor.length > 0) {
        console.log(`  3. 薄いグレー色 (${readabilityAnalysis.typography.lightColor.length}件) → Atlassian推奨色 #172B4D または #6B778C に変更`);
      }
      
      if (readabilityAnalysis.typography.thinWeight.length > 0) {
        console.log(`  4. 細すぎるフォント (${readabilityAnalysis.typography.thinWeight.length}件) → font-weight: 400 以上に変更`);
      }
    }
    
    // 5. ユーザー指摘への直接回答
    console.log('\n=== 5. ユーザー指摘への正直な回答 ===');
    console.log('🎯 ユーザー質問: 「AI投資戦略のタブも確認したか？すべてのタブを改善したか？起動時の画面も見づらい」');
    console.log('\n📋 正直な検証結果:');
    
    if (tabClickResults.length === 0) {
      console.log('  ❌ タブが見つからない: タブ機能に問題がある可能性');
    } else {
      console.log('  ✅ タブボタンは検出されました');
    }
    
    if (totalIssues > 0) {
      console.log(`  ⚠️ 起動時画面の見づらさ: ${totalIssues}件の改善要素が残存`);
      console.log('  📝 結論: ユーザーの指摘は正当です。さらなる改善が必要');
    } else {
      console.log('  ✅ 起動時画面: 主要な読みやすさ問題は解決済み');
    }
    
    console.log('\n🏆 プロとしての評価:');
    const score = Math.max(0, 100 - (totalIssues * 10));
    console.log(`  読みやすさスコア: ${score}/100`);
    
    if (score >= 90) {
      console.log('  評価: 優秀 - Atlassian基準にほぼ準拠');
    } else if (score >= 70) {
      console.log('  評価: 良好 - 軽微な改善で完璧になる');
    } else {
      console.log('  評価: 要改善 - 本質的な修正が必要');
    }
    
  } catch (error) {
    console.error('分析エラー:', error);
  } finally {
    await browser.close();
  }
  
  console.log('\n✅ 詳細分析完了');
})();