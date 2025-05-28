/**
 * セキュリティ監査ログシステム
 * 重要なセキュリティイベントを記録・監視
 */
'use strict';

const logger = require('./logger');

// 監査イベントタイプ
const AUDIT_EVENTS = {
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  AUTH_FAILURE: 'AUTH_FAILURE',
  API_KEY_USAGE: 'API_KEY_USAGE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  DATA_ACCESS: 'DATA_ACCESS',
  ADMIN_ACTION: 'ADMIN_ACTION',
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  SESSION_CREATED: 'SESSION_CREATED',
  SESSION_EXPIRED: 'SESSION_EXPIRED'
};

// 重要度レベル
const SEVERITY_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

/**
 * 監査ログエントリを作成
 * @param {string} eventType - イベントタイプ
 * @param {Object} details - イベント詳細
 * @param {string} severity - 重要度
 * @returns {Object} 監査ログエントリ
 */
const createAuditLogEntry = (eventType, details = {}, severity = SEVERITY_LEVELS.MEDIUM) => {
  return {
    timestamp: new Date().toISOString(),
    eventType,
    severity,
    details: {
      ...details,
      userAgent: details.userAgent ? details.userAgent.slice(0, 500) : undefined,
      ipAddress: details.ipAddress || 'unknown',
      userId: details.userId || 'anonymous',
      sessionId: details.sessionId || 'none',
      requestId: details.requestId || generateRequestId()
    },
    environment: process.env.NODE_ENV || 'development',
    service: 'pfwise-api'
  };
};

/**
 * リクエストIDを生成
 * @returns {string} リクエストID
 */
const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 認証成功ログ
 * @param {Object} details - 認証詳細
 */
const logAuthSuccess = (details) => {
  const auditEntry = createAuditLogEntry(
    AUDIT_EVENTS.AUTH_SUCCESS,
    {
      ...details,
      message: 'User authentication successful'
    },
    SEVERITY_LEVELS.LOW
  );
  
  logger.info('AUDIT: Authentication successful', auditEntry);
};

/**
 * 認証失敗ログ
 * @param {Object} details - 認証詳細
 */
const logAuthFailure = (details) => {
  const auditEntry = createAuditLogEntry(
    AUDIT_EVENTS.AUTH_FAILURE,
    {
      ...details,
      message: 'User authentication failed',
      reason: details.reason || 'Invalid credentials'
    },
    SEVERITY_LEVELS.MEDIUM
  );
  
  logger.warn('AUDIT: Authentication failed', auditEntry);
};

/**
 * APIキー使用ログ
 * @param {Object} details - APIキー使用詳細
 */
const logApiKeyUsage = (details) => {
  const auditEntry = createAuditLogEntry(
    AUDIT_EVENTS.API_KEY_USAGE,
    {
      ...details,
      message: 'API key used for request',
      apiKeyPrefix: details.apiKey ? details.apiKey.substring(0, 10) + '...' : 'unknown'
    },
    SEVERITY_LEVELS.LOW
  );
  
  logger.info('AUDIT: API key usage', auditEntry);
};

/**
 * レート制限超過ログ
 * @param {Object} details - レート制限詳細
 */
const logRateLimitExceeded = (details) => {
  const auditEntry = createAuditLogEntry(
    AUDIT_EVENTS.RATE_LIMIT_EXCEEDED,
    {
      ...details,
      message: 'Rate limit exceeded',
      requestCount: details.requestCount || 'unknown',
      timeWindow: details.timeWindow || 'unknown'
    },
    SEVERITY_LEVELS.HIGH
  );
  
  logger.warn('AUDIT: Rate limit exceeded', auditEntry);
};

/**
 * 疑わしい活動ログ
 * @param {Object} details - 疑わしい活動の詳細
 */
const logSuspiciousActivity = (details) => {
  const auditEntry = createAuditLogEntry(
    AUDIT_EVENTS.SUSPICIOUS_ACTIVITY,
    {
      ...details,
      message: 'Suspicious activity detected',
      activityType: details.activityType || 'unknown'
    },
    SEVERITY_LEVELS.HIGH
  );
  
  logger.error('AUDIT: Suspicious activity', auditEntry);
};

/**
 * データアクセスログ
 * @param {Object} details - データアクセス詳細
 */
const logDataAccess = (details) => {
  const auditEntry = createAuditLogEntry(
    AUDIT_EVENTS.DATA_ACCESS,
    {
      ...details,
      message: 'Data access performed',
      dataType: details.dataType || 'unknown',
      operation: details.operation || 'read'
    },
    SEVERITY_LEVELS.LOW
  );
  
  logger.info('AUDIT: Data access', auditEntry);
};

/**
 * 管理者操作ログ
 * @param {Object} details - 管理者操作詳細
 */
const logAdminAction = (details) => {
  const auditEntry = createAuditLogEntry(
    AUDIT_EVENTS.ADMIN_ACTION,
    {
      ...details,
      message: 'Administrative action performed',
      action: details.action || 'unknown'
    },
    SEVERITY_LEVELS.MEDIUM
  );
  
  logger.warn('AUDIT: Admin action', auditEntry);
};

/**
 * セキュリティ違反ログ
 * @param {Object} details - セキュリティ違反詳細
 */
const logSecurityViolation = (details) => {
  const auditEntry = createAuditLogEntry(
    AUDIT_EVENTS.SECURITY_VIOLATION,
    {
      ...details,
      message: 'Security violation detected',
      violationType: details.violationType || 'unknown'
    },
    SEVERITY_LEVELS.CRITICAL
  );
  
  logger.error('AUDIT: Security violation', auditEntry);
};

/**
 * セッション作成ログ
 * @param {Object} details - セッション詳細
 */
const logSessionCreated = (details) => {
  const auditEntry = createAuditLogEntry(
    AUDIT_EVENTS.SESSION_CREATED,
    {
      ...details,
      message: 'User session created'
    },
    SEVERITY_LEVELS.LOW
  );
  
  logger.info('AUDIT: Session created', auditEntry);
};

/**
 * セッション期限切れログ
 * @param {Object} details - セッション詳細
 */
const logSessionExpired = (details) => {
  const auditEntry = createAuditLogEntry(
    AUDIT_EVENTS.SESSION_EXPIRED,
    {
      ...details,
      message: 'User session expired'
    },
    SEVERITY_LEVELS.LOW
  );
  
  logger.info('AUDIT: Session expired', auditEntry);
};

/**
 * セキュリティメトリクスの取得
 * @param {Date} startTime - 開始時間
 * @param {Date} endTime - 終了時間
 * @returns {Object} セキュリティメトリクス
 */
const getSecurityMetrics = (startTime, endTime) => {
  // 実際の実装では、ログデータベースから集計
  // ここでは簡易版を提供
  return {
    timeRange: {
      start: startTime.toISOString(),
      end: endTime.toISOString()
    },
    metrics: {
      totalRequests: 0,
      authFailures: 0,
      rateLimitViolations: 0,
      securityViolations: 0,
      suspiciousActivities: 0
    }
  };
};

module.exports = {
  AUDIT_EVENTS,
  SEVERITY_LEVELS,
  createAuditLogEntry,
  logAuthSuccess,
  logAuthFailure,
  logApiKeyUsage,
  logRateLimitExceeded,
  logSuspiciousActivity,
  logDataAccess,
  logAdminAction,
  logSecurityViolation,
  logSessionCreated,
  logSessionExpired,
  getSecurityMetrics
};