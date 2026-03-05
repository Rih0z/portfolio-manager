# バグ報告: Google認証・データ読込・タブ切替ログアウト問題

**報告日**: 2026-03-04
**ステータス**: 修正完了・コードレベル検証済み・本番動作確認待ち
**影響度**: CRITICAL

---

## 症状

1. **Googleログイン後、Google Drive上のデータが読み込まれない**
2. **タブを切り替えると勝手にログアウトされる**

---

## 原因分析

### BUG-1: Google Drive データ読込が完全に無効化されている (CRITICAL)

**ファイル**: `frontend/webapp/src/context/PortfolioContext.tsx` (行 1484-1487)

```typescript
// Google Drive API の loadFromGoogleDrive 関数は削除されました
// ダミーのエラーレスポンスを返してフォールバック処理を実行
console.log('Google Drive読み込み機能は現在無効です');
const result: any = { success: false, message: 'Google Drive読み込み機能は現在無効です' };
```

**根本原因**: `loadFromGoogleDrive` 関数内で、実際のAPI呼び出しがダミーレスポンス（`success: false`）に置き換えられている。これにより:
- ログイン後のデータ読込が常に失敗する
- ユーザーには「Google Drive読み込み機能は現在無効です」と表示される
- 行1490-1554のデータ処理コードは到達不能（dead code）

**影響範囲**:
- `LoginButton.tsx` 行340-344: ログイン成功後の自動データ読込
- `useGoogleDrive.ts`: Google Driveフック全体

---

### BUG-2: タブ切替時の自動ログアウト (CRITICAL)

**複数の原因が連鎖して発生する問題**:

#### 原因2-A: トークンリフレッシュ失敗時のトークン即時削除
**ファイル**: `frontend/webapp/src/utils/apiUtils.ts` (行 180)

```typescript
catch (error: any) {
  clearAuthToken(); // ネットワークエラーでもトークンを即座に削除
  return null;
}
```

**問題**: ネットワークの一時的な不安定（タブがバックグラウンドにいた間の接続断等）でもJWTトークンが即座に削除される。Cookieベースのフォールバック前にトークンが消えるため、セッション復帰が困難になる。

#### 原因2-B: セッション確認失敗カウンターによる永続的ログアウト
**ファイル**: `frontend/webapp/src/context/AuthContext.tsx` (行 271-289)

```typescript
sessionCheckFailureCount.current++;
if (sessionCheckFailureCount.current >= MAX_SESSION_CHECK_FAILURES) { // 3回
  const stored = loadSession();
  if (stored) {
    // localStorageフォールバック + セッション確認インターバル停止
    clearInterval(sessionIntervalRef.current);
  } else {
    setAuthState(null, false, false, null); // ← 完全ログアウト
  }
}
```

**問題**: 3回連続の失敗で:
- localStorageにセッションがあれば一応表示は維持されるが、定期チェックが停止
- localStorageにセッションがなければ即座にログアウト
- 一度停止すると、ページリロードまで復帰不可能

#### 原因2-C: タブ復帰時のvisibility handlerが失敗後にスキップされる
**ファイル**: `frontend/webapp/src/context/AuthContext.tsx` (行 463)

```typescript
if (sessionCheckFailureCount.current >= MAX_SESSION_CHECK_FAILURES) return; // 即リターン
```

**問題**: 失敗カウンターが3以上になると、タブ復帰時のセッション検証が永久にスキップされる。カウンターのリセットメカニズムがvisibility handler内にないため、復帰不可能。

#### 原因2-D: 401エラー時のトークン削除がフォールバック前に発生
**ファイル**: `frontend/webapp/src/utils/apiUtils.ts` (行 339)

```typescript
if (isSessionEndpoint || (!isDriveEndpoint && error.response.data?.message?.includes('Invalid token'))) {
  clearAuthToken(); // セッションエンドポイントの401でトークン即削除
}
```

**問題**: セッション確認エンドポイントが401を返した場合、Cookieベースのフォールバック検証前にJWTトークンが消去される。

---

## 発生シナリオ（タブ切替ログアウト）

```
1. ユーザーがログイン済みの状態でタブを切り替える
2. バックグラウンドでブラウザがリソースを節約（接続断の可能性）
3. ユーザーがタブに戻る → visibilitychange イベント発火
4. checkSession() 実行
   4a. JWT（メモリ内）→ まだ有効ならOK、期限切れなら次へ
   4b. refreshAccessToken() → API呼出し
       → ネットワーク不安定/CORSエラー等で失敗
       → clearAuthToken() でトークン削除（原因2-A）
   4c. GET /auth/session フォールバック → これも失敗
       → sessionCheckFailureCount++ （原因2-B）
5. 失敗が3回蓄積 → 完全ログアウト or セッション確認停止（原因2-B）
6. 次のタブ切替 → visibility handler がスキップされる（原因2-C）
7. ユーザーはログアウト状態のまま復帰不可能
```

---

## 修正方針（案）

### BUG-1 修正: Google Drive データ読込の復活

| 項目 | 内容 |
|------|------|
| 対象 | `PortfolioContext.tsx` の `loadFromGoogleDrive` |
| 方針 | ダミーレスポンスを削除し、実際のAPI呼び出しを復元 |
| API | `GET /drive/load` エンドポイントを使用 |
| テスト | Google Driveデータ読込の単体テスト + 統合テスト |

### BUG-2 修正: タブ切替ログアウトの防止

| 項目 | 内容 |
|------|------|
| 2-A修正 | リフレッシュ失敗時にトークンを即削除しない。ネットワークエラーとサーバー拒否を区別する |
| 2-B修正 | 失敗カウンターのリセットタイミングを改善。成功時だけでなく、一定時間経過後もリセット |
| 2-C修正 | visibility handler内で失敗カウンターを時間ベースでリセット可能にする |
| 2-D修正 | 401処理でフォールバック完了前のトークン削除を抑制 |
| テスト | 各修正箇所の単体テスト + タブ切替シミュレーションの統合テスト |

---

## テスト駆動開発（TDD）アプローチ

### Phase 1: テスト作成（Red）
1. `loadFromGoogleDrive` のAPIコール成功テスト
2. `refreshAccessToken` のネットワークエラー時トークン保持テスト
3. `checkSession` の失敗カウンターリセットテスト
4. `handleVisibilityChange` の失敗後復帰テスト
5. 401レスポンス時のフォールバック完了までのトークン保持テスト

### Phase 2: 実装（Green）
- 最小限のコード変更で全テストをパスさせる

### Phase 3: リファクタリング（Refactor）
- コード品質の改善
- エッジケースの追加テスト

---

## 修正内容（2026-03-04 実施）

### BUG-1 修正: Google Drive save/load API復元

**追加発見**: `saveToGoogleDrive`も同様に`api.ts`の非推奨関数を使っており、常に`success: false`を返していた。

| 修正 | ファイル | 変更内容 |
|------|---------|---------|
| import変更 | `PortfolioContext.tsx` | `api.ts`の非推奨`saveToGoogleDrive`を削除、`googleDriveService.ts`の`saveToDrive`/`loadFromDrive`を直接import |
| save修正 | `PortfolioContext.tsx:1452` | `apiSaveToGoogleDrive(portfolioData, user)` → `saveToDrive(portfolioData)` |
| load修正 | `PortfolioContext.tsx:1484` | ダミーレスポンス → `loadFromDrive('latest')` |

### BUG-2a 修正: トークンリフレッシュ失敗時の選択的クリア

| 修正 | ファイル | 変更内容 |
|------|---------|---------|
| 条件分岐追加 | `apiUtils.ts:178-184` | ネットワークエラー(レスポンスなし)ではトークン保持、401/403(サーバー拒否)のみ`clearAuthToken()` |

### BUG-2b 修正: 失敗時のインターバル停止を廃止

| 修正 | ファイル | 変更内容 |
|------|---------|---------|
| interval維持 | `AuthContext.tsx:274-285` | `clearInterval`を削除。localStorageフォールバック後もチェック継続。ログアウトせずリトライ可能に |
| タイムスタンプ追加 | `AuthContext.tsx:272` | `lastFailureTimeRef`で最終失敗時刻を記録 |

### BUG-2c 修正: visibility handlerの時間ベースリセット

| 修正 | ファイル | 変更内容 |
|------|---------|---------|
| リセットロジック | `AuthContext.tsx:463-467` | 失敗カウンター上限到達後、5分(FAILURE_COOLDOWN_MS)経過でカウンターをリセットしリトライ |

### BUG-2d 修正: セッションエンドポイント401でのトークン保持

| 修正 | ファイル | 変更内容 |
|------|---------|---------|
| 条件変更 | `apiUtils.ts:335-340` | `isSessionEndpoint`条件を削除。明示的`Invalid token`メッセージの場合のみ`clearAuthToken()` |

## 検証結果

- `npx tsc --noEmit` → エラー0
- `npm run build` → 成功
- **動作確認**: portfolio-wise.com でのログイン → Google Driveデータ読込 → タブ切替テストが必要
- **コードレベル検証（2026-03-04）**: 全5件の修正が正しくデプロイ済みコードに反映されていることを確認
- **E2Eテスト（2026-03-04）**: 基本E2E 6件全PASS（アプリロード、ログインボタン、API設定等）
- **残**: Google認証を伴う実際のログイン→Drive読込→タブ切替の手動確認

## 関連ファイル

| ファイル | 役割 |
|---------|------|
| `src/context/AuthContext.tsx` | 認証状態管理・セッション検証 |
| `src/utils/apiUtils.ts` | API通信・トークン管理 |
| `src/context/PortfolioContext.tsx` | ポートフォリオデータ管理・Google Drive連携 |
| `src/services/googleDriveService.ts` | Google Drive API実装（saveToDrive/loadFromDrive） |
| `src/components/auth/LoginButton.tsx` | ログインUI・認証フロー開始 |
| `src/hooks/useGoogleDrive.ts` | Google Driveフック |
