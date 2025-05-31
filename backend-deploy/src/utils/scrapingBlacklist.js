/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/utils/scrapingBlacklist.js
 * 
 * 説明: 
 * スクレイピングの失敗を追跡し、一定回数以上失敗した銘柄を
 * 一定期間（デフォルト1週間）スキップするための機能を提供します。
 * これにより、繰り返し失敗する銘柄への無駄なリクエストを減らし、
 * リソース消費とエラー率を低減します。
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-14
 */
'use strict';

const { getDynamoDb } = require('./awsConfig');
const { GetCommand, PutCommand, UpdateCommand, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const alertService = require('../services/alerts');

// 環境変数から設定を取得（またはデフォルト値を使用）
const BLACKLIST_TABLE = process.env.SCRAPING_BLACKLIST_TABLE || `${process.env.DYNAMODB_TABLE_PREFIX || 'portfolio-market-data-'}-scraping-blacklist`;
const MAX_FAILURES = parseInt(process.env.SCRAPING_MAX_FAILURES || '3', 10);
const COOLDOWN_DAYS = parseInt(process.env.SCRAPING_COOLDOWN_DAYS || '7', 10);

/**
 * 銘柄がブラックリストに登録されているか確認する
 * @param {string} symbol - 銘柄コード
 * @param {string} market - 市場種別（'jp', 'us', 'fund'）
 * @returns {Promise<boolean>} ブラックリストに登録されていればtrue
 */
const isBlacklisted = async (symbol, market) => {
  try {
    const dynamoDb = getDynamoDb();
    
    const params = {
      TableName: BLACKLIST_TABLE,
      Key: { symbol }
    };
    
    const result = await dynamoDb.send(new GetCommand(params));
    
    if (!result.Item) {
      return false;
    }
    
    // 対象の市場と一致するか確認
    if (result.Item.market !== market) {
      return false;
    }
    
    // クールダウン期間が終了したかチェック
    const now = new Date();
    const cooldownUntil = new Date(result.Item.cooldownUntil);
    
    if (now > cooldownUntil) {
      // クールダウン期間が終了したらブラックリストから削除
      // module.exports を通して呼び出すことで、
      // Jest からのスパイが機能するようにする
      await module.exports.removeFromBlacklist(symbol);
      return false;
    }
    
    // クールダウン中の場合は残り時間をログ
    const remainingTime = Math.ceil((cooldownUntil - now) / (1000 * 60 * 60 * 24));
    console.log(`Symbol ${symbol} is blacklisted. Cooldown remaining: ${remainingTime} days`);
    
    return true;
  } catch (error) {
    console.error(`Error checking blacklist for ${symbol}:`, error);
    // エラーがあった場合は安全のためfalseを返す（取得を試行）
    return false;
  }
};

/**
 * 失敗した銘柄の記録を更新する
 * @param {string} symbol - 銘柄コード
 * @param {string} market - 市場種別（'jp', 'us', 'fund'）
 * @param {string} reason - 失敗の理由
 * @returns {Promise<Object>} 更新結果
 */
const recordFailure = async (symbol, market, reason = 'Unknown error') => {
  try {
    const dynamoDb = getDynamoDb();
    
    // 現在の記録を取得
    const getParams = {
      TableName: BLACKLIST_TABLE,
      Key: { symbol }
    };
    
    const result = await dynamoDb.send(new GetCommand(getParams));
    
    const now = new Date();
    const item = result.Item || {
      symbol,
      market,
      failureCount: 0,
      firstFailure: now.toISOString()
    };
    
    // 失敗回数を増加
    item.failureCount += 1;
    item.lastFailure = now.toISOString();
    item.reason = reason;
    
    // MAX_FAILURES回以上失敗したら、クールダウン期間を設定
    if (item.failureCount >= MAX_FAILURES) {
      const cooldownUntil = new Date();
      cooldownUntil.setDate(cooldownUntil.getDate() + COOLDOWN_DAYS);
      item.cooldownUntil = cooldownUntil.toISOString();
      
      // アラート通知（銘柄がブラックリストに追加された）
      await alertService.sendAlert({
        subject: 'Symbol Added to Scraping Blacklist',
        message: `${symbol} (${market}) has been blacklisted after ${item.failureCount} consecutive failures.`,
        detail: {
          symbol,
          market,
          failureCount: item.failureCount,
          cooldownUntil: item.cooldownUntil,
          reason
        }
      });
    }
    
    // 更新または新規作成
    const putParams = {
      TableName: BLACKLIST_TABLE,
      Item: item
    };
    
    await dynamoDb.send(new PutCommand(putParams));
    
    return {
      symbol,
      failureCount: item.failureCount,
      isBlacklisted: item.failureCount >= MAX_FAILURES
    };
  } catch (error) {
    console.error(`Error recording failure for ${symbol}:`, error);
    return {
      symbol,
      error: error.message
    };
  }
};

/**
 * 銘柄のスクレイピング成功を記録し、失敗カウントをリセットする
 * @param {string} symbol - 銘柄コード
 * @returns {Promise<boolean>} 成功したらtrue
 */
const recordSuccess = async (symbol) => {
  try {
    const dynamoDb = getDynamoDb();
    
    // 現在の記録を取得
    const getParams = {
      TableName: BLACKLIST_TABLE,
      Key: { symbol }
    };
    
    const result = await dynamoDb.send(new GetCommand(getParams));
    
    // 記録がなければ何もしない
    if (!result.Item) {
      return true;
    }
    
    // ブラックリストから削除
    if (result.Item.failureCount >= MAX_FAILURES) {
      await module.exports.removeFromBlacklist(symbol);
    } else {
      // 失敗回数をリセット
      const updateParams = {
        TableName: BLACKLIST_TABLE,
        Key: { symbol },
        UpdateExpression: 'SET failureCount = :zero, lastSuccess = :now',
        ExpressionAttributeValues: {
          ':zero': 0,
          ':now': new Date().toISOString()
        }
      };
      
      await dynamoDb.send(new UpdateCommand(updateParams));
    }
    
    return true;
  } catch (error) {
    console.error(`Error recording success for ${symbol}:`, error);
    return false;
  }
};

/**
 * 銘柄をブラックリストから削除する
 * @param {string} symbol - 銘柄コード
 * @returns {Promise<boolean>} 成功したらtrue
 */
const removeFromBlacklist = async (symbol) => {
  try {
    const dynamoDb = getDynamoDb();
    
    const params = {
      TableName: BLACKLIST_TABLE,
      Key: { symbol }
    };
    
    await dynamoDb.send(new DeleteCommand(params));
    console.log(`Removed ${symbol} from blacklist`);
    
    return true;
  } catch (error) {
    console.error(`Error removing ${symbol} from blacklist:`, error);
    return false;
  }
};

/**
 * ブラックリストの全銘柄を取得する（管理用）
 * @returns {Promise<Array>} ブラックリストの銘柄一覧
 */
const getBlacklistedSymbols = async () => {
  try {
    const dynamoDb = getDynamoDb();
    
    const params = {
      TableName: BLACKLIST_TABLE,
      FilterExpression: 'cooldownUntil > :now',
      ExpressionAttributeValues: {
        ':now': new Date().toISOString()
      }
    };
    
    const result = await dynamoDb.send(new ScanCommand(params));
    
    return result.Items || [];
  } catch (error) {
    console.error('Error getting blacklisted symbols:', error);
    return [];
  }
};

/**
 * 期限切れのブラックリストエントリをクリーンアップする
 * @returns {Promise<Object>} クリーンアップ結果
 */
const cleanupBlacklist = async () => {
  try {
    const dynamoDb = getDynamoDb();
    
    // 期限切れのアイテムを検索
    const scanParams = {
      TableName: BLACKLIST_TABLE,
      FilterExpression: 'cooldownUntil < :now',
      ExpressionAttributeValues: {
        ':now': new Date().toISOString()
      }
    };
    
    const result = await dynamoDb.send(new ScanCommand(scanParams));
    const expiredItems = result.Items || [];
    
    // 期限切れアイテムを削除
    const deletePromises = expiredItems.map(item => {
      const deleteParams = {
        TableName: BLACKLIST_TABLE,
        Key: { symbol: item.symbol }
      };
      
      return dynamoDb.send(new DeleteCommand(deleteParams));
    });
    
    await Promise.all(deletePromises);
    
    return {
      success: true,
      cleanedItems: expiredItems.length
    };
  } catch (error) {
    console.error('Error cleaning up blacklist:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  isBlacklisted,
  recordFailure,
  recordSuccess,
  removeFromBlacklist,
  getBlacklistedSymbols,
  cleanupBlacklist
};

