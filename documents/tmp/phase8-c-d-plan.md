# Phase 8-C/D 実装計画書

**作成日**: 2026-03-09
**対象フェーズ**: 8-C (Zustand persist 統一) → 8-D (TypeScript strict)

---

## Phase 8-C: Zustand persist 統一

### 現状分析

| ストア | persist状態 | localStorage key |
|--------|------------|-----------------|
| uiStore | ✅ persist | pfwise-ui (theme) |
| goalStore | ✅ persist | pfwise-goals (goals) |
| referralStore | ✅ persist/sessionStorage | pfwise-referral (capturedCode, applied) |
| notificationStore | ✅ persist | pfwise-notifications (notifications, alertRules) |
| socialStore | ✅ persist | pfwise-social (shares) |
| **authStore** | **❌ 手動** | pfwise-session (saveSession/loadSession/clearSession) |
| **portfolioStore** | **❌ 手動** | portfolioData (saveToLocalStorage/loadFromLocalStorage) |

**手動localStorage呼び出し箇所:**
- authStore: 4箇所 (save/load/remove SESSION_STORAGE_KEY)
- portfolioStore: 14箇所 (portfolioData + exchangeRate cache)
- setTimeout(() => saveToLocalStorage(), 100) パターン: 15箇所以上

---

### 8-C-1: authStore persist化

**変更ファイル**: `frontend/webapp/src/stores/authStore.ts`
**リスク**: 低（セッションキャッシュのみ、JWTはメモリ保持で変化なし）

#### 変更内容

1. **persist wrap追加**
   ```typescript
   export const useAuthStore = create<AuthState>()(
     persist(
       (set, get) => { ... },
       {
         name: 'pfwise-session',
         version: 1,
         partialize: (state) => ({
           user: state.user,
           hasDriveAccess: state.hasDriveAccess,
           sessionTimestamp: state.sessionTimestamp, // TTL用
         }),
         onRehydrateStorage: () => (state) => {
           if (!state) return;
           // TTL チェック (SESSION_MAX_AGE_MS)
           if (state.sessionTimestamp && Date.now() - state.sessionTimestamp >= SESSION_MAX_AGE_MS) {
             state.user = null;
             state.isAuthenticated = false;
             state.hasDriveAccess = false;
             state.sessionTimestamp = null;
           } else if (state.user) {
             state.isAuthenticated = true;
           }
         },
         migrate: (persisted: any, version: number) => {
           // v0: 旧 localStorage('pfwise-session') からの自動マイグレーション
           if (version === 0) {
             try {
               const legacy = localStorage.getItem('pfwise-session');
               if (legacy) {
                 const parsed = JSON.parse(legacy);
                 if (parsed.user && Date.now() - (parsed.timestamp || 0) < SESSION_MAX_AGE_MS) {
                   localStorage.removeItem('pfwise-session');
                   return { user: parsed.user, hasDriveAccess: parsed.hasDriveAccess || false, sessionTimestamp: parsed.timestamp };
                 }
                 localStorage.removeItem('pfwise-session');
               }
             } catch { /* noop */ }
           }
           return persisted;
         },
       }
     )
   );
   ```

2. **AuthState に sessionTimestamp 追加**
   ```typescript
   interface AuthState {
     // ... 既存フィールド
     sessionTimestamp: number | null; // persist TTL用
   }
   ```

3. **setAuthState 変更**
   - `saveSession(userData, driveAccess)` → 削除（persistが自動処理）
   - `clearSession()` → 削除（persist state clear）
   - 代わりに `set({ user: userData, isAuthenticated: true, sessionTimestamp: Date.now() })` または `set({ user: null, isAuthenticated: false, sessionTimestamp: null })`

4. **initializeAuth 変更**
   - `loadSession()` 呼び出し削除（persist自動復元）
   - 代わりに `get()` の rehydrated state を使用
   - persist の onRehydrateStorage で isAuthenticated が設定済み

5. **checkSession fallback 変更**
   - `loadSession()` → `get()` の state 参照

6. **削除する定数/関数**:
   - `SESSION_STORAGE_KEY` 定数
   - `saveSession` 関数
   - `loadSession` 関数
   - `clearSession` 関数
   - `SESSION_MAX_AGE_MS` → persist TTL用に保持

---

### 8-C-2: portfolioStore persist化

**変更ファイル**: `frontend/webapp/src/stores/portfolioStore.ts`
**リスク**: 高（ユーザーポートフォリオデータ移行 — 移行失敗時にデータ消失のリスク）

#### データ移行戦略

旧形式 (`portfolioData` key):
- JSON文字列 (v2) または Base64エンコードJSON (v1/v0)
- `encryptData`/`decryptData` で読み書き

新形式 (`pfwise-portfolio` key):
- Zustand persist標準JSON形式

移行フロー:
1. `migrate(persisted, version)` で旧 `portfolioData` を読み込み
2. `decryptData()` で旧形式をデコード
3. 新形式に変換して返す
4. 旧 key を削除（移行後）

#### 変更内容

1. **persist wrap追加**
   ```typescript
   export const usePortfolioStore = create<PortfolioState>()(
     persist(
       (set, get) => ({ ... }),
       {
         name: 'pfwise-portfolio',
         version: 1,
         partialize: (state) => ({
           baseCurrency: state.baseCurrency,
           exchangeRate: state.exchangeRate,
           lastUpdated: state.lastUpdated,
           currentAssets: state.currentAssets,
           targetPortfolio: state.targetPortfolio,
           additionalBudget: state.additionalBudget,
           aiPromptTemplate: state.aiPromptTemplate,
         }),
         // 非persist: initialized, dataSource, lastSyncTime, currentUser,
         //            serverVersion, syncStatus, lastServerSync
         migrate: (persisted: any, version: number) => {
           if (version === 0) {
             // 旧 'portfolioData' からの移行
             try {
               const legacy = localStorage.getItem('portfolioData');
               if (legacy) {
                 const data = decryptData(legacy);
                 if (data && data.currentAssets) {
                   localStorage.removeItem('portfolioData'); // 移行後に削除
                   return {
                     baseCurrency: data.baseCurrency || 'JPY',
                     exchangeRate: data.exchangeRate || { rate: 150.0, source: 'Default', lastUpdated: new Date().toISOString() },
                     lastUpdated: data.lastUpdated || null,
                     currentAssets: data.currentAssets || [],
                     targetPortfolio: data.targetPortfolio || [],
                     additionalBudget: typeof data.additionalBudget === 'number'
                       ? { amount: data.additionalBudget, currency: data.baseCurrency || 'JPY' }
                       : (data.additionalBudget || { amount: 300000, currency: 'JPY' }),
                     aiPromptTemplate: data.aiPromptTemplate || null,
                   };
                 }
               }
             } catch { /* 移行失敗時はデフォルト値 */ }
           }
           return persisted;
         },
         onRehydrateStorage: () => (state) => {
           // 為替レート整合性チェック
           if (state && state.exchangeRate) {
             if (!state.exchangeRate.rate || typeof state.exchangeRate.rate !== 'number') {
               state.exchangeRate = { rate: 150.0, lastUpdated: new Date().toISOString(), source: 'fallback' };
             }
           }
         },
       }
     )
   );
   ```

2. **initializeData() の変更**
   - LocalStorage読み込み部分を削除（persist自動復元）
   - 代わりに rehydrated state の `validateAssetTypes` バリデーションのみ実行
   - `initialized = true` 設定

3. **saveToLocalStorage() の変更**
   - 実装: no-op（互換性維持）またはコメントのみに変更
   - 呼び出し元の `setTimeout(() => get().saveToLocalStorage(), 100)` を全て削除

4. **loadFromLocalStorage() の変更**
   - 削除（initializeData内でのみ使用）

5. **clearLocalStorage() の変更**
   - `localStorage.removeItem('portfolioData')` → `usePortfolioStore.persist.clearStorage()`

6. **exchange rate cache** (localStorage `exchangeRate_JPY`/`exchangeRate_USD`):
   - **変更なし** — これはZustandの状態ではなくAPIレスポンスキャッシュ
   - 将来的にTanStack Query cacheに移行する可能性（Phase 8-B延長）

#### 削除対象

- `encryptData` 関数（移行期間中のmigrate内でのみ使用後、削除可能）
- `decryptData` 関数（同上）
- `saveToLocalStorage` 関数（実装削除、空関数として一時保持）
- `loadFromLocalStorage` 関数
- `clearLocalStorage` 関数 → `clearPortfolioData` に名前変更してpersist.clearStorage使用
- 全 `setTimeout(() => get().saveToLocalStorage(), 100)` 呼び出し（15箇所以上）

---

### 8-C 実行順序

```
8-C-1: authStore persist化 (低リスク) → テスト → 確認
↓
8-C-2: portfolioStore persist化 (高リスク) → テスト → 確認
```

---

## Phase 8-D: TypeScript strict mode

### 現状分析

- 総 `any` 件数: 244件 (src/ 全体)
- ストア別: portfolioStore(58), authStore(8), notificationStore(5), uiStore(1)

### 方針: 段階的 any 削減

#### 8-D-1: strict: false のまま any を削減

**ターゲット削減対象** (優先度高):
1. `catch(e: any)` → `catch(e: unknown)` + `getErrorMessage(e)` 使用（既存パターン）
2. APIレスポンス型定義（`any` → 具体的な interface）
3. 関数パラメータの `any` → union型 or interface

**対象ファイル優先度**:
```
高: portfolioStore.ts (58 any) → 型定義追加で大量削減可能
中: authStore.ts (8 any)
低: services/*.ts, components/*.tsx
```

#### 8-D-2: noImplicitAny: true 有効化

tsconfig.json:
```json
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": true  // ← 追加
  }
}
```

エラーを確認しながら段階的修正。

#### 8-D-3: strict: true 有効化

全strict オプション有効:
- strictNullChecks
- strictFunctionTypes
- strictBindCallApply
- strictPropertyInitialization

**推定 any 削減後目標**: 100件以下 (から strict: true 挑戦)

---

## 実行スケジュール

| フェーズ | 内容 | リスク | 見積もり |
|---------|------|--------|---------|
| 8-C-1 | authStore persist化 | 低 | ⬤ |
| 8-C-2 | portfolioStore persist化 | 高 | ⬤⬤⬤ |
| 8-D-1 | any 244→100件削減 | 中 | ⬤⬤ |
| 8-D-2 | noImplicitAny: true | 中 | ⬤ |
| 8-D-3 | strict: true | 高 | ⬤⬤ |

---

## リスク管理

### portfolioStore移行リスク
- **リスク**: データ移行失敗でユーザーのポートフォリオが消失
- **対策**:
  1. `migrate()` 内で移行失敗時はデフォルト値（空ポートフォリオ）を返す
  2. 旧 `portfolioData` key は移行成功後のみ削除
  3. 移行前にバックアップ（旧データのコピーを別keyに保持）

### authStore移行リスク
- **リスク**: セッション消失 → ユーザーが再ログイン必要
- **対策**: `migrate()` で旧 `pfwise-session` key から自動移行

---

## テスト戦略

各フェーズ後:
1. `npm test` — 全ユニットテスト通過確認
2. `npm run typecheck` — 型エラー0確認
3. `npm run build` — ビルド成功確認
4. ブラウザ動作確認:
   - 既存ユーザー: データ移行確認
   - 新規ユーザー: 初期状態確認
   - ログイン/ログアウトフロー確認

---

**ステータス**: 計画作成完了、実装待ち
