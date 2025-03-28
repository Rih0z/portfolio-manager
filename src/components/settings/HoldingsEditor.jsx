import React, { useState } from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { FUND_TYPES } from '../../utils/fundUtils';

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
  const [editField, setEditField] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // 編集を開始
  const startEditing = (id, value, field) => {
    // 手数料や配当情報の編集は許可しない
    if (field === 'annualFee' || field === 'dividendYield') return;
    
    setEditingId(id);
    setEditValue(value.toString());
    setEditField(field);
  };

  // 保有数量の更新
  const handleUpdate = (id) => {
    // 入力値をチェック
    const value = parseFloat(editValue);
    if (isNaN(value) || value < 0) {
      showMessage('有効な数値を入力してください', 'error');
      return;
    }
    
    if (editField === 'holdings') {
      // 保有数量の更新（小数点以下4桁まで対応）
      updateHoldings(id, parseFloat(value.toFixed(4)));
      showMessage('保有数量を更新しました', 'success');
    }
    
    setEditingId(null);
    setEditField(null);
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

  // 年間手数料を計算
  const calculateAnnualFee = (asset) => {
    // 個別株は手数料なし
    if (asset.fundType === FUND_TYPES.STOCK || asset.isStock) {
      return 0;
    }
    
    let assetValue = asset.price * asset.holdings;
    
    // 通貨換算
    if (asset.currency !== baseCurrency) {
      if (baseCurrency === 'JPY' && asset.currency === 'USD') {
        assetValue *= exchangeRate.rate || 150;
      } else if (baseCurrency === 'USD' && asset.currency === 'JPY') {
        assetValue /= exchangeRate.rate || 150;
      }
    }
    
    return assetValue * (asset.annualFee || 0) / 100;
  };
  
  // 年間配当金を計算
  const calculateAnnualDividend = (asset) => {
    // 配当がない場合は0
    if (!asset.hasDividend) {
      return 0;
    }
    
    let assetValue = asset.price * asset.holdings;
    
    // 通貨換算
    if (asset.currency !== baseCurrency) {
      if (baseCurrency === 'JPY' && asset.currency === 'USD') {
        assetValue *= exchangeRate.rate || 150;
      } else if (baseCurrency === 'USD' && asset.currency === 'JPY') {
        assetValue /= exchangeRate.rate || 150;
      }
    }
    
    return assetValue * (asset.dividendYield || 0) / 100;
  };

  // 銘柄の削除
  const handleRemoveTicker = (id, name) => {
    if (window.confirm(`${name}を削除してもよろしいですか？`)) {
      removeTicker(id);
      showMessage(`${name}を削除しました`, 'success');
    }
  };

  // 保有数量の増減 - 整数単位のみに変更
  const handleIncrementHoldings = (asset, amount) => {
    // 整数単位の増減に変更し、0以上の値に制限
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

  // 配当頻度の表示変換
  const formatDividendFrequency = (frequency) => {
    switch (frequency) {
      case 'monthly': return '毎月';
      case 'quarterly': return '四半期';
      case 'semi-annual': return '半年';
      case 'annual': return '年1回';
      default: return '不明';
    }
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
                年間手数料率
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                配当利回り
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                評価額
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                年間手数料
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                年間配当金
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentAssets.map((asset) => (
              <tr key={asset.id} className={asset.isStock || asset.fundType === FUND_TYPES.STOCK ? 'bg-gray-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {asset.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {asset.ticker}
                      </div>
                      {asset.fundType && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          asset.fundType === FUND_TYPES.STOCK || asset.isStock
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {asset.fundType}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(asset.price, asset.currency)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingId === asset.id && editField === 'holdings' ? (
                    <div className="flex items-center">
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-24 p-1 border rounded text-sm"
                        min="0"
                        step="0.0001" // 小数点以下4桁まで対応（直接入力時）
                      />
                      <button
                        onClick={() => handleUpdate(asset.id)}
                        className="ml-2 p-1 bg-green-600 text-white rounded text-xs"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditField(null);
                        }}
                        className="ml-1 p-1 bg-gray-500 text-white rounded text-xs"
                      >
                        キャンセル
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <button
                        onClick={() => handleIncrementHoldings(asset, -1)}
                        className="p-1 bg-red-100 text-red-700 rounded text-xs"
                        disabled={asset.holdings < 1}
                      >
                        -
                      </button>
                      <span className="mx-2 text-sm">{asset.holdings.toFixed(4)}</span>
                      <button
                        onClick={() => handleIncrementHoldings(asset, 1)}
                        className="p-1 bg-green-100 text-green-700 rounded text-xs"
                      >
                        +
                      </button>
                      <button
                        onClick={() => startEditing(asset.id, asset.holdings, 'holdings')}
                        className="ml-2 text-blue-600 text-xs"
                      >
                        編集
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <span className="text-sm">
                        {formatPercent(asset.annualFee || 0, 2)}
                      </span>
                    </div>
                    {asset.feeSource && (
                      <div className="mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          asset.feeSource === '個別株'
                            ? 'bg-gray-100 text-gray-800'
                            : asset.feeSource === 'ユーザー設定' 
                              ? 'bg-purple-100 text-purple-800' 
                              : asset.feeIsEstimated 
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                        }`}>
                          {asset.feeSource}
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <span className="text-sm">
                        {asset.hasDividend ? formatPercent(asset.dividendYield || 0, 2) : '0.00%'}
                      </span>
                    </div>
                    {asset.hasDividend && (
                      <div className="mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          asset.dividendIsEstimated
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {formatDividendFrequency(asset.dividendFrequency)}
                          {asset.dividendIsEstimated ? '（推定）' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(calculateAssetValue(asset), baseCurrency)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-red-600">
                    {asset.fundType === FUND_TYPES.STOCK || asset.isStock 
                      ? formatCurrency(0, baseCurrency)
                      : formatCurrency(calculateAnnualFee(asset), baseCurrency)
                    }
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-green-600">
                    {asset.hasDividend
                      ? formatCurrency(calculateAnnualDividend(asset), baseCurrency)
                      : formatCurrency(0, baseCurrency)
                    }
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
      
      <div className="mt-4 bg-gray-50 p-4 rounded-md">
        <h3 className="text-sm font-medium text-gray-700 mb-2">手数料・配当情報について</h3>
        <p className="text-xs text-gray-600">
          手数料や配当情報は銘柄タイプから自動的に判定されています。ファンドの手数料率はファンドの種類から推定されますが、個別株は運用会社が存在しないため手数料は0%となります。配当利回りは銘柄の種類や名称から推定されています。市場データ更新時に最新情報が自動的に取得されます。
        </p>
        <div className="flex flex-wrap gap-1 mt-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">個別株 (0%)</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">推定値</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">ティッカー固有の情報</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">毎月配当</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">四半期配当</span>
        </div>
      </div>
      
      {message && (
        <div className={`mt-4 p-2 rounded text-sm ${
          messageType === 'success' 
            ? 'bg-green-100 text-green-700' 
            : messageType === 'warning'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-700'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default HoldingsEditor;
