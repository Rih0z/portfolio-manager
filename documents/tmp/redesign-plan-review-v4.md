# 再設計計画書 第4回レビュー

**レビュー日**: 2026-03-03
**対象**: `documents/tmp/redesign-plan.md`（第3回レビュー反映・確定版）
**レビュー範囲**: 計画書全体 + バックエンド実装の詳細分析 + テスト基盤評価 + 本番障害調査

---

## 🔴 緊急: 本番サイト（portfolio-wise.com）にアクセスできない

### 障害の現象
- ユーザーがページにアクセスできない
- HTTP 200は返る（HTMLもJS/CSSも配信されている）
- **Phase 0-A（Vite移行）デプロイ後に発覚**

### 根本原因の調査結果

**原因1: `/config/client` エンドポイントが403を返す**

```
curl -s "https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod/config/client"
→ {"error":"Forbidden","message":"Direct API access is not allowed"}
```

`backend/src/middleware/apiSecretValidation.js` (Line 42-44):
- `/config/client` は `X-API-Secret` ヘッダーを要求
- フロントエンドの `configService.js` (Line 70) は `axios.get(CONFIG_ENDPOINT)` をヘッダーなしで呼んでいる
- → 常に403で失敗

**原因2: Cloudflare Pagesのプロキシフォールバックが機能しない**

`configService.js` (Line 83-93):
```javascript
// 本番環境ではプロキシ経由で再試行
if (process.env.NODE_ENV === 'production' && CONFIG_ENDPOINT.includes('execute-api')) {
  const proxyResponse = await axios.get('/api-proxy/config/client');
```
- Cloudflare Pagesには `/api-proxy` のプロキシ設定がない
- `_redirects` の `/* /index.html 200` により、HTMLが返る
- JSONパース失敗 → フォールバック設定に進む

**原因3: フォールバック設定の `googleClientId` が空**

`configService.js` (Line 100):
```javascript
googleClientId: '', // Google Client IDは環境変数または設定APIから取得すべき
```
- Google OAuth Provider に `'dummy-client-id'` がセットされる
- ユーザーはログインできない

**原因4: 市場データの品質問題**

```
curl "...prod/api/market-data?type=us-stock&symbols=AAPL"
→ "price":185.75, "lastUpdated":"2025-07-19", "source":"User Provided (Screenshot)"
```
- AAPL $185.75 は**2025年7月のデータ**。2026年3月現在では古い
- ソースが「User Provided (Screenshot)」— ライブデータではなく、ユーザー提供のスクリーンショットデータ
- yahoo-finance2 のライブデータが取得できていない可能性

### これが意味すること

**Phase 0-Aのデプロイは本番環境を壊した状態で完了した。** これは以下の問題を示す:

1. **デプロイ後の動作確認が不十分** — 「デプロイ成功」と報告されたが、実際にページが動作するか確認されていない
2. **スモークテストがない** — デプロイ後にAPI疎通、ログイン、基本機能を確認する自動テストがない
3. **既存のテストがこの問題を検知していない** — Jestテストは全てパスしたと報告されたが、実際のAPIとの疎通は検証されていない
4. **`/config/client` の認証要件がフロントエンドに反映されていない** — これはVite移行以前からの問題である可能性が高い

### 即時対応が必要な修正

```
選択肢A: configService.js にX-API-Secret ヘッダーを追加
  → セキュリティリスク: フロントエンドにAPI秘密鍵を埋め込むことになる

選択肢B: /config/client のapiSecretValidation をスキップ対象に追加
  → getClientConfig.jsのレスポンスは公開可能な情報のみ（Google Client IDは公開情報）
  → apiSecretValidation.js の SKIP_VALIDATION_PATHS に '/config/client' を追加

選択肢C: Cloudflare Workersで /api-proxy をバックエンドにプロキシ
  → 正しいアプローチだが設定作業が必要
```

**推奨: 選択肢B（即時修正） + 選択肢C（Phase 0-B以降で実装）**

---

## 総合評価: 計画は実行可能だが、バックエンドの技術的負債と品質管理が過小評価されている

| 領域 | 評価 | コメント |
|------|------|----------|
| ビジネスモデル | ◎ | 保守的な収益予測、根拠付き、Stage分離が妥当 |
| 市場データ戦略 | ○ | ハイブリッド方式は現実的。免責表示のUXも具体的 |
| フロントエンド計画 | ○ | Phase 0のサブフェーズ分割、TanStack Query/Zustand役割分離が明確 |
| **バックエンド計画** | **△** | **計画書の記載が薄い。実際の技術的負債が反映されていない** |
| **テスト基盤** | **△** | **フロントエンドのみ記載。バックエンドのテスト戦略が未記載** |
| **モバイル対応** | **✕** | **完全に欠落（後述）** |
| デザイン方針 | ○ | shadcn/ui全面移行の決定は妥当 |
| ロードマップ | ○ | Phase 2-A/2-Bの分割、依存関係図が明確 |

---

## 1. モバイルアプリ（App Store / Google Play）について

### 計画書の現状

計画書にはモバイルアプリへの言及が**一切ない**。Section 7.4のレスポンシブ設計で以下のみ：
```
モバイル: ボトムナビ、カード型、スワイプ
```
→ これはレスポンシブWebであり、ネイティブアプリではない。

### 結論: 現時点ではApp Store提出は不要。ただし計画書に方針を明記すべき

**理由:**

| 観点 | Webアプリ（現在の方針） | ネイティブアプリ |
|------|------------------------|-----------------|
| 開発コスト | ¥0（既存コードベース） | React Native: +2〜3ヶ月、Swift/Kotlin: +4〜6ヶ月 |
| 審査 | なし | Apple審査1〜2週間。リジェクトリスクあり（金融アプリは厳しい） |
| 更新速度 | 即時デプロイ | 審査待ち1〜7日 |
| ユーザー獲得 | SEO + LP | App Store検索 + ASO |
| 課金手数料 | Stripe 3.6% | Apple 30% / Google 15%（初年度） |
| Push通知 | PWA（Phase 5） | ネイティブ対応 |
| オフライン | PWA Service Worker | ネイティブストレージ |

**判断:**
- Stage 1（ゼロコスト期間）でネイティブアプリを作る意味がない
  - 開発リソースが分散する
  - Apple/Googleの課金手数料30%/15%が利益を圧迫する（¥700のStandardなら¥210がAppleに取られる）
  - 金融系アプリはApple審査が厳しい（免責表示、データソースの信頼性等）
- MAU 5,000超（Month 18〜24想定）でネイティブアプリの必要性を再評価
- それまではPWA（Phase 5）でモバイル体験を強化

### 計画書に追記すべき内容

```
## モバイル戦略

方針: Webファーストを維持。ネイティブアプリは収益確立後に検討。

Stage 1: レスポンシブWebアプリ + PWA（Phase 5）
  - ボトムナビ、カード型UI、スワイプ操作
  - Service WorkerでApp Shell キャッシュ
  - 「ホーム画面に追加」でアプリライクな体験

Stage 2（MAU 5,000超で検討）: React Native or Capacitor
  - ネイティブアプリの必要性を再評価
  - Apple課金30%を考慮した価格設計
  - App Store審査対応（金融アプリガイドライン準拠）

不採用の理由:
  - 開発リソースの分散回避
  - Apple/Google課金手数料の利益圧迫
  - 審査リジェクトリスク（金融アプリ）
  - PWAで十分なモバイル体験が提供可能
```

---

## 2. バックエンドの技術的負債（計画書に反映されていない）

### 2.1 計画書のバックエンド記載（Section 8.2）

```
現状                          →  新設計
Serverless Framework v3       →  維持
DynamoDB                      →  DynamoDB（テーブル追加）
セッションベース認証           →  JWT + Refresh Token
yahoo-finance2のみ            →  yahoo-finance2（参考値）+ フォールバック
なし                          →  Stripe Webhook処理
なし                          →  CloudWatch Metrics
```

**問題: これだけでは不十分。** バックエンドの実装を詳細分析した結果、以下の技術的負債が発見された。

### 2.2 発見された技術的負債

#### A. 認証系の散乱（深刻度: 🟡）

`backend/src/function/auth/` に以下の実験的/デバッグ用ファイルが残存:
```
googleDriveAuthDebug.js        ← 使用されていない
googleDriveAuthWithLogging.js  ← 使用されていない
googleDriveAuthDetailed.js     ← 使用されていない
temporaryGoogleLogin.js        ← 使用されていない
statelessGoogleLogin.js        ← 使用されていない
basicGoogleLogin.js            ← 使用されていない
```
→ serverless.ymlに定義されているのは`googleDriveAuth.js`のみ。残りは削除すべき。

#### B. セッション認証 → JWT移行の複雑さ（深刻度: 🟡）

計画書は「セッションベース → JWT + Refresh Token」と1行で書いているが、実際の移行は複雑:

- 現在のセッション: DynamoDB SessionsTable に sessionId + ユーザーデータ + Drive トークンを保存
- Cookie設定: `HttpOnly, Secure, SameSite=None, Max-Age=604800（7日）`
- Google Drive の accessToken/refreshToken もセッションに紐付け

JWT移行で必要な作業:
```
1. JWT生成・検証ミドルウェア作成
2. Refresh Token のセキュアな保存（DynamoDB or httpOnly cookie）
3. Google Drive トークンの管理方法変更（セッションから分離）
4. 既存セッションとの並行運用期間（ユーザーが再ログインせずに移行）
5. Cookie → Authorization Bearer ヘッダーへのフロントエンド変更
6. CORS設定の変更（credentials: true が不要になる可能性）
```

→ Phase 1の「3週間」にこれを含めるのは無理。別途1〜2週間が必要。

#### C. 予算超過時のAPI完全停止（深刻度: 🟡）

`budgetCheck.js` の実装:
```
DISABLE_ON_LIMIT: true → 予算超過時にAPI全体を停止
```
→ 全ユーザーのサービスが停止する。グレースフルデグレーション（キャッシュのみ返す等）に変更すべき。

#### D. レート制限がIPベースのみ（深刻度: 🟢）

認証済みユーザーのレート制限がIPアドレスベース。企業のNAT配下の複数ユーザーが同じIPになる。
→ Phase 1のJWT移行後に、ユーザーIDベースのレート制限に変更すべき。

#### E. APIバージョニングなし（深刻度: 🟢）

現在のエンドポイント: `/api/market-data`, `/auth/google/login`
→ `/v1/api/market-data` のようなバージョンプレフィックスがない。
→ Stage 2でのAPI変更時に後方互換性の問題が発生する。

#### F. ヘルスチェックエンドポイントなし（深刻度: 🟢）

→ 監視ツール（UptimeRobot等）からの疎通確認ができない。

### 2.3 計画書に追加すべきバックエンドタスク

```
Phase 0-A（追加）:
  - [ ] 未使用auth関連ファイル削除（6ファイル）

Phase 1（分割 or 延長）:
  - [ ] JWT + Refresh Token 実装（別途2週間）
    - JWT生成/検証ミドルウェア
    - Refresh Token ローテーション
    - Drive トークン管理の分離
    - 既存セッションからの移行パス
    - フロントエンドの Authorization ヘッダー対応
  - [ ] ヘルスチェックエンドポイント追加
  - [ ] APIバージョンプレフィックス（/v1/）追加

Phase 2-B（追加）:
  - [ ] 予算超過時のグレースフルデグレーション実装
  - [ ] ユーザーIDベースレート制限（JWT移行後）
```

---

## 3. テスト基盤の評価

### 3.1 フロントエンドテスト（現状）

```
テストランナー: Jest（Phase 0-BでVitestに移行予定）
テストライブラリ: React Testing Library
APIモック: MSW (Mock Service Worker)
カバレッジ目標: 70〜80%

テスト構成:
  __tests__/
  ├── unit/components/     ← コンポーネント単体テスト
  ├── integration/         ← API連携テスト
  ├── e2e/                 ← E2Eテスト
  └── mocks/handlers.js    ← MSWハンドラー

カスタムスクリプト: scripts/run-tests.sh（カバレッジチャート生成等）
```

**評価: △ テスト基盤は存在するが、十分とは言えない**

問題点:
- カバレッジ目標70〜80%は適切だが、現在の実際のカバレッジが不明
- E2Eテストの範囲が不明（CypressやPlaywrightではなくJestベース）
- Vite移行後のテスト互換性が保証されていない（計画書はPhase 0-Bで対応予定）

### 3.2 バックエンドテスト（現状）

```
テストランナー: Jest
カバレッジ目標: 80% lines/statements, 70% branches
モック: カスタムモック（DynamoDB, axios, AWS SDK）

テスト構成:
  __tests__/
  ├── unit/           ← ユニットテスト
  │   ├── utils/
  │   ├── services/
  │   ├── functions/
  │   └── middleware/
  ├── integration/    ← 統合テスト
  ├── e2e/            ← E2Eテスト
  └── testUtils/      ← テストヘルパー・フィクスチャ
```

**評価: △ 構造は良いが、以下の問題がある**

| 問題 | 詳細 | 影響 |
|------|------|------|
| テスト内でセキュリティバイパス | `if (process.env.NODE_ENV !== 'test')` でIP制限をスキップ | テストがセキュリティの実装を検証していない |
| モックの過剰使用 | DynamoDB, axios, Secrets Manager 全てモック | 統合テストの信頼性が低い |
| E2Eテストの範囲不明 | ディレクトリはあるがカバレッジ不明 | 実際のデータフローが検証されていない可能性 |
| 実際のカバレッジ未確認 | 目標80%だが実測値が不明 | 計画書に現状カバレッジを記載すべき |

### 3.3 計画書に不足しているテスト関連事項

**計画書のテスト戦略（Section 9）:**
```
Phase 0-A: 既存Jestを維持。ビルド成功+テストパスが完了条件
Phase 0-B: Jest→Vitest一括切替
Phase 0-C: 互換ラッパーで段階移行。各コンポーネント移行ごとにテスト実行
```

**不足している内容:**

1. **バックエンドのテスト戦略が完全に未記載**
   - JWT移行時のテスト方針
   - Stripe Webhook のテスト方法
   - 新DynamoDBテーブルのテスト
   - Phase 1以降のバックエンド変更に対するテスト計画

2. **現在のカバレッジ実測値が未記載**
   - フロントエンド: ?%（目標70〜80%）
   - バックエンド: ?%（目標80% lines, 70% branches）
   → 移行前のベースラインを計測し、記録すべき

3. **E2Eテスト戦略がない**
   - Phase 2以降の複雑な機能（CSVインポート、Stripe決済、損益ダッシュボード）にはE2Eが必須
   - Playwright or Cypress の導入タイミングが未定

4. **データ精度テストがない**
   - 市場データの精度検証（yahoo-finance2の返す値が妥当か）
   - CSVパーサーの正確性テスト（SBI/楽天のフォーマット変更対応）
   - 為替レート計算の精度テスト

### 3.4 追加すべきテスト計画

```
■ Phase 0-A（追加）:
  - [ ] フロントエンド・バックエンドのカバレッジベースライン計測・記録

■ Phase 0-B:
  - [ ] Vitest移行（既存計画通り）
  - [ ] カバレッジがベースライン以上であることを確認

■ Phase 1:
  - [ ] Stripe Webhook テスト（stripe-event-mock使用）
  - [ ] JWT認証フローの統合テスト
  - [ ] プラン制限ミドルウェアのテスト

■ Phase 2-A:
  - [ ] CSVパーサーのユニットテスト（SBI/楽天/汎用フォーマット）
  - [ ] Shift-JISエンコーディング変換テスト
  - [ ] PFスコア計算アルゴリズムのテスト

■ Phase 2-B:
  - [ ] 日次スナップショットLambdaのテスト
  - [ ] Zustand ↔ DynamoDB同期のテスト
  - [ ] 損益計算の精度テスト

■ Phase 3以降:
  - [ ] E2Eテスト基盤導入（Playwright推奨）
  - [ ] クリティカルパスのE2E: ログイン→CSVインポート→ダッシュボード→課金
```

---

## 4. その他の改善提案

### 4.1 Phase 2-Aが5週間に拡大（前回3週間から修正済み）

3週間→5週間への修正は適切。Week単位のブレイクダウンも追加されており改善。

### 4.2 KPI矛盾の修正（修正済み）

`Trial→Paid > 5%` に修正されており、収益予測の2〜7%と整合。

### 4.3 Stage 2移行タイミングの明記（修正済み）

「Month 12でStage 2移行判断（予測MRR ¥70Kでは未達。実移行はMonth 18〜24）」と明記済み。

### 4.4 損益表示のUXルール追加（修正済み）

Section 6.2に具体的なUI mockup追加済み。「確定値」と「参考値」の区別が明確。

---

## 5. レビュー結果サマリー

### 修正済み項目（前回レビューから）
- [x] Phase 2-Aの過積載 → 5週間に拡大 + Week分割
- [x] KPI矛盾 → Trial→Paid > 5%に修正
- [x] 損益表示UX → Section 6.2にmockup追加
- [x] Stage 2移行タイミング → Month 18〜24と明記

### 新規指摘事項

| # | 指摘 | 深刻度 | 対応提案 |
|---|------|--------|----------|
| 1 | **モバイルアプリ戦略が未記載** | 🟡 | 「Webファースト、PWA優先、Stage 2でネイティブ検討」を明記 |
| 2 | **バックエンドの技術的負債が計画に反映されていない** | 🟡 | 未使用ファイル削除、JWT移行の複雑さ、グレースフルデグレーション追加 |
| 3 | **JWT移行が「1行」で書かれているが実際は2週間規模** | 🟡 | Phase 1を4〜5週間に拡大、またはPhase 0-DとしてJWT移行を分離 |
| 4 | **バックエンドのテスト戦略が未記載** | 🟡 | Phase 1以降のバックエンドテスト計画を追加 |
| 5 | **現在のテストカバレッジ実測値が不明** | 🟢 | Phase 0-Aでベースライン計測 |
| 6 | **E2Eテスト導入タイミングが未定** | 🟢 | Phase 3以降でPlaywright導入を明記 |
| 7 | **APIバージョニングなし** | 🟢 | Phase 1で /v1/ プレフィックス追加 |
| 8 | **ヘルスチェックエンドポイントなし** | 🟢 | Phase 1で追加 |

### テストは十分か？

**結論: 十分ではない。ただし致命的ではない。**

- フロントエンド: テスト基盤は存在するが、カバレッジの実測値が不明。Vitest移行計画は適切
- バックエンド: テスト構造は良いが、セキュリティテストのバイパス、モック過剰使用が問題
- E2E: 基盤がない。Phase 2以降の複雑な機能（CSV、Stripe、損益）にはE2Eが必須
- **計画書にバックエンドのテスト戦略を追加すべき**

### 全体的な結論

計画書はフロントエンドについては成熟度が高い。しかし**バックエンドが「Serverless維持 + テーブル追加 + JWT移行」の3行で済まされている**のが最大の弱点。

実際のバックエンドには:
- 6つの未使用認証ファイル
- セッション→JWT移行の複雑さ
- 予算超過時の全停止問題
- IPベースのみのレート制限
- ヘルスチェック・APIバージョニングの欠如

これらを計画書に反映し、Phase 1の期間を調整すべき。

---

---

## 6. デプロイ品質管理の欠陥（本番障害から学ぶべきこと）

### 現状の問題

Phase 0-Aのデプロイで発生した障害は、テストとデプロイプロセスの根本的な欠陥を示している:

| 問題 | 詳細 |
|------|------|
| **Jestテストは全パスしたが本番は壊れた** | テストがAPIとの実際の疎通を検証していない。全てモック |
| **「本番デプロイ動作確認」が実施されていない** | Phase 0-Aの完了条件に「本番デプロイ動作確認」があるが、実際には確認されていない |
| **/config/clientの403エラーはVite移行以前からの問題の可能性** | CRA時代からこのエンドポイントは壊れていた可能性がある |
| **スモークテスト/ヘルスチェックが存在しない** | デプロイ後に自動でAPI疎通を確認する仕組みがない |
| **市場データが8ヶ月前のスクリーンショットデータ** | yahoo-finance2がライブデータを返していない可能性 |

### 計画書に追加すべき品質管理施策

```
■ 即時対応（Phase 0-A修正）:
  1. /config/client の 403 問題を修正
  2. 本番サイトで以下を手動確認:
     - ページが表示されるか
     - Google ログインができるか
     - 市場データが取得できるか（参考値）
     - リバランスシミュレーションが動くか

■ Phase 0-B に追加:
  3. デプロイ後スモークテストスクリプト作成（scripts/smoke-test.sh）:
     - curl で portfolio-wise.com の HTTP 200 確認
     - JS/CSS バンドルの読み込み確認
     - /config/client API 疎通確認
     - /api/market-data API 疎通確認
     - レスポンスのJSONバリデーション

  4. ヘルスチェックエンドポイント追加（バックエンド）:
     - GET /health → { status: 'ok', version: '1.0.0', uptime: ... }
     - apiSecretValidation をスキップ
     - UptimeRobot等の外部監視ツールで定期監視

■ Phase 2以降:
  5. E2Eテスト（Playwright）:
     - ログイン→ダッシュボード表示→CSV インポート→ログアウト
     - CI/CD パイプラインに組み込み
     - デプロイ前の自動テスト

  6. カナリアデプロイ:
     - 全ユーザーに即時展開ではなく、一部ユーザーに先行展開
     - エラーレートが閾値を超えたら自動ロールバック
```

### 「テストが十分か」への最終回答

**十分ではない。本番障害が証拠。**

現在のテストの問題を一言でまとめると:
**「モックの世界では全てが動く。しかし本番では何も動かない。」**

| テストレベル | 現状 | あるべき姿 |
|-------------|------|-----------|
| ユニットテスト | ○ Jest/MSWでモック | ○ 維持（基本的な品質保証） |
| 統合テスト | △ モック過剰 | ○ 実APIとの疎通テスト（ステージング環境） |
| E2Eテスト | ✕ なし | ○ Playwright（クリティカルパスのみ） |
| スモークテスト | ✕ なし | ◎ デプロイ後に必ず実行 |
| ヘルスチェック | ✕ なし | ◎ 常時監視（UptimeRobot等） |
| パフォーマンス | ✕ なし | △ Lighthouse CI（Phase 3以降） |

---

*このレビュー文書はバグ解決後に削除予定（CLAUDE.md第10条準拠）*
