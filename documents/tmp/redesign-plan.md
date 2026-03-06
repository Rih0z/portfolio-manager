# PortfolioWise 収益化・再設計計画書

**作成日**: 2026-03-03
**最終更新**: 2026-03-06（Phase 4-C 完了 — Modern*→shadcn/ui移行 + デッドコード削除 -1,091行）
**コスト方針**: ゼロコスト運営から開始。収益が見込めてから有料API導入。

---

## 1. 現状分析サマリー

### 現在のプロダクト（Phase 3 完了時点）
- 日米株式・投資信託のポートフォリオ管理ツール
- リバランスシミュレーション + AI分析プロンプト生成（3観点分割） + PFスコア(8指標/100点)
- 損益ダッシュボード（参考値ベース） + 価格履歴蓄積 + サーバー側ポートフォリオ保存
- AI強化: 強み/弱みカード + 分析タブ（リスク/コスト/成長） + 外部AI連携（Claude/Gemini/ChatGPT）
- Google OAuth認証 + JWT デュアルモード + Google Driveバックアップ
- Stripe決済基盤実装済み（Free/Standard ¥700/月）
- React SPA (Vite 6.x) + TypeScript 5.x + Vitest + Zustand + TanStack Query
- shadcn/ui デザインシステム + ライト/ダークモード切替
- CSVインポート対応（SBI証券/楽天証券/汎用、Shift-JIS自動検出）
- Playwright E2Eテスト基盤（スモーク + クリティカルフロー4件）
- ゴールベース投資トラッキング（目標設定 + 進捗追跡 + Free/Standard制限）
- 月次投資レポート生成（MonthlyReportCard）
- GA4アナリティクス統合
- AWS Lambda + DynamoDB (sessions, cache, rate-limits, users, subscriptions, usage, portfolios, price-history)

### 現状の課題（残存）
| 領域 | 課題 | 深刻度 | 備考 |
|------|------|--------|------|
| **市場データ** | yahoo-finance2（非公式）依存 | 🔴 | Phase 2-Bで対策済（参考値+免責表示） |
| **損益表示** | ~~前日比・年初来比較・推移グラフ未実装~~ | ✅ | Phase 2-Bで実装完了 |
| **Modern*コンポーネント** | ~~旧ModernButton/Card/Inputが21箇所残存~~ | ✅ | Phase 4-Cで全移行+定義ファイル削除完了（-1,091行） |
| **Atlassianコンポーネント** | 旧ファイル7件が未削除（参照0件のデッドコード） | 🟢 | 削除するだけ |
| **バンドルサイズ** | ~~1,164KB~~ → 157KB main + lazy chunks（-65%） | ✅ | Phase 4-Bで最適化完了 |
| **E2Eカバレッジ** | 基本フローのみ（認証フロー未テスト） | 🟡 | Phase 4で拡充 |

---

## 2. 現状の辛口評価（口コミ想定）

> **「入力が面倒すぎて3分で閉じた」** — 初回ユーザー
>
> ティッカーを1つずつ手入力させるUIは論外。証券会社CSVインポートもない。
> 6ステップウィザードを全部埋めないとダッシュボードすら見られない。

> **「結局いくら儲かってるかわからない」** — 1週間後ユーザー
>
> 円グラフと数字の表が出るだけ。前日比・年初来比較もない。資産の成長が「見えない」。

> **「見た目が古くて信頼できない」** — 第一印象
>
> ダークテーマが重苦しい。金額表示がプロポーショナルフォントでズレる。

> **「無料のわりには機能あるけど、お金は払わない」** — ヘビーユーザー
>
> リバランス計算は便利。でもそれだけに月700円は出さない。

### 致命的な問題と修正方針

| # | 問題 | 影響 | 修正方針 | Phase | 状態 |
|---|------|------|----------|-------|------|
| 1 | **入力が面倒** | 初回離脱率 > 80% | CSV一括インポート、テンプレートワンタップ | 2-A | ✅ |
| 2 | **儲けが見えない** | 継続利用の動機なし | ダッシュボード最上部に損益表示、推移グラフ | 2-B | ✅ |
| 3 | **面白みがない** | エンゲージメント低 | PFスコア100点、達成フィードバック | 2-A | ✅ |
| 4 | **デザインがダサい** | 課金意欲ゼロ | ライトモードデフォルト、フィンテック信頼感デザイン | 2-A | ✅ |
| 5 | **AIプロンプトが長文** | 価値が伝わらない | 強み/弱み1行サマリー + 分析観点3分割 | 3 | ✅ |
| 6 | **市場データが不安定** | サービス停止リスク | ハイブリッド戦略（CSVベース + 参考値表示） | 0-A | ✅ |

---

## 3. ペルソナ分析

### Primary Persona: 「テック系長期投資家 タケシ」（初期フォーカス）

| 属性 | 詳細 |
|------|------|
| **年齢** | 28〜42歳 |
| **職業** | IT企業勤務（エンジニア、PM、デザイナー）/ スタートアップ |
| **年収** | 600万〜1,200万円 |
| **投資歴** | 2〜7年。インデックス中心の長期分散投資。月5〜30万円積立 |
| **保有資産** | 500万〜5,000万円（投資分） |
| **利用サービス** | SBI/楽天証券、マネーフォワード（不満あり）、X投資情報 |
| **ペイン** | ①複数口座の一元管理 ②リバランス計算が面倒 ③投資判断に自信なし |
| **ゲイン** | ①全体像を一目把握 ②最適リバランス自動計算 ③AIに相談 |

### Secondary Persona: 「堅実投資初心者 ユキ」（Phase 2以降）

| 属性 | 詳細 |
|------|------|
| **年齢** | 25〜35歳 |
| **投資歴** | 0〜2年（新NISA開始がきっかけ） |
| **ペイン** | 何を買えばいいかわからない。損するのが怖い |
| **ゲイン** | 自分の資産を可視化。少額でも成長を実感 |

### ペルソナ検証計画

| 時期 | 検証手段 | 判断基準 |
|------|----------|----------|
| Phase 1完了時 | Xで投資クラスタ5〜10人にベータ招待。30分インタビュー | PFスコアに興味を示すか、課金意欲があるか |
| Phase 2-A完了時 | Google Analytics デモグラフィック + ファネル分析 | LP→登録CVR 3%以上か |
| Month 3 | NPS調査（アプリ内） | NPS 30以上（初期としては十分） |
| Month 6 | 有料転換ユーザーのコホート分析 | Primaryペルソナが有料ユーザーの70%以上を占めるか |

---

## 4. 収益化モデル設計

### Stage 1: ゼロコスト運営（ローンチ〜収益確立まで）

| 機能 | Free | Standard (¥700/月・¥7,000/年) |
|------|------|-------------------------------|
| **ポートフォリオ管理** | 5銘柄まで | 無制限 |
| **市場データ（参考値）** | 1日3回 | リアルタイム |
| **リバランスシミュレーション** | 月3回 | 無制限 |
| **ポートフォリオスコア** | 基本（3指標） | 詳細（8指標） |
| **AI分析プロンプト生成** | 月1回（コピペ型） | 無制限（高品質パーソナライズ） |
| **損益トラッキング** | 総損益のみ | 前日比・年初来・推移グラフ |
| **目標設定** | 1目標 | 5目標 |
| **Google Driveバックアップ** | 手動 | 自動（日次） |
| **データエクスポート** | CSV | CSV + JSON + PDF |
| **広告** | あり（控えめ） | なし |

**AI戦略（Stage 1）: プロンプト提供型 — APIコスト ¥0**
- 既存PromptOrchestrationServiceを強化
- ポートフォリオデータ連動の高品質プロンプト自動生成
- ユーザーが自分のClaude/ChatGPT/Geminiにコピペ

#### Stage 2: 有料API導入（MRR ¥200K以上で移行判断）

| 機能 | Standard (¥700/月) | Pro (¥1,500/月) ← 新設 |
|------|---------------------|-------------------------|
| **AI分析（アプリ内）** | 月10回（Haiku） | 無制限（Sonnet） |
| **AI診断** | 月3回 | 無制限 |
| Stage 1全機能 | 含む | 含む |

**年間プラン割引: 約17%**

### コスト構造（Stage 1）

| 項目 | 月額コスト |
|------|-----------|
| AWS Lambda + DynamoDB + API Gateway | ¥3,000〜5,000 |
| Cloudflare Pages | ¥0 |
| yahoo-finance2（参考値取得） | ¥0 |
| AI API | ¥0（プロンプト生成のみ） |
| ドメイン | ¥100/月相当 |
| **合計** | **¥3,100〜5,100/月** |

**損益分岐点: Standard ¥700 × 8人 = ¥5,600 → 8人で黒字化**

### 決済基盤: Stripe
- Stripe Checkout + Customer Portal + Webhook Lambda

### 収益予測（保守的・根拠付き）

| 指標 | Month 3 | Month 6 | Month 12 | Month 24 |
|------|---------|---------|----------|----------|
| **Stage** | **1** | **1** | **1→2判断** | **2** |
| MAU | 100 | 500 | 2,000 | 8,000 |
| 有料転換率 | 2% | 3% | 5% | 7% |
| 有料ユーザー数 | 2 | 15 | 100 | 560 |
| MRR | ¥1,400 | ¥10,500 | ¥70,000 | ¥588,000 |
| 運営コスト | ¥5,000 | ¥5,000 | ¥10,000 | ¥50,000 |
| 粗利 | -¥3,600 | ¥5,500 | ¥60,000 | ¥538,000 |

**根拠:**
- MAU 100（M3）: X投資クラスタ＋Product Hunt Japan で初期獲得。広告費ゼロ前提
- MAU 500（M6）: 口コミ + SEO(LP) + 投資系メディア掲載1〜2件で現実的
- MAU 2,000（M12）: 月次10〜15%成長。投資アプリとして控えめ（カビュウは公開1年で10万DL達成だが、pfwiseはWebアプリで母数が違う）
- 転換率2〜7%: 日本SaaS平均3〜5%。フィンテック特化で上限7%は妥当
- **Month 6で黒字化（15人）。Month 12でStage 2移行判断（予測MRR ¥70Kでは未達。実移行は月次成長が続けばMonth 18〜24）。**

---

## 5. 法的対応

### 金融商品取引法への対応

**結論: 投資助言業登録は不要。情報提供ツールとして運営。**

根拠:
- カビュウ、43juni等が同種モデルで未登録運営中
- ポートフォリオ分析＋一般的情報提供は投資助言に非該当（金融庁ガイドライン）
- AI出力を「一般的な分散投資の考え方」に限定

**必須対応:**
1. AIが特定銘柄の売買推奨を出力しないようプロンプト制御
2. 免責事項をToS、ヘルプ、AI応答ヘッダーに表示
3. ローンチ前に金融商品取引法専門弁護士1時間相談（¥30,000〜50,000）
4. 特定商取引法に基づく表記ページ作成
5. プライバシーポリシー・利用規約作成

### 免責事項テンプレート
```
本サービスが提供する情報（ポートフォリオ分析、AI生成コメント、市場データ等）は、
一般的な情報提供のみを目的としており、特定の有価証券や金融商品に関する
投資勧誘・投資助言を構成するものではありません。
本サービスは金融商品取引法に基づく投資助言・代理業の登録を受けておりません。
投資に関する最終的な判断はお客様ご自身の責任においてお願いします。
提供する株価・評価額等のデータの正確性・完全性・適時性については保証しておりません。
```

---

## 6. 市場データ戦略【ハイブリッド方式】

### 6.1 日本株APIの現実

| API | 料金 | 商用利用 | 備考 |
|-----|------|----------|------|
| **J-Quants API** | 無料プランあり | **✕ 個人利用のみ** | 第三者へのデータ提供・アプリ組み込み禁止。商用はPro（法人契約・高額） |
| JPX Market Data Cloud | ¥300,000〜/月 | ◎ | 個人開発者には非現実的 |
| kabuステーション API | 口座開設で無料 | △ 個人限定 | 商用利用は要個別交渉 |
| yahoo-finance2 (npm) | 無料 | **グレーゾーン** | 非公式スクレイピング。多くの個人開発サービスが使用 |

**結論: 日本株の合法的な無料商用APIは存在しない。**

### 6.2 ハイブリッド戦略（確定方針）

**基本思想: ユーザーの入力データ（CSV）を基本とし、yahoo-finance2は「参考値」として表示**

```
■ データ層の分離:

  1. 正式データ（ユーザー所有）:
     - 証券会社CSVインポートで取得した価格・数量
     - ユーザーが手入力した購入価格・保有数量
     → これが損益計算、リバランスの正式な基準値

  2. 参考値データ（免責表示付き）:
     - yahoo-finance2で取得した現在の市場価格
     - 「※参考値です。正確な価格は証券会社でご確認ください」と常時表示
     - データソースバッジ表示（Yahoo Finance参考値）
     → リアルタイム性を提供するが、正確性は保証しない

  3. ダッシュボードの損益表示UXルール:
     ┌──────────────────────────────────────────────┐
     │  総投資額: ¥5,000,000（CSV確定値）           │
     │  参考評価額: ¥5,543,210 ※                    │
     │  参考損益: +¥543,210（+10.9%）※              │
     │                                              │
     │  ※ yahoo-finance2参考値に基づく概算です。     │
     │    実際の評価額は証券会社でご確認ください。   │
     └──────────────────────────────────────────────┘
     - 「確定値」（CSVインポート元）と「参考値」（API取得）を明確に分離
     - 参考値にはすべて※マーク + フッター免責を付与
     - CSVインポート前（手入力のみ）の場合は全て参考値表示

■ Stage 1（ゼロコスト）:

  日本株:
    基本: ユーザーCSVインポート（証券会社データが正式値）
    参考値: yahoo-finance2（免責表示付き）
    フォールバック1: JPX CSV（20分遅延、参考値）
    フォールバック2: 前回取得値を表示（「XX時間前のデータ」表示）

  米国株:
    基本: ユーザー入力 or CSVインポート
    参考値: yahoo-finance2（米国株は安定、免責表示付き）
    フォールバック: 前回取得値

  為替:
    yahoo-finance2 (USDJPY=X) → ExchangeRate-API無料枠 → デフォルト150円

  投資信託:
    CSVインポートが主。yahoo-finance2で基準価額の参考値取得

■ Stage 2（MRR ¥200K以上で移行）:

  J-Quants Pro（法人契約）を検討 — 商用利用可能な正式データ
  Financial Modeling Prep（$29/月）— 米国株の信頼性向上
  証券会社API業務提携交渉 — kabuステーション等
```

### 6.3 免責表示（市場データ）

全ての市場データ表示箇所に以下を付記:
```
※ 表示価格は参考値です。実際の取引価格は各証券会社でご確認ください。
データの正確性・完全性・適時性は保証しておりません。
```

### 6.4 データ精度モニタリング

```
監視対象:
  - データソースごとの成功率/失敗率（CloudWatch Metrics）
  - レスポンスタイム（P50/P95/P99）
  - データ鮮度（最終更新からの経過時間）

異常検知:
  - 前日比 ±30%超の価格変動 → 警告ログ（データソースエラーの可能性）
  - ソース切り替え発生 → Slack/メール通知
  - 連続失敗 3回以上 → アラート
```

### 6.5 歴史的価格データ蓄積

```
設計:
  テーブル: pfwise-price-history-{stage}
  PK: ticker
  SK: date (YYYY-MM-DD)
  属性: close, source, currency, isUserInput(bool)
  TTL: 2年間保持

  データソース:
    1. CSVインポート時の価格（isUserInput=true, 正式値）
    2. yahoo-finance2 日次スナップショット（isUserInput=false, 参考値）
       → Lambda scheduled function（1日1回、JST 18:00）
       → 全ユーザーの保有銘柄をユニーク集計 → バッチ取得

  ダッシュボード表示:
    - 総損益 = Σ(参考現在値 × 保有数 - 購入価格 × 保有数)
    - 前日比 = 今日の参考値 - 昨日の参考値
    - 年初来 = 今日 - 1月1日のスナップショット
    - 初回は購入価格との差分のみ。履歴蓄積後に推移グラフ表示
    - 全ての損益表示に「※参考値に基づく概算」を付記
```

---

## 7. プロダクト再設計

### 7.1 ユーザージャーニー

#### 現状（問題だらけ）
```
Google Login → 6ステップウィザード → 手動ティッカー入力 → ダッシュボード
（離脱）            （離脱）              （離脱）           （やっと価値体験）
```

#### 新（価値体験を最速に）
```
LP → 30秒デモ体験（ログイン不要） → 価値を実感 → Google Login →
CSVインポート or テンプレート選択 → ダッシュボード（損益＋スコア表示） →
「もっと詳しく」→ AIプロンプト → Standard導線
```

### 7.2 ランディングページ（専用LP新規作成）

```
1. Hero: 「資産の全体像が、1分でわかる」+ 無料で始めるCTA
2. 課題共感: 3つのペイン
3. 解決策: スクショ付き3つの解決
4. 主要機能: PFスコア、AIプロンプト、ゴール管理
5. 社会的証明: ユーザー数、評価、セキュリティ
6. 料金表: Free / Standard 比較
7. FAQ: 「投資助言ですか？」含む
8. CTA: 「今すぐ無料で始める — クレジットカード不要」
```

### 7.3 新機能設計

#### A. ポートフォリオスコア（Free核機能）【APIコスト¥0】
- ローカル計算で100点満点スコアリング
- 評価軸: 分散度、コスト効率（信託報酬）、リスクバランス、配当効率
- スコア改善の具体的提案 → AIプロンプト生成へ誘導

#### B. AIプロンプト・エンジン（Stage 1差別化）【APIコスト¥0】
- PromptOrchestrationServiceを大幅強化
- ポートフォリオデータ・目標・リスク許容度連動プロンプト
- 「強み/弱み」1行サマリー（ローカル計算）+ 分析観点3分割
- ワンクリックコピー

#### C. CSVインポート（UX改善の核）
```
1. SBI証券: 保有証券一覧CSV
   カラム: 銘柄コード, 銘柄名, 保有数量, 取得単価, 現在値, 評価損益
   エンコーディング: Shift-JIS → UTF-8変換

2. 楽天証券: 保有商品一覧CSV
   カラム: 銘柄コード, 銘柄名, 数量, 取得単価, 時価, 評価損益
   エンコーディング: Shift-JIS → UTF-8変換

3. マネックス証券: ポートフォリオCSV（要調査）

4. 汎用フォーマット:
   ticker, quantity, purchase_price, currency (UTF-8)
```

#### D. 損益ダッシュボード（継続動機の核）
- 最上部に大きく: 「+¥12,345（前日比 +0.8%）※参考値」
- 資産推移グラフ（日次/週次/月次/年次）
- 目標達成度プログレスバー

#### E. AIポートフォリオ・コーチ（Stage 2）【有料API】
- Claude API直接統合。MRR ¥200K以上で導入判断

#### F. ゴールベース投資トラッキング【APIコスト¥0】
- 目標設定 + 進捗トラッキング + 達成確率（フロントエンド計算）

#### G. ソーシャル・ポートフォリオ（Growth）
- 匿名PF共有、同年代比較、アロケーションランキング

### 7.4 デザインシステム再構築

**方針: shadcn/ui に全面移行。CLAUDE.md第8条を更新する。**

理由:
- Atlassianデザインはエンタープライズ向け。フィンテック個人向けには堅すぎる
- shadcn/uiはTailwindCSS v4ネイティブ。コンポーネント豊富
- 現存Atlassianコンポーネント4つのみ。移行コスト低

**CLAUDE.md第8条 更新内容:**
```
第8条（変更）: デザインはshadcn/ui + Radix UIを基盤とし、
TailwindCSS v4でスタイリングする。フィンテック信頼感デザインを指針とする。
```

**カラーパレット:**
- Primary: Deep Blue (#1A56DB) / Secondary: Emerald (#059669) / Danger: Rose (#E11D48)
- Background: Light #F8FAFC / Dark #0F172A
- ライトモードデフォルト。OS連動ダーク切替 + 手動トグル

**タイポグラフィ:**
- 見出し: Inter (英) / Noto Sans JP (日)
- 数値: JetBrains Mono（等幅）

### 7.5 モバイル戦略

**方針: Webファーストを維持。ネイティブアプリは収益確立後に検討。**

| 観点 | Webアプリ（現在の方針） | ネイティブアプリ |
|------|------------------------|-----------------|
| 開発コスト | ¥0（既存コードベース） | React Native: +2〜3ヶ月 |
| 審査 | なし | Apple審査1〜2週間。リジェクトリスクあり |
| 更新速度 | 即時デプロイ | 審査待ち1〜7日 |
| 課金手数料 | Stripe 3.6% | Apple 30% / Google 15%（初年度） |
| Push通知 | PWA（Phase 5） | ネイティブ対応 |

**Stage 1: レスポンシブWebアプリ + PWA（Phase 5）**
- ボトムナビ、カード型UI、スワイプ操作
- Service WorkerでApp Shellキャッシュ
- 「ホーム画面に追加」でアプリライクな体験

**Stage 2（MAU 5,000超で検討）: React Native or Capacitor**
- ネイティブアプリの必要性を再評価
- Apple課金30%を考慮した価格設計
- App Store審査対応（金融アプリガイドライン準拠）

**不採用の理由:**
- 開発リソースの分散回避
- Apple/Google課金手数料の利益圧迫（¥700のStandardなら¥210がAppleに取られる）
- 審査リジェクトリスク（金融アプリは厳しい）
- PWAで十分なモバイル体験が提供可能

---

## 8. アーキテクチャ再設計

### 8.1 フロントエンド

```
現状                          →  新設計
─────────────────────────────────────────────────
React 18 (JavaScript)         →  React 18 + TypeScript 5.x ← 完了（Phase 0-B）
react-scripts (CRA)           →  Vite 6.x ← 完了（Phase 0-A）
Jest                          →  Vitest + @vitest/coverage-v8 ← 完了（Phase 0-B）
Context API (76KB単一ファイル) →  Zustand（3ストア） + TanStack Query ← 完了（Phase 0-C）
Axios                         →  TanStack Query + fetch API ← 部分移行中
TailwindCSS v3 + Atlassian    →  TailwindCSS v4 + shadcn/ui ← 完了（Phase 2-A）
Base64エンコード              →  Zustand persist → サーバー側保存 ← 完了（Phase 2-B）
なし                          →  Playwright E2Eテスト基盤 ← 完了（Phase 3）
なし                          →  GA4アナリティクス ← 完了（Phase 2-B）
```

### 8.2 バックエンド

```
現状                          →  新設計
─────────────────────────────────────────────────
Serverless Framework v3       →  維持（安定性優先）
DynamoDB                      →  DynamoDB（テーブル追加）
セッションベース認証           →  JWT + Refresh Token + Session デュアルモード ← 完了（Phase 1 W1-2）+ 耐障害性修正（Phase 0-B）
yahoo-finance2のみ            →  yahoo-finance2（参考値、免責付き）+ フォールバック
なし                          →  Stripe Webhook処理
なし                          →  CloudWatch Metrics（データ精度監視）
APIバージョニングなし          →  /v1/ プレフィックス導入
ヘルスチェックなし             →  GET /health エンドポイント追加 ← 完了（Phase 1）
IPベースレート制限             →  ユーザーIDベースレート制限 ← 完了（Phase 1 + 2-B DynamoDB移行）
予算超過時に全API停止          →  グレースフルデグレーション（キャッシュ返却）← 完了（Phase 2-B）
なし                          →  pfwise-price-history + pfwise-portfolios テーブル ← 完了（Phase 2-B）
```

#### 8.2.1 技術的負債（既存コードベースの問題）

**A. 認証系ファイルの散乱 → ✅ 解決済み**
- 未使用の6ファイルを削除済み（Phase 0-A完了時）

**B. セッション→JWT移行 → ✅ 実装済み（Phase 1 Week 1-2）**
- 実装内容:
  1. ✅ JWT生成・検証ミドルウェア（jwtUtils.js — HS256, Secrets Manager連携, aud/iss検証）
  2. ✅ Refresh Token（httpOnly Cookie, Token Reuse Detection, DynamoDBでtokenId管理）
  3. △ Google Driveトークン管理はセッション依存のまま（JWTクレームにhasDriveAccessフラグのみ）
  4. ✅ デュアルモード後方互換（Session Cookie + JWT Bearer 両対応）
  5. ✅ フロントエンド: Authorization Bearerヘッダー + メモリのみトークン保存
  6. ✅ CORS設定更新 + Origin必須化（/auth/refresh）
- セキュリティレビュー実施済み（CRITICAL/HIGH全修正、テスト44件PASS）
- ✅ タブ切替時の自動ログアウト問題修正（Phase 0-B, 4件のバグ修正）
- ✅ Google Drive save/load API復元（Phase 0-B, ダミーレスポンス→実APIに切替）

**C. 予算超過時のAPI全停止（深刻度: 🟡）**
- `budgetCheck.js` の `DISABLE_ON_LIMIT: true` で予算超過時にAPI全体が停止
- 全ユーザーのサービスが止まる
- → グレースフルデグレーション（キャッシュのみ返却、新規データ取得を制限）に変更

**D. レート制限がIPベースのみ（深刻度: 🟢）**
- 企業NATの背後にいる複数ユーザーが同じIPとして制限される
- → JWT移行後にユーザーIDベースのレート制限に移行

**E. APIバージョニングなし（深刻度: 🟢）**
- 現在: `/api/market-data`, `/auth/google/login`
- → `/v1/api/market-data` のプレフィックス追加。Stage 2でのAPI変更時の後方互換性確保

**F. ヘルスチェックエンドポイントなし（深刻度: 🟢）**
- 外部監視ツール（UptimeRobot等）からの疎通確認ができない
- → `GET /health` → `{ status: 'ok', version, uptime }` を追加（apiSecretValidationスキップ）

### 8.3 データフローアーキテクチャ

```
■ 現状:
  手入力 → PortfolioContext(76KB) → localStorage(Base64)
  API    → DynamoDBキャッシュ     → PortfolioContext → 画面

■ 新設計:

  [データ入力]
    CSVインポート → パーサー(Shift-JIS) → バリデーション → usePortfolioStore
    テンプレート選択 → usePortfolioStore
    手動入力 → バリデーション → usePortfolioStore

  [データ永続化]
    usePortfolioStore ←→ localStorage（Zustand persist、オフラインキャッシュ）
                      ←→ DynamoDB（サーバー側プライマリ）[Phase 2-B]
                      ←→ Google Drive（バックアップ）

  [市場データ]  ★ TanStack Queryが一元管理（Zustandストアは持たない）
    TanStack Query → Lambda API → yahoo-finance2（参考値）
                                → JPX CSV（フォールバック）
                                → DynamoDBキャッシュ（TTL管理）
    キャッシュ: staleTime=5min, gcTime=30min
    コンポーネントは useQuery() で直接参照

  [価格履歴]
    Lambda Scheduled(JST 18:00) → yahoo-finance2 → pfwise-price-history

  [画面表示]
    usePortfolioStore（資産データ）
      + TanStack Query キャッシュ（市場参考値）
      → React コンポーネント
```

### 8.4 状態管理: Zustand 4ストア + TanStack Query

**TanStack QueryとZustandの役割分担（明確化）:**
- **TanStack Query**: サーバーデータ（市場価格、為替、API設定、ユーザープロフィール）
- **Zustand**: クライアントデータ（ポートフォリオ構成、UI状態、認証状態、シミュレーション）
- **ルール**: 同じデータを両方に持たない。市場データ用のZustandストアは作らない。

```
usePortfolioStore（資産データ）
  state: currentAssets[], targetPortfolio{}, baseCurrency, additionalBudget
  actions: addTicker, removeTicker, updateHoldings, updateTargetAllocation
  persist: localStorage

useSimulationStore（シミュレーション）
  state: simulationResult
  actions: runSimulation, executePurchase, executeBatchPurchase

useAuthStore（認証）
  state: user, isAuthenticated, hasDriveAccess, googleClientId
  actions: loginWithGoogle, logout, checkSession, authorizeDrive

useUIStore（UI状態）
  state: notifications[], isLoading, activeTab, theme
  actions: addNotification, removeNotification, setTheme
```

**TanStack Queryのカスタムフック:**
```
useExchangeRate()     → queryKey: ['exchangeRate', from, to]
useStockPrice(ticker) → queryKey: ['stockPrice', ticker]
useMultipleStocks()   → queryKey: ['stocks', tickers]
useApiStatus()        → queryKey: ['apiStatus']
```

**移行戦略:**
1. Zustand 4ストア新規作成
2. TanStack QueryでmarketDataService呼び出しを置換
3. PortfolioContextの互換ラッパー作成（内部でZustand + TanStack Query使用）
4. コンポーネントを段階移行
5. 全移行後、互換ラッパーとPortfolioContext.jsを削除

### 8.5 データモデル拡張

```
新規DynamoDBテーブル:
─────────────────────────────
pfwise-users-{stage}             # ユーザープロフィール + プラン情報      [Phase 1]
pfwise-subscriptions-{stage}     # Stripe サブスクリプション              [Phase 1]
pfwise-usage-{stage}             # 機能利用量トラッキング                 [Phase 1]
pfwise-portfolios-{stage}        # サーバー側ポートフォリオ保存           [Phase 2-B]
pfwise-price-history-{stage}     # 日次価格スナップショット(参考値)       [Phase 2-B]
pfwise-goals-{stage}             # 投資目標                              [Phase 4]
pfwise-ai-conversations-{stage}  # AI会話履歴                            [Stage 2]
```

### 8.6 セキュリティ改善

```
Phase 0-C: localStorageのBase64エンコード → Zustand persist（プレーンJSON）
  → localStorageはオフラインキャッシュ。機密データはhttpOnly cookie（既存）

Phase 2-B: サーバー側保存に移行
  → DynamoDB暗号化（AWS KMS）がプライマリ
  → localStorageはキャッシュのみ
```

### 8.7 オフライン対応

```
方針: オフラインファースト → オンライン同期

市場データ: TanStack Query staleTime=5min。オフライン時は最終取得値 + 「古い可能性」バッジ
ポートフォリオ: Zustand persist → localStorage。オンライン復帰時にサーバー同期（楽観的更新）
コンフリクト: サーバー側を正（最終更新タイムスタンプ比較）
PWA: Phase 5でService Worker導入
```

### 8.8 デプロイ品質管理

**教訓: Phase 0-Aデプロイで本番障害が発生。テストが全パスしても本番が壊れていた。**
**根本原因: モックの世界では全てが動く。しかし本番では何も動かない。**

#### デプロイ後スモークテスト（Phase 0-B で scripts/smoke-test.sh として作成）

```
1. curl で portfolio-wise.com の HTTP 200 確認
2. JS/CSSバンドルの読み込み確認
3. /config/client API 疎通確認（200 + JSONバリデーション）
4. /api/market-data API 疎通確認（参考値取得確認）
5. /health エンドポイント疎通確認
```

#### テストレベルの現状と目標

| テストレベル | 現状 | あるべき姿 | 導入Phase |
|-------------|------|-----------|-----------|
| ユニットテスト | ○ | ○ 維持 | 既存 |
| 統合テスト | △ モック過剰 | ○ 実APIとの疎通 | Phase 0-B |
| E2Eテスト | ○ Playwright導入済 | ○ カバレッジ拡大 | Phase 3 ✅ |
| スモークテスト | ✕ | ◎ デプロイ後必須実行 | Phase 0-B |
| ヘルスチェック | ✕ | ◎ 常時監視 | Phase 1 |
| パフォーマンス | ✕ | △ Lighthouse CI | Phase 4 |

#### カナリアデプロイ（Phase 3以降）
- 全ユーザーに即時展開ではなく、一部ユーザーに先行展開
- エラーレートが閾値を超えたら自動ロールバック

---

## 9. 実装ロードマップ

### Phase依存関係図

```
Phase 0-A ──→ Phase 0-B ──→ Phase 0-C ──→ Phase 1
  (ビルド)      (型安全)      (状態管理)     (収益化)
                                               │
                                          ┌────┴────┐
                                     Phase 2-A   Phase 2-B
                                     (UX+デザイン)(データ基盤)
                                          └────┬────┘
                                               │
                                          Phase 3 ──→ Phase 4 ──→ Phase 5
                                          (AI強化)    (差別化)     (グロース)
```

### Phase 0-A: ビルド基盤刷新（2週間） ✅ 完了

**目標:** CRA→Vite移行。既存機能の完全動作維持
**完了条件:** Viteビルド成功、本番デプロイで全機能動作、既存Jestテストパス

- [x] vite, @vitejs/plugin-react インストール
- [x] vite.config.ts 作成（server.proxy, build.outDir='build'）
- [x] index.html をルートに移動、%PUBLIC_URL%除去、`<script type="module">` 追加
- [x] src/index.js → src/main.tsx リネーム
- [x] react-scripts, @babel/core, @babel/preset-env, @babel/preset-react 削除
- [x] craco.config.js 削除（2ファイル）
- [x] setupProxy.js → vite.config.ts proxy設定に移行、削除
- [x] package.json scripts 更新
- [x] REACT_APP_* → VITE_* 全ファイル一括置換
- [x] process.env.REACT_APP_* → import.meta.env.VITE_* 一括置換
- [x] .env ファイル群 + CI/CDの環境変数更新
- [x] require() → import文 変換（6ファイル）
- [x] 不要ファイル削除（バックアップ、未使用ファイル）
- [x] 市場データの免責表示UIを既存DataSourceBadgeコンポーネントに追加
- [x] 未使用auth関連ファイル削除（6ファイル: debug/logging/detailed/temporary/stateless/basic）
- [ ] フロントエンド・バックエンドのテストカバレッジベースライン計測・記録
- [x] **検証: 既存Jestテスト全パス + 本番デプロイ動作確認 + スモークテスト手動実行**
- [x] /config/client 403エラー修正（apiSecretValidation SKIP_VALIDATION_PATHS追加）
- [x] npm workspace hoisting問題修正（backendをworkspacesから除外）

### Phase 0-B: 型安全性（3週間） ✅ 完了

**目標:** TypeScript導入、Jest→Vitest移行
**完了条件:** Vitestで全テストパス、テストカバレッジ維持
**完了日:** 2026-03-04（コミット 0a9e95f1）

- [x] typescript, @types/react, @types/react-dom インストール
- [x] tsconfig.json（strict: false）, vite-env.d.ts 作成
- [x] エントリーポイント → .tsx変換
- [x] types/, services/, utils/, context/, hooks/ → .ts/.tsx変換（113ソースファイル）
- [x] コンポーネント: 全64コンポーネント .tsx化
- [x] vitest, @vitest/coverage-v8, jsdom インストール
- [x] jest.fn()→vi.fn(), jest.mock()→vi.mock() 一括変換（60テストファイル）
- [x] 旧jest config群 + Babel関連10パッケージ削除
- [x] **検証: tsc --noEmit → 0エラー、Vitest 411パス/902スキップ/0失敗**
- [x] **検証: npm run build → 成功（1.62s）**
- [x] **検証: Cloudflare Pages デプロイ成功**

**Phase 0-B統計:**
- 179ファイル変更, +4,763行 / -10,683行
- `any`型使用: 325箇所（段階的移行のため許容、Phase 0-C以降で削減）
- テストスキップ: 42テストファイル（Phase 0-C以降で段階的に有効化）
- バンドルサイズ: 971.68kB（コード分割はPhase 2-Aで対応）

**Phase 0-Bバグ修正（コミット a5bc012c）:**
- [x] BUG-1: Google Drive loadFromGoogleDrive/saveToGoogleDrive がダミーレスポンスに置換されていた問題を修正（googleDriveService.tsの実APIに切替）
- [x] BUG-2a: トークンリフレッシュ失敗時の無条件clearAuthToken → 401/403のみに限定
- [x] BUG-2b: セッション確認3回失敗時のclearInterval → 削除（チェック継続）
- [x] BUG-2c: visibility handler失敗後の永久スキップ → 5分クールダウン後リセット
- [x] BUG-2d: セッションエンドポイント401でのトークン即削除 → "Invalid token"メッセージのみに限定

### Phase 0-C: 状態管理刷新（3週間） ✅ 完了

**目標:** PortfolioContext.js 76KB → Zustand 3ストア + TanStack Query
**完了条件:** 旧Context完全削除、全テストパス、本番デプロイ動作確認

- [x] zustand 5.0.11, @tanstack/react-query 5.90.21 インストール
- [x] usePortfolioStore, useAuthStore, useUIStore 作成（3ストア構成）
- [x] QueryClientProvider をApp.tsxに追加
- [x] 旧Context完全削除（AuthContext 514行 + PortfolioContext 1,888行 + ContextConnector + portfolio/4ファイル）
- [x] 全コンポーネント直接Zustand参照に移行（互換ラッパーではなく完全移行）
- [x] テスト全面修正: 62ファイルPASS / 1,387テストPASS / 0 FAIL
- [x] Zustandストアテスト新設: uiStore(20) + portfolioStore(81) + authStore(48) = 149件
- [x] E2E 6/6 PASS + Cloudflare Pages本番デプロイ確認
- [ ] TanStack Query カスタムフック作成（useExchangeRate, useStockPrice等）→ Phase 1以降
- [ ] Zustand persist移行（現在はBase64エンコードでlocalStorage） → Phase 1以降
- [ ] データ精度モニタリング基盤（CloudWatch Metrics） → Phase 2-B

### テスト戦略（Phase 0全体 + バックエンド）

```
■ フロントエンド:
Phase 0-A: 既存Jestを維持。ビルド成功+テストパス+カバレッジベースライン計測が完了条件 ✅
Phase 0-B: Jest→Vitest一括切替 ✅（411パス/902スキップ）
Phase 0-C: Zustand移行+テスト全面修正 ✅（1,387パス/33スキップ、62ファイルPASS）
全Phase: CI「全テストパス」をマージ条件に設定

■ バックエンド:
Phase 0-A: 既存Jestテスト維持 + カバレッジベースライン計測
Phase 1:
  - JWT認証フローの統合テスト
  - Stripe Webhookテスト（stripe-event-mock使用）
  - プラン制限ミドルウェアのテスト
  - ヘルスチェックエンドポイントのテスト
Phase 2-A:
  - CSVパーサーのユニットテスト（SBI/楽天/汎用フォーマット）
  - Shift-JISエンコーディング変換テスト
  - PFスコア計算アルゴリズムのテスト
Phase 2-B:
  - 日次スナップショットLambdaのテスト
  - Zustand ↔ DynamoDB同期のテスト
  - 損益計算の精度テスト

■ E2Eテスト（Phase 3以降）:
  - Playwright導入
  - クリティカルパス: ログイン→CSVインポート→ダッシュボード→課金
  - CI/CDパイプラインに組み込み
  - デプロイ前の自動テスト

■ データ精度テスト:
  - 市場データの精度検証（yahoo-finance2の返す値が妥当か）
  - 為替レート計算の精度テスト
  - CSVパーサーの正確性テスト（証券会社フォーマット変更対応）
```

### Phase 1: 収益化基盤 + 認証刷新（4〜5週間）

**Week 1-2: JWT認証移行 ✅ 完了**
- [x] JWT生成・検証ミドルウェア作成（jwtUtils.js — HS256, aud:'pfwise-web', iss:'pfwise'）
- [x] Refresh Tokenローテーション + Reuse Detection（DynamoDB currentRefreshTokenId管理）
- [x] デュアルモード後方互換（Session + JWT両対応、sessionHelper.js）
- [x] 既存セッションからの移行パス（再ログイン不要 — 3階層フォールバック）
- [x] フロントエンド: Authorization Bearerヘッダー対応（メモリのみトークン保存）
- [x] CORS設定の見直し + Origin必須化（/auth/refresh）
- [x] セキュリティレビュー全修正（オープンリダイレクト防止、ログマスク化、debug=true無効化等）
- [x] テスト: jwtUtils(24) + refreshToken(11) + logout(9) = 44件PASS

**Week 2-3: Stripe + テーブル ✅ 完了**
- [x] Stripe（Checkout + Customer Portal + Webhook Lambda）
- [x] pfwise-users, pfwise-subscriptions, pfwise-usage テーブル作成
- [x] プラン制限ミドルウェア（planLimitation.js）
- [x] Webhook冪等性（イベントID重複排除、CacheTable 24h TTL）
- [x] Webhookエラーハンドリング（回復不能→200、一時障害→500）
- [x] イベント処理ステータス追跡（succeeded/failed/skipped）

**Week 3-4: UI + 法務 ✅ 完了**
- [x] プライシングページ UI（Pricing.tsx、Free/Standard比較カード）
- [x] 利用規約（Terms.tsx）
- [x] プライバシーポリシー（Privacy.tsx、APPI準拠）
- [x] 特定商取引法に基づく表記（KKKR.tsx）
- [x] 免責事項（Disclaimer.tsx、投資助言非該当明記）
- [x] Footer.tsx（法務リンク）
- [x] UpgradePrompt.tsx（プラン上限誘導）
- [x] subscriptionStore.ts + subscriptionService.ts
- [x] CLAUDE.md第8条更新（Phase 2-A完了時にshadcn/uiに更新済み）

**Week 4-5: インフラ改善 ✅ 完了**
- [x] ヘルスチェックエンドポイント追加（GET /health、情報漏洩対策済み）
- [x] APIバージョンプレフィックス（/v1/subscription/*）
- [x] ユーザーIDベースレート制限（Free: 30/h, Standard: 300/h）
- [x] Stripe CLIローカルWebhookテスト手順（backend/CLAUDE.md）
- [ ] **ペルソナ検証: ベータユーザー5〜10人招待・インタビュー実施**

### Phase 2-A: UX・デザイン刷新（5週間） ✅ 完了

**完了日:** 2026-03-05（コミット eb117fae）

**Week 1-2: デザイン基盤 ✅ 完了**
- [x] CSS変数ベースのセマンティックカラー定義（ライト/ダーク自動切替）
- [x] shadcn/ui 8コンポーネント新設（Button, Card, Input, Badge, Dialog, Progress, Switch, Tabs）
- [x] CVA (class-variance-authority) + clsx + tailwind-merge 導入
- [x] ライトモードデフォルト + ダーク切替 + システム連動（3-state）
- [x] JetBrains Mono 金額表示 + tabular-nums
- [x] Header/TabNavigation/Footer 新デザイン
- [x] テーマ管理: uiStore.ts に initializeTheme/setTheme 追加

**Week 3-4: コア機能 ✅ 完了**
- [x] CSVインポート強化（csvParsers.ts 470行）
  - SBI証券/楽天証券/汎用フォーマット自動判定
  - Shift-JIS → UTF-8 自動検出・変換
  - 数字パース（¥/＄/% 記号対応）
- [x] ポートフォリオスコア（portfolioScore.ts 400行）
  - 8指標: 分散度/目標適合度/コスト効率/リバランス健全度/通貨分散/配当効率/アセット分散/データ鮮度
  - Free: 3指標 / Standard: 8指標（プラン制限連動）
  - CircularProgress + MetricBar による視覚的表示
  - Dashboard統合（PortfolioScoreCard コンポーネント）

**Week 5: 獲得導線**
- [ ] 新オンボーディングフロー（30秒デモ体験）→ Phase 3以降
- [ ] 専用ランディングページ → Phase 3以降

**Phase 2-A統計:**
- 46ファイル変更, +3,190行 / -729行
- バンドルサイズ: 988KB → 1,057KB (+69KB, +7%)
- テスト: 1,387 passed / 33 skipped / 0 failed

### Phase 2-B: データ基盤強化（3週間） ✅ 完了

**完了日:** 2026-03-05（コミット 2d9c9040 + レビュー修正 9cb00b1e）

- [x] pfwise-price-history テーブル + バックエンドAPI（priceHistory.js — JWT認証 + ticker検証）
- [x] 損益ダッシュボード（PnLSummary + PnLTrendChart — 前日比・推移グラフ）※全て「参考値」表示
- [x] pfwise-portfolios テーブル（サーバー側保存 — optimistic locking + version管理）
- [x] portfolioSyncService.ts — Zustand ↔ DynamoDB 同期ロジック（save/load/conflict resolution）
- [x] 予算超過時のグレースフルデグレーション実装（budgetCheck.js — キャッシュ返却モード）
- [x] GA4アナリティクス統合（gtag + analytics.ts — ページビュー/イベントトラッキング）
- [x] **レビュー修正（CRITICAL 4件 + MEDIUM 8件）:**
  - plCalculation.ts: PnL計算ロジックバグ修正（totalCurrentValue/totalInvestment不整合）
  - apiUtils.ts: document.cookie本番ログ出力除去
  - apiKeyAuth.js: インメモリレート制限 → DynamoDB-backed移行
  - marketData.js: X-Test-Modeヘッダー/テストモード検知除去
  - priceHistoryService.ts: authFetch + 並行制限（MAX_CONCURRENCY=5）
  - vite.config.js: sourcemap: false
- [x] テスト: Backend 12/12 PASS, Frontend 59 suites / 1,347 tests PASS

**Phase 2-B統計:**
- バンドルサイズ: 1,057KB → 1,164KB (+107KB)
- テスト: 1,347 passed / 19 skipped / 0 failed

### Phase 3: AI強化 + E2Eテスト基盤（4週間） ✅ 完了

**完了日:** 2026-03-05（コミット 3e9be8a7 + レビュー修正 a9a6800e）

**AI強化（2.5週間）:**
- [x] PromptOrchestrationService強化（PFデータ連動、3観点プロンプト自動生成）
- [x] portfolioDataEnricher.ts（スコア + PnL + 保有 + 目標を統合した構造化データ）
- [x] AnalysisPerspectiveTabs.tsx（リスク分析 / コスト最適化 / 成長戦略 タブ切替）
- [x] StrengthsWeaknessCard.tsx（強み/弱み1行サマリー表示）
- [x] CopyToClipboard.tsx（ボタン/アイコンモード切替、ワンクリックコピー）
- [x] ExternalAILinks.tsx（Claude/Gemini/ChatGPT へのコピー&オープン）
- [ ] 【Stage 2】Claude API直接統合（MRR ¥200K達成後）

**E2Eテスト基盤（1.5週間）:**
- [x] Playwright導入・設定（playwright.config.js + GitHub Actions e2e-tests.yml）
- [x] スモークテスト（health-check.spec.ts — HTTP200 + HTML/JS検証）
- [x] クリティカルフロー4件（app-load / dashboard-view / settings-flow / pricing-flow）
- [x] テスト共通基盤（test-constants.ts + page-objects.ts + run-smoke-tests.sh）
- [x] data-testid追加（5コンポーネント: header, tab-nav, portfolio-score, pnl-summary, strengths-weakness）

**レビュー修正（CRITICAL 5件 + MEDIUM 2件）:**
- [x] PromptOrchestrationService: JSON.parse 3箇所に try-catch + 破損データ自動削除
- [x] CopyToClipboard: setTimeout メモリリーク修正（useRef + useEffect cleanup）
- [x] portfolioDataEnricher: any[] 10箇所 → EnricherAsset/TargetAllocation 型安全化
- [x] AnalysisPerspectiveTabs/ExternalAILinks/CopyToClipboard: data-testid 追加
- [x] E2E test-constants: ハードコードURL → process.env フォールバック
- [x] E2E dashboard-view/settings-flow: afterEach localStorage cleanup 追加
- [x] テスト: 59 suites / 1,347 tests PASS, ビルド成功（1.57s）

**Phase 3統計:**
- 新規ファイル: 9+ファイル（AI 5 + E2E 4+）
- 変更ファイル: 10+ファイル
- テスト: 1,347 passed / 19 skipped / 0 failed

### Phase 4: 差別化機能（4週間） — 進行中

**Phase 4-A 完了日:** 2026-03-06（コミット ab314a74）
**Phase 4-B 完了日:** 2026-03-06（コミット 992d8e6a）
**Phase 4-C 完了日:** 2026-03-06（コミット 1e966cb9）

**TDD実装（テスト駆動開発）:**
- [x] ゴールベース投資トラッキング（goalCalculations + goalStore + GoalCard/Dialog/ProgressSection）
  - 投資目標CRUD（Free: 1ゴール、Standard: 5ゴール）
  - 達成率計算 + 月額必要額計算 + 達成予測日
  - Dashboard統合（GoalProgressSection）
  - TDD: 95テスト新規追加（26+15+10+12+6+16+10）
- [x] 月次投資レポート生成（monthlyReport + MonthlyReportCard）
  - 月間リターン計算、トップ銘柄抽出、スコア変化
- [x] subscriptionStore goalTracking機能制限追加
- [x] GA4イベント追加（goal_create/update/delete）
- [x] バンドル最適化 + パフォーマンス改善
  - React.lazy + Suspense route-based code splitting（全11ページ）
  - メインバンドル: 451KB → 157KB（-65%）、gzip: 127KB → 50KB（-61%）
  - LoadingFallback Suspenseフォールバック（TDD: 6テスト）
  - React.memo（GoalCard, GoalDialog, MonthlyReportCard）
  - useCallback最適化（GoalProgressSection）
- [x] Modern* → shadcn/ui 移行 + デッドコード削除
  - ModernButton/Card/Input/Form → shadcn/ui Button/Card/Input（8ファイル移行）
  - Modern*定義ファイル4つ + テスト2つ削除（-1,091行）
  - ResetSettingsテスト更新（ModernCard→Card クラス検証）
- [ ] ソーシャル・ポートフォリオ（匿名共有）

### Phase 5: グロース（継続）

- [ ] SEO、コンテンツマーケ、リファラルプログラム
- [ ] PWA対応
- [ ] 通知システム
- [ ] 【Stage 2】J-Quants Pro or 証券会社API業務提携交渉

### スケジュール概要

```
Phase 0-A: ビルド基盤        2週間   ← 完了 ✅
Phase 0-B: 型安全性          3週間   ← 完了 ✅ + バグ修正5件
Phase 0-C: 状態管理          3週間   ← 完了 ✅ (Zustand + TanStack Query)
Phase 1:   収益化+認証刷新   4〜5週間 ← 完了 ✅ (JWT + Stripe + 法務 + インフラ)
Phase 2-A: UX+デザイン       5週間   ← 完了 ✅ (shadcn/ui + CSV + PFスコア)
Phase 2-B: データ基盤        3週間   ← 完了 ✅ (損益ダッシュボード + 価格履歴 + サーバー同期 + GA4)
Phase 3:   AI強化+E2E基盤    4週間   ← 完了 ✅ (AI分析3分割 + 強み/弱みカード + Playwright E2E)
Phase 4:   差別化機能        4週間   ← 進行中（4-A: ゴール+月次レポート, 4-B: バンドル-65%, 4-C: Modern*→shadcn/ui移行）
──────────────────────────────────────
直列合計: 約28〜29週間（7〜7.3ヶ月）
並行実行時: 約25〜26週間（6.3〜6.5ヶ月）
```

---

## 10. 競合優位性マトリクス

| 機能 | マネフォ(¥500) | カビュウ(¥1,080) | 43juni(無料) | **pfwise(¥700)** |
|------|----------------|------------------|-------------|-------------------|
| 資産一元管理 | ◎ | ○ | ◎ | ○→◎ |
| 日米株対応 | ○ | ◎ | ◎ | ◎ |
| リバランス計算 | × | × | ○ | **◎** |
| AIプロンプト生成 | × | × | × | **◎（独自）** |
| PFスコア診断 | × | △ | × | **◎（独自）** |
| ゴール管理 | △ | × | × | **◎（独自）** |
| CSVインポート | ○ | ◎ | △ | ○→◎ |
| プライバシー | △(銀行連携) | △(証券連携) | ○ | **◎(自己管理)** |

**独自ポジショニング: 「AIパワーのセルフ投資コーチ」**

---

## 11. 成功指標（KPI）

| 指標 | 目標値 | 測定方法 |
|------|--------|----------|
| Time to Value | < 60秒 | 初回訪問〜スコア表示 |
| LP CVR | > 5% | 訪問者→ログイン |
| Day 7 リテンション | > 40% | 7日後再訪問率 |
| Trial→Paid転換率 | > 5% (12ヶ月目標) | 30日Free→Standard |
| 月次チャーン率 | < 5% | 有料解約率 |
| MRR | ¥70K (12ヶ月後) | Stripe Dashboard |
| 月間運営コスト（Stage 1） | < ¥5,000 | AWS + Cloudflare |
| 損益分岐ユーザー数 | 8人 | Standard ¥700 × 8 |
| データソース成功率 | > 95% | CloudWatch Metrics |
| ビルド時間 | < 30秒 | Vite build |

---

## 12. リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| **yahoo-finance2停止** | 参考値取得不能 | JPX CSVフォールバック + 前回取得値表示 + Stage 2で正式API |
| **グレーゾーンのデータ利用** | 法的リスク | 「参考値」免責表示 + 正確性非保証明記 + 弁護士相談 |
| 金融商品取引法抵触 | 法的リスク | AI出力制御 + 免責表示 + 弁護士相談(¥50K) |
| Phase 0ビッグバンリライト | デグレ | A/B/Cサブフェーズ + 各Phase末に本番検証 |
| ユーザー獲得の遅れ | 収益化遅延 | 収益予測を保守的に設定済み。8人で黒字化の低ハードル |
| ユーザーデータ漏洩 | 信頼喪失 | Phase 2-Bでサーバー側保存(AWS KMS暗号化) |
| Stripe決済障害 | 売上損失 | Webhook retry + 決済失敗通知 |

---

*Phase 0-A（ビルド基盤刷新）から即時実行開始。*
