/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/components/simulation/SimulationResult.jsx 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-08 14:30:00 
 * 
 * 更新履歴: 
 * - 2025-05-08 14:30:00 Koki Riho 初回作成
 * 
 * 説明: 
 * 投資シミュレーション結果を表示するコンポーネント。
 * 目標配分に基づいて計算された各銘柄の購入株数と金額を表示し、
 * 実際の購入操作や購入株数の編集機能も提供する。
 * 小数点以下4桁まで対応した精度の高い株数管理が可能。
 */

import React, { useState } from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import { formatCurrency, formatPercent, formatDate } from '../../utils/formatters';

const SimulationResult = () => {
  const { 
    baseCurrency, 
    exchangeRate,
    calculateSimulation,
    executePurchase 
  } = usePortfolioContext();
  
  const [editingId, setEditingId] = useState(null);
  const [editUnits, setEditUnits] = useState(0);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // シミュレーション結果を取得
  const simulationResults = calculateSimulation();

  // データソースバッジのコンポーネント
  const DataSourceBadge = ({ source }) => {
    let badgeClass = "text-xs px-1.5 py-0.5 rounded ";

    switch(source) {
      case 'Alpaca':
        badgeClass += "bg-blue-100 text-blue-800";
        break;
      case 'Yahoo Finance':
        badgeClass += "bg-purple-100 text-purple-800";
        break;
      case 'Yahoo Finance Japan':
      case 'Minkabu':
      case 'Kabutan':
      case '投資信託協会':
      case 'Morningstar Japan':
        badgeClass += "bg-green-100 text-green-800";
        break;
      case 'Fallback':
        badgeClass += "bg-yellow-100 text-yellow-800";
        break;
      default:
        badgeClass += "bg-gray-100 text-gray-800";
    }

    return (
      <span className={badgeClass}>
        {source}
      </span>
    );
  };

  // 株数編集開始（小数点以下4桁まで対応）
  const startEditing = (id, units) => {
    setEditingId(id);
    setEditUnits(parseFloat(units.toFixed(4)));
  };

  // 株数による金額計算
  const calculateAmount = (result, units) => {
    return units * result.price;
  };

  // 編集中の株数が変更された時の処理（小数点以下4桁まで対応）
  const handleUnitsChange = (e, result) => {
    const value = parseFloat(e.target.value) || 0;
    setEditUnits(parseFloat(Math.max(0, value).toFixed(4)));
  };

  // 個別銘柄の購入処理（小数点以下4桁まで対応）
  const handlePurchase = (result) => {
    if (window.confirm(`${result.name}を${result.purchaseShares.toFixed(4)}${result.isMutualFund ? '口' : '株'}購入しますか？`)) {
      executePurchase(result.id, result.purchaseShares);
      showMessage(`${result.name}を${result.purchaseShares.toFixed(4)}${result.isMutualFund ? '口' : '株'}購入しました`, 'success');
    }
  };

  // 編集内容を適用して購入（小数点以下4桁まで対応）
  const handleEditedPurchase = (result) => {
    if (editUnits <= 0) {
      showMessage('購入株数は0より大きい値を指定してください', 'error');
      return;
    }
    
    if (window.confirm(`${result.name}を${editUnits.toFixed(4)}${result.isMutualFund ? '口' : '株'}購入しますか？`)) {
      executePurchase(result.id, editUnits);
      setEditingId(null);
      showMessage(`${result.name}を${editUnits.toFixed(4)}${result.isMutualFund ? '口' : '株'}購入しました`, 'success');
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
      {/* 為替レート情報の表示（新規追加） */}
      {exchangeRate && (
        <div className="mb-4 p-3 bg-blue-50 rounded-md">
          <h3 className="text-sm font-medium text-blue-800 mb-1">為替レート情報</h3>
          <div className="text-sm text-gray-700">
            1 USD = {exchangeRate.rate.toFixed(2)} JPY
            <span className="text-xs ml-2 text-gray-500">
              (データソース: {exchangeRate.source}, 更新: {formatDate(exchangeRate.lastUpdated)})
            </span>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                銘柄
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                現在額
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                目標額
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                差分
              </th>
              {/* 株価列を追加 */}
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                株価
              </th>
              {/* 購入株数列を追加 */}
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                購入株数
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                購入額
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {simulationResults.map((result) => (
              <tr key={result.id || result.ticker} className={result.purchaseAmount <= 0 ? 'bg-gray-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {result.ticker}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center mt-1">
                        {result.name}
                        {result.source && (
                          <span className="ml-2">
                            <DataSourceBadge source={result.source} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-sm text-gray-900">
                    {formatCurrency(result.currentValue, baseCurrency)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatPercent(result.currentAllocation)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-sm text-gray-900">
                    {/* 目標金額は表示できないが、目標配分率は表示 */}
                    {formatPercent(result.targetAllocation)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className={`text-sm ${
                    result.diff > 0 ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {formatPercent(result.diff)}
                  </div>
                </td>
                {/* 株価列（新規追加） */}
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-sm text-gray-900">
                    {result.currency === 'JPY' ? '¥' : '$'}
                    {formatCurrency(result.price, result.currency)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {result.currency}
                  </div>
                </td>
                {/* 購入株数列（新規追加） */}
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {editingId === result.id ? (
                    <div className="flex items-center justify-end">
                      <input
                        type="number"
                        value={editUnits}
                        onChange={(e) => handleUnitsChange(e, result)}
                        className="w-24 px-2 py-1 border rounded text-sm text-right"
                        min="0"
                        step={result.isMutualFund ? 0.001 : 0.01}
                      />
                      <span className="ml-1 text-xs text-gray-500">
                        {result.isMutualFund ? '口' : '株'}
                      </span>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-900">
                      {result.purchaseShares > 0 
                        ? result.purchaseShares.toFixed(result.isMutualFund ? 3 : 2)
                        : '-'}
                      <span className="text-xs text-gray-500 ml-1">
                        {result.purchaseShares > 0 ? (result.isMutualFund ? '口' : '株') : ''}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {editingId === result.id ? (
                    <div className="text-sm text-gray-900">
                      {formatCurrency(calculateAmount(result, editUnits), result.currency)}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-900">
                      {result.currency === 'JPY' ? '¥' : '$'}
                      {formatCurrency(result.purchaseAmount, result.currency)}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                  {result.purchaseShares > 0 && (
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
                            onClick={() => startEditing(result.id, result.purchaseShares)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            編集
                          </button>
                        </>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {message && (
        <div className={`mt-4 p-3 rounded text-sm ${
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
