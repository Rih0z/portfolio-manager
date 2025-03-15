import React from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import { formatCurrency } from '../../utils/formatters';

const BudgetInput = () => {
  const { additionalBudget, setAdditionalBudget, baseCurrency } = usePortfolioContext();

  // 予算の変更
  const handleBudgetChange = (e) => {
    const value = e.target.value.replace(/[^\d]/g, ''); // 数字以外を削除
    setAdditionalBudget(parseInt(value) || 0);
  };

  // 予算の増減
  const adjustBudget = (amount) => {
    const newValue = Math.max(0, additionalBudget + amount);
    setAdditionalBudget(newValue);
  };

  // プリセット値の設定
  const presets = [100000, 300000, 500000, 1000000];

  return (
    <div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          追加予算
        </label>
        <div className="flex items-center">
          <button
            onClick={() => adjustBudget(-10000)}
            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-l"
          >
            -
          </button>
          <input
            type="text"
            value={additionalBudget.toLocaleString()}
            onChange={handleBudgetChange}
            className="w-full py-2 px-3 border-t border-b text-center"
          />
          <button
            onClick={() => adjustBudget(10000)}
            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-r"
          >
            +
          </button>
        </div>
        <div className="text-right text-xs text-gray-500 mt-1">
          {formatCurrency(additionalBudget, baseCurrency)}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          予算プリセット
        </label>
        <div className="grid grid-cols-4 gap-2">
          {presets.map((preset) => (
            <button
              key={preset}
              onClick={() => setAdditionalBudget(preset)}
              className={`p-2 rounded text-sm ${
                additionalBudget === preset
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {(preset / 10000).toLocaleString()}万
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between text-sm p-2 bg-gray-50 rounded">
        <span>現在の設定額:</span>
        <span className="font-medium">{formatCurrency(additionalBudget, baseCurrency)}</span>
      </div>
    </div>
  );
};

export default BudgetInput;