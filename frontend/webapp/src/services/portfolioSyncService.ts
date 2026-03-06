import { authFetch } from '../utils/apiUtils';
import { PortfolioAsset } from '../utils/plCalculation';

export interface TargetAllocation {
  category: string;
  targetPercentage: number;
  currentPercentage?: number;
}

export interface ServerPortfolio {
  currentAssets: PortfolioAsset[];
  targetPortfolio: TargetAllocation[];
  baseCurrency: string;
  exchangeRate: { rate: number; source?: string; timestamp?: string } | null;
  additionalBudget: { amount: number; currency: string } | null;
  aiPromptTemplate: string | null;
  version: number;
  updatedAt: string;
}

export interface SaveResult {
  version: number;
  updatedAt: string;
}

/**
 * サーバーからポートフォリオデータを取得する
 */
export const fetchServerPortfolio = async (): Promise<ServerPortfolio | null> => {
  try {
    const result = await authFetch('api/portfolio', 'get');
    if (result?.success && result.data) {
      return result.data;
    }
    return null;
  } catch (error: any) {
    if (error.response?.status === 401) {
      return null;
    }
    throw error;
  }
};

/**
 * サーバーにポートフォリオデータを保存する
 * @throws VERSION_CONFLICT: 409レスポンス時
 */
export const saveServerPortfolio = async (
  data: {
    currentAssets: PortfolioAsset[];
    targetPortfolio: TargetAllocation[];
    baseCurrency: string;
    exchangeRate?: ServerPortfolio['exchangeRate'];
    additionalBudget?: ServerPortfolio['additionalBudget'];
    aiPromptTemplate?: ServerPortfolio['aiPromptTemplate'];
  },
  version: number | null
): Promise<SaveResult> => {
  const result = await authFetch('api/portfolio', 'put', {
    ...data,
    version
  });

  if (result?.success && result.data) {
    return result.data;
  }

  // 409 Version Conflict
  if (result?.error?.code === 'VERSION_CONFLICT') {
    const conflictError: any = new Error('VERSION_CONFLICT');
    conflictError.code = 'VERSION_CONFLICT';
    conflictError.serverVersion = result.error.details?.serverVersion;
    throw conflictError;
  }

  throw new Error(result?.error?.message || 'Failed to save portfolio');
};
