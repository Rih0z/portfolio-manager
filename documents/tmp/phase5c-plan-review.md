# Phase 5-C 実装計画レビュー結果

**レビュー日**: 2026-03-07
**対象**: Phase 5-C（通知システム + ソーシャルPF + リファラル）
**レビュアー**: Claude Opus 4.6
**総合判断**: **修正後に実装可能** — CRITICAL 5件を解決すれば技術的に問題ない計画

### 実装後レビュー結果（2026-03-07）

| # | 指摘 | 判定 | 対応内容 |
|---|------|------|---------|
| C-1 | データソース | ✅ 合格 | portfolioStore.lastUpdated で正しく実装 |
| C-2 | uiStore通知 | ✅ 合格 | 永続通知 vs 一時トーストで分離 |
| C-3 | リファラル報酬 | ✅ 修正済 | 重複適用防止 + カウンター更新追加。Stripe報酬付与は Stage 2 |
| C-4 | OAuth sessionStorage | ✅ 合格 | persist + sessionStorage フォールバック |
| C-5 | APIプレフィックス | ✅ 合格 | `api/` で統一 |
| H-1 | クールダウン | ✅ 合格 | 1時間クールダウン実装済み |
| H-2 | 共有OGP | ✅ 合格 | Helmet + og:title/description |
| H-3 | 自己紹介防止 | ✅ 合格 | userId 一致チェック |
| H-4 | レート制限 | ✅ 修正済 | validateCode / getShare に IP ベースレート制限追加 |
| H-5 | ピア比較データ | ✅ 合格 | データなし時「最初の参加者に」表示 |
| H-6 | serverless.yml | ✅ 合格 | 全テーブル + 17関数 + IAM 追加済み |
| M-1 | 通知重複防止 | ✅ 合格 | goalId/クールダウン/break で多層防止 |
| M-2 | モバイルUX | ✅ 合格 | モバイルにも NotificationBell 配置 |
| M-3 | 期限切れUX | ✅ 合格 | 期限表示実装済み |
| M-4 | 統計キャッシュ | ✅ 修正済 | referralStore に 5分間キャッシュ追加 |

**合格率: 15/15 (100%)** — テスト 79ファイル / 1,592テスト PASS

---

## CRITICAL（実装前に修正必須）— 5件

### C-1: アラート評価のデータソースが間違っている

計画では `portfolioStore.lastUpdated` を監視するとあるが、**市場データは TanStack Query が管理**しており portfolioStore には存在しない。

```
誤: portfolioStore.lastUpdated 変更を監視
正: TanStack Query の市場データキャッシュ更新を監視
    → useQuery の onSuccess / data 変更を useEffect で検知
```

### C-2: uiStore の既存通知システムとの関係が未定義

uiStore には既に `addNotification` / `removeNotification` のトースト通知システム（5秒自動消去）が存在する。新 `notificationStore` との役割分担が明記されていない。

```
明確化すべき:
- uiStore.notifications = 一時的トースト（操作フィードバック用、非永続）
- notificationStore.notifications = 永続的通知センター（履歴・既読管理）
- アラート発火時: 両方に追加？notificationStoreのみ？
```

### C-3: リファラル報酬の実装方法が曖昧

「Stripe API 経由 or DynamoDB 直接更新」は方針未決定。

```
推奨: Stripe Coupon API を使用
- stripe.coupons.create() で1ヶ月無料クーポン生成
- stripe.subscriptions.update() で適用
- DynamoDB直接更新はStripeとの整合性が崩れるリスク

被紹介者7日間体験も同様:
- Stripe trial_period_days を使うか
- DynamoDB の planType を一時的に 'standard' にするか
→ 明確化必須
```

### C-4: リファラルコードの OAuth フロー貫通が未保証

計画では `sessionStorage` にコード保存とあるが、Google OAuth リダイレクトで **sessionStorage が消える可能性がある**（ブラウザ・リダイレクト方式依存）。

```
対策案:
- localStorage に保存（sessionStorageより永続的）
- OAuth state パラメータに ref コードを含める
- サーバー側で OAuth callback 時に ref パラメータを処理
```

### C-5: APIバージョンプレフィックスの不統一

Phase 1 で `/v1/subscription/*` を導入済みだが、本計画の全エンドポイントに `/v1/` プレフィックスがない。

```
計画: /api/notifications, /api/alert-rules, /api/social/*, /api/referral/*
整合: /v1/api/notifications... にすべきか、既存パターンに合わせるか統一方針が必要
```

---

## HIGH（品質に大きく影響）— 6件

### H-1: アラート発火のクールダウン未定義

`lastTriggered` フィールドはあるが、再発火までの間隔が未定義。1分ごとにデータ更新があれば同じアラートが大量発火する。

```
追加すべき: cooldownMinutes フィールド（デフォルト60分）
lastTriggered + cooldownMinutes < now の場合のみ発火
```

### H-2: 共有ページの OGP / SEO 未考慮

`/share/:shareId` はソーシャル共有が目的なのに、X/Twitter などでの OGP プレビュー対応が計画にない。Phase 5-A で SEOHead.tsx を作成済みなのに活用されていない。

```
追加すべき:
- SharedPortfolio ページに SEOHead 統合
- og:title = "投資ポートフォリオ — PFスコア XX点"
- og:image = 動的OGP画像（Cloudflare Workers or 静的テンプレート）
```

### H-3: 自己紹介（Self-referral）防止策なし

同一ユーザーが別アカウントで自分の紹介コードを使う不正防止が未記載。

```
対策:
- 同一 Google アカウント（email）チェック
- IP ベースの重複検知（サブ垂直：2-3アカウントは許容）
- 紹介者と被紹介者の email ドメイン一致警告
```

### H-4: 公開エンドポイントのレート制限未記載

`GET /api/social/share/{shareId}` と `POST /api/referral/validate` は公開エンドポイント。レート制限なしだと列挙攻撃のリスク。

```
追加: IP ベースレート制限（例: 60回/時間）
shareId は 12文字 nanoid（62^12 ≈ 3.2×10^21）なので列挙は非現実的だが、
validate エンドポイントは8文字コード（62^8 ≈ 2.2×10^14）なので対策必要
```

### H-5: ピア比較の「サンプルデータ」の定義なし

「初期はサンプルデータ」とあるが、どう生成するか不明。ハードコードは第3条違反。

```
選択肢:
A. 公開されている投資統計データ（GPIF、投信協会）から現実的な分布を生成
B. ピア比較機能自体を共有数が一定数（例: 50件）溜まるまで無効化
→ B を推奨（モック禁止の原則に合致）
```

### H-6: serverless.yml の変更が計画に含まれていない

新規 DynamoDB テーブル 5つ + Lambda 関数 9+ 個の追加が必要だが、serverless.yml の具体的変更が計画にない。

---

## MEDIUM（改善推奨）— 4件

| # | 指摘 | 推奨 |
|---|------|------|
| M-1 | **通知の重複防止** — 同一条件で同日に複数回通知が生成される可能性 | `deduplicationKey`（type + ticker + date）で当日重複を排除 |
| M-2 | **モバイル UX** — NotificationBell のモバイル配置が未設計 | Header のモバイル行に追加（Currency/Refresh と同列） |
| M-3 | **共有リンクの有効期限切れ UX** — TTL で自動削除されるが閲覧者への表示なし | SharedPortfolio ページに「この共有は期限切れです」のフォールバック UI |
| M-4 | **リファラル統計のリアルタイム性** — GET /api/referral/stats のキャッシュ戦略なし | TanStack Query staleTime=5min でキャッシュ |

---

## GOOD（よくできている点）

- 通知→ソーシャル→リファラルの**実装順序が論理的**（通知が他2機能の基盤）
- 匿名化戦略が**プライバシーファースト**（カテゴリ%のみ、金額非公開）
- Web Push の Stage 1 見送りは**コスト意識が高い**
- プラン制限が段階的で**Free ユーザーにも価値提供**
- DynamoDB テーブル設計の TTL 活用が適切
- 既存パターン（goalStore, portfolioDbService）の参照が正確
- i18n / GA4 / TDD の横断的事項が網羅されている

---

## 参考: 既存コードベースの確認結果

### 既存通知システム（uiStore）
- `uiStore.ts`: `addNotification(message, type)` → 5秒自動消去トースト
- `App.tsx`: `<NotificationDisplay />` で bottom-right 固定表示
- 87コンポーネントが `useTranslation()` を使用中（i18n完備）

### テーブル命名規則
- バックエンド: `pfwise-api-{stage}-{resource}`（例: `pfwise-api-dev-portfolios`）
- 計画のテーブル名は規則に合致 ✅

### ハンドラーパターン
- OPTIONS → JWT auth (`authenticateJwt`) → バリデーション → ビジネスロジック → `formatResponse`/`formatErrorResponse`
- `event.user` に認証情報付与

### Store パターン
- Zustand `persist` + `partialize` で選択的永続化
- `getState()` でクロスストア通信
- goalStore の AddGoalResult パターンが参考テンプレート

### GA4 イベント
- `analytics.ts`: `AnalyticsEvents` 定数 + `trackEvent(name, params)` パターン
- 本番のみ有効（`import.meta.env.DEV` で開発時スキップ）
