# Phase R6: Landing Page再設計 実装計画

## 目的
コンバージョン最適化 — ペルソナ「タケシ」に刺さるランディングページへ

## 変更内容

### R6-A: useTranslation除去 + 日本語直書き
- `useTranslation` / `t()` を全て除去（R2と同じアプローチ）
- フォールバック文字列をそのまま直書き

### R6-B: SVGアイコン → Lucide React
- 9個のカスタムSVGコンポーネント（ChartIcon, UploadIcon, BrainIcon等）を除去
- Lucide React アイコンに置換:
  | Custom SVG | Lucide Icon |
  |-----------|-------------|
  | ChartIcon | `BarChart3` |
  | UploadIcon | `Upload` |
  | BrainIcon | `Brain` |
  | TargetIcon | `Target` |
  | ShieldIcon | `ShieldCheck` |
  | CheckIcon | `Check` |
  | PainIcon1 (document) | `FileSpreadsheet` |
  | PainIcon2 (question) | `HelpCircle` |
  | PainIcon3 (grid) | `LayoutGrid` |
  | Cloud icon (inline) | `Cloud` |
  | Currency icon (inline) | `ArrowLeftRight` |
  | Credit card (inline) | `CreditCard` |
  | Server (inline) | `Server` |

### R6-C: Hero セクション改善
- OAuthLoginButtonの説明テキスト簡略化
- 「無料で始める」CTAをプライマリボタンとして強調
- 「クレジットカード不要」の信頼表示追加
- Google Drive権限説明はログインフロー内に移動（Landing上から削除）

### R6-D: テスト更新
- Landing.test.tsx のuseTranslationモック除去
- Lucideアイコンのモック追加
- 新しいテキスト内容のアサーション更新

## テスト修正箇所
- `Landing.test.tsx`: useTranslation mock除去、直接テキスト検証

## 影響範囲
- `src/pages/Landing.tsx` — メイン変更
- `src/__tests__/unit/pages/Landing.test.tsx` — テスト更新
