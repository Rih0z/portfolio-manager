# Phase R7: テスト品質向上 実装計画

## R7-A: インタラクションテスト

### 未テストのインタラクションフロー

| コンポーネント | パターン | テスト内容 |
|-------------|---------|----------|
| HoldingsEditor | ConfirmDialog | 削除ボタン → ダイアログ表示 → 確認 → removeTicker |
| ShareLinkDisplay | ConfirmDialog | リンク削除 → ダイアログ表示 → 確認 → 削除実行 |
| Dashboard | navigate() | 空状態CTA → /data-import, /settings遷移 |
| Settings | navigate() | データ取り込みボタン → /data-import遷移 |
| UpgradePrompt | navigate() | アップグレードボタン → /pricing遷移 |

### 既にテスト済み
- Simulation.tsx: ConfirmDialog + 一括購入フロー ✅
- ResetSettings: リセットダイアログ + 通知 ✅
- InitialSetupWizard: バリデーション通知 ✅
- Landing: 認証済みリダイレクト ✅
