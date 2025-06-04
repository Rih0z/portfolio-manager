/**
 * 本番環境のエラーハンドリング
 * センシティブな情報を含まないエラーメッセージを返す
 */

/**
 * エラーをサニタイズ
 */
export function sanitizeError(error) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // null/undefinedチェック
    if (!error) {
        return {
            message: 'エラーが発生しました。しばらくしてから再度お試しください。',
            code: 'UNKNOWN_ERROR',
            userFriendly: true
        };
    }
    
    if (isDevelopment) {
        // 開発環境では詳細なエラー情報を返す
        return {
            message: error.message || 'Unknown error',
            code: error.code || 'UNKNOWN_ERROR',
            stack: error.stack,
            details: error.details || {}
        };
    }
    
    // 本番環境では一般的なエラーメッセージのみ
    const errorMap = {
        // ネットワークエラー
        'ECONNREFUSED': 'サーバーに接続できません。しばらくしてから再度お試しください。',
        'ETIMEDOUT': 'リクエストがタイムアウトしました。',
        'ENETUNREACH': 'ネットワークに接続できません。',
        
        // 認証エラー
        'AUTH_FAILED': 'ログインに失敗しました。',
        'UNAUTHORIZED': 'アクセス権限がありません。',
        'FORBIDDEN': 'このリソースへのアクセスは禁止されています。',
        'SESSION_EXPIRED': 'セッションの有効期限が切れました。再度ログインしてください。',
        
        // バリデーションエラー
        'VALIDATION_ERROR': '入力内容に誤りがあります。',
        'INVALID_REQUEST': '無効なリクエストです。',
        
        // リソースエラー
        'NOT_FOUND': 'リソースが見つかりません。',
        'RESOURCE_CONFLICT': 'リソースの競合が発生しました。',
        
        // レート制限
        'RATE_LIMIT_EXCEEDED': 'リクエスト数が上限に達しました。しばらくしてから再度お試しください。',
        
        // サーバーエラー
        'INTERNAL_SERVER_ERROR': 'サーバーエラーが発生しました。',
        'SERVICE_UNAVAILABLE': 'サービスが一時的に利用できません。'
    };
    
    const code = error.code || error.name || 'UNKNOWN_ERROR';
    const message = errorMap[code] || 'エラーが発生しました。しばらくしてから再度お試しください。';
    
    return {
        message,
        code,
        userFriendly: true
    };
}

/**
 * APIエラーレスポンスを処理
 */
export function handleApiError(error) {
    // Axiosエラーの場合
    if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        // APIからのエラーメッセージがある場合
        if (data && data.error && data.error.userFriendly) {
            return data.error;
        }
        
        // HTTPステータスコードに基づくエラー
        switch (status) {
            case 400:
                return sanitizeError({ code: 'INVALID_REQUEST' });
            case 401:
                return sanitizeError({ code: 'UNAUTHORIZED' });
            case 403:
                return sanitizeError({ code: 'FORBIDDEN' });
            case 404:
                return sanitizeError({ code: 'NOT_FOUND' });
            case 429:
                return sanitizeError({ code: 'RATE_LIMIT_EXCEEDED' });
            case 500:
                return sanitizeError({ code: 'INTERNAL_SERVER_ERROR' });
            case 503:
                return sanitizeError({ code: 'SERVICE_UNAVAILABLE' });
            default:
                return sanitizeError(error);
        }
    }
    
    // ネットワークエラー
    if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
        return sanitizeError({ code: 'ETIMEDOUT' });
    }
    
    return sanitizeError(error);
}

/**
 * グローバルエラーハンドラーの設定
 */
export function setupGlobalErrorHandlers() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Check if window is available (for tests and SSR)
    const globalWindow = (typeof window !== 'undefined') ? window : (typeof global !== 'undefined' && global.window) ? global.window : null;
    if (!globalWindow) return;
    
    // 未処理の Promise rejection
    globalWindow.addEventListener('unhandledrejection', (event) => {
        const error = event.reason;
        const sanitized = sanitizeError(error);
        
        if (!isDevelopment) {
            // 本番環境ではエラーを報告（実際のエラー追跡サービスに送信）
            console.error('Unhandled promise rejection:', sanitized.code);
            
            // デフォルトの動作を防ぐ
            event.preventDefault();
        }
    });
    
    // 未処理のエラー
    globalWindow.addEventListener('error', (event) => {
        const error = event.error || new Error(event.message);
        const sanitized = sanitizeError(error);
        
        if (!isDevelopment) {
            // 本番環境ではエラーを報告
            console.error('Global error:', sanitized.code);
            
            // デフォルトの動作を防ぐ
            event.preventDefault();
        }
    });
}

/**
 * エラー境界で使用するエラーログ
 */
export function logErrorToService(error, errorInfo) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
        console.error('Error caught by boundary:', error, errorInfo);
    } else {
        // 本番環境では外部サービスに送信（例：Sentry）
        const sanitized = sanitizeError(error);
        console.error('Error boundary:', sanitized.code);
        
        // TODO: 実際のエラー追跡サービスに送信
        // Sentry.captureException(error, { extra: errorInfo });
    }
}