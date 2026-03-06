# Phase 4-B: バンドル最適化 + パフォーマンス改善 TDD計画

## 現状分析
- **Total gzipped**: ~352 KB
- **Main bundle**: 441 KB (127 KB gzipped)
- **Recharts**: 410 KB (112 KB gzipped)
- **React vendor**: 159 KB (53 KB gzipped)
- 全9ページが静的インポート（React.lazy未使用）
- AIAdvisor.tsx: 942行（最大ページ）

## 改善ターゲット
1. Route-based code splitting (React.lazy + Suspense)
2. Vendor chunk最適化（recharts条件付きロード）
3. React.memo適用（リスト系コンポーネント）
4. ビルドサイズ検証テスト

## TDD実装ステップ

### Step 1: LoadingFallback + Suspense境界コンポーネント
- TEST: LoadingFallback.test.tsx → ローディングUI表示テスト
- IMPL: LoadingFallback.tsx → Suspenseのfallback用ローディングスピナー

### Step 2: React.lazy route splitting (App.tsx)
- TEST: App.test.tsx → 既存テスト維持（Suspenseラッパー追加でも壊れないこと）
- IMPL: App.tsx → 9ページをReact.lazy化、Suspense境界追加

### Step 3: React.memo最適化
- TEST: GoalCard/MonthlyReportCard/AssetsTableのメモ化テスト
- IMPL: React.memoラッパー追加

### Step 4: ビルド検証 + バンドル分析
- tsc --noEmit + vitest run + npm run build
- バンドルサイズ比較

## 期待効果
- 初期ロード: 441KB → ~200KB（ダッシュボード直アクセス）
- 他ページは遅延ロード（AIAdvisor, Simulation, DataImport等）
- FCP/LCP改善: 体感30-40%高速化
