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

// 人気銘柄のリスト（更新版）
// インデックスファンド・ETF
const POPULAR_FUNDS = [
  { ticker: '2533106', name: 'eMAXIS Slim 全世界株式（オール・カントリー）' },
  { ticker: '2531108', name: 'eMAXIS Slim 米国株式（S&P500）' },
  { ticker: 'VOO', name: 'Vanguard S&P 500 ETF' },
  { ticker: 'VXUS', name: 'Vanguard Total International Stock ETF' },
  { ticker: 'GLD', name: 'SPDR Gold Shares' },
  { ticker: 'LQD', name: 'iShares iBoxx $ Investment Grade Corporate Bond ETF' }
];

// 個別株
const POPULAR_STOCKS = [
  { ticker: 'AAPL', name: 'アップル' },
  { ticker: 'NVDA', name: 'エヌビディア' },
  { ticker: 'MSFT', name: 'マイクロソフト' }
];

// 日本市場の人気銘柄（現状維持）
const POPULAR_JP_TICKERS = [
  { ticker: '7203.T', name: 'トヨタ自動車' },
  { ticker: '9984.T', name: 'ソフトバンクグループ' },
  { ticker: '6758.T', name: 'ソニーグループ' },
  { ticker: '8306.T', name: '三菱UFJフィナンシャル' },
  { ticker: '9433.T', name: 'KDDI' },
  { ticker: '6861.T', name: 'キーエンス' },
  { ticker: '9432.T', name: 'NTT' },
  { ticker: '7974.T', name: '任天堂' },
  { ticker: '6501.T', name: '日立製作所' },
  { ticker: '4502.T', name: '武田薬品工業' }
];

const PopularTickers = () => {
  const { addTicker } = usePortfolioContext();
  const [category, setCategory] = useState('funds'); // 'funds', 'stocks', 'jp'
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
    case 'funds':
      tickerList = POPULAR_FUNDS;
      break;
    case 'stocks':
      tickerList = POPULAR_STOCKS;
      break;
    case 'jp':
      tickerList = POPULAR_JP_TICKERS;
      break;
    default:
      tickerList = POPULAR_FUNDS;
  }

  return (
    <div>
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setCategory('funds')}
          className={`px-3 py-2 rounded text-sm ${
            category === 'funds'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          インデックス・ETF
        </button>
        <button
          onClick={() => setCategory('stocks')}
          className={`px-3 py-2 rounded text-sm ${
            category === 'stocks'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          人気個別株
        </button>
        <button
          onClick={() => setCategory('jp')}
          className={`px-3 py-2 rounded text-sm ${
            category === 'jp'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          日本市場
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
