# 認証コードエラーの分析

## エラー内容
「認証コードが無効または期限切れです」

## 考えられる原因

### 1. 認証コードの二重使用（最も可能性が高い）
- React の開発環境では `StrictMode` により、コンポーネントが2回レンダリングされる
- これにより、同じ認証コードで2回ログイン処理が実行される可能性がある
- Googleの認証コードは**1回しか使用できない**ため、2回目でエラーになる

### 2. redirect_uriの不一致
- OAuth認証時のredirect_uriと、コード交換時のredirect_uriが異なる
- フロントエンド: `http://localhost:3001/auth/google/callback`
- バックエンド: 異なるURIを使用している可能性

### 3. タイミングの問題
- 認証コードの有効期限は短い（通常10分）
- ネットワーク遅延により期限切れになる可能性

## 診断方法

### フロントエンドでの確認
1. ブラウザのNetworkタブを開く
2. `/auth/google/login`へのPOSTリクエストを確認
3. 同じ認証コードで複数回リクエストが送信されていないか確認

### バックエンドでの確認
1. CloudWatch Logsで認証コードの受信を確認
2. 同じ認証コードで複数回の処理が実行されていないか確認
3. redirect_uriが一致しているか確認

## 解決方法

### フロントエンド側の修正が必要な場合

```javascript
// OAuthLoginButton.jsx の修正
const [codeProcessed, setCodeProcessed] = useState(false);

useEffect(() => {
  const handleCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    // 既に処理済みの場合はスキップ
    if (code && !codeProcessed) {
      setCodeProcessed(true); // 処理済みフラグを立てる
      // ログイン処理...
    }
  };
  
  handleCallback();
}, [codeProcessed]); // 依存配列に追加
```

### バックエンド側で確認すべき点
1. 受信した認証コードをログ出力
2. redirect_uriの値をログ出力
3. Google OAuth2 APIへのリクエスト内容を確認

## 結論
このエラーは主に**フロントエンドの問題**である可能性が高いです。特にReactの開発環境での二重実行が原因と考えられます。