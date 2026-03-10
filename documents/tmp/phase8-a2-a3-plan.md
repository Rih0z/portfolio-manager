# Phase 8-A2 + 8-A3 実装計画

## 8-A2: フォントロード耐障害化

### 現状の問題
- Google Fonts CDN に3フォント（Inter, Noto Sans JP, JetBrains Mono）を1リクエストで依存
- CDN障害・企業プロキシ・ネットワーク不安定時に全フォントが失敗
- JetBrains Mono の tabular-nums はフィンテックアプリの信頼感に直結

### 解決策: fontsource によるセルフホスト
- `@fontsource/inter` — 本文フォント
- `@fontsource/jetbrains-mono` — 数値表示（最重要）
- `@fontsource/noto-sans-jp` — 日本語フォント（Unicode range subsetting で最適化）

### 変更ファイル
1. `package.json` — fontsource パッケージ追加
2. `src/index.tsx` — import 追加
3. `index.html` — Google Fonts link 削除、preconnect 削除
4. `src/index.css` — @font-face 不要（fontsource が管理）

### メリット
- 外部CDN依存ゼロ → 100% 信頼性
- 同一オリジン配信 → CORS問題なし
- Vite による自動最適化（ハッシュ付きファイル名、gzip）
- Google Fonts トラッキング除去 → プライバシー向上

---

## 8-A3: OAuth エラーUI + リトライ

### 現状の問題
- `onScriptLoadError` が `console.error` のみ
- ユーザーに何も伝えない
- `as any` 型ハック

### 解決策
1. AppInitializer に `oauthScriptError` state 追加
2. エラー時にユーザー向けカード型メッセージ表示
3. 「再読み込み」ボタン提供
4. OAuthLoginButton側でも googleClientId 未取得時のフォールバックUI

### 変更ファイル
1. `src/App.tsx` — AppInitializer に oauthScriptError state + エラーUI
