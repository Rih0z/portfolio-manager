# コード規約書: portfolio-market-data-api

## 1. 基本情報

### 1.1 目的と適用範囲
本規約は、portfolio-market-data-api プロジェクトのコードの一貫性、可読性、保守性を確保するために作成されました。すべての新規コードと既存コードの修正に適用されます。

### 1.1.1 著者情報
- **著者**: Koki Riho (https://github.com/Rih0z)
- **貢献者**: Portfolio Manager Team

### 1.2 使用言語とバージョン
- **言語**: JavaScript (Node.js)
- **Node.js バージョン**: 14.x 以上
- **コードモード**: 'use strict' モード
- **モジュール形式**: CommonJS (require/module.exports)
- **AWS SDK バージョン**: v3 推奨 (移行中のコードベース)

### 1.3 参照すべき外部規約や標準
- [JavaScript Standard Style](https://standardjs.com/) - ベースとなる指針として参照
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) - より詳細な規約の参考として

## 2. ファイルヘッダー情報

すべてのソースファイルには以下の形式のヘッダーコメントを含めてください：

```javascript
/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/path/to/file.js
 * 
 * 説明: 
 * ファイルの目的と機能の簡潔な説明。
 * 複数行になる場合は適切に改行してください。
 * 
 * @author Portfolio Manager Team
 * @created YYYY-MM-DD
 * @updated YYYY-MM-DD - 更新内容の簡単な説明
 */
```

必要に応じて、更新履歴を追加できます：

```javascript
 * @updated YYYY-MM-DD - 名前 - 変更内容の簡単な説明
```

## 3. 書式とスタイル

### 3.1 インデント
- 2スペースを使用します
- タブ文字は使用しないでください

```javascript
// 良い例
function example() {
  if (condition) {
    doSomething();
  }
}

// 悪い例
function example() {
    if (condition) {
        doSomething();
    }
}
```

### 3.2 行の長さ
- 最大100文字を目安とします
- それを超える場合は適切に改行してください

```javascript
// 良い例
const longFunction = function(
  parameterOne,
  parameterTwo,
  parameterThree
) {
  // 処理内容
};

// 悪い例
const longFunction = function(parameterOne, parameterTwo, parameterThree, parameterFour, parameterFive) {
  // 処理内容
};
```

### 3.3 空行の使用
- 論理的なコードブロックの間に1行の空行を入れてください
- ファイル先頭の'use strict'宣言後に1行の空行を入れてください
- メソッド/関数の間には1行の空行を入れてください
- 関連するコード群はグループ化し、別のグループとの間に空行を入れてください

```javascript
'use strict';

const util = require('util');
const aws = require('aws-sdk');

// Constants
const TIMEOUT = 5000;
const MAX_RETRIES = 3;

// 機能実装
function mainFunction() {
  // ...
}

function helperFunction() {
  // ...
}
```

### 3.4 括弧の配置
- K&R スタイルを使用します（開始括弧は同じ行に配置）

```javascript
// 良い例
if (condition) {
  doSomething();
} else {
  doSomethingElse();
}

// 悪い例
if (condition)
{
  doSomething();
}
else
{
  doSomethingElse();
}
```

### 3.5 スペースの使用
- 演算子の前後にスペースを入れてください
- カンマの後にスペースを入れてください
- コロンの後にスペースを入れてください（オブジェクトリテラル内）
- 関数呼び出しの括弧の前にはスペースを入れないでください
- 制御文の括弧の前にはスペースを入れてください

```javascript
// 良い例
const x = a + b;
const arr = [1, 2, 3];
const obj = { key: value };
doSomething(param);
if (condition) {
  // ...
}

// 悪い例
const x=a+b;
const arr=[1,2,3];
const obj={key:value};
doSomething (param);
if(condition){
  // ...
}
```

### 3.6 文字列
- 基本的にシングルクォート（'）を使用してください
- テンプレートリテラルを使用する場合はバッククォート（`）を使用してください

```javascript
// 良い例
const name = 'John';
const greeting = `Hello, ${name}!`;

// 悪い例
const name = "John";
```

### 3.7 セミコロン
- すべてのステートメントの末尾にセミコロンを使用してください

```javascript
// 良い例
const value = 42;
doSomething();

// 悪い例
const value = 42
doSomething()
```

## 4. 命名規則

### 4.1 変数
- **ローカル変数**: camelCase
  ```javascript
  const connectionString = 'example';
  let itemCount = 0;
  ```

- **プライベート変数**: 先頭にアンダースコアを付けたcamelCase
  ```javascript
  const _privateVariable = 'internal use only';
  ```

### 4.2 関数/メソッド
- camelCase を使用してください
- 動詞または動詞句から始めてください
  ```javascript
  function calculateTotal() { /* ... */ }
  const getUserData = async () => { /* ... */ };
  ```

- boolean を返す関数は is, has, should などから始めてください
  ```javascript
  function isValidInput(input) { /* ... */ }
  function hasPermission(user, resource) { /* ... */ }
  ```

### 4.3 クラス/オブジェクト
- PascalCase を使用してください
  ```javascript
  class DataService { /* ... */ }
  ```

### 4.4 定数
- UPPER_SNAKE_CASE を使用してください
  ```javascript
  const MAX_RETRY_COUNT = 3;
  const DEFAULT_TIMEOUT = 5000;
  ```

### 4.5 ファイル名
- camelCase を使用してください
- 拡張子は .js を使用してください
- ファイル名は内容を表す名詞にしてください
  ```
  dataFetchUtils.js
  responseFormatter.js
  cacheService.js
  ```

### 4.6 避けるべき命名パターン
- 意味のない短い変数名（`a`, `b`, `x`, `y` など）は避けてください
- センシティブな情報を連想させる変数名（`password`, `secret` など）は避けてください
- `temp`, `tmp` などの一時的な変数名は避けてください
- 日本語のローマ字表記の変数名は避けてください

## 5. コード構造

### 5.1 ファイル構成
- 1ファイルあたり最大500行を目安としてください
- 1ファイルは1つの責務に集中してください（単一責任の原則）
- ファイル構成は以下の順序を推奨します：
  1. 'use strict' 宣言
  2. モジュールインポート
  3. 定数定義
  4. ユーティリティ関数
  5. メイン機能の実装
  6. モジュールエクスポート

```javascript
'use strict';

// インポート
const aws = require('aws-sdk');
const { withRetry } = require('../utils/retry');

// 定数
const MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 5000;

// ユーティリティ関数
function parseResponse(response) {
  // ...
}

// メイン機能
async function getDataFromApi() {
  // ...
}

// エクスポート
module.exports = {
  getDataFromApi
};
```

### 5.2 関数/メソッドの設計
- 1関数あたり最大50行を目安としてください
- 単一責任の原則に従ってください
- 複雑な処理は小さな関数に分割してください
- 関数は1レベルのインデントを超えないように設計してください（理想的には）

```javascript
// 良い例: 小さな関数に分割
function processData(data) {
  const validated = validateData(data);
  const transformed = transformData(validated);
  return formatResult(transformed);
}

function validateData(data) { /* ... */ }
function transformData(data) { /* ... */ }
function formatResult(data) { /* ... */ }

// 悪い例: 単一の大きな関数
function processData(data) {
  // 検証ロジック（20行）
  // ...

  // 変換ロジック（30行）
  // ...

  // フォーマットロジック（20行）
  // ...

  return result;
}
```

### 5.3 モジュール構成
- 以下のディレクトリ構造に従います：
  - `src/config/`: アプリケーションの設定
  - `src/function/`または`src/functions/`: API エンドポイントのハンドラー関数（注: 現状では両方の形式が混在しています）
  - `src/services/`: ビジネスロジックとデータアクセス
  - `src/services/sources/`: データソースアダプター
  - `src/utils/`: ユーティリティ関数

### 5.4 再利用可能なコードの抽出
- 複数の場所で使われる機能はユーティリティ関数として抽出してください
- 関連する機能はサービスにグループ化してください
- データソースに対するアクセスは専用のモジュールに分離してください

### 5.5 モジュール参照とインポート方法

#### 5.5.1 モジュール参照の推奨パターン
- モジュールは完全な参照として保持してください
- テストやスパイが必要なモジュールでは、特に脱構造化代入を避けてください

```javascript
// 推奨: モジュール全体の参照を保持
const responseUtils = require('../../utils/responseUtils');
responseUtils.formatResponse({ data });

// 非推奨: 脱構造化代入で関数を直接取り出す
const { formatResponse } = require('../../utils/responseUtils');
formatResponse({ data });
```

#### 5.5.2 脱構造化代入の適切な使用
脱構造化代入は以下の場合にのみ使用してください：

1. 外部から呼び出されない関数内部での一時的な利便性のため
2. テスト対象でないユーティリティ関数において
3. モジュール内部の参照が保持されている場合

```javascript
// 許容例: 内部関数での利便性のため
function internalFunction() {
  const { formatResponse, formatErrorResponse } = responseUtils;
  // 内部処理...
}

// 推奨: 外部に露出する関数ではモジュール参照を維持
module.exports.handler = async (event) => {
  // ...
  return responseUtils.formatResponse(data);
};
```

#### 5.5.3 依存性注入パターン
テストや拡張性を向上させるため、依存性注入パターンを検討してください：

```javascript
/**
 * 依存性注入パターンを使用したハンドラー
 * @param {Object} event - イベントオブジェクト
 * @param {Object} [deps] - 依存モジュール（テスト用）
 */
const handler = async (event, deps = {}) => {
  // デフォルトの依存関係
  const dependencies = {
    responseUtils: require('../../utils/responseUtils'),
    cookieParser: require('../../utils/cookieParser'),
    ...deps
  };
  
  // 依存関係を使用した実装
  // ...
};
```

## 6. プログラミング慣習

### 6.1 条件文と分岐
- 早期リターンパターンを使用してください
- ネストされた if 文は可能な限り避けてください
- 三項演算子は単純な条件にのみ使用してください

```javascript
// 良い例: 早期リターン
function processUser(user) {
  if (!user) {
    return null;
  }
  
  if (!user.isActive) {
    return { error: 'User is not active' };
  }
  
  // メイン処理
  return doSomethingWithUser(user);
}

// 悪い例: ネストされた条件
function processUser(user) {
  if (user) {
    if (user.isActive) {
      // メイン処理
      return doSomethingWithUser(user);
    } else {
      return { error: 'User is not active' };
    }
  } else {
    return null;
  }
}
```

### 6.2 ループの書き方
- 可能な限り、配列メソッド（map, filter, reduce, forEach）を使用してください
- 古典的な for ループは複雑なループにのみ使用してください

```javascript
// 良い例
const doubled = numbers.map(num => num * 2);
const evens = numbers.filter(num => num % 2 === 0);
const sum = numbers.reduce((total, num) => total + num, 0);

// 悪い例
const doubled = [];
for (let i = 0; i < numbers.length; i++) {
  doubled.push(numbers[i] * 2);
}
```

### 6.3 エラー処理と例外
- Promise を拒否するときはエラーオブジェクトを使用してください
- try-catch ブロックで適切にエラーをハンドリングしてください
- エラーは意味のあるメッセージで投げてください
- エラーのロギングは詳細に行ってください
- エラーハンドリングのレベルを適切に設定してください（末端のハンドラーでキャッチするか、呼び出し元に伝播させるか）

```javascript
// 良い例
try {
  const result = await riskyOperation();
  return formatSuccess(result);
} catch (error) {
  logger.error(`Operation failed: ${error.message}`, { error, context });
  
  // エラータイプによって異なる処理
  if (error.code === 'NETWORK_ERROR') {
    return formatErrorResponse(error, errorTypes.NETWORK_ERROR);
  } else {
    return formatErrorResponse(error, errorTypes.SERVER_ERROR);
  }
}

// 悪い例
try {
  const result = await riskyOperation();
  return formatSuccess(result);
} catch (error) {
  console.error('Error occurred');
  return { error: 'Something went wrong' };
}
```

### 6.4 非同期処理
- async/await パターンを使用してください
- Promise チェーンよりも async/await を優先してください
- Promise.all() を使って並列処理を最適化してください
- Promise.allSettled() を使って一部の失敗を許容する並列処理を実装してください

```javascript
// 良い例
async function processItems(items) {
  try {
    const results = await Promise.all(items.map(item => processItem(item)));
    return results;
  } catch (error) {
    logger.error('Failed to process items', error);
    throw error;
  }
}

// 一部の失敗を許容する例
async function processItemsWithPartialFailure(items) {
  const results = await Promise.allSettled(items.map(item => processItem(item)));
  
  const successes = results
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value);
  
  const failures = results
    .filter(result => result.status === 'rejected')
    .map(result => result.reason);
  
  logger.info(`Processed ${successes.length} items successfully, ${failures.length} failures`);
  
  if (failures.length > 0) {
    logger.warn('Some items failed to process', { failures });
  }
  
  return { successes, failures };
}
```

### 6.5 再試行ロジック
- 外部リソースへのアクセスには `withRetry` ユーティリティを使用してください
- 指数バックオフと適切な最大再試行回数を設定してください
- 再試行すべきエラータイプを明示的に定義してください

```javascript
// 良い例
const result = await withRetry(
  () => externalApiCall(params),
  {
    maxRetries: 3,
    baseDelay: 500,
    shouldRetry: isRetryableApiError
  }
);
```

### 6.6 AWS SDK の使用
- AWS SDK v3 を推奨します（移行中のコードベース）
- プロジェクト内で AWS クライアントを一元化して管理してください
- 環境に応じたエンドポイント設定を行ってください
- 認証情報は環境変数または IAM ロールから取得してください

```javascript
// AWS SDK v3 の使用例
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const getDynamoDbClient = () => {
  const options = {
    region: process.env.AWS_REGION || 'ap-northeast-1'
  };
  
  // 開発環境ではローカルエンドポイントを使用
  if (process.env.NODE_ENV === 'development' && process.env.DYNAMODB_ENDPOINT) {
    options.endpoint = process.env.DYNAMODB_ENDPOINT;
  }
  
  return new DynamoDBClient(options);
};

const getDynamoDb = () => {
  const dbClient = getDynamoDbClient();
  return DynamoDBDocumentClient.from(dbClient);
};
```

## 7. ドキュメント

### 7.1 コメントの書き方
- 複雑なロジックやアルゴリズムにはコメントを付けてください
- TODO コメントには担当者と課題を明記してください
- コードの「なぜ」を説明するコメントを書いてください（「何」はコード自体が示します）

```javascript
// 良い例
// レート制限を回避するために指数バックオフを使用
await sleep(baseDelay * Math.pow(2, attempt));

// 悪い例
// 待機する
await sleep(delay);
```

### 7.2 JSDoc スタイルのコメント
- 公開される関数には JSDoc スタイルのコメントを使用してください
- パラメータと戻り値には型情報を含めてください
- 例外をスローする可能性がある場合は @throws タグを使用してください

```javascript
/**
 * データソースからデータを取得し、キャッシュに保存する
 * @param {string} symbol - 取得するデータのシンボル
 * @param {string} dataType - データタイプ（'us-stock', 'jp-stock' など）
 * @param {boolean} [refresh=false] - キャッシュを無視して強制的に更新するかどうか
 * @returns {Promise<Object>} 取得したデータ
 * @throws {Error} データの取得に失敗した場合
 */
async function fetchDataWithCache(symbol, dataType, refresh = false) {
  // 実装
}
```

### 7.3 インラインコメント
- インラインコメントは制限的に使用してください
- 複雑な条件文や非直感的な処理にのみ使用してください

```javascript
// 良い例
// 市場が開いている時間帯のみ短いキャッシュ時間を使用
const cacheTtl = isMarketOpen ? SHORT_CACHE_TTL : LONG_CACHE_TTL;

// 悪い例
const x = y + z; // x に y と z を加える
```

### 7.4 TODO/FIXME コメント
- TODO コメントには以下の形式を使用してください
  ```javascript
  // TODO(名前): 対応が必要な内容の説明
  ```

- FIXME コメントには以下の形式を使用してください
  ```javascript
  // FIXME(名前): 修正が必要な問題の説明
  ```

## 8. テスト

### 8.1 テストの種類と目的

プロジェクトでは以下の3種類のテストを実施します：

#### 8.1.1 ユニットテスト
- 個々の関数やモジュールの機能を検証します
- 外部依存関係はモックまたはスタブに置き換えます
- 実行速度が速く、CI/CDパイプラインの早期段階で実行します

#### 8.1.2 統合テスト
- 複数のモジュール間の連携を検証します
- 実際のモジュールとモックを組み合わせて使用します
- 特定のサブシステム（認証、データ取得など）の機能を検証します

#### 8.1.3 エンドツーエンド（E2E）テスト
- システム全体の機能を検証します
- 実際のAPIエンドポイントに対して実行します
- ユーザーの視点からのシナリオを検証します

### 8.2 テストディレクトリ構造

テストは以下のディレクトリ構造に従って配置します：

```
__tests__/
  ├── unit/                  # ユニットテスト
  │   ├── services/          # サービス層のテスト
  │   ├── utils/             # ユーティリティ関数のテスト
  │   └── function/          # API関数のテスト
  │
  ├── integration/           # 統合テスト
  │   ├── auth/              # 認証関連の統合テスト
  │   ├── marketData/        # マーケットデータ関連の統合テスト
  │   └── drive/             # Googleドライブ関連の統合テスト
  │
  ├── e2e/                   # エンドツーエンドテスト
  │   └── API_test.js        # API全体の機能テスト
  │
  ├── setup.js               # テスト環境の共通セットアップ
  │
  └── testUtils/             # テスト用ユーティリティ
      ├── apiMocks.js        # APIモックユーティリティ
      ├── apiServer.js       # APIサーバーユーティリティ
      ├── awsEmulator.js     # AWSエミュレーター
      ├── dynamodbLocal.js   # DynamoDB Localユーティリティ
      ├── environment.js     # テスト環境管理
      ├── failureSimulator.js # 障害シミュレーター
      ├── googleMock.js      # Google認証モック 
      └── mockServer.js      # モックサーバー
```

### 8.3 テストファイルの命名規則

- **ユニットテスト**: `{対象ファイル名}.test.js`
- **統合テスト**: `{テスト対象機能}.test.js`
- **E2Eテスト**: `{テスト対象API}.test.js` または `API_test.js`

各テストファイルのヘッダーには、テストの目的と範囲を明確に記述してください：

```javascript
/**
 * ファイルパス: __tests__/unit/utils/responseUtils.test.js
 * 
 * responseUtils.js のユニットテスト
 * レスポンス形式の変換機能を検証します
 * 
 * @author Portfolio Manager Team
 * @created YYYY-MM-DD
 * @updated YYYY-MM-DD - 更新内容の簡単な説明
 */
```

### 8.4 テストケースの構造と命名

テストケースの命名は以下の規則に従ってください：

- **ユニットテスト**:「関数名 + 期待される動作」
  ```javascript
  describe('formatResponse', () => {
    it('デフォルトパラメータでの正常レスポンスを返す', () => {
      // ...
    });
  });
  ```

- **統合テスト**:「機能名 + シナリオ」
  ```javascript
  describe('Google認証ログインハンドラー', () => {
    it('正常なGoogleログイン処理を実行する', () => {
      // ...
    });
  });
  ```

- **E2Eテスト**:「API名 + エンドポイント + シナリオ」
  ```javascript
  describe('マーケットデータAPI', () => {
    it('米国株データを取得する', () => {
      // ...
    });
  });
  ```

各テストの構造はAAA（Arrange-Act-Assert）パターンに従ってください：

```javascript
it('正常なレスポンスを返す', async () => {
  // Arrange - テストデータとモックの設定
  const mockData = { symbol: 'AAPL', price: 150 };
  
  // Act - テスト対象の関数を実行
  const result = await fetchData('AAPL');
  
  // Assert - 結果を検証
  expect(result).toBeDefined();
  expect(result.symbol).toBe('AAPL');
  expect(result.price).toBe(150);
});
```

### 8.5 モックとスパイの使用

#### 8.5.1 外部依存関係のモック

外部サービスやAPIはテスト環境で以下のユーティリティを使用してモック化します：

```javascript
// APIモックの設定例
const { mockApiRequest } = require('../testUtils/apiMocks');

// ヘルスチェックAPIのモック
mockApiRequest(`${API_BASE_URL}/health`, 'GET', {
  success: true,
  status: 'ok',
  version: '1.0.0'
});
```

#### 8.5.2 モジュールのモック化

Jestを使用してモジュールをモック化する方法：

```javascript
// モジュールのモック化
jest.mock('../../../src/services/googleAuthService');

// モック実装の設定
googleAuthService.exchangeCodeForTokens.mockResolvedValue({
  id_token: 'test-id-token',
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600
});
```

#### 8.5.3 Jest.spyOnの適切な使用

Jest.spyOnを使用する場合は以下の点に注意してください：

1. モジュール全体の参照を保持する
2. スパイは元のモジュール参照に対して設定する
3. 呼び出しも同じモジュール参照を通して行う

```javascript
// 正しいスパイの使用例
const responseUtils = require('../../utils/responseUtils');
jest.spyOn(responseUtils, 'formatResponse')
  .mockImplementation(() => ({ statusCode: 200 }));

// 検証
expect(responseUtils.formatResponse).toHaveBeenCalledWith(expect.any(Object));

// 避けるべき使用例
const { formatResponse } = require('../../utils/responseUtils');
// 以下はスパイが機能しない可能性がある
jest.spyOn(formatResponse); // エラー: formatResponseはモジュールではない
```

#### 8.5.4 依存性注入を活用したテストフレンドリーな設計

```javascript
// テスト対象の関数
const handler = async (event, deps = {}) => {
  // デフォルトの依存関係
  const dependencies = {
    responseUtils: require('../../utils/responseUtils'),
    cookieParser: require('../../utils/cookieParser'),
    ...deps
  };
  
  // 依存関係を使用した実装
  // ...
};

// テストコード
it('依存関係をモックしてテスト', async () => {
  // モックの設定
  const mockResponseUtils = {
    formatResponse: jest.fn().mockReturnValue({ statusCode: 200 })
  };
  
  // テスト対象関数を呼び出し
  await handler(testEvent, { responseUtils: mockResponseUtils });
  
  // 検証
  expect(mockResponseUtils.formatResponse).toHaveBeenCalled();
});
```

#### 8.5.5 条件付きテスト

環境やAPIサーバーの状態に応じて条件付きでテストを実行する方法：

```javascript
// 条件付きテスト関数
const conditionalTest = (name, fn) => {
  if (!apiServerAvailable && !USE_MOCKS) {
    test.skip(name, () => {
      console.log(`Skipping test: ${name} - API server not available and mocks not enabled`);
    });
  } else {
    test(name, fn);
  }
};

// 使用例
conditionalTest('米国株データ取得', async () => {
  // テスト内容
});
```

### 8.6 テスト環境の設定

#### 8.6.1 環境変数の設定

テスト環境用の環境変数を設定します：

```javascript
// テスト用の環境変数をセット
process.env.NODE_ENV = 'test';
process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000';
process.env.SESSION_TABLE = 'test-sessions';
process.env.DYNAMODB_TABLE_PREFIX = 'test-';
```

#### 8.6.2 モック使用フラグ

テスト実行時のモック使用を制御する環境変数：

```javascript
// モック使用フラグ
process.env.USE_API_MOCKS = 'true'; // モックを使用
process.env.RUN_E2E_TESTS = 'true'; // E2Eテストを実行
process.env.SKIP_E2E_TESTS = 'true'; // E2Eテストをスキップ
```

#### 8.6.3 Jest設定

Jest実行前のセットアップファイル（`__tests__/setup.js`）を使用します：

```javascript
// テスト用のタイムアウト設定
jest.setTimeout(30000); // 30秒

// エラーハンドリングを改善
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// 各テスト後のクリーンアップ
afterEach(() => {
  jest.clearAllTimers();
  jest.resetAllMocks();
});
```

### 8.7 データソースのエミュレーション

#### 8.7.1 AWS サービスのエミュレーション

AWS サービス（DynamoDB、SNSなど）をローカルでエミュレートします：

```javascript
// LocalStackエミュレーターのセットアップ
const localstack = await setupLocalStackEmulator({
  services: ['dynamodb'],
  region: 'us-east-1'
});

// DynamoDBアイテムの取得
const sessionData = await localstack.getDynamoDBItem({
  TableName: process.env.SESSION_TABLE || 'test-sessions',
  Key: {
    sessionId: { S: 'session-123' }
  }
});
```

#### 8.7.2 外部APIのモック

外部APIへのリクエストをモック化します：

```javascript
// Yahoo Finance APIのモック
nock('https://yh-finance.p.rapidapi.com')
  .persist()
  .get('/v8/finance/quote')
  .query(true)
  .reply(200, {
    quoteResponse: {
      result: [{
        symbol: 'AAPL',
        regularMarketPrice: 190.5,
        regularMarketChange: 2.3,
        regularMarketChangePercent: 1.2,
        currency: 'USD'
      }],
      error: null
    }
  });
```

#### 8.7.3 障害シミュレーション

テスト中に特定のAPIやサービスの障害をシミュレートします：

```javascript
// データソースの失敗をシミュレート
await simulateDataSourceFailure('yahoo-finance-api');

// テスト実行

// データソースをリセット
await resetDataSources();
```

### 8.8 E2Eテスト特有のガイドライン

#### 8.8.1 APIサーバーの自動起動

テスト実行時にAPIサーバーを自動的に起動します：

```javascript
// APIサーバーを起動
if (process.env.RUN_E2E_TESTS === 'true') {
  await startApiServer();
  console.log('✅ API server started successfully for E2E tests');
}
```

#### 8.8.2 フォールバックレスポンスの設定

未処理のAPIリクエスト用にフォールバックレスポンスを設定します：

```javascript
// APIサーバーヘルスチェックのフォールバック
nock(/.*/)
  .persist()
  .get(/\/health.*/)
  .reply(200, {
    success: true,
    status: 'ok',
    mockFallback: true,
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
```

#### 8.8.3 セッション状態の管理

認証状態を追跡し、テスト間で一貫したセッション管理を行います：

```javascript
// セッション状態の追跡
const sessionState = {
  // 有効なセッションクッキーを追跡
  activeSessions: new Set(['test-session-id']),
  
  // ログアウト状態のセッションを追跡
  loggedOutSessions: new Set(),
  
  // セッションが有効かチェック
  isSessionValid(cookie) {
    if (!cookie) return false;
    
    const sessionMatch = cookie.match(/session=([^;]+)/);
    if (!sessionMatch) return false;
    
    const sessionId = sessionMatch[1];
    return this.activeSessions.has(sessionId) && !this.loggedOutSessions.has(sessionId);
  }
};
```

### 8.9 テストデータの管理

#### 8.9.1 テストデータの定義

共通のテストデータを一元管理します：

```javascript
// テストデータ
const TEST_DATA = {
  // 証券コード
  usStockSymbol: 'AAPL',
  jpStockCode: '7203',
  mutualFundCode: '0131103C',
  exchangeRate: 'USD-JPY',
  
  // 認証情報
  testAuthCode: 'test-auth-code',
  redirectUri: 'http://localhost:3000/callback',
  
  // ポートフォリオデータ
  samplePortfolio: {
    name: 'Test Portfolio',
    holdings: [
      { symbol: 'AAPL', shares: 10, cost: 150.0 },
      { symbol: '7203', shares: 100, cost: 2000 }
    ]
  }
};
```

#### 8.9.2 DynamoDBテストデータの設定

テスト用のテーブルとデータを作成します：

```javascript
// テスト用のテーブルを作成
await Promise.allSettled([
  createTestTable(process.env.SESSION_TABLE || 'test-sessions', { sessionId: 'S' }),
  createTestTable(`${process.env.DYNAMODB_TABLE_PREFIX || 'test-'}cache`, { key: 'S' })
]);
```

### 8.10 エラーハンドリングテスト

さまざまなエラーシナリオをテストします：

```javascript
conditionalTest('無効なパラメータでのエラーハンドリング', async () => {
  try {
    // 不正なパラメータでAPIリクエスト
    const response = await axios.get(`${API_BASE_URL}/api/market-data`, {
      params: {
        type: 'invalid-type',
        symbols: TEST_DATA.usStockSymbol
      }
    });
    
    // 予期しない成功レスポンスの場合
    expect(response?.status).toBe(400);
  } catch (error) {
    // エラーレスポンス検証
    expect(error.response.status).toBe(400);
    expect(error.response.data.success).toBe(false);
    expect(error.response.data.error.code).toBe('INVALID_PARAMS');
  }
});
```

### 8.11 テストカバレッジ

- 全体のコードカバレッジは80%以上を目標とします
- ビジネスロジックを含むコアモジュールは90%以上のカバレッジを目標とします
- テストカバレッジレポートを定期的に確認し、カバレッジ改善に努めます

```javascript
// package.jsonの設定例
{
  "scripts": {
    "test": "jest",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "collectCoverageFrom": [
      "src/**/*.js",
      "!src/config/**",
      "!**/node_modules/**"
    ],
    "coverageThreshold": {
      "global": {
        "statements": 80,
        "branches": 70,
        "functions": 80,
        "lines": 80
      }
    }
  }
}
```

### 8.12 テストとモジュール参照の関係

テストを実施する際は、次の点に特に注意してください：

1. **モジュール参照とJest.spyOnの関係**:
   - Jest.spyOnはモジュールオブジェクトの参照に対して機能します
   - 脱構造化代入を使用すると参照が失われ、スパイが機能しなくなります

   ```javascript
   // 推奨（正しくスパイされる）
   const responseUtils = require('../../utils/responseUtils');
   jest.spyOn(responseUtils, 'formatResponse');
   
   // 非推奨（スパイが機能しない）
   const { formatResponse } = require('../../utils/responseUtils');
   ```

2. **モジュールの一貫した参照方法**:
   - テスト対象のコードとテストコードで同じモジュール参照パターンを使用します
   - 実装では常にモジュール経由で関数を呼び出します

   ```javascript
   // 実装コード
   const responseUtils = require('../../utils/responseUtils');
   return responseUtils.formatResponse(data);
   
   // テストコード
   expect(responseUtils.formatResponse).toHaveBeenCalledWith(data);
   ```

3. **依存性注入の活用**:
   - モックしやすいように依存性注入パターンを採用します
   - イベントオブジェクトにモックを埋め込むより明示的な依存関係管理を推奨します

## 9. セキュリティ

### 9.1 セキュアコーディング基準
- 機密情報（API キーなど）をハードコードしないでください。環境変数を使用してください
- 入力データは常に検証してください
- 出力データはエスケープまたはサニタイズしてください
- 環境変数のデフォルト値として機密情報を含めないでください

```javascript
// 良い例
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error('API key is not configured');
}

// 悪い例
const apiKey = process.env.API_KEY || 'my-secret-api-key';
```

### 9.2 避けるべき脆弱なパターン
- eval() の使用
- JSON.parse() の使用時のエラーハンドリングの欠如
- 信頼できないデータを直接オブジェクトに割り当てる
- エラーメッセージに詳細なシステム情報を含める

### 9.3 機密情報の取り扱い
- パスワードやAPIキーなどの機密情報はログに出力しないでください
- 例外メッセージに機密情報を含めないでください
- トレースやデバッグ情報に機密情報を含めないでください

## 10. ツールと自動化

### 10.1 推奨されるリンター/フォーマッター
- ESLint を使用してください
- Prettier を使用してください

### 10.2 ESLint 設定
以下の `.eslintrc.js` 設定を使用してください：

```javascript
module.exports = {
  "env": {
    "node": true,
    "es2020": true
  },
  "extends": [
    "eslint:recommended"
  ],
  "parserOptions": {
    "ecmaVersion": 2020
  },
  "rules": {
    "indent": ["error", 2],
    "linebreak-style": ["error", "unix"],
    "quotes": ["error", "single", { "allowTemplateLiterals": true }],
    "semi": ["error", "always"],
    "no-unused-vars": ["warn"],
    "no-console": "off",
    "curly": ["error", "all"],
    "eqeqeq": ["error", "always"],
    "prefer-const": ["warn"],
    "camelcase": ["warn"]
  }
};
```

### 10.3 Prettier 設定
以下の `.prettierrc` 設定を使用してください：

```json
{
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

### 10.4 コードレビュープロセス
- 新規コードはすべてレビューを受けてください
- レビューの焦点は以下の点に当ててください：
  - コード規約への準拠
  - エラーハンドリングの適切さ
  - パフォーマンスへの配慮
  - セキュリティへの配慮
  - テストの網羅性
  - モジュール参照の適切な使用
  - テスト容易性の確保

## 付録: より詳細な JSDoc テンプレート

### モジュールテンプレート
```javascript
/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/services/cacheService.js
 * 
 * 説明: 
 * キャッシュ機能を提供するサービス。
 * DynamoDBを使用してデータをキャッシュします。
 * 
 * @module services/cacheService
 * @author Portfolio Manager Team
 * @created 2025-05-14
 */
```

### 関数テンプレート
```javascript
/**
 * キャッシュからデータを取得する
 * @param {string} key - キャッシュキー
 * @returns {Promise<Object|null>} キャッシュデータと残りのTTL、存在しない場合はnull
 * @example
 * // キャッシュからデータを取得
 * const cachedData = await cacheService.get('us-stock:AAPL');
 * if (cachedData) {
 *   console.log(`Got cached data with TTL: ${cachedData.ttl}`);
 * }
 */
```

### エラーテンプレート
```javascript
/**
 * カスタムAPIエラー
 * @class
 * @extends Error
 * @param {string} message - エラーメッセージ
 * @param {string} code - エラーコード
 * @param {number} statusCode - HTTPステータスコード
 */
```

## 付録: テストに関するJSDocテンプレート

### テストファイルのヘッダーテンプレート
```javascript
/**
 * ファイルパス: __tests__/unit/services/cacheService.test.js
 * 
 * キャッシュサービスのユニットテスト
 * DynamoDBキャッシュの読み書き機能を検証します。
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-20
 */
```

### テストユーティリティ関数テンプレート
```javascript
/**
 * テスト用にDynamoDBテーブルをセットアップする
 * @param {string} tableName - 作成するテーブル名
 * @param {Object} keySchema - プライマリキーのスキーマ（例: { key: 'S' }）
 * @returns {Promise<void>} 処理完了後にresolveするPromise
 */
```

---

この規約書は、プロジェクトの進化とともに継続的に更新されるべきです。また、規約の変更は全チームメンバーの同意を得た上で行うのが望ましいです。
