import React, { useState } from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import { formatCurrency, formatPercent } from '../../utils/formatters';

const SimulationResult = () => {
  const { 
    baseCurrency, 
    calculateSimulation,
    executePurchase 
  } = usePortfolioContext();
  
  const [editingId, setEditingId] = useState(null);
  const [editUnits, setEditUnits] = useState(0);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // シミュレーション結果を取得
  const simulationResults = calculateSimulation();

  // 株数編集開始（小数点以下4桁まで対応）
  const startEditing = (id, units) => {
    setEditingId(id);
    setEditUnits(parseFloat(units.toFixed(4)));
  };
  // 株数による金額計算
  const calculateAmount = (result, units) => {
    // 通貨単位を考慮して計算
    let amount = units * result.price;
    
    // 通貨換算が必要な場合
    if (result.currency !== baseCurrency) {
      if (baseCurrency === 'JPY' && result.currency === 'USD') {
        amount *= 150; // 固定レート（実際には動的に取得）
      } else if (baseCurrency === 'USD' && result.currency === 'JPY') {
        amount /= 150;
      }
    }
    
    return amount;
  };

  // 編集中の株数が変更された時の処理（小数点以下4桁まで対応）
  const handleUnitsChange = (e, result) => {
    const value = parseFloat(e.target.value) || 0;
    setEditUnits(parseFloat(Math.max(0, value).toFixed(4)));
  };

  // 個別銘柄の購入処理（小数点以下4桁まで対応）
  const handlePurchase = (result) => {
    if (window.confirm(`${result.name}を${result.additionalUnits.toFixed(4)}株購入しますか？`)) {
      executePurchase(result.id, result.additionalUnits);
      showMessage(`${result.name}を${result.additionalUnits.toFixed(4)}株購入しました`, 'success');
    }
  };

  // 編集内容を適用して購入（小数点以下4桁まで対応）
  const handleEditedPurchase = (result) => {
    if (editUnits <= 0) {
      showMessage('購入株数は0より大きい値を指定してください', 'error');
      return;
    }
    
    if (window.confirm(`${result.name}を${editUnits.toFixed(4)}株購入しますか？`)) {
      executePurchase(result.id, editUnits);
      setEditingId(null);
      showMessage(`${result.name}を${editUnits.toFixed(4)}株購入しました`, 'success');
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

  // シミュレーション結果がない場合
  if (!simulationResults || simulationResults.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-600">
          シミュレーション結果がありません。「設定」タブから目標配分を設定してください。
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
                現在額
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                目標額
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                差額
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                購入株数
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                購入額
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {simulationResults.map((result) => (
              <tr key={result.id} className={result.additionalAmount <= 0 ? 'bg-gray-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {result.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {result.ticker}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(result.currentAmount, baseCurrency)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatPercent(result.currentAmount / (result.currentAmount + result.additionalAmount) * 100)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(result.targetAmount, baseCurrency)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatPercent(result.targetPercentage)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`text-sm ${
                    result.additionalAmount > 0 ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {formatCurrency(result.additionalAmount, baseCurrency)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingId === result.id ? (
                    <div className="flex items-center">
                      <input
                        type="number"
                        value={editUnits}
                        onChange={(e) => handleUnitsChange(e, result)}
                        className="w-20 p-1 border rounded text-sm"
                        min="0"
                      />
                    </div>
                  ) : (
                    <div className="text-sm text-gray-900">
                      {result.additionalUnits > 0 ? result.additionalUnits.toFixed(4) : '-'}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingId === result.id ? (
                    <div className="text-sm text-gray-900">
                      {formatCurrency(calculateAmount(result, editUnits), baseCurrency)}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-900">
                      {result.purchaseAmount > 0 ? formatCurrency(result.purchaseAmount, baseCurrency) : '-'}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {result.additionalUnits > 0 && (
                    <>
                      {editingId === result.id ? (
                        <>
                          <button
                            onClick={() => handleEditedPurchase(result)}
                            className="text-green-600 hover:text-green-900 mr-2"
                          >
                            購入
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            キャンセル
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handlePurchase(result)}
                            className="text-green-600 hover:text-green-900 mr-2"
                          >
                            購入
                          </button>
                          <button
                            onClick={() => startEditing(result.id, result.additionalUnits)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            編集
                          </button>
                        </>
                      )}
                    </>
                  )}
                  {result.remark && (
                    <div className="text-xs text-gray-500 mt-1">
                      {result.remark}
                    </div>
                  )}
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

export default SimulationResult;