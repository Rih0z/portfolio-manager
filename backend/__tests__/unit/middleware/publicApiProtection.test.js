/**
 * publicApiProtection middleware のテスト
 */

const { publicApiProtection } = require('../../../src/middleware/publicApiProtection');
const { createResponse } = require('../../../src/utils/responseUtils');
const logger = require('../../../src/utils/logger');

// モック設定
jest.mock('../../../src/utils/responseUtils');
jest.mock('../../../src/utils/logger');

describe('publicApiProtection', () => {
    let originalEnv;

    beforeEach(() => {
        originalEnv = process.env;
        jest.clearAllMocks();
        
        createResponse.mockReturnValue({
            statusCode: 403,
            body: JSON.stringify({ error: 'Mocked response' })
        });
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('User-Agent validation', () => {
        it('should allow valid browser User-Agent', async () => {
            const event = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            };

            const result = await publicApiProtection(event);

            expect(result).toBeNull();
            expect(logger.warn).not.toHaveBeenCalled();
        });

        it('should block curl User-Agent', async () => {
            const event = {
                headers: {
                    'User-Agent': 'curl/7.68.0'
                }
            };

            const result = await publicApiProtection(event);

            expect(result).not.toBeNull();
            expect(logger.warn).toHaveBeenCalledWith('Blocked request with User-Agent:', {
                userAgent: 'curl/7.68.0',
                origin: ''
            });
            expect(createResponse).toHaveBeenCalledWith(403, { error: 'Access denied' });
        });

        it('should block wget User-Agent', async () => {
            const event = {
                headers: {
                    'User-Agent': 'Wget/1.20.3 (linux-gnu)'
                }
            };

            const result = await publicApiProtection(event);

            expect(result).not.toBeNull();
            expect(logger.warn).toHaveBeenCalled();
        });

        it('should block python User-Agent', async () => {
            const event = {
                headers: {
                    'User-Agent': 'python-requests/2.25.1'
                }
            };

            const result = await publicApiProtection(event);

            expect(result).not.toBeNull();
            expect(logger.warn).toHaveBeenCalled();
        });

        it('should block java User-Agent', async () => {
            const event = {
                headers: {
                    'User-Agent': 'Java/11.0.1'
                }
            };

            const result = await publicApiProtection(event);

            expect(result).not.toBeNull();
            expect(logger.warn).toHaveBeenCalled();
        });

        it('should block go-http User-Agent', async () => {
            const event = {
                headers: {
                    'User-Agent': 'Go-http-client/1.1'
                }
            };

            const result = await publicApiProtection(event);

            expect(result).not.toBeNull();
            expect(logger.warn).toHaveBeenCalled();
        });

        it('should block ruby User-Agent', async () => {
            const event = {
                headers: {
                    'User-Agent': 'Ruby'
                }
            };

            const result = await publicApiProtection(event);

            expect(result).not.toBeNull();
            expect(logger.warn).toHaveBeenCalled();
        });

        it('should block perl User-Agent', async () => {
            const event = {
                headers: {
                    'User-Agent': 'libwww-perl/6.43'
                }
            };

            const result = await publicApiProtection(event);

            expect(result).not.toBeNull();
            expect(logger.warn).toHaveBeenCalled();
        });

        it('should handle case-insensitive User-Agent matching', async () => {
            const event = {
                headers: {
                    'User-Agent': 'CURL/7.68.0'
                }
            };

            const result = await publicApiProtection(event);

            expect(result).not.toBeNull();
            expect(logger.warn).toHaveBeenCalled();
        });

        it('should handle lowercase user-agent header', async () => {
            const event = {
                headers: {
                    'user-agent': 'curl/7.68.0'
                }
            };

            const result = await publicApiProtection(event);

            expect(result).not.toBeNull();
            expect(logger.warn).toHaveBeenCalled();
        });

        it('should block empty User-Agent', async () => {
            const event = {
                headers: {
                    'User-Agent': ''
                }
            };

            const result = await publicApiProtection(event);

            expect(result).not.toBeNull();
            expect(logger.warn).toHaveBeenCalledWith('Blocked request with empty or short User-Agent');
            expect(createResponse).toHaveBeenCalledWith(403, { error: 'Invalid request' });
        });

        it('should block missing User-Agent', async () => {
            const event = {
                headers: {}
            };

            const result = await publicApiProtection(event);

            expect(result).not.toBeNull();
            expect(logger.warn).toHaveBeenCalledWith('Blocked request with empty or short User-Agent');
        });

        it('should block short User-Agent', async () => {
            const event = {
                headers: {
                    'User-Agent': 'short'
                }
            };

            const result = await publicApiProtection(event);

            expect(result).not.toBeNull();
            expect(logger.warn).toHaveBeenCalledWith('Blocked request with empty or short User-Agent');
        });
    });

    describe('Origin validation', () => {
        it('should allow request without origin', async () => {
            const event = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            };

            const result = await publicApiProtection(event);

            expect(result).toBeNull();
        });

        it('should allow valid origin when CORS_ALLOWED_ORIGINS is set', async () => {
            process.env.CORS_ALLOWED_ORIGINS = 'https://portfolio-wise.com,https://app.example.com';

            const event = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'origin': 'https://portfolio-wise.com'
                }
            };

            const result = await publicApiProtection(event);

            expect(result).toBeNull();
        });

        it('should block invalid origin when CORS_ALLOWED_ORIGINS is set', async () => {
            process.env.CORS_ALLOWED_ORIGINS = 'https://portfolio-wise.com,https://app.example.com';

            const event = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'origin': 'https://malicious-site.com'
                }
            };

            const result = await publicApiProtection(event);

            expect(result).not.toBeNull();
            expect(logger.warn).toHaveBeenCalledWith('Blocked request with invalid origin:', {
                origin: 'https://malicious-site.com'
            });
            expect(createResponse).toHaveBeenCalledWith(403, { error: 'Origin not allowed' });
        });

        it('should handle uppercase Origin header', async () => {
            process.env.CORS_ALLOWED_ORIGINS = 'https://portfolio-wise.com';

            const event = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Origin': 'https://portfolio-wise.com'
                }
            };

            const result = await publicApiProtection(event);

            expect(result).toBeNull();
        });

        it('should allow request when CORS_ALLOWED_ORIGINS is not set', async () => {
            delete process.env.CORS_ALLOWED_ORIGINS;

            const event = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'origin': 'https://any-origin.com'
                }
            };

            const result = await publicApiProtection(event);

            expect(result).toBeNull();
        });

        it('should use partial matching for origins', async () => {
            process.env.CORS_ALLOWED_ORIGINS = 'portfolio-wise.com';

            const event = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'origin': 'https://www.portfolio-wise.com'
                }
            };

            const result = await publicApiProtection(event);

            expect(result).toBeNull();
        });
    });

    describe('Error handling', () => {
        it('should handle errors gracefully and allow request through', async () => {
            // createResponseがエラーをスローするように設定
            createResponse.mockImplementation(() => {
                throw new Error('createResponse error');
            });

            const event = {
                headers: {
                    'User-Agent': 'curl/7.68.0'
                }
            };

            const result = await publicApiProtection(event);

            expect(result).toBeNull(); // エラー時は通過させる
            expect(logger.error).toHaveBeenCalledWith('Public API protection error:', expect.any(Error));
        });

        it('should handle missing headers object', async () => {
            const event = {};

            const result = await publicApiProtection(event);

            expect(result).not.toBeNull(); // 空のUser-Agentなのでブロック
            expect(logger.warn).toHaveBeenCalledWith('Blocked request with empty or short User-Agent');
        });
    });

    describe('Referer handling', () => {
        it('should handle referer header (case variations)', async () => {
            const event1 = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'referer': 'https://portfolio-wise.com/page'
                }
            };

            const event2 = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://portfolio-wise.com/page'
                }
            };

            const result1 = await publicApiProtection(event1);
            const result2 = await publicApiProtection(event2);

            expect(result1).toBeNull();
            expect(result2).toBeNull();
        });
    });

    describe('Integration scenarios', () => {
        it('should handle complete realistic browser request', async () => {
            const event = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15',
                    'origin': 'https://portfolio-wise.com',
                    'referer': 'https://portfolio-wise.com/dashboard'
                }
            };

            const result = await publicApiProtection(event);

            expect(result).toBeNull();
            expect(logger.warn).not.toHaveBeenCalled();
        });

        it('should handle Chrome browser request', async () => {
            const event = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                }
            };

            const result = await publicApiProtection(event);

            expect(result).toBeNull();
        });

        it('should handle Firefox browser request', async () => {
            const event = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0'
                }
            };

            const result = await publicApiProtection(event);

            expect(result).toBeNull();
        });
    });
});