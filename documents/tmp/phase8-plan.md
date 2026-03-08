# Phase 8: 継続改善 実装計画

**作成日**: 2026-03-08
**目標**: コードベースの品質・保守性向上、Stage 2への技術基盤整備

---

## 現状分析サマリー

| 領域 | 現状 | 目標 |
|------|------|------|
| カバレッジ閾値 | 75/65/70/75 | 80/70/75/80 |
| TanStack Query | インストール済だが未使用（QueryProvider空） | Zustandストア内API呼び出しをuseQuery/useMutationに移行 |
| Zustand persist | 手動実装3件 + middleware 2件（混在） | persist middleware統一 |
| TypeScript any | 304箇所 | 段階的削減（Phase 8-Aで100箇所以下目標） |
| テスト | 1,919 PASS / 1 FAIL（Dashboard CSS class不整合） | 全PASS + カバレッジ閾値達成 |

---

## Phase 8-A: テスト修正 + カバレッジ閾値引き上げ（1日）

### 8-A-1: Dashboard.test.jsx 修正
- CSS gradient class `from-primary-400` → `from-primary-500` のアサーション更新
- Phase 7 UIコントラスト改善で変更されたclass名に追従

### 8-A-2: カバレッジ閾値引き上げ
- vitest.config.ts: statements 75→80, branches 65→70, functions 70→75, lines 75→80
- 現状実績: 77.85/67.88/75.66/79.12
- statements 80%とlines 80%に到達させるため、不足分のテスト追加が必要

---

## Phase 8-B: TanStack Query カスタムフック導入（1〜2週間）

### 背景
- @tanstack/react-query 5.90.21 インストール済、QueryProvider設定済
- 全API呼び出しがZustandストア内のasync actionsで実行されている
- サーバー状態のキャッシュ、再取得、楽観的更新が手動管理

### 移行方針
Zustandは**クライアント状態**に集中させ、**サーバー状態**はTanStack Queryに移行:

| 区分 | Zustand（クライアント状態） | TanStack Query（サーバー状態） |
|------|---------------------------|------------------------------|
| 認証 | isAuthenticated, token管理 | - |
| ポートフォリオ | currentAssets, targetPortfolio, additionalBudget | 為替レート、株価、価格履歴 |
| サブスク | プランステータスキャッシュ | サブスク状態取得、チェックアウト |
| UI | テーマ、通知、モーダル | - |
| ゴール | ゴール一覧（ローカル管理） | - |
| 通知 | アラートルール | アラートルール取得、通知一覧 |
| ソーシャル | - | 共有PF取得、ピア比較 |
| リファラル | 紹介コード（ローカル） | リファラル統計 |

### 作成するカスタムフック
1. `useExchangeRate()` — 為替レート取得（staleTime: 5分）
2. `useStockPrices(tickers)` — 株価一括取得（staleTime: 1分）
3. `useSubscriptionStatus()` — サブスク状態（staleTime: 10分）
4. `usePriceHistory(ticker)` — 価格履歴取得（staleTime: 30分）
5. `useNotifications()` — 通知一覧（staleTime: 5分）
6. `useAlertRules()` — アラートルール取得
7. `useSharedPortfolio(shareId)` — 共有PF取得
8. `usePeerComparison()` — ピア比較データ
9. `useReferralStats()` — リファラル統計

### Mutations
1. `useSavePortfolio()` — PF保存（楽観的更新）
2. `useCreateCheckout()` — Stripe Checkout作成
3. `useUpdateAlertRule()` — アラートルールCRUD
4. `useSharePortfolio()` — PF共有作成

---

## Phase 8-C: Zustand persist 統一（3日）

### 現状の問題
- authStore: 手動localStorage + saveSession/loadSession
- portfolioStore: 手動Base64エンコード + encryptData/decryptData
- uiStore: 手動localStorage.setItem
- goalStore: persist middleware ✅
- referralStore: persist middleware ✅（sessionStorage）

### 移行方針
- 全ストアでZustand `persist` middleware統一
- カスタムストレージアダプタ作成（暗号化が必要な場合）
- portfolioStoreのBase64 → プレーンJSON + persist middleware
- authStoreのセッション管理 → persist middleware + TTL管理
- uiStoreのテーマ → persist middleware

### 後方互換性
- 既存のlocalStorageキーを読み取り、persist形式に自動マイグレーション
- バージョン管理: persist の `version` + `migrate` オプション活用

---

## Phase 8-D: TypeScript 型安全性強化（2〜3週間）

### 段階的アプローチ（strict: true は最終目標）
1. **Phase 8-D-1**: エラーハンドリング型安全化（~60箇所）
   - catch(e: any) → catch(e: unknown) + type guard
   - 共通エラーユーティリティ作成
2. **Phase 8-D-2**: API レスポンス型定義（~120箇所）
   - サービス層の戻り値型定義
   - Zustandストアのアクション引数型定義
3. **Phase 8-D-3**: コンポーネントprops型強化（~30箇所）
4. **Phase 8-D-4**: ユーティリティ関数型定義（~50箇所）
5. **Phase 8-D-5**: tsconfig strict: true 有効化 + 残存any解消

---

## 実行順序

```
Phase 8-A (テスト修正+閾値) ──→ Phase 8-B (TanStack Query)
                                      │
                                 Phase 8-C (Zustand persist)
                                      │
                                 Phase 8-D (TypeScript strict)
```

Phase 8-A は即座に着手可能。8-B〜8-D は順次実施。
