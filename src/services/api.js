/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/services/api.js
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-11 17:20:00 
 * 
 * 更新履歴: 
 * - 2025-03-15 11:10:35 Koki Riho 初回作成
 * - 2025-03-30 14:25:50 Koki Riho Google Drive API連携を追加
 * - 2025-04-20 09:15:30 Koki Riho 配当データ取得関数を追加
 * - 2025-05-05 15:40:22 Koki Riho トークン取得処理の改善
 * - 2025-05-11 17:20:00 Koki Riho リファクタリング - 市場データ関連の関数を marketDataService.js に移動
 * - 2025-05-12 10:45:00 外部APIサーバー利用に修正、スクレイピング機能を削除
 * - 2025-05-12 15:30:00 バックエンド連携型認証に対応
 * 
 * 説明: 
 * API関連の関数をまとめたエントリーポイント。市場データ取得関数と
 * バックエンドAPIへのアクセス機能を提供する。
 */

// 市場データサービスをインポート
import { 
  fetchTickerData as fetchTickerDataService, 
  fetchExchangeRate as fetchExchangeRateService,
  fetchMultipleTickerData as fetchMultipleTickerDataService,
  fetchFundInfo as fetchFundInfoService,
  fetchDividendData as fetchDividendDataService,
  checkDataFreshness as checkDataFreshnessService
} from './marketDataService';

// APIの基本URL
const MARKET_DATA_API_URL = process.env.REACT_APP_MARKET_DATA_API_URL || 'http://localhost:3000';
const API_STAGE = process.env.REACT_APP_API_STAGE || 'dev';

/**
 * APIエンドポイントを取得する
 * @param {string} type - エンドポイントタイプ ('market-data', 'auth', 'drive')
 * @returns {string} エンドポイントURL
 */
export const getApiEndpoint = (type) => {
  switch (type) {
    case 'market-data':
      return `${MARKET_DATA_API_URL}/${API_STAGE}/api/market-data`;
    case 'auth':
      return `${MARKET_DATA_API_URL}/${API_STAGE}/auth`;
    case 'drive':
      return `${MARKET_DATA_API_URL}/${API_STAGE}/drive`;
    default:
      return `${MARKET_DATA_API_URL}/${API_STAGE}`;
  }
};

/**
 * 市場データ取得関連の関数をエクスポート
 */
export const fetchTickerData = fetchTickerDataService;
export const fetchExchangeRate = fetchExchangeRateService;
export const fetchMultipleTickerData = fetchMultipleTickerDataService;
export const fetchFundInfo = fetchFundInfoService;
export const fetchDividendData = fetchDividendDataService; 
export const checkDataFreshness = checkDataFreshnessService;

/**
 * Deprecated: これらの関数はAuthContext経由で提供されるため、直接使用しないでください。
 * 互換性のために残していますが、新しいコードでは使用しないでください。
 */

export const setGoogleAccessToken = (token) => {
  console.warn('[API] setGoogleAccessToken is deprecated. Use AuthContext methods instead.');
};

export const getGoogleAccessToken = async () => {
  console.warn('[API] getGoogleAccessToken is deprecated. Use AuthContext methods instead.');
  return null;
};

export const saveToGoogleDrive = async (data, userData, filename = 'portfolio_data.json') => {
  console.warn('[API] saveToGoogleDrive is deprecated. Use AuthContext.saveToDrive instead.');
  return { success: false, message: 'この関数は非推奨です。AuthContext.saveToDriveを使用してください。' };
};

export const loadFromGoogleDrive = async (userData, filename = 'portfolio_data.json') => {
  console.warn('[API] loadFromGoogleDrive is deprecated. Use AuthContext.loadFromDrive instead.');
  return { success: false, message: 'この関数は非推奨です。AuthContext.loadFromDriveを使用してください。' };
};
