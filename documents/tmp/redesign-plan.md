# PortfolioWise ゼロベース再設計計画書

**作成日**: 2026-03-08
**方針**: ゼロから作るならどうするか？を起点に、現行プロダクトを逆算リファクタリング
**ペルソナ**: テック系長期投資家 タケシ（28-42歳, IT企業勤務, 日米分散投資）
**目標**: 収益化可能なプロダクト品質への到達

---

## 0. 現状の致命的問題（プロダクトレビュー結果）

### ユーザーフィードバック
- 「動かないボタンが大量にある」
- 「テストが不十分」
- 「収益化に繋がるとは思えないデザイン」
- 「絵文字がダサい」
- 「ペルソナに合致していない」

### 定量的問題
| カテゴリ | 件数 | 深刻度 |
|---------|------|--------|
| 絵文字使用箇所 | 38箇所 | 高 |
| 英語/日本語混在 | 50箇所以上 | 高 |
| ハードコード色値 | 35箇所以上 | 中 |
| alert()/confirm()使用 | 7箇所以上 | 高 |
| window.location.href (SPA違反) | 1箇所 | 中 |
| 孤立ルート (/data) | 1箇所 | 低 |
| フォント読込エラー (JetBrains Mono) | 本番環境 | 中 |
| Google OAuth スクリプトエラー | 本番環境 | 高 |

---

## 1. ゼロベース設計思想

### 1.1 もしゼロから作るなら

**ペルソナ: タケシ（32歳, SaaS企業のエンジニア）**
- 楽天証券 + SBI証券で日米株・投信を長期保有
- 普段からターミナルやダッシュボード系ツールに慣れている
- 「データが正確に見えること」に価値を感じる
- 派手な装飾より**クリーンで信頼感のあるUI**を好む
- スマホでサッと確認、PCで詳細分析
- 月700円なら「本当に使えるツール」にだけ払う

**ゼロベース設計の核心**:
1. **Landing → Login → Dashboard の3クリック完結** — 余計な画面を挟まない
2. **Dashboard = プロダクトの顔** — ログイン後すぐに価値が見える
3. **設定は裏方** — ユーザーが意識しなくても動く
4. **AIは補助** — メインはデータの正確な可視化
5. **日本語ファースト** — 英語フォールバック不要、日本市場特化

### 1.2 現行プロダクトとのギャップ

| ゼロベース設計 | 現行プロダクト | ギャップ |
|---------------|---------------|---------|
| クリーンなアイコン | 絵文字(📊🤖🔄🔔⚙️) | デザイン品質 |
| 日本語統一 | EN/JP混在50箇所 | 言語一貫性 |
| in-app Dialog確認 | window.confirm() 7箇所 | UX品質 |
| Toast通知 | alert() 1箇所+ | UX品質 |
| React Router遷移 | window.location.href | SPA一貫性 |
| デザイントークン統一 | ハードコード色35箇所 | 保守性 |
| セルフホストフォント | Google Fonts CDN | 信頼性 |
| 信頼感デザイン | 情報過多・装飾過多 | ペルソナ適合 |

---

## 2. リファクタリングフェーズ

### Phase R1: 基盤品質（UX破壊の修正）— 1-2日

**目的**: 「動かないボタン」問題を根絶し、基本的なUX品質を確保

#### R1-A: ブラウザAPI撲滅
| 対象ファイル | 問題 | 修正 |
|-------------|------|------|
| `pages/Simulation.tsx:40` | `alert('購入処理が完了しました')` | `addNotification()` に置換 |
| `pages/Simulation.tsx:38` | `window.confirm()` | shadcn Dialog に置換 |
| `components/simulation/SimulationResult.tsx:89,102` | `window.confirm()` | shadcn Dialog に置換 |
| `components/settings/LocalStorageDiagnostics.tsx` | `window.confirm()` | shadcn AlertDialog に置換 |
| `components/settings/HoldingsEditor.tsx` | `window.confirm()` | shadcn AlertDialog に置換 |
| `components/social/ShareLinkDisplay.tsx` | `window.confirm()` | shadcn AlertDialog に置換 |
| `pages/Pricing.tsx:61` | `window.location.href = '/dashboard'` | `navigate('/dashboard')` に置換 |

#### R1-B: フォント・外部リソース修正
- JetBrains Mono をセルフホスト（`public/fonts/` に配置、`@font-face` で読込）
- Google OAuth スクリプトのエラーハンドリング強化
- フォールバックフォント指定: `font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace`

#### R1-C: 孤立ルート整理
- `/data` ルート → 削除（`/data-import` に統合済み）
- `DataIntegration.tsx` → 参照がなければ削除

**完了基準**: ブラウザネイティブダイアログがゼロ、コンソールエラーがゼロ

---

### Phase R2: デザイン浄化（絵文字→アイコン + 言語統一）— 2-3日

**目的**: プロフェッショナルな外観への転換

#### R2-A: 絵文字完全除去 → Lucide Icons 統一

Lucide React（shadcn/ui 標準）のアイコンに全置換:

| 絵文字 | Lucide アイコン | 使用箇所 |
|--------|----------------|---------|
| 📊 | `<BarChart3 />` | Settings, DataImport, AIAdvisor, DataSourceBadge |
| 🤖 | `<Bot />` | Settings (AI分析設定タブ) |
| 🔄 | `<ArrowUpDown />` | Settings (データ交換タブ) |
| 🔔 | `<Bell />` | Settings (通知設定タブ) |
| ⚙️ | `<Settings />` | Settings (システム設定タブ) |
| 📈 | `<TrendingUp />` | DataSourceBadge, DataImport |
| 💾 | `<HardDrive />` | DataSourceBadge, DataImport |
| ⚠️ | `<AlertTriangle />` | DataSourceBadge |
| ℹ️ | `<Info />` | DataSourceBadge |
| 🎯 | `<Target />` | ExternalAILinks, AIAdvisor, PromptOrchestrator |
| 📄 | `<FileText />` | DataImport, ScreenshotAnalyzer |
| 📁 | `<FolderOpen />` | DataImport |
| 💡 | `<Lightbulb />` | DataImport, AIAdvisor, PromptOrchestrator |
| ✅ | `<CheckCircle />` | ScreenshotAnalyzer, DataImport |
| 📋 | `<ClipboardList />` | AIAdvisor, DataImport |
| ✨ | `<Sparkles />` | AIAdvisor (初回セットアップ) |
| 🇯🇵 | 国旗画像/SVG | LandingHeader (言語切替) |

**実装方針**:
1. `lucide-react` は既にインストール済み（shadcn/ui 依存）
2. 各コンポーネントで `import { IconName } from 'lucide-react'` に置換
3. アイコンサイズ統一: タブ内 `size={16}`, セクションヘッダー `size={20}`, 装飾用 `size={24}`
4. アイコンカラー: `className="text-muted-foreground"` または `text-primary`

#### R2-B: 日本語完全統一

全てのユーザー向けテキストを日本語に統一。`isJapanese` 三項演算子を削除し、日本語固定に。

**主要対象ファイル**:
| ファイル | EN文字列数 | 対応 |
|---------|-----------|------|
| `components/ai/ScreenshotAnalyzer.tsx` | 12箇所 | 日本語固定 |
| `components/ai/PromptOrchestrator.tsx` | 10箇所 | 日本語固定 |
| `pages/DataImport.tsx` | 15箇所 | 日本語固定 |
| `pages/AIAdvisor.tsx` | 8箇所 | 日本語固定 |
| `pages/Settings.tsx` | 5箇所 | 日本語固定 |
| `components/settings/*.tsx` | 多数 | 日本語固定 |

**方針**:
- `isJapanese ? 'A' : 'B'` → `'A'` に簡素化
- 言語切替機能自体は将来の国際化に備えて仕組みは残すが、UIからは一旦非表示
- ヘッダーの `🇯🇵 日本語` ボタンは削除（日本語のみなので不要）

#### R2-C: Settings タブの刷新

**現行**（絵文字+混在テキスト）:
```
📊ポートフォリオ設定 | 🤖AI分析設定 | 🔄データ交換 | 🔔通知設定 | ⚙️システム設定
```

**新規**（Lucide Icons + 簡潔ラベル）:
```
[BarChart3] 銘柄管理 | [Bot] AI設定 | [ArrowUpDown] データ | [Bell] 通知 | [Settings] システム
```

---

### Phase R3: デザイントークン統一 — 1-2日

**目的**: ハードコード色値の撲滅、テーマ対応の完全化

#### R3-A: カラーパレット統一

CSS変数に全色を集約（`tailwind.config.ts` / `globals.css`）:

```css
/* チャート専用カラーパレット */
--chart-1: oklch(0.65 0.2 250);   /* Blue */
--chart-2: oklch(0.65 0.18 160);  /* Green */
--chart-3: oklch(0.7 0.15 80);    /* Amber */
--chart-4: oklch(0.6 0.2 25);     /* Red-orange */
--chart-5: oklch(0.6 0.2 290);    /* Purple */
/* 拡張パレット（最大15色） */
--chart-6 through --chart-15
```

**対象ファイル**:
| ファイル | ハードコード色数 | 対応 |
|---------|----------------|------|
| `components/dashboard/PortfolioCharts.tsx` | 15色 | `--chart-N` 変数使用 |
| `components/dashboard/DifferenceChart.tsx` | 2色 | `--color-success/danger` 使用 |
| `components/social/PeerComparisonPanel.tsx` | 10色 | `--chart-N` 変数使用 |
| `pages/SharedPortfolio.tsx` | 10色 | `--chart-N` 変数使用 |
| `components/ui/progress.tsx` | 4色 | CSS変数使用 |
| `pages/AIAdvisor.tsx` | 2色 | Tailwind クラス使用 |

#### R3-B: スペーシング・タイポグラフィ規約

```
スペーシング規約:
- セクション間: space-y-8 (32px)
- カード間: gap-4 (16px)
- カード内: p-6 (24px)
- ラベル-入力間: space-y-2 (8px)
- インラインアイコン: gap-2 (8px)

フォントサイズ規約:
- ページタイトル: text-2xl font-bold
- セクション見出し: text-lg font-semibold
- カードタイトル: text-base font-medium
- 本文: text-sm
- 補足: text-xs text-muted-foreground
- 数値表示: font-mono tabular-nums
```

---

### Phase R4: ダッシュボード再設計 — 3-4日

**目的**: ログイン後すぐに価値が伝わるダッシュボードへ

#### R4-A: 空状態の改善

**現行**: 英語テキスト "No Portfolio Set" + "Go to Settings"
**新規**:
```
┌──────────────────────────────────────────┐
│                                          │
│     [Upload icon - Lucide]               │
│                                          │
│     ポートフォリオを始めましょう           │
│                                          │
│     証券口座のCSVをインポートするか、      │
│     銘柄を手動で追加できます。             │
│                                          │
│     [CSVインポート]  [手動で追加]          │
│                                          │
└──────────────────────────────────────────┘
```

- 明確なCTA 2つ（CSVインポート → `/data-import`, 手動追加 → `/settings`）
- 全テキスト日本語
- ガイド的なイラスト/アイコンでフレンドリーに（絵文字ではなくLucideアイコン）

#### R4-B: ダッシュボードレイアウト最適化

**タケシが見たい順序**:
1. **総資産額** + **総損益**（最も目立つ位置、大きな数字）
2. **PFスコア**（信頼感のあるゲージ表示）
3. **資産配分チャート**（ドーナツ、シンプル配色）
4. **保有銘柄一覧**（ティッカー、数量、評価額、損益率）
5. **損益推移グラフ**（折れ線チャート）

**デザイン指針**:
- 数値はモノスペース（JetBrains Mono セルフホスト）、`tabular-nums`
- 損益: 緑/赤の明確なカラーコーディング（`text-success` / `text-danger`）
- カードの角丸統一: `rounded-xl` (12px)
- シャドウ統一: `shadow-sm` (控えめ、フラットデザイン寄り)
- 情報密度: タケシはデータが見たい → 余白過多を避ける

#### R4-C: ヘッダーのスリム化

**現行問題**: ログインカードがヘッダー内に肥大表示
**修正**:
- 未ログイン時: シンプルな「ログイン」ボタンのみ（ランディングページでフル表示）
- ログイン時: ユーザーアバター + 通貨切替 + 更新ボタン（コンパクト）
- `DataStatusBar` の必要性を再検討（情報過多の原因）

---

### Phase R5: 機能の取捨選択 — 2-3日

**目的**: ペルソナに不要な機能を整理し、コア機能を磨く

#### R5-A: 機能重要度マトリクス

**コア機能（必須・磨く）**:
| 機能 | 現状 | 改善ポイント |
|------|------|------------|
| CSVインポート | 動作する | エラーメッセージの日本語化 |
| ダッシュボード | 動作する | レイアウト・空状態改善(R4) |
| 損益表示 | 動作する | 数値フォーマット統一 |
| PFスコア | 動作する | ゲージUIの改善 |
| 通貨切替 | 動作する | トグルUIの改善 |

**補助機能（維持・軽量化）**:
| 機能 | 現状 | 改善ポイント |
|------|------|------------|
| AIプロンプト生成 | 動作する | UI簡素化、絵文字除去 |
| リバランスシミュレーション | 動作する | alert()→Toast, confirm()→Dialog |
| Google Driveバックアップ | 動作する | ステータス表示の改善 |
| データエクスポート | 動作する | UI統一 |

**検討対象（存在意義を再評価）**:
| 機能 | 判断 | 理由 |
|------|------|------|
| ソーシャルPF共有 | 維持（簡素化） | 口コミ効果あり |
| 同年代比較 | 維持（簡素化） | 差別化要素 |
| リファラルプログラム | 維持 | グロース施策 |
| 目標設定 | 維持 | エンゲージメント |
| NPS調査 | 維持 | フィードバック収集 |
| 通知設定 | 簡素化 | 過度に複雑 |
| スクリーンショット分析 | 簡素化 | UIが複雑すぎる |
| YAML変換 | 簡素化 | ニッチすぎる |
| 月次レポート | 維持 | Standard差別化 |

#### R5-B: ナビゲーション再構成

**現行タブ（5つ）**:
```
Dashboard | AI投資戦略 | 投資配分 | Settings | データ取り込み
```

**新規タブ（4つ、日本語統一、簡潔）**:
```
[BarChart3] ダッシュボード | [Calculator] シミュレーション | [Bot] AI分析 | [Settings] 設定
```

変更点:
- 5タブ → 4タブに集約（認知負荷低減）
- 「データ取り込み」を「設定」内のサブタブに統合（使用頻度が低い）
- ラベルは短く（4文字以内目標）
- 全て日本語

---

### Phase R6: Landing Page 再設計 — 2-3日

**目的**: 収益化に直結するコンバージョン最適化

#### R6-A: ヒーローセクション

**現行の問題**:
- ログインカードがヒーロー内に大きく表示され、プロダクトの価値提案を阻害
- 「ログインしてください」「Google Driveへのアクセス許可が必要です」は不安を与える
- CTA前に権限説明をしすぎ

**改善方針**:
```
┌──────────────────────────────────────────┐
│                                          │
│  分散投資の全体像が、                     │
│  ひとつの画面で完結                       │
│                                          │
│  CSVインポートで保有銘柄を取り込むだけ。   │
│  損益ダッシュボード・PFスコア・AI分析      │
│  であなたの投資判断をサポート。            │
│                                          │
│  [無料で始める]  ← primary CTA            │
│                                          │
│  クレジットカード不要                     │
│                                          │
│  [プロダクトのスクリーンショット/モック]    │
│                                          │
└──────────────────────────────────────────┘
```

- ログインカードをヒーローから分離
- 「無料で始める」ボタン → クリックでログインモーダル or ダッシュボードへ
- Google Drive権限説明はログインフロー内で表示（Landing不要）
- プロダクトの実際の画面キャプチャを掲載（信頼感）

#### R6-B: 社会的証明（将来）
- ユーザー数表示（実数が出たら）
- 実際のPFスコア画面のデモ

#### R6-C: Pricing セクション
- 現行のPricing表示は比較的良好
- Free ↔ Standard の差をより明確に（Free制限の具体的な数値）
- CTA「無料で始める」の文言統一

---

### Phase R7: テスト品質向上 — 2-3日

**目的**: 「動くボタン」を保証するテスト戦略

#### R7-A: インタラクションテスト

Phase R1で修正した全要素に対するテスト:
- Dialog表示 → 確認 → アクション実行のフローテスト
- Toast通知の表示テスト
- React Router遷移テスト

#### R7-B: E2Eテスト強化（Playwright）

**コアフロー**:
1. Landing → ログイン → ダッシュボード表示
2. CSVインポート → 銘柄反映 → ダッシュボード更新
3. 設定変更 → 反映確認
4. シミュレーション実行 → 結果表示
5. AIプロンプト生成 → コピー

#### R7-C: ビジュアルリグレッション

- Playwright スクリーンショット比較
- 主要画面の定期スナップショット
- ダーク/ライトモード両方

---

## 3. 実行スケジュール

```
Phase R1: 基盤品質修正        [1-2日] ← 最優先
Phase R2: デザイン浄化        [2-3日]
Phase R3: デザイントークン     [1-2日]
Phase R4: ダッシュボード再設計 [3-4日]
Phase R5: 機能取捨選択        [2-3日]
Phase R6: Landing再設計       [2-3日]
Phase R7: テスト品質向上       [2-3日]
                              ─────────
                              合計: 12-20日
```

**依存関係**:
```
R1 → R2 → R3 → R4
              ↘ R5
                 ↘ R6
R1 → R7（R1完了後いつでも開始可）
```

---

## 4. 成功指標

| 指標 | 現行 | 目標 |
|------|------|------|
| ブラウザネイティブダイアログ | 7箇所以上 | 0 |
| 絵文字使用箇所 | 38箇所 | 0 |
| EN/JP混在箇所 | 50箇所以上 | 0 |
| ハードコード色値 | 35箇所以上 | 0 |
| コンソールエラー（本番） | 4件 | 0 |
| ページロード速度 | 未計測 | FCP < 1.5s |
| ユニットテストカバレッジ | 81% | 85%以上 |
| E2Eテストスペック | 17 | 25以上 |

---

## 5. デザイン原則（タケシ向け）

### DO
- **数値を大きく、正確に** — タケシはデータが見たい
- **モノスペースフォントで金額表示** — 桁が揃う安心感
- **控えめなカラー** — Blue/Grey基調、緑赤は損益のみ
- **フラットデザイン** — 過度なシャドウ・グラデーション不要
- **情報密度** — 1画面に多くの情報を簡潔に
- **即座のフィードバック** — 操作→結果が0.3秒以内

### DON'T
- **絵文字をUIに使わない** — プロフェッショナルなアイコンのみ
- **英語をUIに混ぜない** — 日本語市場特化
- **alert()/confirm()を使わない** — in-app コンポーネントのみ
- **過度な装飾** — タケシはギミックを嫌う
- **情報の隠蔽** — 折りたたみより一覧表示を優先
- **ローディングの放置** — スケルトンUIで常に構造を見せる

---

## 6. 技術原則

### コンポーネント設計
- shadcn/ui を基本部品とする（Dialog, AlertDialog, Toast, Button, Card, Input, Tabs）
- Lucide React でアイコン統一
- カスタムコンポーネントは最小限
- Recharts のテーマカラーはCSS変数経由

### 状態管理
- Zustand: クライアント状態（auth, portfolio, ui, subscription）
- TanStack Query: サーバー状態（市場データ, API通信）
- persist middleware: テーマのみ（portfolioは Google Drive / API）

### パフォーマンス
- Route-based code splitting（React.lazy）
- 画像最適化（WebP, lazy loading）
- Font subsetting（JetBrains Mono は数字+記号のみ）

---

## 付録: 問題箇所の詳細リスト

### A. alert()/confirm() 使用箇所
```
pages/Simulation.tsx:38          window.confirm()
pages/Simulation.tsx:40          alert()
components/simulation/SimulationResult.tsx:89   window.confirm()
components/simulation/SimulationResult.tsx:102  window.confirm()
components/settings/LocalStorageDiagnostics.tsx  window.confirm()
components/settings/HoldingsEditor.tsx           window.confirm()
components/social/ShareLinkDisplay.tsx            window.confirm()
```

### B. 絵文字使用箇所（主要）
```
pages/Settings.tsx:39,44                    📊, 🤖
pages/DataImport.tsx:40,48,56              📄, 📁, 💾
pages/AIAdvisor.tsx:155,161,167,354,370    📊, 📈, 📋, 🤖, ✨
components/ai/PromptOrchestrator.tsx:126,191,289  🎯, 💡
components/ai/ScreenshotAnalyzer.tsx:96,182,204   📄, ✅, 💡
components/common/DataSourceBadge.tsx:30,36,48,54,60,81  📊, 📈, ⚠️, 💾, ℹ️
components/ai/ExternalAILinks.tsx:34        🎯
components/settings/MarketSelectionWizard.tsx:73  📊
```

### C. 英語テキスト残存（主要）
```
components/ai/ScreenshotAnalyzer.tsx     12箇所 (Clear, Privacy Protection, etc.)
components/ai/PromptOrchestrator.tsx      10箇所 (Prompt Orchestrator, How to Use, etc.)
pages/DataImport.tsx                      15箇所 (JSON Import, Data Export, etc.)
pages/AIAdvisor.tsx                       8箇所 (AI Advisor, Initial Setup, etc.)
pages/Settings.tsx                        5箇所 (Portfolio Settings, etc.)
components/ui/progress.tsx               1箇所 (Progress)
```

### D. ハードコード色値（主要）
```
components/dashboard/PortfolioCharts.tsx:64-66   15色のHEXアレイ
components/dashboard/DifferenceChart.tsx:124     #4CAF50, #F44336
components/social/PeerComparisonPanel.tsx:20-21  10色のHEXアレイ
pages/SharedPortfolio.tsx:24-26                  10色のHEXアレイ
components/ui/progress.tsx:96-99                 4色のHEX値
pages/AIAdvisor.tsx:450-451                      インラインstyleグラデーション
```
