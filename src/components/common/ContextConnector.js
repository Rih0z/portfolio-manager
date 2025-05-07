import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePortfolioContext } from '../hooks/usePortfolioContext';

const ContextConnector = () => {
  const auth = useAuth();
  const portfolio = usePortfolioContext();
  
  // AuthContextにPortfolioContextへの参照を設定
  useEffect(() => {
    if (auth.setPortfolioContextRef && portfolio) {
      auth.setPortfolioContextRef(portfolio);
    }
  }, [auth, portfolio]);
  
  return null; // このコンポーネントはUIをレンダリングしない
};

export default ContextConnector;
