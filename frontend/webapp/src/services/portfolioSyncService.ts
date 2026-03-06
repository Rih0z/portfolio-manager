import { authFetch } from '../utils/apiUtils';

export interface ServerPortfolio {
  currentAssets: any[];
  targetPortfolio: any[];
  baseCurrency: string;
  exchangeRate: any;
  additionalBudget: any;
  aiPromptTemplate: any;
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
    currentAssets: any[];
    targetPortfolio: any[];
    baseCurrency: string;
    exchangeRate?: any;
    additionalBudget?: any;
    aiPromptTemplate?: any;
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
