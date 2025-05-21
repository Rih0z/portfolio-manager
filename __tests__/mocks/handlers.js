/**
 * ファイルパス: __test__/mocks/handlers.js
 * 
 * MSW（Mock Service Worker）によるAPIモックハンドラー定義
 * テスト時のAPIリクエストをインターセプトして模擬レスポンスを返す
 * 
 * @file __test__/mocks/handlers.js
 * @author プロジェクトチーム
 * @created 2025-05-21
 */

import { rest } from 'msw';
import { mockMarketData, mockExchangeRate, mockUserProfile } from './data';

// 基本的なAPIパスの構築
const getApiPath = (path) => {
  // テスト環境ではAPI_STAGEはdevを使用
  return `*/dev/${path}`;
};

// MSWハンドラー
export const handlers = [
  // 市場データ取得API
  rest.get(getApiPath('api/market-data'), (req, res, ctx) => {
    const type = req.url.searchParams.get('type');
    const symbols = req.url.searchParams.get('symbols');
    
    // 為替レート取得の場合
    if (type === 'exchange-rate') {
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          data: mockExchangeRate,
          message: '為替レートを取得しました'
        })
      );
    }
    
    // 単一銘柄または複数銘柄データ取得の場合
    if (symbols) {
      // タイプに応じてモックデータをフィルタリング
      let responseData = {};
      
      if (symbols.includes(',')) {
        // 複数銘柄の場合はカンマで分割
        const symbolList = symbols.split(',');
        symbolList.forEach(symbol => {
          if (mockMarketData[symbol]) {
            responseData[symbol] = mockMarketData[symbol];
          }
        });
      } else {
        // 単一銘柄の場合
        if (mockMarketData[symbols]) {
          responseData[symbols] = mockMarketData[symbols];
        }
      }
      
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          data: responseData,
          source: 'Market Data API',
          message: 'データを取得しました'
        })
      );
    }
    
    // パラメータが不足している場合
    return res(
      ctx.status(400),
      ctx.json({
        success: false,
        error: true,
        message: '必須パラメータが不足しています'
      })
    );
  }),
  
  // Google認証API
  rest.post(getApiPath('auth/google/login'), (req, res, ctx) => {
    const { code, redirectUri } = req.body;
    
    // リクエストパラメータの検証
    if (!code || !redirectUri) {
      return res(
        ctx.status(400),
        ctx.json({
          success: false,
          error: true,
          message: '認証コードまたはリダイレクトURIが不足しています'
        })
      );
    }
    
    // 成功レスポンス
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        isAuthenticated: true,
        user: mockUserProfile,
        session: {
          expiresAt: new Date(Date.now() + 3600000).toISOString() // 1時間後
        }
      })
    );
  }),
  
  // セッション確認API
  rest.get(getApiPath('auth/session'), (req, res, ctx) => {
    // セッションクッキーをチェック
    const authCookie = req.cookies['auth_session'];
    
    if (authCookie === 'test-valid-session') {
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          isAuthenticated: true,
          user: mockUserProfile,
          session: {
            expiresAt: new Date(Date.now() + 3600000).toISOString() // 1時間後
          }
        })
      );
    }
    
    // 未認証レスポンス
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        isAuthenticated: false,
        message: '認証されていません'
      })
    );
  }),
  
  // ログアウトAPI
  rest.post(getApiPath('auth/logout'), (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'ログアウトしました'
      })
    );
  }),
  
  // Google Driveファイル一覧取得API
  rest.get(getApiPath('drive/files'), (req, res, ctx) => {
    // 認証チェック
    const authCookie = req.cookies['auth_session'];
    
    if (!authCookie) {
      return res(
        ctx.status(401),
        ctx.json({
          success: false,
          error: true,
          message: '認証が必要です'
        })
      );
    }
    
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        files: [
          {
            id: '1Zt8jKX7H3gFzN9v2X5yM6fGhJkLpQr7s',
            name: 'portfolio-data-2025-05-11T12-34-56-789Z.json',
            size: 1024,
            mimeType: 'application/json',
            createdAt: '2025-05-11T12:34:56.789Z',
            modifiedAt: '2025-05-11T12:34:56.789Z',
            webViewLink: 'https://drive.google.com/file/d/1Zt8jKX7H3gFzN9v2X5yM6fGhJkLpQr7s/view'
          },
          {
            id: '2Ab9cDe3F4gHi5J6kLmN7oP8qRsT9uVw',
            name: 'portfolio-data-2025-05-10T15-22-33-456Z.json',
            size: 980,
            mimeType: 'application/json',
            createdAt: '2025-05-10T15:22:33.456Z',
            modifiedAt: '2025-05-10T15:22:33.456Z',
            webViewLink: 'https://drive.google.com/file/d/2Ab9cDe3F4gHi5J6kLmN7oP8qRsT9uVw/view'
          }
        ],
        count: 2
      })
    );
  }),
  
  // Google Driveファイル保存API
  rest.post(getApiPath('drive/save'), (req, res, ctx) => {
    const { portfolioData } = req.body;
    
    // データチェック
    if (!portfolioData) {
      return res(
        ctx.status(400),
        ctx.json({
          success: false,
          error: true,
          message: 'ポートフォリオデータが不足しています'
        })
      );
    }
    
    // 現在のタイムスタンプを使用してファイル名を生成
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const fileName = `portfolio-data-${timestamp}.json`;
    
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'ポートフォリオデータをGoogle Driveに保存しました',
        file: {
          id: '3Fe9dKx7L3gMzA9b2V5cP6dGiTkApYr7t',
          name: fileName,
          url: `https://drive.google.com/file/d/3Fe9dKx7L3gMzA9b2V5cP6dGiTkApYr7t/view`,
          createdAt: new Date().toISOString()
        }
      })
    );
  }),
  
  // Google Driveファイル読み込みAPI
  rest.get(getApiPath('drive/load'), (req, res, ctx) => {
    const fileId = req.url.searchParams.get('fileId');
    
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'ポートフォリオデータをGoogle Driveから読み込みました',
        file: {
          name: 'portfolio-data-2025-05-10T15-22-33-456Z.json',
          createdAt: '2025-05-10T15:22:33.456Z',
          modifiedAt: '2025-05-10T15:22:33.456Z'
        },
        data: {
          name: 'マイポートフォリオ',
          baseCurrency: 'JPY',
          currentAssets: [
            {
              id: '1',
              ticker: 'AAPL',
              name: 'Apple Inc.',
              price: 174.79,
              currency: 'USD',
              holdings: 10,
              annualFee: 0,
              isStock: true,
              isMutualFund: false,
              source: 'Market Data API'
            },
            {
              id: '2',
              ticker: '7203.T',
              name: 'トヨタ自動車',
              price: 2100,
              currency: 'JPY',
              holdings: 100,
              annualFee: 0,
              isStock: true,
              isMutualFund: false,
              source: 'Market Data API'
            }
          ],
          targetPortfolio: [
            { id: '1', ticker: 'AAPL', targetPercentage: 40 },
            { id: '2', ticker: '7203.T', targetPercentage: 60 }
          ],
          additionalBudget: { amount: 100000, currency: 'JPY' },
          createdAt: '2025-05-10T15:22:33.456Z'
        }
      })
    );
  }),
  
  // 管理者API
  rest.get(getApiPath('admin/status'), (req, res, ctx) => {
    const apiKey = req.url.searchParams.get('apiKey');
    
    if (apiKey !== 'test-admin-api-key') {
      return res(
        ctx.status(401),
        ctx.json({
          success: false,
          error: true,
          message: '無効なAPIキーです'
        })
      );
    }
    
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        status: 'running',
        uptime: '5d 12h 34m',
        usageCount: {
          'market-data': 1250,
          'exchange-rate': 526
        },
        lastReset: '2025-05-15T00:00:00.000Z'
      })
    );
  })
];
