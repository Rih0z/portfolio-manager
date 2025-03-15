import { useContext } from 'react';
import { PortfolioContext } from '../context/PortfolioContext';

export const usePortfolioContext = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolioContext must be used within a PortfolioProvider');
  }
  return context;
};

export default usePortfolioContext;