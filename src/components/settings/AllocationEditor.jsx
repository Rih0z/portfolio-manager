/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/components/settings/AllocationEditor.jsx 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-08 14:30:00 
 * 
 * 更新履歴: 
 * - 2025-05-08 14:30:00 Koki Riho 初回作成
 * 
 * 説明: 
 * 目標資産配分の編集を行うコンポーネント。
 * 各銘柄の目標配分率を個別に設定したり、自動調整機能で合計を100%に調整したりできる。
 * 現在の合計配分率を表示し、100%になっているかどうかを視覚的にフィードバックする。
 */
import React, { useState, useEffect } from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';

const AllocationEditor = () => {
  const { targetPortfolio, updateTargetAllocation } = usePortfolioContext();
  const [allocations, setAllocations] = useState({});
  const [totalAllocation, setTotalAllocation] = useState(0);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // 初期値のセット
  useEffect(() => {
    const initialAllocations = {};
    targetPortfolio.forEach(item => {
      initialAllocations[item.id] = item.targetPercentage;
    });
    setAllocations(initialAllocations);
    
    // 合計値の計算
    const total = Object.values(initialAllocations).reduce((sum, value) => sum + value, 0);
    setTotalAllocation(total);
  }, [targetPortfolio]);

  // 配分値の変更処理
  const handleAllocationChange = (id, value) => {
    // 入力値のバリデーション
    const numValue = parseFloat(value) || 0;
    const clampedValue = Math.max(0, Math.min(100, numValue));
    
    // 状態の更新
    const newAllocations = { ...allocations, [id]: clampedValue };
    setAllocations(newAllocations);
    
    // 合計値の再計算
    const total = Object.values(newAllocations).reduce((sum, value) => sum + value, 0);
    setTotalAllocation(total);
    
    // コンテキストの更新
    updateTargetAllocation(id, clampedValue);
  };

  // 配分の自動調整
  const handleAdjustAllocations = () => {
    if (targetPortfolio.length === 0) {
      showMessage('調整する銘柄がありません', 'error');
      return;
    }
    
    if (totalAllocation === 100) {
      showMessage('既に100%になっています', 'info');
      return;
    }
    
    // 現在の配分比率を保持したまま合計を100%にする
    const total = Object.values(allocations).reduce((sum, value) => sum + value, 0);
    if (total === 0) {
      // すべてが0の場合は均等に分配
      const equalShare = 100 / targetPortfolio.length;
      const newAllocations = {};
      
      targetPortfolio.forEach(item => {
        newAllocations[item.id] = equalShare;
        updateTargetAllocation(item.id, equalShare);
      });
      
      setAllocations(newAllocations);
      setTotalAllocation(100);
      showMessage('配分を均等に調整しました', 'success');
      
    } else {
      // 現在の比率を保持して調整
      const ratio = 100 / total;
      const newAllocations = {};
      
      Object.entries(allocations).forEach(([id, value]) => {
        const adjustedValue = parseFloat((value * ratio).toFixed(1));
        newAllocations[id] = adjustedValue;
        updateTargetAllocation(id, adjustedValue);
      });
      
      // 端数調整（最後の項目で調整）
      if (targetPortfolio.length > 0) {
        const adjustedTotal = Object.values(newAllocations).reduce((sum, value) => sum + value, 0);
        const lastId = targetPortfolio[targetPortfolio.length - 1].id;
        newAllocations[lastId] = parseFloat((newAllocations[lastId] + (100 - adjustedTotal)).toFixed(1));
        updateTargetAllocation(lastId, newAllocations[lastId]);
      }
      
      setAllocations(newAllocations);
      setTotalAllocation(100);
      showMessage('配分比率を保持したまま調整しました', 'success');
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

  // 銘柄がない場合
  if (targetPortfolio.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-600">
          目標配分を設定する銘柄がありません。上部の「銘柄の追加」セクションから銘柄を追加してください。
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm">
          <span className="font-medium">合計:</span>{' '}
          <span className={totalAllocation === 100 ? 'text-green-600' : 'text-red-600'}>
            {totalAllocation.toFixed(1)}%
          </span>
        </div>
        <button
          onClick={handleAdjustAllocations}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          配分を自動調整
        </button>
      </div>

      <div className="bg-white rounded border overflow-hidden">
        {targetPortfolio.map((item) => (
          <div
            key={item.id}
            className="flex items-center p-3 border-b last:border-b-0 hover:bg-gray-50"
          >
            <div className="flex-1">
              <div className="font-medium">{item.name}</div>
              <div className="text-xs text-gray-500">{item.ticker}</div>
            </div>
            <div className="w-20 flex items-center">
              <input
                type="number"
                value={allocations[item.id] || 0}
                onChange={(e) => handleAllocationChange(item.id, e.target.value)}
                className="w-14 p-1 border rounded text-right"
                min="0"
                max="100"
                step="0.1"
              />
              <span className="ml-1">%</span>
            </div>
          </div>
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

export default AllocationEditor;
