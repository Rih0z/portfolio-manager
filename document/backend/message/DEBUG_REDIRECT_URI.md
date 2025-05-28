# Google OAuth redirect_uri_mismatch エラーの解決方法

## 🚨 問題の原因
Lambda関数が送信しているリダイレクトURIと、Google Cloud Consoleに登録されているURIが一致していません。

## 📋 確認事項

### 1. 現在Lambda関数が送信しているリダイレクトURI
```
https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback
```

### 2. CloudWatch Logsで確認する方法
1. AWS CloudWatch Logsにアクセス
2. `/aws/lambda/pfwise-api-dev-googleDriveAuthInitiate` ログストリームを確認
3. "Drive OAuth configuration:" で検索
4. `redirectUri` の値を確認

## ✅ 解決手順

### Google Cloud Consoleでの設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 正しいプロジェクトを選択
3. 左メニューから「APIとサービス」→「認証情報」をクリック
4. OAuth 2.0 クライアント ID（Web アプリケーション）をクリック
5. 「承認済みのリダイレクト URI」セクションを確認

### 追加すべきURI（完全一致で追加してください）

```
https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback
```

⚠️ **重要**: 
- スペースや改行を含めない
- 末尾にスラッシュを付けない
- HTTPSであることを確認
- 大文字小文字も完全一致

### デバッグ用の一時的なエンドポイント

デバッグのために、以下のエンドポイントにアクセスして実際の設定を確認できます：

```
GET https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/debug/google-config
```

このエンドポイントは以下の情報を返します：
- 使用されているリダイレクトURI
- Client IDの形式確認
- 環境変数の設定状況

## 🔍 トラブルシューティング

### それでもエラーが続く場合

1. **ブラウザキャッシュをクリア**
   - Chromeの場合: 設定 → プライバシーとセキュリティ → 閲覧履歴データの削除
   - Cookieとサイトデータを含めてクリア

2. **Google アカウントの認証をリセット**
   - [Google アカウント設定](https://myaccount.google.com/permissions) にアクセス
   - 該当アプリのアクセス権を取り消し
   - 再度認証を試行

3. **Client IDの確認**
   - Google Cloud ConsoleのClient IDと、アプリケーションが使用しているClient IDが一致することを確認
   - Client ID: `243939385276-0gga06ocrn3vumf7lasubcpdqjk49j3n.apps.googleusercontent.com`

### 正しい設定の例（Google Cloud Console）

```
アプリケーション名: Portfolio Manager
アプリケーションの種類: ウェブ アプリケーション

承認済みの JavaScript 生成元:
- http://localhost:3001
- https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com

承認済みのリダイレクト URI:
- https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback
- http://localhost:3001/auth/google/callback （既存のログイン用）
```

## 📝 確認リスト

- [ ] Google Cloud Consoleにログインした
- [ ] 正しいプロジェクトを選択した
- [ ] OAuth 2.0 クライアント IDを開いた
- [ ] リダイレクトURIを正確にコピー＆ペーストした
- [ ] 保存ボタンをクリックした
- [ ] ブラウザキャッシュをクリアした
- [ ] 再度認証を試した

これらの手順を実行してもエラーが続く場合は、CloudWatch Logsの詳細なエラーメッセージを確認してください。