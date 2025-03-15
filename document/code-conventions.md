# ポートフォリオマネージャー コード規約書

**バージョン:** 1.0  
**最終更新日:** 2025/03/16

## 1. 概要

このドキュメントは、ポートフォリオマネージャーアプリケーションの開発に関する一貫したコーディング規約を定義します。すべての貢献者は、コードの品質、一貫性、保守性を確保するためにこれらの規約に従うものとします。

## 2. ファイル構造とプロジェクト編成

### 2.1 ディレクトリ構造

```
src/
├── components/      # UIコンポーネント
│   ├── auth/        # 認証関連コンポーネント 
│   ├── common/      # 共通UIコンポーネント
│   ├── dashboard/   # ダッシュボード画面コンポーネント
│   ├── data/        # データ連携コンポーネント
│   ├── layout/      # レイアウト関連コンポーネント
│   ├── settings/    # 設定画面コンポーネント
│   └── simulation/  # シミュレーション画面コンポーネント
├── context/         # React Context定義
├── hooks/           # カスタムReact Hooks
├── pages/           # ページコンポーネント
├── services/        # APIサービスとデータ処理
├── utils/           # ユーティリティ関数
└── App.jsx          # アプリケーションルート
```

### 2.2 ファイル命名規則

- **コンポーネントファイル**: PascalCase を使用（例: `PortfolioSummary.jsx`）
- **ユーティリティファイル**: camelCase を使用（例: `formatters.js`）
- **テストファイル**: `.test.js` または `.spec.js` を追加（例: `PortfolioSummary.test.jsx`）
- **CSS/SCSS**: コンポーネントと同じ名前で `.module.css` サフィックス（例: `Button.module.css`）

### 2.3 コンポーネント分類と配置

1. **ページコンポーネント**: `/pages` ディレクトリに配置
2. **機能コンポーネント**: 目的に応じたサブディレクトリに配置
3. **共通コンポーネント**: `/components/common` に配置
4. **レイアウトコンポーネント**: `/components/layout` に配置

## 3. 命名規則

### 3.1 JSX コンポーネント

- **コンポーネント名**: PascalCase を使用
  ```jsx
  // 良い例
  function UserProfile() {...}
  const PortfolioChart = () => {...}
  
  // 悪い例
  function userProfile() {...}
  const portfolioChart = () => {...}
  ```

### 3.2 変数・関数名

- **変数・関数名**: camelCase を使用
  ```javascript
  // 良い例
  const userData = {...}
  function calculateTotal() {...}
  
  // 悪い例
  const UserData = {...}
  function CalculateTotal() {...}
  ```

- **boolean変数**: `is`, `has`, `should` などのプレフィックスを使用
  ```javascript
  // 良い例
  const isLoading = true;
  const hasError = false;
  const shouldRefresh = true;
  
  // 悪い例
  const loading = true;
  const error = false;
  ```

### 3.3 定数

- **定数**: 大文字のSNAKE_CASEを使用
  ```javascript
  // 良い例
  const MAX_RETRY_COUNT = 3;
  const DEFAULT_CURRENCY = 'JPY';
  
  // 悪い例
  const maxRetryCount = 3;
  const defaultCurrency = 'JPY';
  ```

### 3.4 Context & Hooks

- **Context**: `XxxContext` の形式を使用
  ```javascript
  // 良い例
  const PortfolioContext = createContext();
  const AuthContext = createContext();
  ```

- **カスタムHooks**: `use` プレフィックスを使用
  ```javascript
  // 良い例
  function usePortfolioContext() {...}
  function useFormValidation() {...}
  
  // 悪い例
  function portfolioContextHook() {...}
  function getFormValidation() {...}
  ```

### 3.5 イベントハンドラ

- **イベントハンドラ関数**: `handle` プレフィックスを使用
  ```javascript
  // 良い例
  const handleSubmit = () => {...}
  const handleInputChange = (e) => {...}
  
  // 悪い例
  const submitForm = () => {...}
  const changeInput = (e) => {...}
  ```

## 4. コードフォーマット

### 4.1 基本ルール

- **インデント**: 2スペースを使用
- **行の長さ**: 最大100文字（例外：URLs、長い文字列）
- **セミコロン**: すべての文の末尾にセミコロンを使用
- **括弧のスタイル**: 開始括弧は同じ行に配置
  ```javascript
  // 良い例
  function example() {
    if (condition) {
      // ...
    }
  }
  
  // 悪い例
  function example() 
  {
    if (condition) 
    {
      // ...
    }
  }
  ```

### 4.2 JSX フォーマット

- **要素の属性が多い場合**: 複数行に分割
  ```jsx
  // 良い例 (少数の属性)
  <Button type="primary" onClick={handleClick}>提出</Button>
  
  // 良い例 (多数の属性)
  <Button
    type="primary"
    onClick={handleClick}
    disabled={isSubmitting}
    className="submit-button"
    data-testid="submit-button"
  >
    提出
  </Button>
  ```

- **子要素の複雑性に応じたフォーマット**:
  ```jsx
  // 単純な子要素
  <Parent>
    <Child />
  </Parent>
  
  // 複雑な子要素
  <Parent>
    <Child>
      <GrandChild>
        <Content />
      </GrandChild>
    </Child>
  </Parent>
  ```

### 4.3 インポート文の整理

- **インポートの順序**:
  1. React関連（React, React Router）
  2. サードパーティライブラリ
  3. プロジェクト内モジュール（相対パス）
  4. スタイル・アセット

  ```javascript
  // 良い例
  import React, { useState, useEffect } from 'react';
  import { useParams } from 'react-router-dom';
  
  import axios from 'axios';
  import { formatCurrency } from 'accounting';
  
  import { usePortfolioContext } from '../../hooks/usePortfolioContext';
  import Header from '../layout/Header';
  
  import './styles.css';
  ```

- **インポート間のグループ分け**: 1行の空行でグループを分ける

### 4.4 コメントスタイル

- **単一行コメント**: `//` を使用し、コメントの前に空白を1つ入れる
  ```javascript
  // これは単一行コメントです
  const value = 42;
  ```

- **複数行コメント**: `/* */` を使用
  ```javascript
  /*
   * これは複数行コメントです
   * 複数の行にわたってコードを説明します
   */
  ```

## 5. React固有の規則

### 5.1 コンポーネント定義

- **関数コンポーネント**: アロー関数よりも関数宣言を優先
  ```jsx
  // 推奨
  function MyComponent() {
    return <div>...</div>;
  }
  
  // 許容可能
  const MyComponent = () => {
    return <div>...</div>;
  };
  
  // 避けるべき
  const MyComponent = function() {
    return <div>...</div>;
  };
  ```

- **Props分割代入**: コンポーネント内で使用
  ```jsx
  // 良い例
  function UserCard({ name, email, avatar }) {
    return (
      <div>
        <img src={avatar} alt={name} />
        <h2>{name}</h2>
        <p>{email}</p>
      </div>
    );
  }
  
  // 悪い例
  function UserCard(props) {
    return (
      <div>
        <img src={props.avatar} alt={props.name} />
        <h2>{props.name}</h2>
        <p>{props.email}</p>
      </div>
    );
  }
  ```

### 5.2 Hooks の使用

- **Hooks呼び出し順序**: コンポーネントのトップレベルでのみ使用
- **依存配列**: 明示的に全ての依存関係を記述
  ```jsx
  // 良い例
  useEffect(() => {
    fetchData(userId);
  }, [userId, fetchData]);
  
  // 悪い例
  useEffect(() => {
    fetchData(userId);
  }, []); // 依存関係が欠けている
  ```

- **カスタムHooks抽出**: 複雑なロジックは独自Hooksに抽出
  ```jsx
  // 良い例 - カスタムHook
  function useFormInput(initialValue) {
    const [value, setValue] = useState(initialValue);
    const handleChange = e => setValue(e.target.value);
    return { value, onChange: handleChange };
  }
  
  // 使用例
  function Form() {
    const nameInput = useFormInput('');
    const emailInput = useFormInput('');
    // ...
  }
  ```

### 5.3 条件付きレンダリング

- **三項演算子**: シンプルな条件で使用
  ```jsx
  // 良い例
  return isLoading ? <Spinner /> : <Content />;
  ```

- **AND演算子**: 条件が単一のとき使用
  ```jsx
  // 良い例
  return hasData && <DataList data={data} />;
  ```

- **複雑な条件**: 変数に代入または関数に抽出
  ```jsx
  // 良い例
  const renderContent = () => {
    if (isLoading) return <Spinner />;
    if (hasError) return <ErrorMessage error={error} />;
    if (!data) return <EmptyState />;
    return <DataList data={data} />;
  };
  
  return <div>{renderContent()}</div>;
  ```

## 6. 状態管理

### 6.1 Context API の使用

- **コンテキスト分離**: 関連する状態ごとに別々のコンテキスト
  ```jsx
  // 良い例
  const AuthContext = createContext();
  const PortfolioContext = createContext();
  
  // 悪い例
  const GlobalContext = createContext(); // すべての状態を一つのコンテキストに
  ```

- **Provider のカプセル化**: 専用のProviderコンポーネントを作成
  ```jsx
  export const AuthProvider = ({ children }) => {
    // 状態と関数の定義
    return (
      <AuthContext.Provider value={...}>
        {children}
      </AuthContext.Provider>
    );
  };
  ```

### 6.2 状態更新関数

- **イミュータブルな更新**: 常に新しいオブジェクトを返す
  ```javascript
  // 良い例
  setUsers(prevUsers => [...prevUsers, newUser]);
  setUser(prevUser => ({ ...prevUser, name: newName }));
  
  // 悪い例
  const newUsers = users;
  newUsers.push(newUser);
  setUsers(newUsers);
  ```

- **更新関数を適切に命名**: `update`, `set`, `reset` などプレフィックスを使用
  ```javascript
  // 良い例
  const updateUserProfile = (newData) => {...}
  const resetForm = () => {...}
  ```

## 7. エラー処理

### 7.1 エラーキャッチと表示

- **try/catch**: 非同期処理では常に使用
  ```javascript
  // 良い例
  const fetchData = async () => {
    try {
      const response = await api.getData();
      return response.data;
    } catch (error) {
      console.error("Data fetch failed:", error);
      addNotification(`データの取得に失敗しました: ${error.message}`, 'error');
      return null;
    }
  };
  ```

- **フォールバックとエラーメッセージ**: ユーザーフレンドリーなエラー対応
  ```javascript
  // 良い例
  if (!data) {
    return <ErrorState message="データが読み込めませんでした。再試行してください。" />;
  }
  ```

### 7.2 入力バリデーション

- **早期リターン**: エラーケースを最初に処理
  ```javascript
  // 良い例
  const submitForm = (data) => {
    if (!data.email) {
      setError('メールアドレスは必須です');
      return;
    }
    
    if (!isValidEmail(data.email)) {
      setError('有効なメールアドレスを入力してください');
      return;
    }
    
    // 正常処理を続行
    submitData(data);
  };
  ```

## 8. パフォーマンス最適化

### 8.1 レンダリング最適化

- **メモ化**: 高価な計算や再レンダリングの最適化に使用
  ```jsx
  // 高価な計算をメモ化
  const filteredData = useMemo(() => {
    return data.filter(item => item.value > threshold);
  }, [data, threshold]);
  
  // コールバック関数をメモ化
  const handleClick = useCallback(() => {
    doSomethingWith(prop1, prop2);
  }, [prop1, prop2]);
  
  // コンポーネントのメモ化
  const MemoizedComponent = React.memo(MyComponent);
  ```

- **不要なレンダリング回避**: 状態更新を適切に管理
  ```jsx
  // 良い例 - ディープ比較を避ける
  const [user, setUser] = useState({ name: '', email: '' });
  
  // 個別の状態として管理
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  ```

### 8.2 リスト要素

- **key属性**: 安定した一意のIDを使用
  ```jsx
  // 良い例
  {items.map(item => (
    <ListItem key={item.id} data={item} />
  ))}
  
  // 悪い例 - インデックスをkeyとして使用
  {items.map((item, index) => (
    <ListItem key={index} data={item} />
  ))}
  ```

## 9. ドキュメンテーション

### 9.1 コードコメント

- **機能説明**: 複雑なロジックには説明を追加
  ```javascript
  // シミュレーション購入株数を計算
  // 追加予算、目標配分、現在保有量から最適な購入数を決定
  function calculatePurchaseUnits() {
    // ...実装...
  }
  ```

- **TODO コメント**: フォーマットを統一し担当者を明記
  ```javascript
  // TODO(username): パフォーマンス最適化が必要 - 2025/03/15
  ```

### 9.2 JSDoc

- **関数ドキュメント**: 重要な関数にはJSDocを使用
  ```javascript
  /**
   * 投資シミュレーションを計算し、最適な購入配分を返す
   * @param {number} budget - 追加投資予算
   * @param {Array<Object>} currentAssets - 現在の保有資産
   * @param {Array<Object>} targetAllocation - 目標配分
   * @returns {Array<Object>} 購入推奨
   */
  function calculateSimulation(budget, currentAssets, targetAllocation) {
    // ...実装...
  }
  ```

- **型定義**: パラメータと戻り値の型を明記

## 10. テスト規約

### 10.1 テストファイル構成

- **テストファイルの配置**: テスト対象と同じディレクトリに配置
  ```
  components/
  ├── Button.jsx
  └── Button.test.jsx
  ```

- **テスト記述構造**: describe-it パターンを使用
  ```javascript
  describe('Button Component', () => {
    it('renders correctly with default props', () => {
      // ...テスト実装...
    });
    
    it('calls onClick handler when clicked', () => {
      // ...テスト実装...
    });
  });
  ```

### 10.2 テスト命名

- **テスト名**: 期待する動作を記述
  ```javascript
  // 良い例
  it('displays error message when API call fails', () => {
    // ...テスト実装...
  });
  
  // 悪い例
  it('test API error', () => {
    // ...テスト実装...
  });
  ```

## 11. アクセシビリティ

### 11.1 基本原則

- **意味的なHTML**: 適切なHTML要素を使用
  ```jsx
  // 良い例
  <button onClick={handleClick}>送信</button>
  
  // 悪い例
  <div onClick={handleClick}>送信</div>
  ```

- **ARIA属性**: 必要に応じて使用
  ```jsx
  <button 
    aria-label="閉じる"
    aria-expanded={isOpen}
    onClick={toggleMenu}
  >
    <Icon name="close" />
  </button>
  ```

### 11.2 フォームアクセシビリティ

- **ラベル関連付け**: フォーム要素にはlabelを関連付け
  ```jsx
  // 良い例
  <div>
    <label htmlFor="email">メールアドレス</label>
    <input id="email" type="email" />
  </div>
  
  // 悪い例
  <div>
    <span>メールアドレス</span>
    <input type="email" />
  </div>
  ```

- **エラーメッセージ**: aria-invalid と aria-describedby を使用
  ```jsx
  <div>
    <label htmlFor="email">メールアドレス</label>
    <input 
      id="email" 
      type="email"
      aria-invalid={hasError}
      aria-describedby="email-error"
    />
    {hasError && (
      <div id="email-error" className="error">
        有効なメールアドレスを入力してください
      </div>
    )}
  </div>
  ```

## 12. セキュリティ

### 12.1 安全なデータ処理

- **インジェクション防止**: ユーザー入力はエスケープまたは検証
- **機密情報**: トークンなどをコードにハードコーディングしない
  ```javascript
  // 良い例
  const apiKey = process.env.REACT_APP_API_KEY;
  
  // 悪い例
  const apiKey = "1234567890abcdef";
  ```

### 12.2 認証処理

- **トークン管理**: 有効期限チェックと適切な保存場所
  ```javascript
  // トークン検証例
  const isTokenValid = (token) => {
    if (!token) return false;
    
    try {
      const decoded = jwtDecode(token);
      return decoded.exp > Date.now() / 1000;
    } catch (error) {
      return false;
    }
  };
  ```

## 付録: Linting & フォーマット設定

### ESLint 設定（推奨）

```json
{
  "extends": [
    "react-app",
    "react-app/jest",
    "plugin:jsx-a11y/recommended"
  ],
  "plugins": ["jsx-a11y"],
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "no-unused-vars": "warn",
    "react/prop-types": "warn",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### Prettier 設定（推奨）

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "jsxBracketSameLine": false,
  "arrowParens": "avoid"
}
```

## 改訂履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|----------|-----|---------|-------|
| 1.0      | 2025/03/16 | 初版作成 | |
