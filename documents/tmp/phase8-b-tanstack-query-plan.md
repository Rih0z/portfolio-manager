# Phase 8-B: TanStack Query カスタムフック導入 — 実装計画

## サーバー状態 vs クライアント状態 分類

### 移行対象（サーバー状態 → TanStack Query）
| Store | 状態 | API | 優先度 |
|-------|------|-----|--------|
| subscriptionStore | planType, subscription, limits | `v1/subscription/status` | P1 |
| socialStore | shares[], peerComparison | `api/social/*` | P1 |
| referralStore | referralCode, stats | `api/referral/*` | P1 |
| notificationStore | notifications[], alertRules[] | `api/notifications`, `api/alert-rules` | P2 |
| portfolioStore | exchangeRate, currentAssets[] | `api/market-data` | P3 |
| portfolioStore | serverPortfolio | `api/portfolio` | P3 |

### 移行不要（クライアント状態 → Zustand 維持）
| Store | 理由 |
|-------|------|
| uiStore | 100% クライアント状態（テーマ・通知） |
| goalStore | 100% クライアント状態（ローカル目標） |
| authStore | セッション管理はZustandで維持（JWT refresh は Query化検討） |

---

## 作成するカスタムフック（9本）

### P1: 低複雑度（3本）
1. **useSubscriptionStatus** — `v1/subscription/status`
   - staleTime: 5分、cacheTime: 30分
   - ログイン時のみ有効（enabled: isAuthenticated）

2. **useUserShares** — `api/social/shares`
   - staleTime: 1分
   - useShareMutation: create/delete

3. **useReferralCode** + **useReferralStats** — `api/referral/*`
   - staleTime: 5分（stats）、Infinity（code）

### P2: 中複雑度（3本）
4. **useNotifications** — `api/notifications`（useInfiniteQuery）
   - ページネーション（DynamoDB lastKey）

5. **useAlertRules** — `api/alert-rules`
   - CRUD mutations 4本

6. **usePeerComparison** — `api/social/compare`
   - staleTime: 10分

### P3: 高複雑度（3本）
7. **useExchangeRate** — `api/market-data?type=exchange-rate`
   - staleTime: 1時間（既存の1時間キャッシュに合わせる）
   - localStorage永続化

8. **useMarketData** — `api/market-data`（useQueries バッチ）
   - 既存のデバウンス・スロットリングと統合
   - フォールバックデータ生成との連携

9. **useServerPortfolio** — `api/portfolio`
   - バージョン管理（optimistic concurrency）
   - 409 Conflict ハンドリング

---

## 作成するMutation（4本）
1. **useCreateShareMutation** — POST `api/social/share`
2. **useDeleteShareMutation** — DELETE `api/social/share/{id}`
3. **useAlertRuleMutations** — CRUD `api/alert-rules`
4. **useSavePortfolioMutation** — PUT `api/portfolio`

---

## ファイル構成
```
src/hooks/
  queries/
    useSubscriptionStatus.ts
    useUserShares.ts
    useReferralCode.ts
    useReferralStats.ts
    useNotifications.ts
    useAlertRules.ts
    usePeerComparison.ts
    useExchangeRate.ts
    useMarketData.ts
    useServerPortfolio.ts
    index.ts
  queryKeys.ts        # Query key 定数定義
```

---

## 実装順序
1. `queryKeys.ts` — クエリキー定義
2. P1 フック3本（subscription, shares, referral）
3. P1 コンポーネント統合 + テスト
4. P2 フック3本（notifications, alertRules, peerComparison）
5. P3 フック3本（exchangeRate, marketData, serverPortfolio）
6. ストアからサーバー状態を段階的に除去
