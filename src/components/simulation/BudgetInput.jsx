import React, { useState, useCallback } from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';

const presetAmounts = [100000, 300000, 500000, 1000000];

const BudgetInput = () => {
  const { additionalBudget, setAdditionalBudget, baseCurrency } = usePortfolioContext();
  const [budget, setBudget] = useState(additionalBudget);

  // 予算入力の変更処理
  const handleInputChange = useCallback((e) => {
    const value = parseFloat(e.target.value);
    setBudget(isNaN(value) ? 0 : value);
  }, []);

  // 予算の増加処理
  const handleIncrease = useCallback(() => {
    const step = baseCurrency === 'JPY' ? 10000 : 100;
    setBudget(prevBudget => prevBudget + step);
  }, [baseCurrency]);

  // 予算の減少処理
  const handleDecrease = useCallback(() => {
    const step = baseCurrency === 'JPY' ? 10000 : 100;
    setBudget(prevBudget => Math.max(0, prevBudget - step));
  }, [baseCurrency]);

  // 予算プリセットを設定
  const handleSetPreset = useCallback((amount) => {
    setBudget(amount);
  }, []);

  // 予算の更新を適用
  const handleApply = useCallback(() => {
    setAdditionalBudget(budget);
  }, [budget, setAdditionalBudget]);

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h2 className="text-lg font-semibold mb-4">追加投資シミュレーション</h2>
      
      <div className="mb-4">
        <label htmlFor="budget-input" className="block text-sm font-medium text-gray-700 mb-1">
          追加予算
        </label>
        <div className="flex items-center">
          <button
            type="button"
            className="bg-gray-200 text-gray-700 h-10 w-10 rounded-l-md flex items-center justify-center"
            onClick={handleDecrease}
            aria-label="予算を減らす"
          >
            -
          </button>
          <input
            id="budget-input"
            type="number"
            className="h-10 text-center border-y border-gray-300 w-24 focus:outline-none"
            value={budget}
            onChange={handleInputChange}
            min="0"
            step={baseCurrency === 'JPY' ? 10000 : 100}
          />
          <button
            type="button"
            className="bg-gray-200 text-gray-700 h-10 w-10 rounded-r-md flex items-center justify-center"
            onClick={handleIncrease}
            aria-label="予算を増やす"
          >
            +
          </button>
          <span id="budget-currency" className="ml-2">{baseCurrency}</span>
          
          <button
            type="button"
            className="ml-4 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark"
            onClick={handleApply}
          >
            適用
          </button>
        </div>
      </div>
      
      <div className="mb-4">
        <label id="preset-label" className="block text-sm font-medium text-gray-700 mb-1">
          予算プリセット
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="preset-label">
          {presetAmounts.map((amount) => (
            <button
              key={amount}
              type="button"
              className="bg-gray-200 text-gray-800 px-3 py-1 rounded-md hover:bg-gray-300"
              onClick={() => handleSetPreset(amount)}
            >
              {baseCurrency === 'JPY' 
                ? `${(amount / 10000).toFixed(0)}万${baseCurrency}` 
                : `${amount.toLocaleString()} ${baseCurrency}`}
            </button>
          ))}
        </div>
      </div>
      
      <div className="bg-gray-100 p-3 rounded-md">
        <div className="text-sm text-gray-600 mb-1">現在の設定:</div>
        <div className="font-bold">
          追加予算: {additionalBudget.toLocaleString()} {baseCurrency}
        </div>
      </div>
    </div>
  );
};

export default BudgetInput;