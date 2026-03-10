# Phase 9-A 実装計画: 取得単価入力 UI（HoldingCard 拡張）

**作成日**: 2026-03-10
**担当**: Claude Code

---

## 変更ファイル一覧

| ファイル | 変更種別 | 概要 |
|---------|----------|------|
| `src/stores/portfolioStore.ts` | 修正 | `updatePurchasePrice` アクション追加 |
| `src/hooks/usePortfolioContext.ts` | 修正 | `updatePurchasePrice` を型・実装に追加 |
| `src/components/settings/HoldingCard.tsx` | 修正 | 取得単価入力 UI 追加（Standard/Free 分岐） |
| `src/components/settings/HoldingsEditor.tsx` | 修正 | `updatePurchasePrice` を HoldingCard に渡す |
| `src/__tests__/unit/components/settings/HoldingCard.test.tsx` | 修正 | 取得単価テスト追加 |

---

## 実装詳細

### 1. portfolioStore.ts
- `PortfolioState` interface に `updatePurchasePrice: (id: string, price: number) => void` 追加
- `usePortfolioStore` 内に実装追加（`updateHoldings` 同様のパターン）
  ```ts
  updatePurchasePrice: (id, price) => {
    set(state => ({
      currentAssets: state.currentAssets.map(item =>
        item.id === id ? { ...item, purchasePrice: price } : item
      )
    }));
  }
  ```
  - persist 自動保存 ✅（Zustand persist middleware 配下）

### 2. usePortfolioContext.ts
- `PortfolioContextValue` interface に `updatePurchasePrice` 追加
- `usePortfolioContext` 内で `portfolio.updatePurchasePrice` を返す

### 3. HoldingCard.tsx
- 新 prop: `onUpdatePurchasePrice: (id: string, price: number) => void`
- 内部 import: `useIsPremium` from `hooks/queries/useSubscription`
- 内部 import: `useNavigate` from `react-router-dom`
- 新 state: `isPurchasePriceEditing`, `purchasePriceEditValue`, `purchasePriceError`
- Holdings Editor の直後に「取得単価」セクション追加
  - Standard: 編集可能 Input（保存/キャンセルボタン付き）
  - Free: ロック表示 + アップグレード誘導（/pricing へ navigate）
- バリデーション: 0・負値・NaN でエラー表示

### 4. HoldingsEditor.tsx
- `usePortfolioContext()` から `updatePurchasePrice` 取得
- HoldingCard に `onUpdatePurchasePrice={updatePurchasePrice}` を渡す

### 5. テスト
- `useIsPremium` / `react-router-dom` のモック追加
- Standard ユーザー: 取得単価フィールド表示・編集・保存・キャンセルテスト
- Free ユーザー: ロック表示テスト
- バリデーション: 0, -1, NaN のエラー確認
- 正常系: 10, 1000, 99999 の保存確認

---

## 受け入れ基準チェック
- [ ] HoldingCard に「取得単価」入力フィールド（Standard のみ編集可）
- [ ] Free はロック + アップグレード誘導
- [ ] 入力後 PnLSummary が即時更新（Zustand リアクティブ）
- [ ] 0・負値バリデーションエラー表示
- [ ] テスト全件通過・tsc 0 errors・ビルド成功
