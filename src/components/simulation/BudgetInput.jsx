/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/components/simulation/BudgetInput.jsx 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-08 14:30:00 
 * 
 * 更新履歴: 
 * - 2025-05-08 14:30:00 Koki Riho 初回作成
 * 
 * 説明: 
 * 追加投資シミュレーション用の予算入力コンポーネント。
 * 追加予算の金額と通貨（円またはドル）を設定でき、プリセット金額の選択も可能。
 * 通貨に応じて適切なステップ値や表示形式が自動的に調整される。
 */

import React, { useState, useCallback, useEffect } from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';

const BudgetInput = () => {
  const { additionalBudget, setAdditionalBudget, baseCurrency } = usePortfolioContext();
  
  // 状態管理
  const [amount, setAmount] = useState(additionalBudget.amount || 300000);
  const [currency, setCurrency] = useState(additionalBudget.currency || baseCurrency || 'JPY');

  // additionalBudgetが変更されたら内部の状態も更新
  useEffect(() => {
    setAmount(additionalBudget.amount || 0);
    setCurrency(additionalBudget.currency || baseCurrency || 'JPY');
  }, [additionalBudget, baseCurrency]);

  // 通貨に応じた増減ステップを設定
  const getStep = useCallback(() => {
    return currency === 'JPY' ? 10000 : 100;
  }, [currency]);

  // 予算入力の変更処理
  const handleAmountChange = useCallback((e) => {
    const value = parseFloat(e.target.value);
    setAmount(isNaN(value) ? 0 : value);
  }, []);

  // 通貨選択の変更処理
  const handleCurrencyChange = useCallback((newCurrency) => {
    setCurrency(newCurrency);
    
    // 通貨変更時にデフォルト値を設定
    if (newCurrency === 'JPY' && amount < 100) {
      setAmount(100000); // 円での一般的な初期値
    } else if (newCurrency === 'USD' && amount > 10000) {
      setAmount(1000); // ドルでの一般的な初期値
    }
  }, [amount]);

  // 予算の増加処理
  const handleIncrease = useCallback(() => {
    const step = getStep();
    setAmount(prevAmount => prevAmount + step);
  }, [getStep]);

  // 予算の減少処理
  const handleDecrease = useCallback(() => {
    const step = getStep();
    setAmount(prevAmount => Math.max(0, prevAmount - step));
  }, [getStep]);

  // 予算プリセットを設定
  const handleSetPreset = useCallback((presetAmount) => {
    setAmount(presetAmount);
  }, []);

  // 予算の更新を適用
  const handleApply = useCallback(() => {
    setAdditionalBudget(amount, currency);
  }, [amount, currency, setAdditionalBudget]);

  // 通貨に応じたプリセット金額を取得
  const getPresetAmounts = useCallback(() => {
    return currency === 'JPY' 
      ? [100000, 300000, 500000, 1000000]  // 円のプリセット
      : [1000, 3000, 5000, 10000];          // ドルのプリセット
  }, [currency]);

  // 通貨に応じたプリセット表示
  const formatPresetLabel = useCallback((presetAmount) => {
    if (currency === 'JPY') {
      // 10万円、30万円などの表示形式
      const amount = presetAmount / 10000;
      return `${amount}万${currency}`;
    } else {
      // $1,000などの表示形式
      return `${currency === 'USD' ? '$' : ''}${presetAmount.toLocaleString()}`;
    }
  }, [currency]);

  // 通貨記号
  const currencySymbol = currency === 'JPY' ? '¥' : '$';
  const presetAmounts = getPresetAmounts();

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h2 className="text-lg font-semibold mb-4">追加投資シミュレーション</h2>
      
      {/* 通貨選択（新規追加） */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          予算通貨
        </label>
        <div className="flex space-x-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="currency"
              value="JPY"
              checked={currency === 'JPY'}
              onChange={() => handleCurrencyChange('JPY')}
              className="form-radio h-4 w-4 text-blue-600"
            />
            <span className="ml-2 text-sm text-gray-700">円 (¥)</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="currency"
              value="USD"
              checked={currency === 'USD'}
              onChange={() => handleCurrencyChange('USD')}
              className="form-radio h-4 w-4 text-blue-600"
            />
            <span className="ml-2 text-sm text-gray-700">ドル ($)</span>
          </label>
        </div>
      </div>
      
      <div className="mb-4">
        <label htmlFor="budget-input" className="block text-sm font-medium text-gray-700 mb-1">
          追加予算
        </label>
        <div className="flex items-center">
          <div className="relative flex items-center">
            <span className="absolute left-3 text-gray-500">{currencySymbol}</span>
            <input
              id="budget-input"
              type="number"
              className="pl-7 pr-3 py-2 border border-gray-300 rounded-md w-40 focus:ring-blue-500 focus:border-blue-500"
              value={amount}
              onChange={handleAmountChange}
              min="0"
              step={getStep()}
            />
          </div>
          <button
            type="button"
            className="ml-2 px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-md"
            onClick={handleDecrease}
            aria-label="予算を減らす"
          >
            -
          </button>
          <button
            type="button"
            className="ml-2 px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-md"
            onClick={handleIncrease}
            aria-label="予算を増やす"
          >
            +
          </button>
          
          <button
            type="button"
            className="ml-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            onClick={handleApply}
          >
            適用
          </button>
        </div>
      </div>
      
      {/* 通貨に応じたプリセットボタン（更新） */}
      <div className="mb-4">
        <label id="preset-label" className="block text-sm font-medium text-gray-700 mb-1">
          予算プリセット
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="preset-label">
          {presetAmounts.map((presetAmount) => (
            <button
              key={presetAmount}
              type="button"
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-md hover:bg-blue-200"
              onClick={() => handleSetPreset(presetAmount)}
            >
              {formatPresetLabel(presetAmount)}
            </button>
          ))}
        </div>
      </div>
      
      <div className="bg-gray-100 p-3 rounded-md">
        <div className="text-sm text-gray-600 mb-1">現在の設定:</div>
        <div className="font-bold">
          追加予算: {currencySymbol}{additionalBudget.amount.toLocaleString()} {additionalBudget.currency}
        </div>
      </div>
    </div>
  );
};

export default BudgetInput;
