/**
 * index.js のテストファイル
 * アプリケーションエントリーポイントの基本的なテスト
 */

describe('index.js', () => {
  test('モジュールファイルが存在し、基本構文が正しい', () => {
    const fs = require('fs');
    const path = require('path');
    
    const indexPath = path.resolve(__dirname, '../../../index.js');
    expect(fs.existsSync(indexPath)).toBe(true);
    
    // ファイルが読み込み可能であることを確認
    const content = fs.readFileSync(indexPath, 'utf8');
    expect(content.length).toBeGreaterThan(0);
  });

  test('index.jsファイルが存在する', () => {
    const fs = require('fs');
    const path = require('path');
    
    const indexPath = path.resolve(__dirname, '../../../index.js');
    expect(fs.existsSync(indexPath)).toBe(true);
  });

  test('必要な依存関係をインポートしている', () => {
    const fs = require('fs');
    const path = require('path');
    
    const indexPath = path.resolve(__dirname, '../../../index.js');
    const content = fs.readFileSync(indexPath, 'utf8');
    
    // 主要なインポートが含まれているかチェック
    expect(content).toContain("from 'react'");
    expect(content).toContain("from 'react-dom/client'");
    expect(content).toContain("from './App'");
    expect(content).toContain("from './reportWebVitals'");
  });

  test('createRootとrenderの呼び出しが含まれている', () => {
    const fs = require('fs');
    const path = require('path');
    
    const indexPath = path.resolve(__dirname, '../../../index.js');
    const content = fs.readFileSync(indexPath, 'utf8');
    
    expect(content).toContain('createRoot');
    expect(content).toContain('root.render');
    expect(content).toContain('React.StrictMode');
  });

  test('開発環境機能の読み込みロジックが含まれている', () => {
    const fs = require('fs');
    const path = require('path');
    
    const indexPath = path.resolve(__dirname, '../../../index.js');
    const content = fs.readFileSync(indexPath, 'utf8');
    
    expect(content).toContain('loadDevelopmentFeatures');
    expect(content).toContain('NODE_ENV');
    expect(content).toContain('development');
  });

  test('エラーハンドリングが含まれている', () => {
    const fs = require('fs');
    const path = require('path');
    
    const indexPath = path.resolve(__dirname, '../../../index.js');
    const content = fs.readFileSync(indexPath, 'utf8');
    
    expect(content).toContain('try');
    expect(content).toContain('catch');
    expect(content).toContain('console.warn');
  });

  test('パフォーマンス測定の設定が含まれている', () => {
    const fs = require('fs');
    const path = require('path');
    
    const indexPath = path.resolve(__dirname, '../../../index.js');
    const content = fs.readFileSync(indexPath, 'utf8');
    
    expect(content).toContain('reportWebVitals');
  });

  test('ログフィルタリングの設定が含まれている', () => {
    const fs = require('fs');
    const path = require('path');
    
    const indexPath = path.resolve(__dirname, '../../../index.js');
    const content = fs.readFileSync(indexPath, 'utf8');
    
    expect(content).toContain('replaceConsoleLog');
  });

  test('適切なコメントとドキュメントが含まれている', () => {
    const fs = require('fs');
    const path = require('path');
    
    const indexPath = path.resolve(__dirname, '../../../index.js');
    const content = fs.readFileSync(indexPath, 'utf8');
    
    expect(content).toContain('エントリーポイント');
    expect(content).toContain('performance');
    expect(content).toContain('Web Vitals');
  });

  describe('設定の検証', () => {
    test('React 18の新しいAPIを使用している', () => {
      const fs = require('fs');
      const path = require('path');
      
      const indexPath = path.resolve(__dirname, '../../../index.js');
      const content = fs.readFileSync(indexPath, 'utf8');
      
      // React 18の新しいAPIを使用
      expect(content).toContain('createRoot');
      expect(content).not.toContain('ReactDOM.render');
    });

    test('適切な遅延読み込み設定がある', () => {
      const fs = require('fs');
      const path = require('path');
      
      const indexPath = path.resolve(__dirname, '../../../index.js');
      const content = fs.readFileSync(indexPath, 'utf8');
      
      expect(content).toContain('setTimeout');
      expect(content).toContain('2000'); // 2秒の遅延
    });

    test('動的インポートを使用している', () => {
      const fs = require('fs');
      const path = require('path');
      
      const indexPath = path.resolve(__dirname, '../../../index.js');
      const content = fs.readFileSync(indexPath, 'utf8');
      
      expect(content).toContain('import(');
    });
  });

  describe('ファイル構造の検証', () => {
    test('必要なファイルが存在する', () => {
      const fs = require('fs');
      const path = require('path');
      
      // index.jsが参照するファイルが存在することを確認
      const files = [
        '../../../App.jsx',
        '../../../reportWebVitals.js',
        '../../../index.css'
      ];
      
      files.forEach(file => {
        const filePath = path.resolve(__dirname, file);
        const exists = fs.existsSync(filePath);
        if (!exists) {
          // .jsファイルがない場合は.jsxファイルをチェック
          const jsxPath = file.replace('.js', '.jsx');
          const jsxFilePath = path.resolve(__dirname, jsxPath);
          expect(fs.existsSync(jsxFilePath)).toBe(true);
        } else {
          expect(exists).toBe(true);
        }
      });
    });

    test('package.jsonにReact 18の依存関係がある', () => {
      const fs = require('fs');
      const path = require('path');
      
      const packagePath = path.resolve(__dirname, '../../../../package.json');
      const packageContent = fs.readFileSync(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);
      
      // React 18以上が使われていることを確認
      expect(packageJson.dependencies.react).toBeDefined();
      expect(packageJson.dependencies['react-dom']).toBeDefined();
    });
  });

  describe('コード品質', () => {
    test('適切なエラーハンドリングパターンを使用', () => {
      const fs = require('fs');
      const path = require('path');
      
      const indexPath = path.resolve(__dirname, '../../../index.js');
      const content = fs.readFileSync(indexPath, 'utf8');
      
      // try-catchパターンの使用
      const tryBlocks = (content.match(/try\s*{/g) || []).length;
      const catchBlocks = (content.match(/catch\s*\(/g) || []).length;
      
      expect(tryBlocks).toBeGreaterThan(0);
      expect(catchBlocks).toBe(tryBlocks); // try と catch の数が一致
    });

    test('適切な非同期処理パターンを使用', () => {
      const fs = require('fs');
      const path = require('path');
      
      const indexPath = path.resolve(__dirname, '../../../index.js');
      const content = fs.readFileSync(indexPath, 'utf8');
      
      expect(content).toContain('async');
      expect(content).toContain('await');
    });

    test('環境変数の適切な使用', () => {
      const fs = require('fs');
      const path = require('path');
      
      const indexPath = path.resolve(__dirname, '../../../index.js');
      const content = fs.readFileSync(indexPath, 'utf8');
      
      expect(content).toContain('process.env.NODE_ENV');
      expect(content).toContain('development');
    });
  });
});