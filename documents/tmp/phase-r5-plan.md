# Phase R5: 機能取捨選択 実装計画

## ナビゲーション再構成 (5→4タブ)

### 変更内容
1. TabNavigation: data-importタブ削除、grid-cols-5→grid-cols-4
2. Settings「データ」タブ: データ取り込みへのリンク追加
3. /data-importルートは維持（Dashboard空状態CTAからアクセス可能）

### タブ構成
| Before | After |
|--------|-------|
| ホーム, AI分析, 配分, 設定, データ | ホーム, AI分析, 配分, 設定 |

### テスト修正
- TabNavigation.test.jsx: 5リンク→4リンク、grid-cols-5→grid-cols-4
