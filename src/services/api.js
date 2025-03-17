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
- Alpha Vantage Key: ${ALPHA_VANTAGE_KEY.substring(0, 4)}...`);

if (GOOGLE_CLIENT_ID) {
  console.log(`- Google Client ID: ${GOOGLE_CLIENT_ID.substring(0, 10)}...`);
}

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

// ここからGoogleドライブAPI連携のコード（シンプル版）

// アクセストークンの保存用変数
let accessToken = null;

/**
 * GoogleドライブAPIの初期化（シンプル版）
 * @returns {Promise<boolean>} 初期化が成功したかどうか
 */
export async function initGoogleDriveAPI() {
  console.log('[API] Initializing Google Drive API (simplified version)');
  
  try {
    // スタブ実装 - 常に成功を返します
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
  if (token) {
    accessToken = token;
    console.log('[API] Access token set successfully');
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
    
    // メタデータとファイル内容の準備
    const metadata = {
      name: filename,
      mimeType: 'application/json'
    };
    
    // JSONデータを文字列に変換
    const jsonContent = JSON.stringify(data);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    
    // FormDataオブジェクトを作成
    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', blob);
    
    // APIリクエストを実行
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
    
    // レスポンスを処理
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('[API] File saved to Google Drive:', result);
    
    // 成功結果を返す
    return {
      success: true,
      message: 'データを保存しました',
      fileId: result.id,
      fileName: result.name
    };
  } catch (error) {
    console.error('[API] Error saving to Google Drive:', error);
    return { 
      success: false, 
      message: `Googleドライブへの保存に失敗しました: ${error.message}` 
    };
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
    
    // ファイルを検索するクエリを構築
    const query = encodeURIComponent(`name='${filename}' and trashed=false`);
    
    // ファイル検索APIを呼び出し
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      throw new Error(`検索エラー ${searchResponse.status}: ${errorText}`);
    }
    
    const searchResult = await searchResponse.json();
    console.log('[API] Search results:', searchResult);
    
    // ファイルが見つからない場合
    if (!searchResult.files || searchResult.files.length === 0) {
      console.log(`[API] No file found with name: ${filename}`);
      return { success: false, message: 'ファイルが見つかりません' };
    }
    
    // 最新のファイルを取得
    const fileId = searchResult.files[0].id;
    console.log(`[API] Found file: ${fileId}`);
    
    // ファイルの内容を取得
    const fileResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!fileResponse.ok) {
      const errorText = await fileResponse.text();
      throw new Error(`ファイル取得エラー ${fileResponse.status}: ${errorText}`);
    }
    
    // レスポンスをJSONとしてパース
    const data = await fileResponse.json();
    console.log('[API] File content retrieved from Google Drive');
    
    // 成功結果を返す
    return {
      success: true,
      message: 'データを読み込みました',
      data: data,
      fileId: fileId,
      fileName: filename
    };
  } catch (error) {
    console.error('[API] Error loading from Google Drive:', error);
    return { 
      success: false, 
      message: `Googleドライブからの読み込みに失敗しました: ${error.message}` 
    };
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
