import React, { useState } from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';

const TickerSearch = () => {
  const { addTicker } = usePortfolioContext();
  const [ticker, setTicker] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // 銘柄追加の処理
  const handleAddTicker = async (e) => {
    e.preventDefault();
    
    // 入力チェック
    if (!ticker.trim()) {
      showMessage('ティッカーシンボルを入力してください', 'error');
      return;
    }
    
    // 一般的なティッカーシンボルの形式チェック
    const tickerPattern = /^[A-Z0-9.^-]{1,20}$/i;
    if (!tickerPattern.test(ticker)) {
      showMessage('無効なティッカーシンボル形式です', 'error');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // ティッカーを大文字に変換
      const formattedTicker = ticker.toUpperCase();
      
      // 銘柄の追加
      const result = await addTicker(formattedTicker);
      
      if (result.success) {
        showMessage(result.message || '銘柄を追加しました', 'success');
        setTicker(''); // 入力をクリア
      } else {
        showMessage(result.message || '銘柄の追加に失敗しました', 'error');
      }
    } catch (error) {
      console.error('Add ticker error:', error);
      showMessage('銘柄の追加中にエラーが発生しました', 'error');
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

  return (
    <div>
      <form onSubmit={handleAddTicker} className="mb-4">
        <div className="flex items-center">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="例: AAPL, 7203.T"
            className="flex-1 p-2 border rounded-l"
            disabled={isLoading}
          />
          <button
            type="submit"
            className={`p-2 rounded-r ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            disabled={isLoading}
          >
            {isLoading ? '検索中...' : '追加'}
          </button>
        </div>
      </form>
      
      <div className="text-sm mb-4">
        <p>
          <strong>米国株:</strong> AAPL (アップル), MSFT (マイクロソフト)
        </p>
        <p>
          <strong>日本株:</strong> 7203.T (トヨタ), 9984.T (ソフトバンクG)
        </p>
      </div>
      
      {message && (
        <div className={`p-2 rounded text-sm ${
          messageType === 'success' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-red-100 text-red-700'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default TickerSearch;