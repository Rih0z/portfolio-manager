# UI レビュー修正計画

**作成日**: 2026-03-07
**対象**: ランディングページ + グローバルカラー

## 問題分析

### 致命的: テキスト可読性
| 箇所 | 現状 | コントラスト比 | WCAG AA |
|------|------|-------------|---------|
| ヒーロー グラデーション左端 (`primary-400`) | `#60A5FA` on `#F8FAFC` | ~2.5:1 | **FAIL** |
| 説明テキスト全般 (`muted-foreground`) | `#64748B` on `#F8FAFC` | ~4.7:1 | ギリギリ（日本語14pxで体感薄い）|
| ヘッダーロゴテキスト | `#60A5FA→#1A56DB` gradient | ~2.5:1〜6.5:1 | 左端FAIL |

### デザイン統一性
1. 全セクション同一白背景 → 視覚的リズムなし
2. OAuthLoginButton が header/hero/CTA に3回フルレンダリング → 散漫
3. カードが白on白で区別困難

## 修正内容

### 1. index.css — muted-foreground 強化
- `--muted-foreground: #64748B` → `--muted-foreground: #475569` (slate-600, contrast ~7.2:1)

### 2. Landing.tsx — グラデーション修正 + セクションリズム
- ヒーロー: `from-primary-400 to-primary-600` → `from-primary-500 to-primary-700`
- Pain/Features/Pricing にセクション背景を交互配置

### 3. LandingHeader.tsx — ロゴグラデーション修正
- `from-primary-400 to-primary-600` → `from-primary-500 to-primary-700`
- `from-primary-400 to-primary-500` → `from-primary-500 to-primary-600`

### 4. OAuthLoginButton.tsx — compact モード追加
- `compact` prop: ボタンのみ表示（タイトル・説明・ヘルプ非表示）
- ヘッダーで compact 使用

### 5. UIレビューチェックリスト作成
- `documents/ui-review-checklist.md` として永続化

## ペルソナ整合性チェック
- タケシ（28-42歳 IT勤務）: スマホ閲覧でも読めるコントラスト ✓
- フィンテック信頼感: 濃い青 + 適度なコントラスト ✓
