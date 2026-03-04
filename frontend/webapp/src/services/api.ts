/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/services/api.ts
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
 * - 2025-05-20 15:45:00 AWS環境対応 - 互換性のためのinitGoogleDriveAPI関数を追加
 * - 2025-05-20 16:30:00 AWS環境対応 - インポート関数名を修正
 *
 * 説明:
 * API関連の関数をまとめたエントリーポイント。市場データ取得関数と
 * バックエンドAPIへのアクセス機能を提供する。
 */

// 市場データサービスをインポート - 正しい関数名にマッピング
import {
  fetchStockData as fetchTickerData,
  fetchExchangeRate,
  fetchMultipleStocks as fetchMultipleTickerData,
  fetchApiStatus
} from './marketDataService';

// 新しいGoogleDriveフックをインポート
import useGoogleDrive from '../hooks/useGoogleDrive';

// APIの基本URL
const MARKET_DATA_API_URL: string = import.meta.env.VITE_MARKET_DATA_API_URL || 'http://localhost:3000';
const API_STAGE: string = import.meta.env.VITE_API_STAGE || 'dev';

interface GoogleDriveResult {
  success: boolean;
  message: string;
}

interface GoogleDriveAPI {
  saveFile: (portfolioData: any) => Promise<GoogleDriveResult>;
  loadFile: (fileId: string) => Promise<GoogleDriveResult>;
  listFiles: () => Promise<GoogleDriveResult>;
}

interface DataFreshnessResult {
  success: boolean;
  fresh: boolean;
}

/**
 * APIエンドポイントを取得する
 */
export const getApiEndpoint = (type: string): string => {
  // 開発環境でローカルホストの場合はステージプレフィックスを追加しない
  const isLocalDev: boolean = MARKET_DATA_API_URL.includes('localhost');
  const basePath: string = isLocalDev ? '' : `/${API_STAGE}`;

  switch (type) {
    case 'market-data':
      return `${MARKET_DATA_API_URL}${basePath}/api/market-data`;
    case 'auth':
      return `${MARKET_DATA_API_URL}${basePath}/auth`;
    case 'drive':
      return `${MARKET_DATA_API_URL}${basePath}/drive`;
    default:
      return `${MARKET_DATA_API_URL}${basePath}`;
  }
};

/**
 * 市場データ取得関連の関数をエクスポート
 */
export { fetchTickerData, fetchExchangeRate, fetchMultipleTickerData, fetchApiStatus };

// 互換性のために仮実装
export const fetchFundInfo = async (fundId: string, fundName?: string): Promise<any> => {
  console.warn('[API] fetchFundInfo is not implemented yet. Using fetchTickerData as fallback.');
  return fetchTickerData(fundId);
};

export const fetchDividendData = async (ticker: string): Promise<any> => {
  console.warn('[API] fetchDividendData is not implemented yet. Using fetchTickerData as fallback.');
  return fetchTickerData(ticker);
};

export const checkDataFreshness = async (): Promise<DataFreshnessResult> => {
  console.warn('[API] checkDataFreshness is not implemented yet.');
  return { success: true, fresh: true };
};

/**
 * Google Drive APIを初期化する関数
 * 互換性のために残していますが、新しいコードでは useGoogleDrive フックを使用することを推奨します。
 */
export const initGoogleDriveAPI = (): GoogleDriveAPI => {
  console.warn('[API] initGoogleDriveAPI is deprecated. Use useGoogleDrive hook instead.');

  // 注意: これはReactフックの原則に違反する可能性があるため、
  // 既存コードとの互換性のためだけに提供しています。
  // 新しいコンポーネントでは必ずuseGoogleDriveフックを直接使用してください。

  return {
    saveFile: async (portfolioData: any): Promise<GoogleDriveResult> => {
      console.warn('[API] Using deprecated Google Drive API method. Please update your code to use useGoogleDrive hook.');
      // フックの外部での使用なので、実際の機能は提供できません
      return { success: false, message: 'この関数は非推奨です。useGoogleDriveフックを使用してください。' };
    },

    loadFile: async (fileId: string): Promise<GoogleDriveResult> => {
      console.warn('[API] Using deprecated Google Drive API method. Please update your code to use useGoogleDrive hook.');
      // フックの外部での使用なので、実際の機能は提供できません
      return { success: false, message: 'この関数は非推奨です。useGoogleDriveフックを使用してください。' };
    },

    listFiles: async (): Promise<GoogleDriveResult> => {
      console.warn('[API] Using deprecated Google Drive API method. Please update your code to use useGoogleDrive hook.');
      // フックの外部での使用なので、実際の機能は提供できません
      return { success: false, message: 'この関数は非推奨です。useGoogleDriveフックを使用してください。' };
    }
  };
};

/**
 * Deprecated: これらの関数はAuthContext経由で提供されるため、直接使用しないでください。
 * 互換性のために残していますが、新しいコードでは使用しないでください。
 */

export const setGoogleAccessToken = (token: string): void => {
  console.warn('[API] setGoogleAccessToken is deprecated. Use AuthContext methods instead.');
};

export const getGoogleAccessToken = async (): Promise<string | null> => {
  console.warn('[API] getGoogleAccessToken is deprecated. Use AuthContext methods instead.');
  return null;
};

export const saveToGoogleDrive = async (data: any, userData: any, filename: string = 'portfolio_data.json'): Promise<GoogleDriveResult> => {
  console.warn('[API] saveToGoogleDrive is deprecated. Use AuthContext.saveToDrive instead.');
  return { success: false, message: 'この関数は非推奨です。AuthContext.saveToDriveを使用してください。' };
};

export const loadFromGoogleDrive = async (userData: any, filename: string = 'portfolio_data.json'): Promise<GoogleDriveResult> => {
  console.warn('[API] loadFromGoogleDrive is deprecated. Use AuthContext.loadFromDrive instead.');
  return { success: false, message: 'この関数は非推奨です。AuthContext.loadFromDriveを使用してください。' };
};
