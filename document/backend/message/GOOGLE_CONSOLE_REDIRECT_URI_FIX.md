# Google Cloud Console リダイレクトURI設定修正

## 問題
redirect_uri_mismatchエラーが発生しています。Google Cloud Consoleで設定されているリダイレクトURIに問題があります。

## 現在の状況
登録されているURI（エラーメッセージから）:
1. `https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback`
2. `http://localhost:3000/auth/google/callbackhttp://localhost:3001/auth/google/callback` ← **これが問題**

## 修正手順

### 1. Google Cloud Consoleにアクセス
1. [Google Cloud Console](https://console.cloud.google.com/)にログイン
2. プロジェクトを選択
3. 左メニューから「APIとサービス」→「認証情報」を選択
4. OAuth 2.0 クライアントIDをクリック

### 2. リダイレクトURIの修正
「承認済みのリダイレクトURI」セクションで以下のように修正してください：

**削除するURI:**
```
http://localhost:3000/auth/google/callbackhttp://localhost:3001/auth/google/callback
```

**追加するURI（それぞれ別々の行に）:**
```
http://localhost:3000/auth/google/callback
http://localhost:3001/auth/google/callback
```

### 3. 最終的なリダイレクトURIリスト
以下のURIがすべて個別に登録されていることを確認：

1. `http://localhost:3000/auth/google/callback`
2. `http://localhost:3001/auth/google/callback`
3. `https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/callback`
4. `https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback`
5. `https://portfolio-wise.com/auth/google/callback` (本番用)

### 4. 保存と反映
1. 「保存」ボタンをクリック
2. 変更が反映されるまで5-10分待つ
3. ブラウザのキャッシュをクリア

## 確認方法
1. ブラウザの開発者ツールでコンソールを開く
2. ログインボタンをクリック
3. コンソールに表示される`Generated redirect_uri:`が上記のリストに含まれていることを確認

## 重要な注意点
- 各URIは**別々の行**に入力する必要があります
- URIの末尾にスラッシュ（/）を含めない
- httpとhttpsの違いに注意
- ポート番号（:3000, :3001）も正確に一致する必要があります

## トラブルシューティング
もし問題が続く場合：
1. ブラウザのシークレット/プライベートモードで試す
2. 別のブラウザで試す
3. Google Cloud Consoleで変更が保存されているか再確認