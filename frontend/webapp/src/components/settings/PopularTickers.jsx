/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/components/settings/PopularTickers.jsx 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-08 14:30:00 
 * 
 * 更新履歴: 
 * - 2025-05-08 14:30:00 Koki Riho 初回作成
 * 
 * 説明: 
 * 人気銘柄を簡単に追加できるコンポーネント。
 * インデックス・ETF、人気個別株、日本市場の3カテゴリの人気銘柄をボタン一つで
 * ポートフォリオに追加できる。追加済み銘柄には追加済みマークを表示する。
 */
import React, { useState } from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import { getJapaneseStockName } from '../../utils/japaneseStockNames';

// 人気銘柄のリスト（更新版）
// 日本の投資信託
const POPULAR_JP_MUTUAL_FUNDS = [
  { ticker: '0331418A', name: getJapaneseStockName('0331418A') },
  { ticker: '03311187', name: getJapaneseStockName('03311187') },
  { ticker: '0331119A', name: getJapaneseStockName('0331119A') },
  { ticker: '9C31116A', name: getJapaneseStockName('9C31116A') },
  { ticker: '89311199', name: getJapaneseStockName('89311199') },
  { ticker: '9I311179', name: getJapaneseStockName('9I311179') }
];

// インデックスファンド・ETF（米国）
const POPULAR_FUNDS = [
  { ticker: 'VOO', name: 'Vanguard S&P 500 ETF' },
  { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF' },
  { ticker: 'VXUS', name: 'Vanguard Total International Stock ETF' },
  { ticker: 'GLD', name: 'SPDR Gold Shares' },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust' },
  { ticker: 'LQD', name: 'iShares iBoxx $ Investment Grade Corporate Bond ETF' }
];

// 個別株
const POPULAR_STOCKS = [
  { ticker: 'AAPL', name: 'アップル' },
  { ticker: 'NVDA', name: 'エヌビディア' },
  { ticker: 'MSFT', name: 'マイクロソフト' },
  { ticker: 'GOOGL', name: 'Google（アルファベット）' },
  { ticker: 'AMZN', name: 'アマゾン' },
  { ticker: 'TSLA', name: 'テスラ' }
];

// 日本市場の人気銘柄
const POPULAR_JP_STOCKS = [
  { ticker: '7203.T', name: getJapaneseStockName('7203') },
  { ticker: '9984.T', name: getJapaneseStockName('9984') },
  { ticker: '6758.T', name: getJapaneseStockName('6758') },
  { ticker: '8306.T', name: getJapaneseStockName('8306') },
  { ticker: '9433.T', name: getJapaneseStockName('9433') },
  { ticker: '6861.T', name: getJapaneseStockName('6861') },
  { ticker: '9432.T', name: getJapaneseStockName('9432') },
  { ticker: '7974.T', name: getJapaneseStockName('7974') },
  { ticker: '6501.T', name: getJapaneseStockName('6501') },
  { ticker: '4502.T', name: getJapaneseStockName('4502') }
];

const PopularTickers = () => {
  const { addTicker } = usePortfolioContext();
  const [category, setCategory] = useState('jp-mutual-funds'); // 'jp-mutual-funds', 'funds', 'stocks', 'jp-stocks'
  const [isLoading, setIsLoading] = useState(false);
  const [addedTickers, setAddedTickers] = useState({});
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // 銘柄追加の処理
  const handleAddTicker = async (ticker) => {
    if (addedTickers[ticker]) {
      showMessage(`${ticker}は既に追加されています`, 'info');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // 銘柄の追加
      const result = await addTicker(ticker);
      
      if (result.success) {
        // 追加済みマークを付ける
        setAddedTickers(prev => ({ ...prev, [ticker]: true }));
        showMessage(result.message || `${ticker}を追加しました`, 'success');
      } else {
        showMessage(result.message || `${ticker}の追加に失敗しました`, 'error');
      }
    } catch (error) {
      console.error('Add popular ticker error:', error);
      showMessage(`${ticker}の追加中にエラーが発生しました`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // メッセージの表示
  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  // 表示する銘柄リスト
  let tickerList;
  switch (category) {
    case 'jp-mutual-funds':
      tickerList = POPULAR_JP_MUTUAL_FUNDS;
      break;
    case 'funds':
      tickerList = POPULAR_FUNDS;
      break;
    case 'stocks':
      tickerList = POPULAR_STOCKS;
      break;
    case 'jp-stocks':
      tickerList = POPULAR_JP_STOCKS;
      break;
    default:
      tickerList = POPULAR_JP_MUTUAL_FUNDS;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setCategory('jp-mutual-funds')}
          className={`px-3 py-2 rounded text-sm ${
            category === 'jp-mutual-funds'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          日本投資信託
        </button>
        <button
          onClick={() => setCategory('funds')}
          className={`px-3 py-2 rounded text-sm ${
            category === 'funds'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          米国ETF
        </button>
        <button
          onClick={() => setCategory('stocks')}
          className={`px-3 py-2 rounded text-sm ${
            category === 'stocks'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          米国個別株
        </button>
        <button
          onClick={() => setCategory('jp-stocks')}
          className={`px-3 py-2 rounded text-sm ${
            category === 'jp-stocks'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          日本個別株
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {tickerList.map((item) => (
          <button
            key={item.ticker}
            onClick={() => handleAddTicker(item.ticker)}
            disabled={isLoading || addedTickers[item.ticker]}
            className={`p-2 text-left rounded border ${
              addedTickers[item.ticker]
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="font-medium">{item.name}</div>
            <div className="text-xs text-gray-500">{item.ticker}</div>
            {addedTickers[item.ticker] && (
              <div className="text-xs text-green-600 mt-1">✓ 追加済み</div>
            )}
          </button>
        ))}
      </div>
      
      {message && (
        <div className={`mt-4 p-2 rounded text-sm ${
          messageType === 'success' 
            ? 'bg-green-100 text-green-700' 
            : messageType === 'error'
              ? 'bg-red-100 text-red-700'
              : 'bg-blue-100 text-blue-700'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default PopularTickers;
