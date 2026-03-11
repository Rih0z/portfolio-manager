/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/pages/Simulation.tsx
 *
 * 作成者: Koki Riho （https://github.com/Rih0z）
 * 作成日: 2025-03-19 16:40:22
 *
 * 更新履歴:
 * - 2025-03-19 16:40:22 Koki Riho 初回作成
 * - 2025-04-12 11:35:40 Koki Riho シミュレーション結果表示の改善
 * - 2025-04-30 15:20:15 Yuta Sato AI分析プロンプト生成機能を追加
 *
 * 説明:
 * 追加投資のシミュレーション機能を提供するページコンポーネント。
 * 予算設定、最適な購入配分のシミュレーション、一括購入実行機能を実装。
 */

import React, { useState } from 'react';
import BudgetInput from '../components/simulation/BudgetInput';
import SimulationResult from '../components/simulation/SimulationResult';
import AiAnalysisPrompt from '../components/simulation/AiAnalysisPrompt';
import { usePortfolioContext } from '../hooks/usePortfolioContext';
import { useUIStore } from '../stores/uiStore';
import ConfirmDialog from '../components/ui/confirm-dialog';

const Simulation = () => {
  const {
    totalAssets,
    additionalBudget,
    calculateSimulation,
    executeBatchPurchase,
    baseCurrency,
    convertCurrency,
  } = usePortfolioContext();
  const addNotification = useUIStore(s => s.addNotification);
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);

  // 追加予算を baseCurrency に換算
  const budgetInBase = additionalBudget.currency === baseCurrency
    ? additionalBudget.amount
    : convertCurrency(additionalBudget.amount, additionalBudget.currency, baseCurrency);

  // シミュレーション結果を計算
  const simulationResults = calculateSimulation();

  // 一括購入処理
  const handleBatchPurchase = () => {
    setShowBatchConfirm(true);
  };

  const confirmBatchPurchase = () => {
    executeBatchPurchase(simulationResults);
    addNotification('購入処理が完了しました。', 'success');
    setShowBatchConfirm(false);
  };

  // 通貨に応じたフォーマット
  const formatCurrencyValue = (value: any, currency: any) => {
    if (currency === 'JPY') {
      return `${value.toLocaleString()} 円`;
    } else {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  return (
    <div data-testid="simulation-page" className="space-y-6">
      <div className="bg-card rounded-lg shadow border border-border p-6">
        <h2 className="text-xl font-semibold mb-4 text-foreground">追加投資のシミュレーション</h2>

        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3 text-foreground">予算の設定</h3>
          <BudgetInput />
        </div>

        <div className="bg-primary-500/10 p-4 rounded-md mb-6 border border-primary-500/20">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">現在の総資産</p>
              <p className="text-lg font-semibold text-foreground">
                {formatCurrencyValue(totalAssets, baseCurrency)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">追加予算</p>
              <p className="text-lg font-semibold text-foreground">
                {formatCurrencyValue(additionalBudget.amount, additionalBudget.currency)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">シミュレーション後の総資産</p>
              <p className="text-lg font-semibold text-foreground">
                {formatCurrencyValue(totalAssets + budgetInBase, baseCurrency)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow border border-border p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-foreground">シミュレーション結果</h2>
          <button
            onClick={handleBatchPurchase}
            className="bg-success-500 hover:bg-success-600 text-white font-medium py-2 px-4 rounded"
          >
            一括購入実行
          </button>
        </div>

        <SimulationResult simulationResults={simulationResults} />
      </div>

      {/* AI分析プロンプト生成コンポーネントを追加 */}
      <AiAnalysisPrompt />

      <ConfirmDialog
        isOpen={showBatchConfirm}
        onConfirm={confirmBatchPurchase}
        onCancel={() => setShowBatchConfirm(false)}
        title="一括購入の確認"
        description="シミュレーション結果に基づいて購入を実行しますか？"
        confirmLabel="購入実行"
        cancelLabel="キャンセル"
      />
    </div>
  );
};

export default Simulation;
