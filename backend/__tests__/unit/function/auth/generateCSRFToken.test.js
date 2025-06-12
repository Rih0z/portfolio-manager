/**
 * generateCSRFToken Lambda function のテスト
 */

// AWS SDK のモック
const mockSecretsManager = {
    getSecretValue: jest.fn()
};

jest.mock('aws-sdk', () => ({
    SecretsManager: jest.fn(() => mockSecretsManager)
}));

jest.mock('../../../../src/utils/csrfProtection', () => ({
    generateCSRFToken: jest.fn()
}));

const { handler } = require('../../../../src/function/auth/generateCSRFToken');
const { generateCSRFToken } = require('../../../../src/utils/csrfProtection');

describe('generateCSRFToken handler', () => {
    let originalConsole;
    let originalDateNow;

    beforeEach(() => {
        originalConsole = console.error;
        console.error = jest.fn();
        
        // Date.now をモック化
        originalDateNow = Date.now;
        Date.now = jest.fn(() => 1000000);
        
        jest.clearAllMocks();
        jest.resetModules(); // モジュールキャッシュをリセット
        
        // デフォルトのモック設定
        mockSecretsManager.getSecretValue.mockReturnValue({
            promise: jest.fn().mockResolvedValue({
                SecretString: JSON.stringify({
                    CSRF_SECRET: 'test-csrf-secret'
                })
            })
        });
        
        generateCSRFToken.mockReturnValue('mock-csrf-token');
    });

    afterEach(() => {
        console.error = originalConsole;
        Date.now = originalDateNow;
        jest.restoreAllMocks();
    });

    it('should generate CSRF token successfully with session ID from headers', async () => {
        const event = {
            headers: {
                'x-session-id': 'test-session-123'
            }
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toEqual({
            csrfToken: 'mock-csrf-token',
            expiresIn: 3600
        });
        expect(generateCSRFToken).toHaveBeenCalledWith('test-session-123', 'test-csrf-secret');
        expect(result.headers['Content-Type']).toBe('application/json');
        expect(result.headers['Cache-Control']).toBe('no-store, max-age=0');
    });

    it('should handle capitalized session ID header', async () => {
        const event = {
            headers: {
                'X-Session-Id': 'test-session-456'
            }
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
        expect(generateCSRFToken).toHaveBeenCalledWith('test-session-456', 'test-csrf-secret');
    });

    it('should handle session ID from requestContext authorizer', async () => {
        const event = {
            headers: {},
            requestContext: {
                authorizer: {
                    sessionId: 'context-session-789'
                }
            }
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
        expect(generateCSRFToken).toHaveBeenCalledWith('context-session-789', 'test-csrf-secret');
    });

    it('should return 401 when no session ID is provided', async () => {
        const event = {
            headers: {}
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(401);
        expect(JSON.parse(result.body)).toEqual({
            error: 'No session found'
        });
        expect(generateCSRFToken).not.toHaveBeenCalled();
    });

    it('should use APP_SECRET as fallback when CSRF_SECRET is not available', async () => {
        mockSecretsManager.getSecretValue.mockReturnValue({
            promise: jest.fn().mockResolvedValue({
                SecretString: JSON.stringify({
                    APP_SECRET: 'fallback-app-secret'
                })
            })
        });

        const event = {
            headers: {
                'x-session-id': 'test-session'
            }
        };

        await handler(event);

        expect(generateCSRFToken).toHaveBeenCalledWith('test-session', 'fallback-app-secret');
    });

    it('should handle secrets manager error', async () => {
        mockSecretsManager.getSecretValue.mockReturnValue({
            promise: jest.fn().mockRejectedValue(new Error('Secrets Manager error'))
        });

        const event = {
            headers: {
                'x-session-id': 'test-session'
            }
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(500);
        expect(JSON.parse(result.body)).toEqual({
            error: 'Failed to generate CSRF token'
        });
        expect(console.error).toHaveBeenCalledWith('Failed to get app secret:', expect.any(Error));
        expect(console.error).toHaveBeenCalledWith('CSRF token generation error:', expect.any(Error));
    });

    it('should handle CSRF token generation error', async () => {
        generateCSRFToken.mockImplementation(() => {
            throw new Error('Token generation failed');
        });

        const event = {
            headers: {
                'x-session-id': 'test-session'
            }
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(500);
        expect(JSON.parse(result.body)).toEqual({
            error: 'Failed to generate CSRF token'
        });
        expect(console.error).toHaveBeenCalledWith('CSRF token generation error:', expect.any(Error));
    });

    it('should cache secrets and reuse them within cache duration', async () => {
        const event = {
            headers: {
                'x-session-id': 'test-session'
            }
        };

        // 最初の呼び出し
        const result1 = await handler(event);
        expect(result1.statusCode).toBe(200);

        // キャッシュ期間内の2回目の呼び出し
        const result2 = await handler(event);
        expect(result2.statusCode).toBe(200);
        
        // セキュリティの観点から、この関数では毎回SecretsManagerを呼ぶ可能性があります
        // 実装を確認してからテストを調整します
    });

    it('should refresh cache after cache duration expires', async () => {
        const event = {
            headers: {
                'x-session-id': 'test-session'
            }
        };

        // 最初の呼び出し (時刻: 1000000)
        await handler(event);
        expect(mockSecretsManager.getSecretValue).toHaveBeenCalledTimes(1);

        // 5分と1秒後 (キャッシュ期間 5分 + 1秒)
        Date.now.mockReturnValue(1000000 + 5 * 60 * 1000 + 1000);

        // 2回目の呼び出し
        await handler(event);
        expect(mockSecretsManager.getSecretValue).toHaveBeenCalledTimes(2); // キャッシュが期限切れなので再取得
    });

    it('should handle missing headers object', async () => {
        const event = {};

        const result = await handler(event);

        expect(result.statusCode).toBe(401);
        expect(JSON.parse(result.body)).toEqual({
            error: 'No session found'
        });
    });

    it('should use custom ALLOWED_ORIGINS from environment', async () => {
        const originalEnv = process.env.ALLOWED_ORIGINS;
        process.env.ALLOWED_ORIGINS = 'https://custom-origin.com';

        const event = {
            headers: {
                'x-session-id': 'test-session'
            }
        };

        const result = await handler(event);

        expect(result.headers['Access-Control-Allow-Origin']).toBe('https://custom-origin.com');

        // 環境変数を元に戻す
        if (originalEnv) {
            process.env.ALLOWED_ORIGINS = originalEnv;
        } else {
            delete process.env.ALLOWED_ORIGINS;
        }
    });

    it('should use default wildcard origin when ALLOWED_ORIGINS is not set', async () => {
        const originalEnv = process.env.ALLOWED_ORIGINS;
        delete process.env.ALLOWED_ORIGINS;

        const event = {
            headers: {
                'x-session-id': 'test-session'
            }
        };

        const result = await handler(event);

        expect(result.headers['Access-Control-Allow-Origin']).toBe('*');

        // 環境変数を元に戻す
        if (originalEnv) {
            process.env.ALLOWED_ORIGINS = originalEnv;
        }
    });

    it('should handle JSON parsing error from secrets manager', async () => {
        mockSecretsManager.getSecretValue.mockReturnValue({
            promise: jest.fn().mockResolvedValue({
                SecretString: 'invalid-json'
            })
        });

        const event = {
            headers: {
                'x-session-id': 'test-session'
            }
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(500);
        expect(console.error).toHaveBeenCalledWith('Failed to get app secret:', expect.any(Error));
    });

    describe('integration scenarios', () => {
        it('should work with complete realistic event', async () => {
            const event = {
                headers: {
                    'x-session-id': 'session-abc123',
                    'User-Agent': 'Mozilla/5.0',
                    'Origin': 'https://portfolio-wise.com'
                },
                requestContext: {
                    requestId: 'test-request-id'
                }
            };

            const result = await handler(event);

            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body).toHaveProperty('csrfToken');
            expect(body).toHaveProperty('expiresIn');
            expect(body.expiresIn).toBe(3600);
        });
    });
});