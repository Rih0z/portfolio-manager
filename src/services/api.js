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
 * 
 * 説明: 
 * API関連の関数をまとめたエントリーポイント。市場データ取得関数と
 * Google Drive APIへのアクセス機能を提供する。
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

// Google Drive API初期化状態
let isGoogleDriveApiInitialized = false;
let accessToken = null;

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
 * Google Drive API初期化
 */
export const initGoogleDriveAPI = async () => {
  if (isGoogleDriveApiInitialized) {
    console.log('[API] Google Drive API already initialized');
    return true;
  }
  
  try {
    console.log('[API] Initializing Google Drive API');
    // APIの初期化処理
    isGoogleDriveApiInitialized = true;
    return true;
  } catch (error) {
    console.error('[API] Error initializing Google Drive API:', error);
    return false;
  }
};

/**
 * アクセストークンを設定する
 */
export const setGoogleAccessToken = (token) => {
  console.log('[API] Setting Google access token');
  if (token) {
    accessToken = token;
    console.log('[API] Access token set successfully');
  }
};

/**
 * 新しいアクセストークンを取得する
 */
export const getGoogleAccessToken = async () => {
  try {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      return new Promise((resolve, reject) => {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/drive.file',
          callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              console.log('[API] New access token acquired');
              resolve(tokenResponse.access_token);
            } else {
              console.warn('[API] No access token in response');
              resolve(null);
            }
          },
          error_callback: (error) => {
            console.error('[API] Error getting token:', error);
            reject(error);
          }
        });
        
        // トークンをリクエスト
        tokenClient.requestAccessToken({ prompt: '' });
      });
    } else {
      console.warn('[API] Google OAuth API not available');
      return null;
    }
  } catch (error) {
    console.error('[API] Error in getGoogleAccessToken:', error);
    return null;
  }
};

/**
 * Googleドライブにデータを保存
 */
export const saveToGoogleDrive = async (data, userData, filename = 'portfolio_data.json') => {
  if (!userData || !userData.email) {
    return { success: false, message: 'ユーザー情報がありません' };
  }
  
  try {
    // 新しいアクセストークンを取得
    const newToken = await getGoogleAccessToken();
    if (!newToken) {
      return { success: false, message: 'アクセストークンの取得に失敗しました' };
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
          'Authorization': `Bearer ${newToken}`
        },
        body: formData
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    
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
};

/**
 * Googleドライブからデータを読み込む
 */
export const loadFromGoogleDrive = async (userData, filename = 'portfolio_data.json') => {
  if (!userData || !userData.email) {
    return { success: false, message: 'ユーザー情報がありません' };
  }
  
  try {
    // 新しいアクセストークンを取得
    const newToken = await getGoogleAccessToken();
    if (!newToken) {
      return { success: false, message: 'アクセストークンの取得に失敗しました' };
    }
    
    // ファイルを検索するクエリを構築
    const query = encodeURIComponent(`name='${filename}' and trashed=false`);
    
    // ファイル検索APIを呼び出し
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}`,
      {
        headers: {
          'Authorization': `Bearer ${newToken}`
        }
      }
    );
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      throw new Error(`検索エラー ${searchResponse.status}: ${errorText}`);
    }
    
    const searchResult = await searchResponse.json();
    
    // ファイルが見つからない場合
    if (!searchResult.files || searchResult.files.length === 0) {
      return { success: false, message: 'ファイルが見つかりません' };
    }
    
    // 最新のファイルを取得
    const fileId = searchResult.files[0].id;
    
    // ファイルの内容を取得
    const fileResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          'Authorization': `Bearer ${newToken}`
        }
      }
    );
    
    if (!fileResponse.ok) {
      const errorText = await fileResponse.text();
      throw new Error(`ファイル取得エラー ${fileResponse.status}: ${errorText}`);
    }
    
    // レスポンスをJSONとしてパース
    const data = await fileResponse.json();
    
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
};
