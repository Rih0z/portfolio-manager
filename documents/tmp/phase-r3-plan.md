# Phase R3: デザイントークン統一 実装計画

## 目的
ハードコード色値(24箇所)を CSS変数 + 集約定数ファイルに統一し、テーマ対応を完全化。

## 実装手順

### 1. CSS変数追加 (`src/index.css`)
- `--chart-1` 〜 `--chart-15`: チャート用カラーパレット（ライト/ダーク両対応）
- `--color-success-500`, `--color-danger-500`, `--color-primary-500`, `--color-warning-500`: セマンティック色変数

### 2. 集約定数ファイル作成 (`src/constants/chartColors.ts`)
- `CHART_COLORS`: CSS変数を参照する15色配列
- 全チャートコンポーネントから import して使用

### 3. 対象ファイル修正
| ファイル | HEX数 | 修正内容 |
|---------|--------|---------|
| `PortfolioCharts.tsx` | 15 | COLORS → import CHART_COLORS + bg-white → bg-card |
| `DifferenceChart.tsx` | 2 | `#4CAF50`/`#F44336` → CSS変数 + bg-white → bg-card |
| `PeerComparisonPanel.tsx` | 10 | COLORS → import CHART_COLORS |
| `SharedPortfolio.tsx` | 15 | CHART_COLORS → import CHART_COLORS |
| `progress.tsx` | 4 | getColor() → CSS変数参照 |
| `AIAdvisor.tsx` | 2 | `#0052CC`/`#E5E7EA` → CSS変数 |

### 4. 除外（変更しない）
- `OAuthLoginButton.tsx`: Google公式ブランドカラー（変更禁止）
- `PnLTrendChart.tsx`: 既にCSS変数使用済み（変更不要）

## 完了基準
- ハードコード色値（Google以外）: 0箇所
- ダーク/ライト両モードでチャート色が適切に表示
- 全テスト通過
