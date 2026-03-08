# Phase R4: ダッシュボード再設計 実装計画

## 対象ファイル

### 1. Dashboard.tsx
- useTranslation 削除、日本語テキスト直書き
- 空状態: CSVインポート / 手動追加の2 CTA追加
- window.location.href → useNavigate()
- 英語 subtitle → 日本語
- text-neutral-* → テーマ対応クラス

### 2. DataStatusBar.tsx
- bg-gray-50/bg-yellow-50 → テーマ対応クラス
- text-gray-*/text-yellow-*/text-orange-*/text-blue-* → semantic色
- Lucide Icons 導入（RefreshCw, AlertTriangle）

### 3. TabNavigation.tsx
- useTranslation 削除、日本語ラベル直書き
- SVGアイコン → Lucide React Icons (LayoutDashboard, Bot, BarChart3, Settings, Upload)

## 完了基準
- English テキストゼロ
- ハードコード色クラスゼロ
- 空状態にCSVインポートCTA
