# バグ報告: 基本機能の不具合（3件）

**報告日**: 2026-03-07
**ステータス**: 原因特定済み → 修正待ち

---

## Bug 1: YAMLプロンプト生成ボタンでプロンプトがコピーされない

### 症状
「YAMLプロンプトを生成」ボタンを押しても、AIに読み込ませるためのプロンプトがクリップボードにコピーされない。

### 根本原因（致命的）
**`PortfolioYamlConverter.tsx` が存在しないプロパティを参照している**

1. `portfolio` → `usePortfolioContext` に存在しない（正しくは `currentAssets`）
2. `updatePortfolioFromImport` → `usePortfolioContext` に存在しない
3. `portfolio` が `undefined` のため、`portfolio.map()` が TypeError を投げ、YAML生成自体が失敗
4. `handleGenerateYaml` はクリップボードコピーを実行しない（生成のみ）

### 該当コード
- `frontend/webapp/src/components/settings/PortfolioYamlConverter.tsx:20-25`
  ```tsx
  const {
    portfolio,           // ← undefined（currentAssets が正しい）
    targetPortfolio,
    updatePortfolioFromImport,  // ← undefined（存在しない関数）
    totalAssets,
    baseCurrency
  } = usePortfolioContext();
  ```
- `generateYamlPrompt` 内で `portfolio.map()` を呼び出し → TypeError

### 修正方法
1. `portfolio` → `currentAssets` に変更
2. `updatePortfolioFromImport` → `importData` に変更（既存の関数）
3. `handleGenerateYaml` で生成後に自動コピーを実行

---

## Bug 2: 銘柄の数量変更が他の銘柄もリセットする

### 症状
1つの銘柄の保有数量を変更すると、他の銘柄の保有数量もリセットされる。

### 根本原因
**`HoldingCard.tsx` の `editValue` ローカルステートが編集モード開始時に同期されていない**

1. `editValue` は `useState(asset.holdings.toString())` で初期化（マウント時の値）
2. ユーザーが +1/-1 ボタンで数量変更 → store の `asset.holdings` は更新される
3. しかし `editValue` は初期値のまま更新されない（React の useState は初回のみ）
4. ユーザーが「編集」ボタンをクリック → `editValue`（古い値）が表示される
5. 保存すると古い値でストアが更新される → **数量がリセットされる**

### 該当コード
- `frontend/webapp/src/components/settings/HoldingCard.tsx:19`
  ```tsx
  const [editValue, setEditValue] = useState(asset.holdings.toString());
  ```
- `HoldingCard.tsx:183` 編集モード開始時に editValue を更新しない
  ```tsx
  onClick={() => setIsEditing(true)}  // editValue を同期していない！
  ```

### 修正方法
編集モード開始時に `editValue` を現在の `asset.holdings` で同期する。

---

## Bug 3: 銘柄追加の反応が悪い

### 症状
銘柄を追加しても反応が悪い、UIが重い。

### 根本原因
**`usePortfolioContext` フックが Zustand ストア全体をサブスクライブしている**

1. `usePortfolioStore()` をセレクタなしで呼び出し
2. ストアのどのプロパティが変更されてもALL消費コンポーネントが再レンダリング
3. 20以上のコンポーネントが `usePortfolioContext` を使用
4. 銘柄追加時に複数のAPI呼び出し + loading状態変更が発生
5. 各状態変更で全コンポーネントがカスケード的に再レンダリング

### 該当コード
- `frontend/webapp/src/hooks/usePortfolioContext.ts:12`
  ```tsx
  const portfolio = usePortfolioStore();  // セレクタなし → 全サブスクリプション
  ```

### 修正方法（段階的）
- 即時対応: `HoldingCard` を `React.memo` でラップして不要な再レンダリングを防止
- 将来的: `usePortfolioContext` をセレクタベースに分割
