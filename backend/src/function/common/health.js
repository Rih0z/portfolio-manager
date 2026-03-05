/**
 * ヘルスチェックエンドポイント
 *
 * GET /health
 * DynamoDB 接続確認を含むアプリケーション状態チェック。
 *
 * @file src/function/common/health.js
 */
'use strict';

const { DynamoDBClient, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const { getCorsHeaders } = require('../../utils/corsHeaders');

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-west-2',
});

module.exports.handler = async (event) => {
  const startTime = Date.now();
  const checks = {};

  // DynamoDB 接続チェック
  try {
    const tableName = process.env.CACHE_TABLE || 'pfwise-api-dev-cache';
    await dynamoClient.send(new DescribeTableCommand({ TableName: tableName }));
    checks.dynamodb = 'ok';
  } catch (error) {
    checks.dynamodb = `error: ${error.message}`;
  }

  const allOk = Object.values(checks).every(v => v === 'ok');
  const responseTime = Date.now() - startTime;

  const body = {
    status: allOk ? 'healthy' : 'degraded',
    version: '1.0.0',
    stage: process.env.NODE_ENV || 'dev',
    timestamp: new Date().toISOString(),
    responseTime: `${responseTime}ms`,
    checks,
  };

  return {
    statusCode: allOk ? 200 : 503,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(event),
    },
    body: JSON.stringify(body),
  };
};
