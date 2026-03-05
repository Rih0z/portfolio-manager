# Phase 2-A 実装計画: UX・デザイン刷新

## 概要
shadcn/ui導入、ライトモードデフォルト化、CSVインポート強化、ポートフォリオスコア実装

## Step 1: デザイン基盤（shadcn/ui + ライトモード + JetBrains Mono）
- 依存追加: @radix-ui/react-slot, class-variance-authority, clsx, tailwind-merge, lucide-react
- lib/utils.ts (cn関数)
- tailwind.config.js 再設計（CSS変数ベース、ライトモードデフォルト）
- index.css グローバルスタイル更新（CSS変数、JetBrains Mono）
- テーマ切替: OS連動 + 手動トグル（useUIStoreにtheme state追加）
- 新カラーパレット: Primary #1A56DB / Success #059669 / Danger #E11D48

## Step 2: shadcn/ui コンポーネント作成
- components/ui/button.tsx (CVA variants)
- components/ui/card.tsx
- components/ui/input.tsx
- components/ui/select.tsx
- components/ui/dialog.tsx (Modal置換)
- components/ui/badge.tsx
- components/ui/tabs.tsx
- components/ui/progress.tsx (スコア表示用)
- components/ui/tooltip.tsx
- components/ui/switch.tsx (テーマトグル用)

## Step 3: Atlassianコンポーネント置換
- Dashboard.tsx: Card/Button → ui/card, ui/button
- AIAdvisor.tsx: Card/Button/Input/Select → ui/*
- 全ページのimport更新
- 旧 components/atlassian/ + tokens/ を削除

## Step 4: Header/TabNavigation ライトモード対応
- Header.tsx: ダーク固定→テーマ対応
- TabNavigation.tsx: 同上
- Footer.tsx: 同上

## Step 5: CSVインポート強化
- encoding.ts: TextDecoder('shift_jis')ベースのShift-JIS→UTF-8変換
- csvTemplates.ts: SBI/楽天/汎用フォーマット定義
- csvParser.ts: フォーマット自動検出 + パース
- CSVImportWizard.tsx: ステップ式インポートUI
- DataImport.tsx 統合

## Step 6: ポートフォリオスコア
- services/portfolio/ScoringService.ts: 100点スコアリングアルゴリズム
  - 分散度（地域/資産クラス）: 30点
  - コスト効率（信託報酬）: 25点
  - リスクバランス: 25点
  - 配当効率: 20点
- components/dashboard/PortfolioScore.tsx: スコア可視化
- Dashboard.tsx にスコアセクション追加

## Step 7: 新オンボーディング
- InitialSetupWizard改修: 3ステップ→2ステップ簡略化
- テンプレートポートフォリオ選択機能

## 実装順序
Step 1 → Step 2 → Step 3 → Step 4 → Step 5 → Step 6 → Step 7
