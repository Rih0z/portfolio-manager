import React, { useState } from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import { formatCurrency } from '../../utils/formatters';

const HoldingsEditor = () => {
  const { 
    currentAssets,
    updateHoldings,
    removeTicker,
    baseCurrency,
    exchangeRate
  } = usePortfolioContext();
  
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // 保有数量の編集を開始
  const startEditing = (id, holdings) => {
    setEditingId(id);
    setEditValue(holdings.toString());
  };

  // 保有数量の更新
  const handleUpdateHoldings = (id) => {
    // 入力値をチェック
    const value = parseFloat(editValue);
    if (isNaN(value) || value < 0) {
      showMessage('有効な数値を入力してください', 'error');
      return;
    }
    
    // 保有数量の更新（小数点以下4桁まで対応）
    updateHoldings(id, parseFloat(value.toFixed(4)));
    setEditingId(null);
    showMessage('保有数量を更新しました', 'success');
  };

  // 資産の評価額を計算
  const calculateAssetValue = (asset) => {
    let value = asset.price * asset.holdings;
    
    // 通貨換算
    if (asset.currency !== baseCurrency) {
      if (baseCurrency === 'JPY' && asset.currency === 'USD') {
        value *= exchangeRate.rate || 150;
      } else if (baseCurrency === 'USD' && asset.currency === 'JPY') {
        value /= exchangeRate.rate || 150;
      }
    }
    
    return value;
  };

  // 銘柄の削除
  const handleRemoveTicker = (id, name) => {
    if (window.confirm(`${name}を削除してもよろしいですか？`)) {
      removeTicker(id);
      showMessage(`${name}を削除しました`, 'success');
    }
  };

  // 保有数量の増減
  const handleIncrementHoldings = (asset, amount) => {
    // 0以上の値に制限
    const newValue = Math.max(0, asset.holdings + amount);
    updateHoldings(asset.id, parseFloat(newValue.toFixed(4)));
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

  // 保有資産がない場合
  if (currentAssets.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-600">
          保有資産が設定されていません。上部の「銘柄の追加」セクションから銘柄を追加してください。
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                銘柄
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                価格
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                保有数
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                評価額
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentAssets.map((asset) => (
              <tr key={asset.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {asset.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {asset.ticker}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(asset.price, asset.currency)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingId === asset.id ? (
                    <div className="flex items-center">
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-24 p-1 border rounded text-sm"
                        min="0"
                        step="0.0001" // 小数点以下4桁まで対応
                      />
                      <button
                        onClick={() => handleUpdateHoldings(asset.id)}
                        className="ml-2 p-1 bg-green-600 text-white rounded text-xs"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="ml-1 p-1 bg-gray-500 text-white rounded text-xs"
                      >
                        キャンセル
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <button
                        onClick={() => handleIncrementHoldings(asset, -0.0001)}
                        className="p-1 bg-red-100 text-red-700 rounded text-xs"
                        disabled={asset.holdings <= 0}
                      >
                        -
                      </button>
                      <span className="mx-2 text-sm">{asset.holdings.toFixed(4)}</span>
                      <button
                        onClick={() => handleIncrementHoldings(asset, 0.0001)}
                        className="p-1 bg-green-100 text-green-700 rounded text-xs"
                      >
                        +
                      </button>
                      <button
                        onClick={() => startEditing(asset.id, asset.holdings)}
                        className="ml-2 text-blue-600 text-xs"
                      >
                        編集
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(calculateAssetValue(asset), baseCurrency)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleRemoveTicker(asset.id, asset.name)}
                    className="text-red-600 hover:text-red-900"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {message && (
        <div className={`mt-4 p-2 rounded text-sm ${
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

export default HoldingsEditor;