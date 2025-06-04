/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/components/common/InitialSetupWizard.jsx
 * 
 * 作成者: Claude
 * 作成日: 2025-02-06
 * 
 * 説明: 
 * 初期設定ウィザードコンポーネント。
 * 設定がリセットされた後や初回利用時に表示される。
 * ユーザーに基本的な設定を案内する。
 */

import React, { useState, useContext } from 'react';
import { PortfolioContext } from '../../context/PortfolioContext';
import ModernButton from './ModernButton';
import ModernCard from './ModernCard';
import ModernInput from './ModernInput';
import MarketSelectionWizard from '../settings/MarketSelectionWizard';

const InitialSetupWizard = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [baseCurrency, setBaseCurrency] = useState('JPY');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [selectedMarkets, setSelectedMarkets] = useState([]);
  
  const { 
    setBaseCurrency: updateBaseCurrency,
    setAdditionalBudget,
    addNotification
  } = useContext(PortfolioContext);

  const handleNext = () => {
    if (step === 1) {
      updateBaseCurrency(baseCurrency);
      setStep(2);
    } else if (step === 2) {
      if (!budgetAmount || parseFloat(budgetAmount) <= 0) {
        addNotification('投資予算を入力してください', 'warning');
        return;
      }
      setAdditionalBudget(parseFloat(budgetAmount), baseCurrency);
      setStep(3);
    } else if (step === 3) {
      if (selectedMarkets.length === 0) {
        addNotification('投資対象を選択してください', 'warning');
        return;
      }
      // 設定完了
      addNotification('初期設定が完了しました', 'success');
      onComplete();
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <ModernCard className="max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* プログレスバー */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              <span className={`text-sm ${step >= 1 ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                基本設定
              </span>
              <span className={`text-sm ${step >= 2 ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                投資予算
              </span>
              <span className={`text-sm ${step >= 3 ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                投資対象
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>

          {/* ステップ1: 基本設定 */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Portfolio Wiseへようこそ！</h2>
              <p className="text-gray-600 mb-6">
                まず、基本的な設定から始めましょう。
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    表示通貨を選択してください
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setBaseCurrency('JPY')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        baseCurrency === 'JPY' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-lg font-semibold">¥ 日本円</div>
                      <div className="text-sm text-gray-600">JPY</div>
                    </button>
                    <button
                      onClick={() => setBaseCurrency('USD')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        baseCurrency === 'USD' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-lg font-semibold">$ 米ドル</div>
                      <div className="text-sm text-gray-600">USD</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ステップ2: 投資予算 */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">投資予算の設定</h2>
              <p className="text-gray-600 mb-6">
                今回の投資に使用する予算を入力してください。
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    投資予算
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-semibold">
                      {baseCurrency === 'JPY' ? '¥' : '$'}
                    </span>
                    <ModernInput
                      type="number"
                      value={budgetAmount}
                      onChange={(e) => setBudgetAmount(e.target.value)}
                      placeholder={baseCurrency === 'JPY' ? '300000' : '2000'}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    この金額をもとに最適な投資配分を計算します
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ステップ3: 投資対象選択 */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">投資対象の選択</h2>
              <p className="text-gray-600 mb-6">
                どの市場に投資したいですか？複数選択可能です。
              </p>
              
              <div className="bg-gray-900 p-4 rounded-lg">
                <MarketSelectionWizard
                  selectedMarkets={selectedMarkets}
                  onMarketsChange={setSelectedMarkets}
                  showTitle={false}
                  showPopularCombinations={true}
                />
              </div>
            </div>
          )}

          {/* ボタン */}
          <div className="mt-8 flex justify-between">
            {step > 1 ? (
              <ModernButton
                variant="secondary"
                onClick={handleBack}
              >
                戻る
              </ModernButton>
            ) : (
              <div />
            )}
            
            <ModernButton
              variant="primary"
              onClick={handleNext}
            >
              {step === 3 ? '設定を完了' : '次へ'}
            </ModernButton>
          </div>
        </div>
      </ModernCard>
    </div>
  );
};

export default InitialSetupWizard;