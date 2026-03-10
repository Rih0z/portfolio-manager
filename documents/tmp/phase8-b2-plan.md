# Phase 8-B(2): コンポーネント統合 — Zustand→TanStack Query移行 実装計画

**作成日**: 2026-03-09
**目的**: Zustandストアのサーバー状態をTanStack Queryフックに段階的に移行し、キャッシュ・再取得・楽観的更新を活用する。

---

## 移行対象サマリー

| # | ストア | Query フック | 影響ファイル数 | 難易度 |
|---|--------|-------------|---------------|--------|
| 1 | subscriptionStore | useSubscriptionStatus + mutations | 17 | 高 |
| 2 | socialStore | useUserShares + usePeerComparison | 6 | 中 |
| 3 | referralStore | useReferralCode + useReferralStats | 5 | 低 |
| 4 | notificationStore | useNotifications + useAlertRules + 5 mutations | 7 | 高 |
| 5 | portfolioStore（部分） | useExchangeRate + useStockPrices + useServerPortfolio | 8 | 高 |

---

## Step 1: subscriptionStore 移行（最大影響・最優先）

### 1-A: `useIsPremium()` 便利フック追加

**useSubscription.ts に追加:**
```typescript
export function useIsPremium(): boolean {
  const { data } = useSubscriptionStatus();
  return data?.planType === 'standard';
}
```

### 1-B: React コンポーネント移行

| ファイル | 変更前 | 変更後 |
|---------|--------|--------|
| App.tsx | `useSubscriptionStore(s => s.fetchStatus)` + useEffect | `useSubscriptionStatus({ enabled: isAuthenticated })` — 自動fetch |
| Dashboard.tsx | `useSubscriptionStore(s => s.isPremium())` | `useIsPremium()` |
| AIAdvisor.tsx | 同上 | `useIsPremium()` |
| PortfolioScoreCard.tsx | 同上 | `useIsPremium()` |
| NotificationPreferences.tsx | `useSubscriptionStore(s => s.isPremium)` | `useIsPremium()` |
| AlertRulesManager.tsx | 同上 | `useIsPremium()` |
| Pricing.tsx | `planType, startCheckout, openPortal, loading` | `useSubscriptionStatus()` + `useCreateCheckout()` + `useCreatePortal()` |

### 1-C: Zustand ストア間クロスアクセス

**問題**: goalStore, socialStore, notificationStore が `useSubscriptionStore.getState().isPremium()` を使用（非React文脈）

**解決策**: `queryClient` シングルトン（`providers/QueryProvider.tsx` からexport済み）を使い、キャッシュから直接読み取る。

```typescript
// 各ストア内のヘルパー
import { queryClient } from '../providers/QueryProvider';
import { subscriptionKeys } from '../hooks/queries/useSubscription';
import type { SubscriptionStatus } from '../services/subscriptionService';

function getIsPremiumFromCache(): boolean {
  const data = queryClient.getQueryData<SubscriptionStatus>(subscriptionKeys.status());
  return data?.planType === 'standard';
}
```

**対象ストア:**
- goalStore.ts: `isPremium()` → `getIsPremiumFromCache()`
- socialStore.ts: `isPremium()` → `getIsPremiumFromCache()`（2箇所）
- notificationStore.ts: `isPremium()` → `getIsPremiumFromCache()`（3箇所）

### 1-D: authStore 統合

**現状**: authStore が login/logout 時に `setPlanType()` を呼ぶ
**変更**:
- Login時: `queryClient.setQueryData(subscriptionKeys.status(), { planType: payload.planType, ... })` で楽観的更新 → 次にクエリが自動refetch
- Logout時: `queryClient.removeQueries({ queryKey: subscriptionKeys.all })` でキャッシュクリア

### 1-E: subscriptionStore 簡素化

移行後、subscriptionStore から削除する状態/アクション:
- `planType` → Query キャッシュ
- `subscription` → Query キャッシュ
- `limits` → Query キャッシュ
- `loading` → Query/Mutation の `isPending`
- `error` → Query/Mutation の `error`
- `isPremium()` → `useIsPremium()` フック
- `canUseFeature()` → Query データから導出
- `fetchStatus()` → `useSubscriptionStatus()` の自動fetch
- `startCheckout()` → `useCreateCheckout()` mutation
- `openPortal()` → `useCreatePortal()` mutation
- `setPlanType()` → `queryClient.setQueryData()` 楽観的更新

**結果**: subscriptionStore は完全に不要になり削除可能。

---

## Step 2: socialStore 移行

### 2-A: コンポーネント移行

| ファイル | 変更前 | 変更後 |
|---------|--------|--------|
| ShareDialog.tsx | `useSocialStore(createShare, loading, canCreateShare, getTtlDays)` | `useCreateShare()` + `useUserShares()` + ローカル計算 |
| PeerComparisonPanel.tsx | `useSocialStore(peerComparison, peerLoading, fetchPeerComparison)` | `usePeerComparison(ageGroup)` |
| SharePortfolioButton.tsx | `useSocialStore(shares, fetchUserShares, loading)` | `useUserShares()` |
| ShareLinkDisplay.tsx | `useSocialStore(deleteShare, loading)` | `useDeleteShare()` |

### 2-B: canCreateShare / getMaxShares / getTtlDays 計算ロジック

これらは `isPremium()` に依存 → `useIsPremium()` + ローカル定数で計算。
ShareDialog内でインラインで導出するか、`useShareLimits()` 小フックを作成。

### 2-C: socialStore 削除

全コンポーネント移行後、socialStore は完全削除可能。

---

## Step 3: referralStore 移行

### 3-A: コンポーネント移行

| ファイル | 変更前 | 変更後 |
|---------|--------|--------|
| ReferralSection.tsx | `useReferralStore(referralCode, stats, loading, fetchCode, fetchStats)` | `useReferralCode()` + `useReferralStats()` |
| ReferralStatsCard.tsx | `useReferralStore(stats, loading, fetchStats)` | `useReferralStats()` |
| useReferralCapture.ts | `useReferralStore(captureFromUrl, getCapturedCode, applyCode, applied)` | `useApplyReferral()` + ローカルsessionStorage管理 |

### 3-B: URL キャプチャ（ローカル状態）

`captureFromUrl`, `getCapturedCode`, `clearCapturedCode` はサーバー状態でないため、
`useReferralCapture.ts` 内にインラインで移動（sessionStorage直接操作）。

### 3-C: referralStore 削除

全移行後、referralStore は完全削除可能。

---

## Step 4: notificationStore 移行

### 4-A: コンポーネント移行

| ファイル | 変更前 | 変更後 |
|---------|--------|--------|
| NotificationDropdown.tsx | `notifications, markRead, markAllRead, removeNotification, loading, unreadCount` | `useNotifications()` + mutation フック群 |
| NotificationBell.tsx | `unreadCount` | `useNotifications()` の data から導出 |
| AlertRulesManager.tsx | `alertRules, removeAlertRule, updateAlertRule, fetchAlertRules, getMaxAlertRules, loading` | `useAlertRules()` + mutation フック群 + `useIsPremium()` |
| PriceAlertDialog.tsx | `addAlertRule` | `useCreateAlertRule()` |

### 4-B: ローカル状態の維持

以下はサーバー状態でないため、notificationStore に残す（または新しい軽量ストアに分離）:
- `addLocalNotification()` — UIトースト用
- `evaluateAlerts()` — ローカルアラート条件チェック
- `unreadCount` のローカル管理（サーバーfetch前の即座のUI更新用）

### 4-C: useAlertEvaluation.ts 更新

`evaluateAlerts` と `fetchNotifications/fetchAlertRules` の呼び出しを
TanStack Query の `refetch` に置換。

---

## Step 5: portfolioStore 部分移行

### 5-A: Exchange Rate 移行

| ファイル | 変更前 | 変更後 |
|---------|--------|--------|
| App.tsx | `updateExchangeRate()` | `useExchangeRate(baseCurrency, 'USD')` の自動fetch |
| usePortfolioData.ts | `exchangeRate` from store | `useExchangeRate()` フック |
| usePortfolioActions.ts | `updateExchangeRate()` | フックの `refetch()` |

### 5-B: Stock Prices

`refreshMarketPrices()` → `useStockPrices(tickers)` の自動fetch + `refetch()`

### 5-C: Server Portfolio Sync

`syncToServer/syncFromServer` → `useServerPortfolio()` + `useSavePortfolio()`

### 5-D: portfolioStore は部分的に残す

ポートフォリオのローカルCRUD操作（addTicker, updateHoldings, etc.）は引き続きZustand。
サーバー状態のみTanStack Queryに移行。

---

## 実行順序と進捗

```
Step 1 (subscriptionStore)  ← 最大影響・最優先     ✅ 完了
  1-A: useIsPremium + useCanUseFeature + getIsPremiumFromCache フック追加
  1-B: コンポーネント移行 (7ファイル)
  1-C: ストア間クロスアクセス (goalStore, socialStore, notificationStore)
  1-D: authStore 統合 (queryClient.setQueryData / removeQueries)
  1-E: subscriptionStore 削除
  → 全テスト通過確認 (2237 tests)

Step 2 (socialStore)                                ✅ 完了
  ShareDialog, PeerComparisonPanel, SharePortfolioButton, ShareLinkDisplay 移行
  → 全テスト通過確認

Step 3 (referralStore)                              ✅ 完了
  ReferralSection, ReferralStatsCard, useReferralCapture 移行
  → 全テスト通過確認

Step 4 (notificationStore)                          ✅ 完了
  NotificationBell, NotificationDropdown, AlertRulesManager, PriceAlertDialog 移行
  addLocalNotification → TQ キャッシュにも反映
  isPremium() バグ修正 (boolean を関数呼び出ししていた)
  → 全テスト通過確認 (2236 tests)

Step 5 (portfolioStore部分)                         ⬜ 未着手
  exchangeRate, stockPrices, serverSync — 深いビジネスロジック結合のため別セッションで実施
  → usePortfolioContext 経由で ~90% のコンポーネントに影響
  → テスト実行・確認
  → 全体ビルド確認
```

---

## テスト戦略

- 各ステップ完了後に `npm test` で全テスト通過確認
- 既存の `queries.test.tsx` はTanStack Queryフックのテスト済み
- Zustandストアのテストは移行対象分を更新/削除
- モックパターン: `vi.mock('../stores/subscriptionStore')` → `vi.mock('../hooks/queries')` に移行
- `QueryClientProvider` ラッパーが必要なテストは既存の `createWrapper()` パターンを踏襲

## リスク・注意事項

1. **ストア間クロスアクセス**: `queryClient.getQueryData()` はキャッシュがない場合 `undefined` を返す → フォールバック値 `false`（free相当）
2. **認証前のクエリ**: `enabled: isAuthenticated` で制御。未認証時はクエリ実行しない
3. **Pricing.tsx のリダイレクト**: 現行 `startCheckout()` は内部でリダイレクト実行 → mutation の `onSuccess` でリダイレクト処理を追加
4. **テストカバレッジ**: 80% 閾値を維持する必要あり — 削除するストアのテスト分を考慮
