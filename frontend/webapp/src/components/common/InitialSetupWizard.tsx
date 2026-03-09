/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/components/common/InitialSetupWizard.tsx
 *
 * 作成者: Claude
 * 作成日: 2025-02-06
 * 更新日: 2026-03-09
 *
 * 説明:
 * 初期設定ウィザードコンポーネント（1画面統合版）。
 * 通貨・予算・市場を1画面で設定可能。
 * ブラウザロケールから通貨を自動検出し、「米国+日本」をデフォルト選択。
 * スキップ機能あり。
 */

import React, { useState } from 'react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import MarketSelectionWizard from '../settings/MarketSelectionWizard';

// ブラウザロケールから通貨を自動検出
const detectCurrency = (): 'JPY' | 'USD' => {
  const lang = navigator.language || 'ja';
  return lang.startsWith('ja') ? 'JPY' : 'USD';
};

const InitialSetupWizard = ({ onComplete }: { onComplete: () => void }) => {
  const [baseCurrency, setBaseCurrency] = useState<'JPY' | 'USD'>(detectCurrency());
  const [budgetAmount, setBudgetAmount] = useState('');
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>(['US', 'JAPAN']);

  const {
    setBaseCurrency: updateBaseCurrency,
    setAdditionalBudget,
    addNotification
  } = usePortfolioContext();

  const handleComplete = () => {
    updateBaseCurrency(baseCurrency);

    if (budgetAmount && parseFloat(budgetAmount) > 0) {
      setAdditionalBudget(parseFloat(budgetAmount), baseCurrency);
    }

    addNotification('初期設定が完了しました', 'success');
    onComplete();
  };

  const handleSkip = () => {
    // デフォルト値で設定を完了
    updateBaseCurrency(detectCurrency());
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" data-testid="initial-setup-wizard">
      <Card padding="none" className="max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* ヘッダー */}
          <div>
            <h2 className="text-2xl font-bold mb-1">Portfolio Wiseへようこそ！</h2>
            <p className="text-muted-foreground text-sm">
              基本設定を行いましょう。後からいつでも変更できます。
            </p>
          </div>

          {/* 通貨 + 予算（同一行） */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                表示通貨
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setBaseCurrency('JPY')}
                  className={`p-3 rounded-lg border-2 transition-all text-sm ${
                    baseCurrency === 'JPY'
                      ? 'border-primary-500 bg-primary-500/10 text-foreground'
                      : 'border-border hover:border-muted-foreground text-muted-foreground'
                  }`}
                >
                  <div className="font-semibold">¥ 日本円</div>
                </button>
                <button
                  onClick={() => setBaseCurrency('USD')}
                  className={`p-3 rounded-lg border-2 transition-all text-sm ${
                    baseCurrency === 'USD'
                      ? 'border-primary-500 bg-primary-500/10 text-foreground'
                      : 'border-border hover:border-muted-foreground text-muted-foreground'
                  }`}
                >
                  <div className="font-semibold">$ 米ドル</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                投資予算（任意）
              </label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-foreground">
                  {baseCurrency === 'JPY' ? '¥' : '$'}
                </span>
                <Input
                  type="number"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  placeholder={baseCurrency === 'JPY' ? '300000' : '2000'}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                最適な投資配分の計算に使用します
              </p>
            </div>
          </div>

          {/* 投資対象市場 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              投資対象市場
            </label>
            <div className="bg-muted/50 p-4 rounded-lg">
              <MarketSelectionWizard
                selectedMarkets={selectedMarkets}
                onMarketsChange={setSelectedMarkets}
                showTitle={false}
                showPopularCombinations={true}
              />
            </div>
          </div>

          {/* ボタン */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
            >
              スキップしてダッシュボードへ
            </button>

            <Button
              variant="primary"
              onClick={handleComplete}
            >
              設定を完了
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default InitialSetupWizard;
