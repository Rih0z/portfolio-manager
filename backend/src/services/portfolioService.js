/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/services/portfolioService.js
 * 
 * 説明: 
 * ポートフォリオデータの管理サービス。
 * ポートフォリオの保存・読込・変更・削除機能を提供します。
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-12
 * @updated 2025-05-18
 */
'use strict';

const googleDriveService = require('./googleDriveService');
const { withRetry } = require('../utils/retry');
const logger = require('../utils/logger');

/**
 * ポートフォリオを保存する
 * @param {Object} portfolioData - ポートフォリオデータ
 * @param {string} userId - ユーザーID
 * @param {string} accessToken - アクセストークン
 * @param {string} [fileId] - 更新する場合のファイルID
 * @returns {Promise<Object>} 保存結果
 */
const savePortfolio = async (portfolioData, userId, accessToken, fileId = null) => {
  try {
    // ポートフォリオデータを検証・正規化
    const validatedData = validatePortfolioData({
      ...portfolioData,
      createdBy: userId,
      lastUpdated: new Date().toISOString()
    });
    
    // ファイル名の作成（テストに合わせた形式）
    const fileName = `${validatedData.name.replace(/[^a-zA-Z0-9]/g, '_')}_portfolio.json`;
    
    // データをJSON文字列に変換
    const content = JSON.stringify(validatedData, null, 2);
    
    // Google Driveに保存
    const saveResult = await googleDriveService.saveFile(
      fileName,
      content,
      'application/json',
      accessToken,
      fileId
    );
    
    return saveResult;
  } catch (error) {
    logger.error('Error saving portfolio:', error);
    throw new Error(`Failed to save portfolio: ${error.message}`);
  }
};

/**
 * ポートフォリオを取得する
 * @param {string} fileId - ファイルID
 * @param {string} accessToken - アクセストークン
 * @returns {Promise<Object>} ポートフォリオデータ
 */
const getPortfolio = async (fileId, accessToken) => {
  try {
    // Google Driveからファイルを取得
    const fileContent = await googleDriveService.getFile(fileId, accessToken);
    
    try {
      // JSONとしてパース
      const portfolioData = JSON.parse(fileContent);
      
      // 古い形式のデータを新形式に変換
      const convertedData = convertLegacyPortfolio(portfolioData);
      
      // データを検証・正規化
      const validatedData = validatePortfolioData(convertedData);
      
      return validatedData;
    } catch (parseError) {
      logger.error('Error parsing portfolio data:', parseError);
      throw new Error('Invalid portfolio data format');
    }
  } catch (error) {
    logger.error(`Error getting portfolio ${fileId}:`, error);
    throw error;
  }
};

/**
 * ポートフォリオ一覧を取得する
 * @param {string} accessToken - アクセストークン
 * @param {string} [nameFilter] - 名前フィルター
 * @returns {Promise<Array>} ポートフォリオファイル一覧
 */
const listPortfolios = async (accessToken, nameFilter = 'portfolio') => {
  try {
    // Google Driveからファイル一覧を取得
    const files = await googleDriveService.listFiles(
      nameFilter,
      'application/json',
      accessToken
    );
    
    return files;
  } catch (error) {
    logger.error('Error listing portfolios:', error);
    throw error;
  }
};

/**
 * ポートフォリオを削除する
 * @param {string} fileId - ファイルID
 * @param {string} accessToken - アクセストークン
 * @returns {Promise<boolean>} 成功したらtrue
 */
const deletePortfolio = async (fileId, accessToken) => {
  try {
    // Google Driveからファイルを削除
    const result = await googleDriveService.deleteFile(fileId, accessToken);
    return result;
  } catch (error) {
    logger.error(`Error deleting portfolio ${fileId}:`, error);
    throw error;
  }
};

/**
 * ポートフォリオデータを検証し、必要に応じてデフォルト値を設定する
 * @param {Object} data - 検証するポートフォリオデータ
 * @returns {Object} 検証済みのポートフォリオデータ
 */
const validatePortfolioData = (data = {}) => {
  // 検証済みデータを保持するオブジェクト
  const validated = { ...data };
  
  // ポートフォリオ名が無い場合はデフォルト値を設定
  if (!validated.name || typeof validated.name !== 'string') {
    validated.name = `Portfolio ${new Date().toISOString().substring(0, 10)}`;
  }
  
  // 保有銘柄が無い場合は空配列を設定
  if (!validated.holdings || !Array.isArray(validated.holdings)) {
    validated.holdings = [];
  } else {
    // 各保有銘柄を検証
    validated.holdings = validated.holdings.map(holding => {
      // シンボルが無い場合はスキップ
      if (!holding.symbol) {
        return null;
      }
      
      return {
        symbol: holding.symbol,
        shares: typeof holding.shares === 'number' ? holding.shares : 0,
        cost: typeof holding.cost === 'number' ? holding.cost : 0,
        ...holding
      };
    }).filter(Boolean); // nullを除外
  }
  
  // 最終更新日が無い場合は現在時刻を設定
  if (!validated.lastUpdated || typeof validated.lastUpdated !== 'string') {
    validated.lastUpdated = new Date().toISOString();
  }
  
  return validated;
};

/**
 * 古い形式のポートフォリオを新形式に変換する
 * @param {Object} portfolio - ポートフォリオデータ
 * @returns {Object} 変換後のポートフォリオデータ
 */
const convertLegacyPortfolio = (portfolio) => {
  const converted = { ...portfolio };
  
  // ポートフォリオ名の変換（portfolioName → name）
  if (portfolio.portfolioName) {
    converted.name = portfolio.portfolioName;
    delete converted.portfolioName;
  }
  
  // 保有銘柄の変換（stocks → holdings）
  if (portfolio.stocks && !portfolio.holdings) {
    converted.holdings = portfolio.stocks.map(stock => ({
      symbol: stock.symbol,
      shares: stock.quantity || stock.shares || 0,
      cost: stock.purchasePrice || stock.cost || 0,
      notes: stock.notes || '',
      sector: stock.sector || '',
      type: stock.type || 'equity'
    }));
    delete converted.stocks;
  }
  
  // 最終更新日の変換（lastUpdate → lastUpdated）
  if (portfolio.lastUpdate && !portfolio.lastUpdated) {
    converted.lastUpdated = portfolio.lastUpdate;
    delete converted.lastUpdate;
  }
  
  // 作成者の変換（userId → createdBy）
  if (portfolio.userId && !portfolio.createdBy) {
    converted.createdBy = portfolio.userId;
    delete converted.userId;
  }
  
  return converted;
};

module.exports = {
  savePortfolio,
  getPortfolio,
  listPortfolios,
  deletePortfolio,
  validatePortfolioData,
  convertLegacyPortfolio  // テスト用にexport
};
