# Google Drive連携時の強制ログアウト問題 - 調査手順

## 確認すべきログ（優先順位順）

### 1. **`/aws/lambda/pfwise-api-dev-googleDriveAuthInitiate`** ⭐最重要
Google Drive認証を開始する際のログ。セッション処理のエラーを確認。

確認ポイント：
- セッションの検証エラー
- Cookie/認証ヘッダーの問題
- 401エラーの詳細

### 2. **`/aws/lambda/pfwise-api-dev-getSession`** ⭐重要
セッション情報を取得する際のログ。ログアウトの直接的な原因を確認。

確認ポイント：
- セッションの有効期限切れ
- DynamoDBからのセッション取得エラー
- セッション更新の失敗

### 3. **`/aws/lambda/pfwise-api-dev-googleDriveAuthCallback`**
Google認証後のコールバック処理。セッション更新の問題を確認。

確認ポイント：
- セッション更新時のエラー
- トークン保存の失敗
- リダイレクト処理のエラー

### 4. **`/aws/lambda/pfwise-api-dev-logout`**
明示的なログアウト処理が実行されたか確認。

確認ポイント：
- 意図しないログアウトの実行
- セッション無効化の詳細

## CloudWatch Logsでの確認方法

1. AWS CloudWatch Logsにアクセス
2. 上記のロググループを選択
3. 時間範囲を問題発生時刻の前後30分に設定
4. 以下のキーワードで検索：
   - `ERROR`
   - `Session not found`
   - `401`
   - `NO_SESSION`
   - `INVALID_SESSION`
   - `updateSession`

## 考えられる原因

### 1. セッションIDの不一致
- Google Drive認証時に新しいセッションIDが生成された
- 既存のセッションが上書きされた

### 2. Cookie設定の問題
- SameSite属性の影響
- Cookieが正しく送信されていない

### 3. セッション更新の失敗
- DynamoDBへの書き込みエラー
- 同時実行による競合状態

### 4. 認証フローの問題
- Google Drive OAuth後のセッション再構築エラー
- stateパラメータの不一致

## デバッグ手順

1. **時系列で確認**
   ```
   1. googleDriveAuthInitiate のログ
   2. Google認証画面へのリダイレクト
   3. googleDriveAuthCallback のログ
   4. getSession または logout のログ
   ```

2. **セッションIDを追跡**
   - 各ログでセッションIDを確認
   - 同じセッションIDが維持されているか

3. **エラーメッセージの詳細**
   - スタックトレース
   - エラーコード
   - リクエスト/レスポンスの詳細

## 解決に向けて

ログを確認後、以下の情報を共有してください：
1. エラーメッセージの全文
2. セッションIDの変化
3. タイムスタンプ付きのログの流れ

これらの情報から、強制ログアウトの原因を特定し、修正方法を提案します。