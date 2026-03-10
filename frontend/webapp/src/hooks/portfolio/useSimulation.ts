/**
 * 投資シミュレーション用カスタムフック — PortfolioStore セレクタ
 */
import { usePortfolioStore } from '../../stores/portfolioStore';
import type { SimulationItem } from '../../types/portfolio.types';

export const useSimulation = () => {
  const store = usePortfolioStore();

  return {
    runSimulation: store.calculateSimulation,
    executePurchase: store.executePurchase,
    simulationResult: null as SimulationItem[] | null,
    includeCurrentHoldings: true,
    setIncludeCurrentHoldings: () => {},
  };
};
