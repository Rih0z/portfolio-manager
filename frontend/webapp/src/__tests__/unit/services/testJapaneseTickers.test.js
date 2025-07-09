// Mock dependencies
jest.mock('../../../services/marketDataService', () => ({
  fetchStockData: jest.fn(),
  fetchMultipleStocks: jest.fn()
}));

jest.mock('../../../utils/japaneseStockNames', () => ({
  getJapaneseStockName: jest.fn()
}));

// Mock console
const originalConsole = { ...console };
beforeEach(() => {
  console.log = jest.fn();
});

afterEach(() => {
  console.log = originalConsole.log;
  jest.clearAllMocks();
});

import { fetchStockData, fetchMultipleStocks } from '../../../services/marketDataService';
import { getJapaneseStockName } from '../../../utils/japaneseStockNames';
import testJapaneseTickers from '../../../services/testJapaneseTickers';

describe('testJapaneseTickers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // デフォルトのモック実装
    getJapaneseStockName.mockImplementation((ticker) => {
      const names = {
        '0331418A': 'eMAXIS Slim 米国株式(S&P500)',
        '03311187': 'eMAXIS Slim 全世界株式(オール・カントリー)',
        '9C31116A': 'ひふみプラス',
        '89311199': 'SBI・V・S&P500インデックス・ファンド',
        '7203': 'トヨタ自動車',
        '6758': 'ソニーグループ',
        '9432': 'NTT',
        '7974': '任天堂'
      };
      return names[ticker] || ticker;
    });
  });

  test('関数が正しくエクスポートされている', () => {
    expect(testJapaneseTickers).toBeDefined();
    expect(typeof testJapaneseTickers).toBe('function');
  });

  test('個別の投資信託データ取得が成功する場合', async () => {
    fetchStockData.mockResolvedValue({
      success: true,
      data: {
        '0331418A': {
          price: 25000,
          source: 'morningstar'
        }
      }
    });

    await testJapaneseTickers();

    // 投資信託のfetchが呼ばれる
    expect(fetchStockData).toHaveBeenCalledWith('0331418A');
    expect(fetchStockData).toHaveBeenCalledWith('03311187');
    expect(fetchStockData).toHaveBeenCalledWith('9C31116A');
    expect(fetchStockData).toHaveBeenCalledWith('89311199');

    // 成功ログが出力される
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ 成功: ¥25,000'));
  });

  test('個別の日本株データ取得が成功する場合', async () => {
    fetchStockData.mockResolvedValue({
      success: true,
      data: {
        '7203.T': {
          price: 2850,
          source: 'yahoo'
        }
      }
    });

    await testJapaneseTickers();

    // 日本株のfetchが呼ばれる
    expect(fetchStockData).toHaveBeenCalledWith('7203.T');
    expect(fetchStockData).toHaveBeenCalledWith('6758.T');
    expect(fetchStockData).toHaveBeenCalledWith('9432.T');
    expect(fetchStockData).toHaveBeenCalledWith('7974.T');

    // getJapaneseStockNameが.Tを除いた形で呼ばれる
    expect(getJapaneseStockName).toHaveBeenCalledWith('7203');
  });

  test('個別取得が失敗する場合', async () => {
    fetchStockData.mockResolvedValue({
      success: false,
      message: 'データ取得エラー'
    });

    await testJapaneseTickers();

    // 失敗ログが出力される
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('❌ 失敗: データ取得エラー'));
  });

  test('個別取得で例外が発生する場合', async () => {
    fetchStockData.mockRejectedValue(new Error('ネットワークエラー'));

    await testJapaneseTickers();

    // エラーログが出力される
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('❌ エラー: ネットワークエラー'));
  });

  test('一括取得が成功する場合', async () => {
    fetchStockData.mockResolvedValue({ success: true, data: {} });
    
    fetchMultipleStocks.mockResolvedValue({
      success: true,
      data: {
        '0331418A': { price: 25000 },
        '7203.T': { price: 2850 },
        '6758.T': { price: 12500 }
      },
      sourcesSummary: 'morningstar: 1, yahoo: 2',
      errors: []
    });

    await testJapaneseTickers();

    // 一括取得が全ティッカーで呼ばれる
    expect(fetchMultipleStocks).toHaveBeenCalledWith([
      '0331418A', '03311187', '9C31116A', '89311199',
      '7203.T', '6758.T', '9432.T', '7974.T'
    ]);

    // 成功ログが出力される
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('取得結果: 3/8 件成功'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('データソース: morningstar: 1, yahoo: 2'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ 0331418A'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ 7203.T'));
  });

  test('一括取得でエラーがある場合', async () => {
    fetchStockData.mockResolvedValue({ success: true, data: {} });
    
    fetchMultipleStocks.mockResolvedValue({
      success: true,
      data: {
        '0331418A': { price: 25000 }
      },
      errors: [
        { ticker: '7203.T', message: 'レート制限' },
        { ticker: '9432.T', message: 'タイムアウト' }
      ]
    });

    await testJapaneseTickers();

    // エラーログが出力される
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('エラー:'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('- 7203.T: レート制限'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('- 9432.T: タイムアウト'));
  });

  test('一括取得で例外が発生する場合', async () => {
    fetchStockData.mockResolvedValue({ success: true, data: {} });
    fetchMultipleStocks.mockRejectedValue(new Error('サーバーエラー'));

    await testJapaneseTickers();

    // エラーログが出力される
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('❌ 一括取得エラー: サーバーエラー'));
  });

  test('開始と終了のログが出力される', async () => {
    fetchStockData.mockResolvedValue({ success: true, data: {} });
    fetchMultipleStocks.mockResolvedValue({ success: true, data: {} });

    await testJapaneseTickers();

    // 開始ログ
    expect(console.log).toHaveBeenCalledWith('=== 日本の投資信託・株式価格取得テスト開始 ===\n');
    
    // セクションログ
    expect(console.log).toHaveBeenCalledWith('【個別取得テスト】');
    expect(console.log).toHaveBeenCalledWith('\n投資信託:');
    expect(console.log).toHaveBeenCalledWith('\n日本株:');
    expect(console.log).toHaveBeenCalledWith('\n\n【一括取得テスト】');
    
    // 終了ログ
    expect(console.log).toHaveBeenCalledWith('\n=== テスト完了 ===');
  });

  test('データがない場合の処理', async () => {
    fetchStockData.mockResolvedValue({
      success: true,
      data: null
    });

    await testJapaneseTickers();

    // データなしログが出力される
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('❌ 失敗: データなし'));
  });

  test('一括取得でデータがない銘柄の処理', async () => {
    fetchStockData.mockResolvedValue({ success: true, data: {} });
    
    fetchMultipleStocks.mockResolvedValue({
      success: true,
      data: {
        '0331418A': { price: 25000 }
      }
    });

    await testJapaneseTickers();

    // データありの銘柄
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ 0331418A'));
    
    // データなしの銘柄
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('❌ 03311187'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('❌ 7203.T'));
  });
});

describe('グローバル関数の登録', () => {
  let originalWindow;

  beforeEach(() => {
    originalWindow = global.window;
    jest.resetModules();
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  test('ブラウザ環境でwindowに関数が登録される', () => {
    global.window = {};
    console.log = jest.fn();

    // モジュールを再読み込み
    require('../../../services/testJapaneseTickers');

    expect(window.testJapaneseTickers).toBeDefined();
    expect(typeof window.testJapaneseTickers).toBe('function');
    expect(console.log).toHaveBeenCalledWith(
      'テスト関数が利用可能です。コンソールで testJapaneseTickers() を実行してください。'
    );
  });

  test('Node.js環境では関数が登録されない', () => {
    delete global.window;
    console.log = jest.fn();

    // モジュールを再読み込み
    require('../../../services/testJapaneseTickers');

    expect(typeof global.window).toBe('undefined');
    expect(console.log).not.toHaveBeenCalledWith(
      'テスト関数が利用可能です。コンソールで testJapaneseTickers() を実行してください。'
    );
  });
});