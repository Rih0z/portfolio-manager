/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/utils/awsConfig.js
 * 
 * 説明: 
 * AWS SDKの初期化と各種クライアントの取得を一元管理するユーティリティモジュール。
 * 開発環境と本番環境での設定を統一的に処理します。
 * クライアント初期化の重複を防ぎ、エンドポイント設定を一元化します。
 *
 * @author Portfolio Manager Team
 * @updated 2025-05-17
 * @updated 2025-05-18 AWS SDK v3に移行
 * @updated 2025-05-21 テスト互換性の改善
 */
'use strict';

// AWS SDK v3のインポート
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const { SNSClient } = require('@aws-sdk/client-sns');
const { STSClient } = require('@aws-sdk/client-sts');

const logger = require('./logger');

// 環境変数からの値取得またはデフォルト値
const getEnvVar = (name, defaultValue) => process.env[name] || defaultValue;

// 環境設定
const ENV = {
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  REGION: getEnvVar('AWS_REGION', 'ap-northeast-1'),
  DYNAMODB_ENDPOINT: getEnvVar('DYNAMODB_ENDPOINT', undefined),
  SNS_ENDPOINT: getEnvVar('SNS_ENDPOINT', undefined),
  STS_ENDPOINT: getEnvVar('STS_ENDPOINT', undefined),
  AWS_ENDPOINT: getEnvVar('AWS_ENDPOINT', undefined),
  LOG_LEVEL: getEnvVar('LOG_LEVEL', 'info')
};

// 環境フラグ
const isDevelopment = ENV.NODE_ENV === 'development';
const isTest = ENV.NODE_ENV === 'test';
const isProduction = ENV.NODE_ENV === 'production';

// AWS SDKクライアントのキャッシュ
const clients = {
  dynamoDb: null,
  dynamoDbDoc: null,
  sns: null,
  sts: null
};

/**
 * AWS SDKの基本設定オプションを取得する
 * @param {Object} additionalOptions - 追加オプション
 * @returns {Object} 設定オプション
 */
const getAWSOptions = (additionalOptions = {}) => {
  // 基本設定
  const options = {
    region: ENV.REGION,
    ...additionalOptions
  };
  
  // ローカル開発モードまたはテストモードの場合の設定
  if (isDevelopment || isTest) {
    // 各サービスの開発エンドポイント設定
    if (additionalOptions.service === 'dynamodb' && ENV.DYNAMODB_ENDPOINT) {
      options.endpoint = ENV.DYNAMODB_ENDPOINT;
    } else if (additionalOptions.service === 'sns' && ENV.SNS_ENDPOINT) {
      options.endpoint = ENV.SNS_ENDPOINT;
    } else if (additionalOptions.service === 'sts' && ENV.STS_ENDPOINT) {
      options.endpoint = ENV.STS_ENDPOINT;
    } else if (ENV.AWS_ENDPOINT) {
      options.endpoint = ENV.AWS_ENDPOINT;
    }
    
    // ローカル開発用の認証情報
    if (options.endpoint) {
      options.credentials = {
        accessKeyId: 'test',
        secretAccessKey: 'test'
      };
    }
  }
  
  // エラー処理とロギングを設定（SDKv3ではロガーの設定方法が異なる）
  if (ENV.LOG_LEVEL === 'debug') {
    options.logger = {
      debug: (message) => logger.debug(`AWS SDK: ${message}`),
      info: (message) => logger.debug(`AWS SDK: ${message}`),
      warn: (message) => logger.warn(`AWS SDK: ${message}`),
      error: (message) => logger.error(`AWS SDK: ${message}`)
    };
  }
  
  return options;
};

/**
 * DynamoDB クライアントインスタンスを取得
 * @returns {DynamoDBClient} DynamoDBクライアント
 */
const getDynamoDbClient = () => {
  if (clients.dynamoDb) {
    return clients.dynamoDb;
  }
  
  clients.dynamoDb = new DynamoDBClient(
    getAWSOptions({ service: 'dynamodb' })
  );
  
  return clients.dynamoDb;
};

/**
 * DynamoDB DocumentClient インスタンスを取得（高レベルAPI）
 * @returns {DynamoDBDocumentClient} DynamoDB DocumentClient
 */
const getDynamoDb = () => {
  if (clients.dynamoDbDoc) {
    return clients.dynamoDbDoc;
  }
  
  const dbClient = getDynamoDbClient();
  clients.dynamoDbDoc = DynamoDBDocumentClient.from(dbClient, {
    marshallOptions: {
      convertEmptyValues: true,
      removeUndefinedValues: true,
      convertClassInstanceToMap: true
    }
  });
  
  return clients.dynamoDbDoc;
};

/**
 * SNSクライアントインスタンスを取得
 * @returns {SNSClient} SNSクライアント
 */
const getSNS = () => {
  if (clients.sns) {
    return clients.sns;
  }
  
  clients.sns = new SNSClient(
    getAWSOptions({ service: 'sns' })
  );
  
  return clients.sns;
};

/**
 * STS (Security Token Service) クライアントインスタンスを取得
 * @returns {STSClient} STSクライアント
 */
const getSTS = () => {
  if (clients.sts) {
    return clients.sts;
  }
  
  clients.sts = new STSClient(
    getAWSOptions({ service: 'sts' })
  );
  
  return clients.sts;
};

/**
 * AWS設定をリセットする（テスト用）
 */
const resetAWSConfig = () => {
  clients.dynamoDb = null;
  clients.dynamoDbDoc = null;
  clients.sns = null;
  clients.sts = null;
};

module.exports = {
  getDynamoDb,
  getSNS,
  getSTS,
  resetAWSConfig,
  // テスト用に追加
  getDynamoDbClient,
  ENV,
  isDevelopment,
  isTest,
  isProduction
};
