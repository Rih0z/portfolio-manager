/**
 * ログユーティリティ
 * 本番環境では機密情報を含むログを無効化
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

// 機密情報のパターン
const SENSITIVE_PATTERNS = [
    /token/i,
    /cookie/i,
    /password/i,
    /secret/i,
    /credential/i,
    /authorization/i,
    /session/i,
    /auth/i
];

/**
 * 機密情報を含む可能性があるかチェック
 */
const containsSensitiveInfo = (args) => {
    const str = args.map(arg => {
        if (typeof arg === 'object') {
            return JSON.stringify(arg);
        }
        return String(arg);
    }).join(' ');
    
    return SENSITIVE_PATTERNS.some(pattern => pattern.test(str));
};

/**
 * 機密情報をマスク
 */
const maskSensitiveData = (data) => {
    if (typeof data === 'string') {
        // トークンのような文字列をマスク
        if (data.length > 10 && /^[A-Za-z0-9_\-\.]+$/.test(data)) {
            return data.substring(0, 4) + '...' + data.substring(data.length - 4);
        }
        return data;
    }
    
    if (typeof data === 'object' && data !== null) {
        const masked = Array.isArray(data) ? [] : {};
        
        for (const key in data) {
            const lowerKey = key.toLowerCase();
            if (SENSITIVE_PATTERNS.some(pattern => pattern.test(lowerKey))) {
                if (typeof data[key] === 'string' && data[key].length > 0) {
                    masked[key] = '[MASKED]';
                } else if (typeof data[key] === 'boolean') {
                    masked[key] = data[key];
                } else {
                    masked[key] = '[MASKED]';
                }
            } else {
                masked[key] = maskSensitiveData(data[key]);
            }
        }
        
        return masked;
    }
    
    return data;
}

/**
 * 安全なログ関数
 */
const logger = {
    log: (...args) => {
        if (isDevelopment || isTest) {
            // 開発環境でも機密情報をマスク
            const maskedArgs = args.map(arg => maskSensitiveData(arg));
            console.log(...maskedArgs);
        } else if (!containsSensitiveInfo(args)) {
            // 本番環境では機密情報を含まないログのみ出力
            console.log(...args);
        }
    },
    
    info: (...args) => {
        if (isDevelopment || isTest) {
            const maskedArgs = args.map(arg => maskSensitiveData(arg));
            console.info(...maskedArgs);
        } else if (!containsSensitiveInfo(args)) {
            console.info(...args);
        }
    },
    
    warn: (...args) => {
        // 警告は常に出力（ただし機密情報はマスク）
        const maskedArgs = args.map(arg => maskSensitiveData(arg));
        console.warn(...maskedArgs);
    },
    
    error: (...args) => {
        // エラーは常に出力（ただし機密情報はマスク）
        const maskedArgs = args.map(arg => maskSensitiveData(arg));
        console.error(...maskedArgs);
    },
    
    debug: (...args) => {
        // デバッグログは開発環境でのみ出力
        if (isDevelopment) {
            const maskedArgs = args.map(arg => maskSensitiveData(arg));
            console.log('[DEBUG]', ...maskedArgs);
        }
    }
};

// console.logを置き換える関数
export function replaceConsoleLog() {
    const currentEnv = process.env.NODE_ENV;
    if (currentEnv !== 'development') {
        const originalLog = console.log;
        console.log = (...args) => {
            if (!containsSensitiveInfo(args)) {
                originalLog(...args);
            }
        };
    }
}

export default logger;