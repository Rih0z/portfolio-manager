# Portfolio Wise Design System

## 色彩心理学とユーザーペルソナ分析

### ターゲットペルソナ：洗練された投資家
- **年齢層**: 30-55歳
- **特徴**: テクノロジーに精通、プロフェッショナル、時間価値を重視
- **求めるもの**: 
  - 信頼性と高級感
  - データの明瞭性
  - 素早い情報アクセス
  - モバイルファースト体験

### カラーパレット（Netflix/Uber風ダークテーマ）

#### ベースカラー
```css
--color-dark-100: #0A0A0B;    /* 最も暗い背景 */
--color-dark-200: #141416;    /* カード背景 */
--color-dark-300: #1C1C1F;    /* 要素背景 */
--color-dark-400: #28282C;    /* ボーダー */
--color-dark-500: #3A3A3F;    /* 非アクティブ要素 */
```

#### プライマリカラー（信頼・安定）
```css
--color-primary-400: #4A9EFF;  /* メインアクション */
--color-primary-500: #0066FF;  /* ホバー状態 */
--color-primary-600: #0052CC;  /* アクティブ状態 */
```

#### 成功カラー（利益・成長）
```css
--color-success-400: #10D876;  /* 利益表示 */
--color-success-500: #00C853;  /* 強調時 */
--color-success-600: #00A847;  /* ダーク */
```

#### 危険カラー（損失・警告）
```css
--color-danger-400: #FF5252;   /* 損失表示 */
--color-danger-500: #F44336;   /* 警告 */
--color-danger-600: #D32F2F;   /* 強調 */
```

#### ニュートラルカラー
```css
--color-gray-100: #FFFFFF;     /* 最重要テキスト */
--color-gray-200: #E8E8EA;     /* 重要テキスト */
--color-gray-300: #B3B3B6;     /* 通常テキスト */
--color-gray-400: #7E7E82;     /* 補助テキスト */
--color-gray-500: #5A5A5E;     /* 非活性テキスト */
```

### タイポグラフィ

```css
--font-primary: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
--font-mono: 'SF Mono', 'Monaco', 'Inconsolata', monospace;

/* サイズ階層 */
--text-xs: 0.75rem;    /* 10px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.5rem;     /* 24px */
--text-2xl: 2rem;      /* 32px */
--text-3xl: 2.5rem;    /* 40px */
```

### スペーシングシステム

```css
--space-1: 0.25rem;    /* 4px */
--space-2: 0.5rem;     /* 8px */
--space-3: 0.75rem;    /* 12px */
--space-4: 1rem;       /* 16px */
--space-5: 1.5rem;     /* 24px */
--space-6: 2rem;       /* 32px */
--space-8: 3rem;       /* 48px */
--space-10: 4rem;      /* 64px */
```

### アニメーション

```css
/* イージング関数 */
--ease-out: cubic-bezier(0.215, 0.61, 0.355, 1);
--ease-in-out: cubic-bezier(0.645, 0.045, 0.355, 1);

/* デュレーション */
--duration-fast: 150ms;
--duration-base: 250ms;
--duration-slow: 350ms;
```

### コンポーネントデザイン原則

1. **カード**: 
   - 背景: `--color-dark-200`
   - ボーダー: なし（影で深度を表現）
   - 角丸: 12px
   - パディング: `--space-5`

2. **ボタン**:
   - 高さ: 最小44px（モバイルタッチ対応）
   - 角丸: 8px
   - トランジション: すべて `--duration-base`
   - ホバー: 明度+10%

3. **データ表示**:
   - 数値: `--font-mono`使用
   - 正の値: `--color-success-400`
   - 負の値: `--color-danger-400`
   - グラフ: 高コントラストカラー

4. **モバイル最適化**:
   - タッチターゲット: 最小44x44px
   - フォントサイズ: 最小14px
   - パディング: モバイルで増加
   - スクロール: 慣性スクロール有効

### Netflix/Uber風の特徴

1. **ダークテーマファースト**: 目に優しく高級感
2. **マイクロインタラクション**: 細かなアニメーション
3. **カード型UI**: 情報の階層化
4. **大胆な色使い**: アクセントカラーの効果的使用
5. **影の活用**: 深度と階層の表現