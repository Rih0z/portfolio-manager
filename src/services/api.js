// src/services/api.js

import axios from 'axios';
import { estimateAnnualFee, guessFundType, extractFundInfo, FUND_TYPES } from '../utils/fundUtils';

/**
 * 強制的にYahoo Finance API利用を無効化し、Alpha Vantageのみを使用するバージョン
 * 401エラーの完全な解決のため
 */

// 環境に応じたベースURL設定
const isLocalhost = 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1';

// 本番環境のURLは環境変数から取得、未設定の場合は現在のオリジンを使用
const PROD_BASE_URL = process.env.REACT_APP_API_BASE_URL || 
                     (!isLocalhost ? window.location.origin : 'https://delicate-malasada-1fb747.netlify.app');

// Alpha Vantage APIエンドポイント（プライマリデータソース）
const ALPHA_VANTAGE_URL = isLocalhost
  ? '/.netlify/functions/alpha-vantage-proxy' // ローカル環境
  : `${PROD_BASE_URL}/.netlify/functions/alpha-vantage-proxy`; // 本番環境

// 環境変数または固定値からAPIキーを取得
const ALPHA_VANTAGE_KEY = process.env.REACT_APP_ALPHA_VANTAGE_API_KEY || 'GC4EBI5YHFKOJEXY';

// デバッグ用：初期起動時に設定を表示
console.log(`API Configuration (FORCED ALPHA VANTAGE MODE):
- Environment: ${isLocalhost ? 'Local development' : 'Production'}
- Alpha Vantage URL: ${ALPHA_VANTAGE_URL}
- Alpha Vantage Key: ${ALPHA_VANTAGE_KEY.substring(0, 4)}...`);

/**
 * 銘柄データを取得する（Alpha Vantageのみを使用）
 * @param {string} ticker - ティッカーシンボル
 * @returns {Promise<Object>} 銘柄データ
 */
export async function fetchTickerData(ticker) {
  console.log(`[API] Fetching ticker data for ${ticker} using Alpha Vantage only`);
  
  try {
    const response = await axios.get(ALPHA_VANTAGE_URL, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: ticker,
        apikey: ALPHA_VANTAGE_KEY
      },
      timeout: 15000,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    console.log(`[API] Alpha Vantage response for ${ticker}:`, response.data);
    
    // Alpha Vantageのレート制限チェック
    if (response.data && response.data.Note && response.data.Note.includes('API call frequency')) {
      console.warn('[API] Alpha Vantage rate limit reached');
      return generateFallbackData(ticker);
    }
    
    // データチェック
    if (response.data && response.data['Global Quote'] && response.data['Global Quote']['05. price']) {
      const quoteData = response.data['Global Quote'];
      const price = parseFloat(quoteData['05. price']);
      
      // ティッカー情報から銘柄名を推定
      let name = ticker;
      
      // ファンド情報の取得（種類と手数料率の推定）
      const fundInfo = extractFundInfo(ticker, name);
      const fundType = guessFundType(ticker, name);
      const feeInfo = estimateAnnualFee(ticker, name);
      
      // 個別株かどうかを判定
      const isStock = fundType === FUND_TYPES.STOCK;
      
      // 個別株の場合は手数料を必ず0に設定
      const annualFee = isStock ? 0 : feeInfo.fee;
      
      console.log(`[API] Estimated fund type for ${ticker}: ${fundType} with fee ${isStock ? 0 : feeInfo.fee}%`);
      
      // 基本情報を返す
      return {
        id: ticker,
        name: ticker, // Alpha Vantageは銘柄名を提供しないのでティッカーを使用
        ticker: ticker,
        exchangeMarket: ticker.includes('.T') ? 'Japan' : 'US',
        price: price,
        currency: ticker.includes('.T') ? 'JPY' : 'USD',
        holdings: 0,
        annualFee: annualFee,
        fundType: fundType,
        feeSource: isStock ? '個別株' : feeInfo.source,
        feeIsEstimated: isStock ? false : feeInfo.isEstimated,
        region: fundInfo.region,
        isStock: isStock,
        lastUpdated: new Date().toISOString(),
        source: 'Alpha Vantage'
      };
    }
    
    // データが見つからない場合はフォールバック
    console.warn(`[API] No valid data found for ${ticker}`);
    return generateFallbackData(ticker);
  } 
  catch (error) {
    console.error('[API] Alpha Vantage error:', error.message);
    return generateFallbackData(ticker);
  }
}

/**
 * フォールバックデータを生成
 * @param {string} ticker - ティッカーシンボル
 * @returns {Object} - 生成されたフォールバックデータ
 */
function generateFallbackData(ticker) {
  console.log(`[API] Using fallback data for ${ticker}`);
  
  // 市場を簡易判定
  const isJapanese = ticker.includes('.T');
  const defaultPrice = isJapanese ? 2500 : 150;
  
  // ファンド情報の取得（種類と手数料率の推定）
  const fundInfo = extractFundInfo(ticker);
  const fundType = guessFundType(ticker);
  const feeInfo = estimateAnnualFee(ticker);
  
  // 個別株かどうかを判定
  const isStock = fundType === FUND_TYPES.STOCK;
  
  // 個別株の場合は手数料を必ず0に設定
  const annualFee = isStock ? 0 : feeInfo.fee;
  
  return {
    id: ticker,
    name: ticker,
    ticker: ticker,
    exchangeMarket: isJapanese ? 'Japan' : 'US',
    price: defaultPrice,
    currency: isJapanese ? 'JPY' : 'USD',
    holdings: 0,
    annualFee: annualFee,
    fundType: fundType,
    feeSource: isStock ? '個別株' : feeInfo.source,
    feeIsEstimated: isStock ? false : feeInfo.isEstimated,
    region: fundInfo.region,
    isStock: isStock,
    lastUpdated: new Date().toISOString(),
    source: 'Fallback'
  };
}

/**
 * 為替レートを取得する
 * @param {string} fromCurrency - 元の通貨
 * @param {string} toCurrency - 変換先通貨
 * @returns {Promise<Object>} - 為替レートデータ
 */
export async function fetchExchangeRate(fromCurrency, toCurrency) {
  console.log(`[API] Fetching exchange rate ${fromCurrency}/${toCurrency}`);
  
  // 同一通貨の場合は1を返す
  if (fromCurrency === toCurrency) {
    return {
      rate: 1,
      source: 'Direct',
      lastUpdated: new Date().toISOString()
    };
  }
  
  try {
    // Alpha Vantage APIから為替レートを取得
    const response = await axios.get(ALPHA_VANTAGE_URL, {
      params: {
        function: 'CURRENCY_EXCHANGE_RATE',
        from_currency: fromCurrency,
        to_currency: toCurrency,
        apikey: ALPHA_VANTAGE_KEY
      },
      timeout: 15000
    });
    
    // レスポンスを確認
    if (response.data && 
        response.data['Realtime Currency Exchange Rate'] && 
        response.data['Realtime Currency Exchange Rate']['5. Exchange Rate']) {
      
      const rate = parseFloat(response.data['Realtime Currency Exchange Rate']['5. Exchange Rate']);
      
      return {
        rate: rate,
        source: 'Alpha Vantage',
        lastUpdated: new Date().toISOString()
      };
    }
    
    // データが見つからない場合はフォールバック
    return getFallbackExchangeRate(fromCurrency, toCurrency);
  } 
  catch (error) {
    console.error('[API] Exchange rate error:', error.message);
    return getFallbackExchangeRate(fromCurrency, toCurrency);
  }
}

/**
 * フォールバックの為替レートを取得
 * @param {string} fromCurrency - 元の通貨
 * @param {string} toCurrency - 変換先通貨
 * @returns {Object} - フォールバックの為替レート
 */
function getFallbackExchangeRate(fromCurrency, toCurrency) {
  console.log(`[API] Using fallback exchange rate for ${fromCurrency}/${toCurrency}`);
  
  let rate = 1;
  
  // 主要な通貨ペアのデフォルト値
  if (fromCurrency === 'USD' && toCurrency === 'JPY') {
    rate = 150.0;
  } 
  else if (fromCurrency === 'JPY' && toCurrency === 'USD') {
    rate = 1 / 150.0;
  }
  else if (fromCurrency === 'EUR' && toCurrency === 'USD') {
    rate = 1.1;
  }
  else if (fromCurrency === 'EUR' && toCurrency === 'JPY') {
    rate = 160.0;
  }
  
  return {
    rate: rate,
    source: 'Fallback',
    lastUpdated: new Date().toISOString()
  };
}

/**
 * ファンド情報を取得する
 * @param {string} ticker - ティッカーシンボル
 * @returns {Promise<Object>} ファンド情報
 */
export async function fetchFundInfo(ticker) {
  console.log(`[API] Fetching fund info for ${ticker}`);
  
  try {
    // まずはティッカーシンボルから基本情報を推定
    const fundInfo = extractFundInfo(ticker);
    const fundType = guessFundType(ticker);
    const feeInfo = estimateAnnualFee(ticker);
    
    // 個別株かどうかを判定
    const isStock = fundType === FUND_TYPES.STOCK;
    
    // 個別株の場合は手数料を必ず0に設定
    const annualFee = isStock ? 0 : feeInfo.fee;
    
    return {
      success: true,
      ticker: ticker,
      fundType: fundType,
      annualFee: annualFee,
      feeSource: isStock ? '個別株' : feeInfo.source,
      feeIsEstimated: isStock ? false : feeInfo.isEstimated,
      region: fundInfo.region,
      isStock: isStock,
      lastUpdated: new Date().toISOString(),
      source: 'Estimated'
    };
  } 
  catch (error) {
    console.error('[API] Fund info error:', error.message);
    
    // エラーが発生した場合もデフォルト値を返す
    return {
      success: false,
      ticker: ticker,
      fundType: 'unknown',
      annualFee: 0, // エラー時はデフォルトで0を返す
      feeSource: 'Default',
      feeIsEstimated: true,
      region: 'unknown',
      isStock: false,
      lastUpdated: new Date().toISOString(),
      source: 'Fallback'
    };
  }
}

// ここからGoogleドライブAPI連携のコードを追加

// GoogleドライブAPIの初期化フラグ
let isGapiInitialized = false;
let isGapiLoaded = false;

/**
 * GoogleドライブAPIの初期化
 * @returns {Promise<boolean>} 初期化が成功したかどうか
 */
export async function initGoogleDriveAPI() {
  console.log('[API] Initializing Google Drive API');
  
  if (!window.gapi) {
    console.error('[API] Google API client (gapi) not found');
    return false;
  }
  
  // 既に初期化済みの場合は何もしない
  if (isGapiInitialized) {
    console.log('[API] Google Drive API already initialized');
    return true;
  }
  
  try {
    return new Promise((resolve, reject) => {
      // gapiのロード
      if (!isGapiLoaded) {
        window.gapi.load('client:auth2', () => {
          isGapiLoaded = true;
          console.log('[API] Google API client loaded');
          
          // クライアント初期化
          window.gapi.client.init({
            apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
            clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
            scope: 'https://www.googleapis.com/auth/drive.file'
          }).then(() => {
            isGapiInitialized = true;
            console.log('[API] Google Drive API initialized successfully');
            resolve(true);
          }).catch(error => {
            console.error('[API] Error initializing Google Drive API:', error);
            reject(error);
          });
        }, error => {
          console.error('[API] Error loading Google API client:', error);
          reject(error);
        });
      } else {
        // 既にロード済み、初期化のみ行う
        window.gapi.client.init({
          apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
          clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
          scope: 'https://www.googleapis.com/auth/drive.file'
        }).then(() => {
          isGapiInitialized = true;
          console.log('[API] Google Drive API initialized successfully');
          resolve(true);
        }).catch(error => {
          console.error('[API] Error initializing Google Drive API:', error);
          reject(error);
        });
      }
    });
  } catch (error) {
    console.error('[API] Error in Google Drive API initialization:', error);
    return false;
  }
}

/**
 * Googleドライブにデータを保存する
 * @param {Object} data - 保存するデータ
 * @param {Object} userData - ユーザー情報
 * @param {string} filename - ファイル名
 * @returns {Promise<Object>} 保存結果
 */
export async function saveToGoogleDrive(data, userData, filename = 'portfolio_data.json') {
  console.log('[API] Saving data to Google Drive:', { data, userData, filename });
  
  if (!userData || !userData.email) {
    console.error('[API] User data is required for Google Drive operations');
    return { success: false, message: 'ユーザー情報がありません' };
  }
  
  try {
    // APIが初期化されていることを確認
    if (!isGapiInitialized) {
      await initGoogleDriveAPI();
    }
    
    // JSONデータに変換
    const jsonContent = JSON.stringify(data);
    const fileMetadata = {
      name: filename,
      mimeType: 'application/json',
      parents: ['appDataFolder'] // アプリ専用フォルダに保存
    };
    
    // 既存のファイルを確認
    const existingFiles = await findFileInGoogleDrive(filename);
    
    if (existingFiles && existingFiles.length > 0) {
      // 既存ファイルの更新
      const fileId = existingFiles[0].id;
      console.log(`[API] Updating existing file in Google Drive: ${fileId}`);
      
      const response = await window.gapi.client.drive.files.update({
        fileId: fileId,
        resource: fileMetadata,
        media: {
          mimeType: 'application/json',
          body: jsonContent
        },
        fields: 'id,name,modifiedTime'
      });
      
      console.log('[API] File updated in Google Drive:', response.result);
      return { 
        success: true, 
        message: 'データを更新しました',
        fileId: response.result.id,
        fileName: response.result.name,
        modifiedTime: response.result.modifiedTime
      };
    } else {
      // 新規ファイルの作成
      console.log('[API] Creating new file in Google Drive');
      
      const response = await window.gapi.client.drive.files.create({
        resource: fileMetadata,
        media: {
          mimeType: 'application/json',
          body: jsonContent
        },
        fields: 'id,name,modifiedTime'
      });
      
      console.log('[API] File created in Google Drive:', response.result);
      return { 
        success: true, 
        message: 'データを保存しました',
        fileId: response.result.id,
        fileName: response.result.name,
        modifiedTime: response.result.modifiedTime
      };
    }
  } catch (error) {
    console.error('[API] Error saving to Google Drive:', error);
    return { success: false, message: `Googleドライブへの保存に失敗しました: ${error.message}` };
  }
}

/**
 * Googleドライブからデータを読み込む
 * @param {Object} userData - ユーザー情報
 * @param {string} filename - ファイル名
 * @returns {Promise<Object>} 読み込み結果
 */
export async function loadFromGoogleDrive(userData, filename = 'portfolio_data.json') {
  console.log('[API] Loading data from Google Drive:', { userData, filename });
  
  if (!userData || !userData.email) {
    console.error('[API] User data is required for Google Drive operations');
    return { success: false, message: 'ユーザー情報がありません' };
  }
  
  try {
    // APIが初期化されていることを確認
    if (!isGapiInitialized) {
      await initGoogleDriveAPI();
    }
    
    // ファイルを検索
    const files = await findFileInGoogleDrive(filename);
    
    if (!files || files.length === 0) {
      console.log(`[API] No file found with name: ${filename}`);
      return { success: false, message: 'ファイルが見つかりません' };
    }
    
    // 最新のファイルを使用
    const fileId = files[0].id;
    console.log(`[API] Found file in Google Drive: ${fileId}`);
    
    // ファイルの内容を取得
    const response = await window.gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media'
    });
    
    console.log('[API] File content retrieved from Google Drive');
    
    // レスポンスをJSONとしてパース
    const data = JSON.parse(response.body);
    
    return { 
      success: true, 
      message: 'データを読み込みました',
      data: data,
      fileId: fileId,
      fileName: filename,
      modifiedTime: files[0].modifiedTime
    };
  } catch (error) {
    console.error('[API] Error loading from Google Drive:', error);
    return { success: false, message: `Googleドライブからの読み込みに失敗しました: ${error.message}` };
  }
}

/**
 * Googleドライブ上のファイルを検索する
 * @param {string} filename - 検索するファイル名
 * @returns {Promise<Array>} - 見つかったファイルの配列
 */
async function findFileInGoogleDrive(filename) {
  try {
    console.log(`[API] Searching for file: ${filename}`);
    
    const response = await window.gapi.client.drive.files.list({
      spaces: 'appDataFolder',
      q: `name='${filename}' and trashed=false`,
      fields: 'files(id, name, modifiedTime)',
      orderBy: 'modifiedTime desc'
    });
    
    console.log('[API] Files found in Google Drive:', response.result.files);
    return response.result.files;
  } catch (error) {
    console.error('[API] Error finding files in Google Drive:', error);
    throw error;
  }
}

/**
 * Googleドライブ上のポートフォリオデータファイルを一覧表示する
 * @param {Object} userData - ユーザー情報
 * @returns {Promise<Object>} - ファイル一覧の結果
 */
export async function listPortfolioFilesInGoogleDrive(userData) {
  console.log('[API] Listing portfolio files in Google Drive');
  
  if (!userData || !userData.email) {
    console.error('[API] User data is required for Google Drive operations');
    return { success: false, message: 'ユーザー情報がありません' };
  }
  
  try {
    // APIが初期化されていることを確認
    if (!isGapiInitialized) {
      await initGoogleDriveAPI();
    }
    
    const response = await window.gapi.client.drive.files.list({
      spaces: 'appDataFolder',
      q: "name contains 'portfolio' and mimeType='application/json' and trashed=false",
      fields: 'files(id, name, modifiedTime)',
      orderBy: 'modifiedTime desc'
    });
    
    console.log('[API] Portfolio files found in Google Drive:', response.result.files);
    
    return { 
      success: true, 
      files: response.result.files
    };
  } catch (error) {
    console.error('[API] Error listing files in Google Drive:', error);
    return { success: false, message: `Googleドライブのファイル一覧取得に失敗しました: ${error.message}` };
  }
}

/**
 * Googleドライブ上のファイルを削除する
 * @param {string} fileId - 削除するファイルのID
 * @param {Object} userData - ユーザー情報
 * @returns {Promise<Object>} - 削除結果
 */
export async function deleteFileFromGoogleDrive(fileId, userData) {
  console.log(`[API] Deleting file from Google Drive: ${fileId}`);
  
  if (!userData || !userData.email) {
    console.error('[API] User data is required for Google Drive operations');
    return { success: false, message: 'ユーザー情報がありません' };
  }
  
  if (!fileId) {
    return { success: false, message: 'ファイルIDが指定されていません' };
  }
  
  try {
    // APIが初期化されていることを確認
    if (!isGapiInitialized) {
      await initGoogleDriveAPI();
    }
    
    await window.gapi.client.drive.files.delete({
      fileId: fileId
    });
    
    console.log(`[API] File deleted from Google Drive: ${fileId}`);
    
    return { 
      success: true, 
      message: 'ファイルを削除しました',
      fileId: fileId 
    };
  } catch (error) {
    console.error('[API] Error deleting file from Google Drive:', error);
    return { success: false, message: `ファイルの削除に失敗しました: ${error.message}` };
  }
}
