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

// Google関連の設定
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY || '';
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '243939385276-0gga06ocrn3vumf7lasubcpdqjk49j3n.apps.googleusercontent.com';

// デバッグ用：初期起動時に設定を表示
console.log(`API Configuration:
- Environment: ${isLocalhost ? 'Local development' : 'Production'}
- Alpha Vantage URL: ${ALPHA_VANTAGE_URL}
- Alpha Vantage Key: ${ALPHA_VANTAGE_KEY.substring(0, 4)}...
- Google Client ID: ${GOOGLE_CLIENT_ID.substring(0, 10)}...`);

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

// ここからGoogleドライブAPI連携のコード（修正版）

// GoogleドライブAPIの初期化フラグ
let isGapiInitialized = false;
let isGapiLoaded = false;
let accessToken = null;

/**
 * GoogleドライブAPIの初期化（修正版）
 * @returns {Promise<boolean>} 初期化が成功したかどうか
 */
export async function initGoogleDriveAPI() {
  console.log('[API] Initializing Google Drive API');
  
  if (!window.gapi) {
    console.error('[API] Google API client (gapi) not found. Make sure the script is loaded in index.html');
    return false;
  }
  
  // アクセストークンが既に取得されている場合
  if (accessToken) {
    console.log('[API] Access token already available');
    return true;
  }
  
  try {
    // gapi.clientが既に存在するか確認
    if (!window.gapi.client) {
      // gapiクライアントライブラリを読み込む
      await new Promise((resolve, reject) => {
        window.gapi.load('client', {
          callback: resolve,
          onerror: reject,
          timeout: 5000,
          ontimeout: reject
        });
      });
    }
    
    // Google Drive APIを初期化
    await window.gapi.client.init({
      apiKey: GOOGLE_API_KEY,
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
    });
    
    console.log('[API] Google Drive API initialized successfully');
    isGapiInitialized = true;
    
    // アクセストークンを使用して認証
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file',
        callback: (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            accessToken = tokenResponse.access_token;
            console.log('[API] Access token acquired successfully');
          }
        }
      });
      
      // トークンリクエストを実行
      if (!accessToken) {
        tokenClient.requestAccessToken({ prompt: '' });
      }
    } else {
      console.error('[API] Google accounts oauth2 not found. Make sure the Google Identity Services script is loaded in index.html');
    }
    
    return true;
  } catch (error) {
    console.error('[API] Error initializing Google Drive API:', error);
    return false;
  }
}

/**
 * アクセストークンを設定する
 * @param {string} token - GoogleOAuthから取得したトークン
 */
export function setGoogleAccessToken(token) {
  console.log('[API] Setting Google access token');
  accessToken = token;
  
  if (token) {
    // トークンをAuthorizationヘッダーに設定
    window.gapi.client.setToken({
      access_token: token
    });
  }
}

/**
 * シンプル化されたGoogleドライブへのデータ保存
 * @param {Object} data - 保存するデータ
 * @param {Object} userData - ユーザー情報
 * @param {string} filename - ファイル名
 * @returns {Promise<Object>} 保存結果
 */
export async function saveToGoogleDrive(data, userData, filename = 'portfolio_data.json') {
  console.log('[API] Saving data to Google Drive:', { userData, filename });
  
  if (!userData || !userData.email) {
    console.error('[API] User data is required for Google Drive operations');
    return { success: false, message: 'ユーザー情報がありません' };
  }
  
  try {
    // トークンを取得
    const token = accessToken || localStorage.getItem('googleToken');
    if (!token) {
      console.error('[API] No access token available for Google Drive operations');
      return { success: false, message: 'アクセストークンがありません。再度ログインしてください。' };
    }
    
    // JSONデータに変換
    const jsonContent = JSON.stringify(data);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    
    // 直接Fetch APIを使用してファイルを作成/更新
    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify({
      name: filename,
      mimeType: 'application/json',
      parents: ['appDataFolder']
    })], { type: 'application/json' }));
    formData.append('file', blob);
    
    // メディアアップロードを使用
    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    const result = await response.json();
    console.log('[API] File saved to Google Drive:', result);
    
    return {
      success: true,
      message: 'データを保存しました',
      fileId: result.id,
      fileName: result.name
    };
  } catch (error) {
    console.error('[API] Error saving to Google Drive:', error);
    return { success: false, message: `Googleドライブへの保存に失敗しました: ${error.message}` };
  }
}

/**
 * シンプル化されたGoogleドライブからのデータ読み込み
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
    // トークンを取得
    const token = accessToken || localStorage.getItem('googleToken');
    if (!token) {
      console.error('[API] No access token available for Google Drive operations');
      return { success: false, message: 'アクセストークンがありません。再度ログインしてください。' };
    }
    
    // ファイルを検索
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${filename}'`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!searchResponse.ok) {
      throw new Error(`HTTP error ${searchResponse.status}: ${await searchResponse.text()}`);
    }
    
    const searchResult = await searchResponse.json();
    console.log('[API] Search results:', searchResult);
    
    if (!searchResult.files || searchResult.files.length === 0) {
      console.log(`[API] No file found with name: ${filename}`);
      return { success: false, message: 'ファイルが見つかりません' };
    }
    
    // 最新のファイルを取得
    const fileId = searchResult.files[0].id;
    const fileResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!fileResponse.ok) {
      throw new Error(`HTTP error ${fileResponse.status}: ${await fileResponse.text()}`);
    }
    
    const data = await fileResponse.json();
    console.log('[API] File content retrieved from Google Drive');
    
    return {
      success: true,
      message: 'データを読み込みました',
      data: data,
      fileId: fileId,
      fileName: filename
    };
  } catch (error) {
    console.error('[API] Error loading from Google Drive:', error);
    return { success: false, message: `Googleドライブからの読み込みに失敗しました: ${error.message}` };
  }
}

/**
 * シンプル化されたGoogleドライブのファイル削除
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
    // トークンを取得
    const token = accessToken || localStorage.getItem('googleToken');
    if (!token) {
      console.error('[API] No access token available for Google Drive operations');
      return { success: false, message: 'アクセストークンがありません' };
    }
    
    // ファイルを削除
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
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
