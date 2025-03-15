import React from 'react';
import BudgetInput from '../components/simulation/BudgetInput';
import SimulationResult from '../components/simulation/SimulationResult';
import { usePortfolioContext } from '../hooks/usePortfolioContext';

const Simulation = () => {
  const { totalAssets, additionalBudget, calculateSimulation, executeBatchPurchase } = usePortfolioContext();
  
  // シミュレーション結果を計算
  const simulationResults = calculateSimulation();
  
  // 一括購入処理
  const handleBatchPurchase = () => {
    if (window.confirm('シミュレーション結果に基づいて購入を実行しますか？')) {
      executeBatchPurchase(simulationResults);
      alert('購入処理が完了しました。');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">追加投資のシミュレーション</h2>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">予算の設定</h3>
          <BudgetInput />
        </div>
        
        <div className="bg-blue-50 p-4 rounded-md mb-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">現在の総資産</p>
              <p className="text-lg font-semibold">{totalAssets.toLocaleString()} 円</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">追加予算</p>
              <p className="text-lg font-semibold">{additionalBudget.toLocaleString()} 円</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">シミュレーション後の総資産</p>
              <p className="text-lg font-semibold">{(totalAssets + additionalBudget).toLocaleString()} 円</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">シミュレーション結果</h2>
          <button
            onClick={handleBatchPurchase}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded"
          >
            一括購入実行
          </button>
        </div>
        
        <SimulationResult simulationResults={simulationResults} />
      </div>
    </div>
  );
};

export default Simulation;