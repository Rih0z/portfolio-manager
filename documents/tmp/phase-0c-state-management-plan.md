# Phase 0-C: 状態管理刷新 実装計画

**作成日**: 2026-03-04
**目標**: PortfolioContext.tsx 1,888行 → Zustand 4ストア + TanStack Query
**完了条件**: 互換ラッパー経由で全機能動作 + ビルド成功 + デプロイ確認

---

## 現状分析

### PortfolioContext.tsx の構造（1,888行）

| カテゴリ | 状態変数 | アクション数 | 推定行数 |
|---------|---------|------------|---------|
| ポートフォリオデータ | 6 (baseCurrency, currentAssets, targetPortfolio, exchangeRate, additionalBudget, aiPromptTemplate) | 12 (addTicker, updateHolding, removeAsset, updateTargetAllocation, etc.) | ~400行 |
| 計算値 | 3 (totalAssets, annualFees, annualDividends) | 4 (calculatePurchaseShares, convertCurrency, etc.) | ~150行 |
| マーケットデータ | 0 (exchangeRateと共有) | 2 (refreshMarketData, updateExchangeRate) | ~200行 |
| シミュレーション | 0 (結果はローカル変数) | 3 (runSimulation, executePurchase, executeBatchPurchase) | ~200行 |
| Google Drive同期 | 3 (dataSource, lastSyncTime, currentUser) | 3 (saveToGoogleDrive, loadFromGoogleDrive, handleAuthStateChange) | ~250行 |
| ローカルストレージ | 0 | 3 (saveToLocalStorage, loadFromLocalStorage, clearLocalStorage) | ~200行 |
| 通知 | 1 (notifications) | 2 (addNotification, removeNotification) | ~50行 |
| UI状態 | 2 (initialized, isLoading) | 1 (initializeData) | ~100行 |
| データ入出力 | 0 | 3 (importData, exportData, validateAssetTypes) | ~200行 |
| Contextプロバイダ | - | - | ~138行 |

### 既存の分割済みフック（薄いラッパー）

| フック | 提供内容 | 移行方針 |
|-------|---------|---------|
| `usePortfolioData` | 読み取り専用データ | → usePortfolioStoreのセレクタに置換 |
| `usePortfolioActions` | CRUD操作 | → usePortfolioStoreのアクションに置換 |
| `useSimulation` | シミュレーション | → useSimulationStoreに置換 |
| `useCloudSync` | クラウド同期 | → usePortfolioStoreの同期アクションに置換 |
| `useNotifications` | 通知管理 | → useUIStoreに置換 |

### サービス層（変更不要）

| サービス | 役割 | TanStack Query化 |
|---------|------|-----------------|
| `marketDataService.ts` | マーケットデータ取得 | ✅ queryFnとして利用 |
| `googleDriveService.ts` | Google Drive API | ❌ mutationとして利用するがストア側で呼出し |
| `configService.ts` | API設定取得 | ✅ queryFnとして利用 |
| `CalculationService.ts` | 金融計算 | ❌ 純粋関数、そのまま利用 |
| `SimulationService.ts` | シミュレーション | ❌ 純粋関数、そのまま利用 |

---

## アーキテクチャ設計

### 責務分離ルール

```
TanStack Query（サーバーデータ）     Zustand（クライアントデータ）
├─ 為替レート                        ├─ ポートフォリオ構成
├─ 株価データ                        ├─ UI状態・通知
├─ API設定                          ├─ 認証状態
└─ APIステータス                     └─ シミュレーション設定
```

**ルール**: 同じデータを両方に保持しない。マーケットデータ用のZustandストアは作らない。

### 4 Zustand ストア

#### 1. `usePortfolioStore` — 資産データ + 同期

```typescript
// src/stores/portfolioStore.ts
interface PortfolioState {
  // --- State ---
  currentAssets: Asset[];
  targetPortfolio: TargetAllocation[];
  baseCurrency: 'JPY' | 'USD';
  additionalBudget: { amount: number; currency: string };
  aiPromptTemplate: any;
  dataSource: 'local' | 'cloud';
  lastSyncTime: string | null;
  currentUser: any;
  initialized: boolean;

  // --- Computed (get) ---
  // totalAssets, annualFees, annualDividends は TanStack Query のexchangeRateと組み合わせて算出
  // → コンポーネント側で useMemo + useExchangeRate() で計算

  // --- Actions ---
  addTicker: (ticker: string, holdings?: number) => Promise<void>;
  removeTicker: (ticker: string) => void;
  updateHolding: (ticker: string, holdings: number) => void;
  updateTargetAllocation: (ticker: string, percentage: number) => void;
  updateAnnualFee: (id: string, fee: number) => void;
  updateDividendInfo: (id: string, yield_: number, hasDividend: boolean, frequency: string) => void;
  setBaseCurrency: (currency: 'JPY' | 'USD') => void;
  toggleCurrency: () => void;
  setAdditionalBudget: (budget: { amount: number; currency: string }) => void;
  setAiPromptTemplate: (template: any) => void;
  importData: (data: any) => ImportResult;
  exportData: () => any;

  // Cloud Sync
  saveToGoogleDrive: () => Promise<any>;
  loadFromGoogleDrive: (userData?: any) => Promise<any>;
  handleAuthStateChange: (isAuthenticated: boolean, user: any) => void;

  // Local Storage
  saveToLocalStorage: () => boolean;
  loadFromLocalStorage: () => any | null;
  clearLocalStorage: () => boolean;
  initializeData: () => void;
}
```

**Persist**: `zustand/middleware` の `persist` で localStorage に永続化（Base64エンコード廃止→プレーンJSON）

#### 2. `useAuthStore` — 認証状態

```typescript
// src/stores/authStore.ts
interface AuthState {
  user: UserData | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  hasDriveAccess: boolean;
  googleClientId: string;

  loginWithGoogle: (credentialResponse: any) => Promise<any>;
  logout: () => Promise<void>;
  checkSession: () => Promise<boolean>;
  initiateDriveAuth: () => Promise<boolean>;
  setPortfolioStoreRef: (store: any) => void;
}
```

**注意**: AuthContextの内部ロジック（JWT管理、セッション永続化、visibility handler）はストア内に移植。
apiUtils.tsのトークン管理（setAuthToken/getAuthToken/clearAuthToken/refreshAccessToken）はそのまま利用。

#### 3. `useSimulationStore` — シミュレーション

```typescript
// src/stores/simulationStore.ts
interface SimulationState {
  simulationResult: SimulationResult[] | null;
  includeCurrentHoldings: boolean;

  runSimulation: () => SimulationResult[];
  executePurchase: (tickerId: string, units: number) => void;
  executeBatchPurchase: (results: SimulationResult[]) => void;
  setIncludeCurrentHoldings: (include: boolean) => void;
}
```

**依存**: portfolioStoreの currentAssets, targetPortfolio, additionalBudget を参照。
Zustandの `getState()` で直接読み取る（subscribe不要）。

#### 4. `useUIStore` — UI状態 + 通知

```typescript
// src/stores/uiStore.ts
interface UIState {
  notifications: Notification[];
  isLoading: boolean;
  activeTab: string;
  theme: 'light' | 'dark';

  addNotification: (message: string, type?: string) => string;
  removeNotification: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setActiveTab: (tab: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
}
```

### TanStack Query カスタムフック

```typescript
// src/hooks/queries/useExchangeRate.ts
export function useExchangeRate(from = 'USD', to = 'JPY') {
  return useQuery({
    queryKey: ['exchangeRate', from, to],
    queryFn: () => fetchExchangeRate(from, to),
    staleTime: 30 * 60 * 1000, // 30分
    gcTime: 24 * 60 * 60 * 1000, // 24時間
    placeholderData: { rate: 150.0, source: 'Default', lastUpdated: new Date().toISOString() },
  });
}

// src/hooks/queries/useStockPrice.ts
export function useStockPrice(ticker: string) {
  return useQuery({
    queryKey: ['stockPrice', ticker],
    queryFn: () => fetchStockData(ticker),
    staleTime: 5 * 60 * 1000, // 5分
    enabled: !!ticker,
  });
}

// src/hooks/queries/useMultipleStocks.ts
export function useMultipleStocks(tickers: string[]) {
  return useQuery({
    queryKey: ['stocks', tickers.sort().join(',')],
    queryFn: () => fetchMultipleStocks(tickers),
    staleTime: 5 * 60 * 1000,
    enabled: tickers.length > 0,
  });
}

// src/hooks/queries/useApiConfig.ts
export function useApiConfig() {
  return useQuery({
    queryKey: ['apiConfig'],
    queryFn: () => fetchApiConfig(),
    staleTime: Infinity, // 一度取得したら変わらない
    gcTime: Infinity,
  });
}

// src/hooks/queries/useApiStatus.ts
export function useApiStatus() {
  return useQuery({
    queryKey: ['apiStatus'],
    queryFn: () => getStatus(),
    staleTime: 60 * 1000,
  });
}
```

---

## 実装ステップ

### Step 1: 依存パッケージインストール + QueryClientProvider設定

```bash
cd frontend/webapp
npm install zustand @tanstack/react-query --legacy-peer-deps
npm install --save-dev @tanstack/react-query-devtools --legacy-peer-deps
```

- `src/providers/QueryProvider.tsx` 新規作成
- `App.tsx` に QueryClientProvider を追加
- 検証: `npx tsc --noEmit` + `npm run build`

### Step 2: UIStore 作成（最も独立性が高い）

- `src/stores/uiStore.ts` 新規作成
- NotificationService.ts のロジックを統合
- 既存の `useNotifications` フックを UIStore のセレクタに書き換え
- 検証: `npm run build`

### Step 3: TanStack Query フック作成

- `src/hooks/queries/useExchangeRate.ts` 新規作成
- `src/hooks/queries/useMultipleStocks.ts` 新規作成
- `src/hooks/queries/useApiConfig.ts` 新規作成
- `src/hooks/queries/useApiStatus.ts` 新規作成
- 既存のサービス関数を queryFn として利用（サービス層は変更なし）
- 検証: `npm run build`

### Step 4: PortfolioStore 作成

- `src/stores/portfolioStore.ts` 新規作成
- PortfolioContext.tsx から状態とアクションを抽出
- `zustand/middleware/persist` で localStorage 永続化
- 計算値（totalAssets等）は `useShallow` セレクタ + useMemo で実現
- Cloud Sync ロジック（saveToGoogleDrive/loadFromGoogleDrive）をストア内に移植
- 検証: `npm run build`

### Step 5: SimulationStore 作成

- `src/stores/simulationStore.ts` 新規作成
- SimulationService.ts を queryFn として利用
- portfolioStore.getState() で資産データ参照
- 検証: `npm run build`

### Step 6: AuthStore 作成

- `src/stores/authStore.ts` 新規作成
- AuthContext.tsx の全ロジックを移植
- JWT管理、セッション永続化、visibility handler を含む
- apiUtils.ts のトークン管理関数はそのまま利用
- 検証: `npm run build`

### Step 7: 互換ラッパー作成

- `src/context/PortfolioContext.tsx` を互換ラッパーに書き換え
  - 内部でusePortfolioStore + TanStack Queryを使用
  - 外部インターフェースは完全に同一を維持
  - 既存コンポーネントのusePortfolioContext()呼び出しは変更不要
- `src/context/AuthContext.tsx` を互換ラッパーに書き換え
  - 内部でuseAuthStoreを使用
  - 外部インターフェースは完全に同一を維持
- `ContextConnector` を新しいストア間ブリッジに更新
- 検証: `npm run build` + E2E全PASS

### Step 8: 段階的コンポーネント移行（Phase 0-C完了後、UI/UXリデザイン時に実施）

- 互換ラッパー経由で動作する状態で一旦完了
- コンポーネントの直接ストア参照への移行はUI/UXリデザイン（Phase 1-2）時に実施
- この時点では `usePortfolioContext()` → 互換ラッパー → Zustand の2段階

### Step 9: 検証 + デプロイ

- `npx tsc --noEmit` → エラー0
- `npm run build` → 成功
- E2E テスト 6件 → 全PASS
- Cloudflare Pages デプロイ → portfolio-wise.com 動作確認
- Git commit + push

---

## ファイル構成（新規追加）

```
src/
├── stores/
│   ├── portfolioStore.ts      # ポートフォリオデータ + 同期
│   ├── authStore.ts           # 認証状態
│   ├── simulationStore.ts     # シミュレーション
│   └── uiStore.ts             # UI状態 + 通知
├── hooks/
│   └── queries/
│       ├── useExchangeRate.ts
│       ├── useMultipleStocks.ts
│       ├── useStockPrice.ts
│       ├── useApiConfig.ts
│       └── useApiStatus.ts
├── providers/
│   └── QueryProvider.tsx       # QueryClientProvider設定
├── context/
│   ├── PortfolioContext.tsx    # 互換ラッパー（内部でZustand使用）
│   └── AuthContext.tsx         # 互換ラッパー（内部でZustand使用）
```

---

## リスク軽減

| リスク | 対策 |
|--------|------|
| 互換ラッパーの不完全さ | 外部インターフェースの型定義を先に作成し、ラッパーが同一シグネチャを返すことを型レベルで保証 |
| Zustand persist と既存暗号化の競合 | Phase 0-C では persist をプレーンJSON化。暗号化はPhase 2-B（サーバーサイドストレージ移行）で対応 |
| TanStack Query と既存キャッシュの二重管理 | 既存の requestDeduplicator/exchangeRateDebounce は TanStack Query の staleTime/gcTime に置換。移行完了後に削除 |
| AuthStore の visibility handler 移植 | Zustand は React ライフサイクル外でも動作するため、subscribeWithSelector でイベントリスナを登録 |
| SimulationStore からの portfolioStore 参照 | Zustand の getState() で同期的に読み取り。subscribe は不要（計算は on-demand） |
| 既存テストの大量失敗 | テストはPhase 0-B時点で42件スキップ済み。UI/UXリデザイン後に書き直す前提。互換ラッパーにより既存テストは変更なしで動作するはず |

---

## 工数見積もり

| Step | 内容 | 複雑度 | 見積もり |
|------|------|--------|---------|
| 1 | パッケージ + QueryProvider | 低 | 30分 |
| 2 | UIStore | 低 | 1時間 |
| 3 | TanStack Query フック | 中 | 2時間 |
| 4 | PortfolioStore | 高 | 4時間（最大のファイル分割） |
| 5 | SimulationStore | 中 | 1時間 |
| 6 | AuthStore | 高 | 3時間（JWT・セッション管理の複雑さ） |
| 7 | 互換ラッパー | 高 | 3時間（全インターフェースの完全互換性確保） |
| 8 | コンポーネント移行 | - | Phase 1-2で実施（スコープ外） |
| 9 | 検証 + デプロイ | 低 | 1時間 |

**合計**: 約15時間（1セッション内で完了を目指す）

---

## 完了条件チェックリスト

- [ ] `npx tsc --noEmit` → エラー0
- [ ] `npm run build` → 成功
- [ ] 互換ラッパー経由で既存コンポーネント全動作
- [ ] E2Eテスト6件全PASS
- [ ] Cloudflare Pagesデプロイ → portfolio-wise.com 動作確認
- [ ] Git commit + push
- [ ] redesign-plan.md の Phase 0-C チェックボックスを ✅ に更新
