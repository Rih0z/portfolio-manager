import { authFetch } from '../utils/apiUtils';
import { getErrorStatus } from '../utils/errorUtils';
import type { CurrentAsset, TargetAllocation, ExchangeRate } from '../types/portfolio.types';

export interface ServerPortfolio {
  currentAssets: CurrentAsset[];
  targetPortfolio: TargetAllocation[];
  baseCurrency: string;
  exchangeRate: ExchangeRate | null;
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
      return result.data as ServerPortfolio;
    }
    return null;
  } catch (error: unknown) {
    if (getErrorStatus(error) === 401) {
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
    currentAssets: CurrentAsset[];
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
    return result.data as SaveResult;
  }

  // 409 Version Conflict
  if (result?.error?.code === 'VERSION_CONFLICT') {
    interface ConflictError extends Error {
      code: string;
      serverVersion?: number;
    }
    const conflictError: ConflictError = Object.assign(new Error('VERSION_CONFLICT'), {
      code: 'VERSION_CONFLICT',
      serverVersion: result.error.details?.serverVersion as number | undefined,
    });
    throw conflictError;
  }

  throw new Error((result?.error?.message as string | undefined) ?? 'Failed to save portfolio');
};
