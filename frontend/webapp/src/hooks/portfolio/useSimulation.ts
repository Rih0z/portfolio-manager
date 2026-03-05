/**
 * 投資シミュレーション用カスタムフック — PortfolioStore セレクタ
 */
import { usePortfolioStore } from '../../stores/portfolioStore';

export const useSimulation = () => {
  const store = usePortfolioStore();

  return {
    runSimulation: store.calculateSimulation,
    executePurchase: store.executePurchase,
    simulationResult: null,
    includeCurrentHoldings: true,
    setIncludeCurrentHoldings: () => {},
  };
};
