/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/context/AuthContext.tsx
 *
 * 作成者: Koki Riho （https://github.com/Rih0z）
 * 更新日: 2026-03-04
 *
 * 更新履歴:
 * - 2025-05-08 Koki Riho 初回作成
 * - 2025-09-05 Claude Code セッション永続化改善 (AuthContextFix)
 * - 2026-03-04 Claude Code 3実装を統合（AuthContext + AuthContextFix + AuthContext.client）
 *
 * 説明:
 * Google OAuth認証のReact Context。セッション管理、Google Drive連携、
 * localStorageによるセッション永続化を提供する統合実装。
 */

import React, { createContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { getApiEndpoint, getGoogleClientId } from '../utils/envUtils';
import { authFetch, setAuthToken, getAuthToken, clearAuthToken, refreshAccessToken } from '../utils/apiUtils';

interface UserData {
  id: string;
  email: string;
  name: string;
  picture: string;
}

interface SessionData {
  user: UserData;
  hasDriveAccess: boolean;
  timestamp: number;
}

interface PortfolioContextRef {
  handleAuthStateChange?: (authenticated: boolean, userData: UserData | null) => void;
  loadFromGoogleDrive?: () => void;
}

interface CredentialResponse {
  credential?: string;
  code?: string;
  [key: string]: any;
}

interface LoginResult {
  success: boolean;
  hasDriveAccess: boolean;
}

export interface AuthContextValue {
  // State
  user: UserData | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  hasDriveAccess: boolean;
  googleClientId: string;
  // Methods
  loginWithGoogle: (credentialResponse: CredentialResponse) => Promise<LoginResult>;
  logout: () => Promise<void>;
  checkSession: () => Promise<boolean>;
  initiateDriveAuth: () => Promise<boolean>;
  setPortfolioContextRef: (context: PortfolioContextRef) => void;
  // Aliases (後方互換)
  handleLogout: () => Promise<void>;
  login: (credentialResponse: CredentialResponse) => Promise<LoginResult>;
  authorizeDrive: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const SESSION_STORAGE_KEY = 'pfwise_session';
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24時間
const SESSION_CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30分
const VISIBILITY_CHECK_DEBOUNCE_MS = 1000;
const MIN_CHECK_INTERVAL_MS = 60 * 1000; // 1分
const MAX_SESSION_CHECK_FAILURES = 3;

// --- localStorage セッション永続化 ---

const saveSession = (sessionData: Omit<SessionData, 'timestamp'>): void => {
  try {
    // セキュリティ: JWT Access Token は localStorage に保存しない（メモリのみ）
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
      user: sessionData.user,
      hasDriveAccess: sessionData.hasDriveAccess,
      timestamp: Date.now(),
    }));
  } catch (e: any) {
    console.warn('セッション保存エラー:', e.message);
  }
};

const loadSession = (): SessionData | null => {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;
    const session: SessionData = JSON.parse(stored);
    if (Date.now() - session.timestamp >= SESSION_MAX_AGE_MS) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return session;
  } catch (e: any) {
    console.warn('セッション読み込みエラー:', e.message);
    return null;
  }
};

const clearSession = (): void => {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {
    // noop
  }
};

// --- AuthProvider ---

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasDriveAccess, setHasDriveAccess] = useState<boolean>(false);
  const [googleClientId, setGoogleClientId] = useState<string>('');

  const portfolioContextRef = useRef<PortfolioContextRef | null>(null);
  const sessionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionCheckFailureCount = useRef<number>(0);
  const lastCheckTimeRef = useRef<number>(0);

  // Google Client ID 取得
  useEffect(() => {
    getGoogleClientId().then((id: string) => setGoogleClientId(id));
  }, []);

  // 認証状態の内部更新ヘルパー
  const setAuthState = useCallback((userData: UserData | null, authenticated: boolean, driveAccess: boolean, token: string | null): void => {
    setUser(userData);
    setIsAuthenticated(authenticated);
    setHasDriveAccess(driveAccess);
    setError(null);

    if (authenticated && userData) {
      if (token) setAuthToken(token);
      // トークンはメモリのみ保存、localStorageにはユーザー情報のみ
      saveSession({ user: userData, hasDriveAccess: driveAccess });
    } else {
      clearAuthToken();
      clearSession();
    }
  }, []);

  const notifyPortfolioContext = useCallback((authenticated: boolean, userData: UserData | null): void => {
    if (portfolioContextRef.current?.handleAuthStateChange) {
      portfolioContextRef.current.handleAuthStateChange(authenticated, userData);
    }
  }, []);

  /**
   * JWT Access Token をデコードして有効期限を確認する（ローカル検証、API不要）
   */
  const checkTokenLocally = useCallback((token: string): { valid: boolean; payload: any } => {
    if (!token) return { valid: false, payload: null };
    try {
      // JWTペイロードをBase64デコード（署名検証はサーバー側で実施済み）
      const parts = token.split('.');
      if (parts.length !== 3) return { valid: false, payload: null };
      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);
      // 5分のバッファを持って期限切れ判定
      if (payload.exp && payload.exp > (now + 300)) {
        return { valid: true, payload };
      }
      return { valid: false, payload };
    } catch {
      return { valid: false, payload: null };
    }
  }, []);

  // --- セッション確認 ---
  const checkSession = useCallback(async (): Promise<boolean> => {
    try {
      const token = getAuthToken();
      const stored = loadSession();

      // トークンもストレージもない場合
      if (!token && !stored) {
        setAuthState(null, false, false, null);
        setLoading(false);
        return false;
      }

      // 1. メモリにJWTがある場合、ローカルデコードで有効期限確認（API不要）
      if (token) {
        const { valid, payload } = checkTokenLocally(token);
        if (valid && payload) {
          // JWT有効 → UI更新のみ（APIコール不要）
          const userData: UserData = {
            id: payload.sub,
            email: payload.email,
            name: payload.name || '',
            picture: payload.picture || ''
          };
          setAuthState(userData, true, payload.hasDriveAccess || false, token);
          sessionCheckFailureCount.current = 0;
          lastCheckTimeRef.current = Date.now();
          setLoading(false);
          return true;
        }
      }

      // 2. JWT期限切れまたは無し → POST /auth/refresh でトークン取得
      setLoading(true);

      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          const { valid, payload } = checkTokenLocally(newToken);
          if (valid && payload) {
            const userData: UserData = {
              id: payload.sub,
              email: payload.email,
              name: payload.name || '',
              picture: payload.picture || ''
            };
            setAuthState(userData, true, payload.hasDriveAccess || false, newToken);
            notifyPortfolioContext(true, userData);
            sessionCheckFailureCount.current = 0;
            lastCheckTimeRef.current = Date.now();
            setLoading(false);
            return true;
          }
        }
      } catch (refreshErr: any) {
        console.warn('JWT refresh failed:', refreshErr.message);
      }

      // 3. フォールバック: GET /auth/session（レガシーCookieセッション）
      try {
        const sessionEndpoint = await getApiEndpoint('auth/session');
        const response: any = await authFetch(sessionEndpoint, 'get');

        if (response?.success && response.isAuthenticated) {
          const newToken = response.accessToken || response.token || getAuthToken();
          setAuthState(response.user, true, response.hasDriveAccess || false, newToken);
          notifyPortfolioContext(true, response.user);
          sessionCheckFailureCount.current = 0;
          lastCheckTimeRef.current = Date.now();
          setLoading(false);
          return true;
        }
      } catch (sessionErr: any) {
        console.warn('Session check fallback failed:', sessionErr.message);
      }

      // セッション無効
      setAuthState(null, false, false, null);
      notifyPortfolioContext(false, null);
      setLoading(false);
      return false;

    } catch (err: any) {
      console.warn('セッション確認エラー:', err.message);
      sessionCheckFailureCount.current++;

      // 最大失敗回数に達した場合、ローカルセッションにフォールバック
      if (sessionCheckFailureCount.current >= MAX_SESSION_CHECK_FAILURES) {
        const stored = loadSession();
        if (stored) {
          setAuthState(stored.user, true, stored.hasDriveAccess, null);
          if (sessionIntervalRef.current) {
            clearInterval(sessionIntervalRef.current);
            sessionIntervalRef.current = null;
          }
        } else {
          setAuthState(null, false, false, null);
        }
      }

      setLoading(false);
      return false;
    }
  }, [setAuthState, notifyPortfolioContext, checkTokenLocally]);

  // --- Google ログイン ---
  const loginWithGoogle = useCallback(async (credentialResponse: CredentialResponse): Promise<LoginResult> => {
    try {
      setLoading(true);
      setError(null);

      const loginEndpoint = await getApiEndpoint('auth/google/login');

      // リクエストボディを構築（One Tap / OAuth Code Flow 両対応）
      const requestBody: Record<string, string> = {};
      if (credentialResponse.credential) {
        requestBody.credential = credentialResponse.credential;
      } else if (credentialResponse.code) {
        requestBody.code = credentialResponse.code;
        requestBody.redirectUri = window.location.origin + '/auth/google/callback';
      } else {
        setError('認証情報が取得できませんでした');
        setLoading(false);
        return { success: false, hasDriveAccess: false };
      }

      const response: any = await authFetch(loginEndpoint, 'post', requestBody);

      if (!response) {
        setError('サーバーからの応答がありません');
        setLoading(false);
        return { success: false, hasDriveAccess: false };
      }

      if (response.error) {
        setError(response.error.message || '認証に失敗しました');
        setLoading(false);
        return { success: false, hasDriveAccess: false };
      }

      if (response.success) {
        // JWT Access Token を優先的に検出
        const data = response.data || response;
        const token = data.accessToken || data.token ||
                      response.accessToken || response.token;
        const userData = data.user || response.user;
        const driveAccess = data.hasDriveAccess || response.hasDriveAccess || false;

        setAuthState(userData, true, driveAccess, token);
        notifyPortfolioContext(true, userData);
        sessionCheckFailureCount.current = 0;

        // Drive権限がある場合、自動でデータ読み込み
        if (driveAccess && portfolioContextRef.current?.loadFromGoogleDrive) {
          setTimeout(() => {
            portfolioContextRef.current?.loadFromGoogleDrive?.();
          }, 1000);
        }

        setLoading(false);
        return { success: true, hasDriveAccess: driveAccess };
      }

      const errorMessage = response?.message || response?.error?.message || 'ログインに失敗しました';
      setError(errorMessage);
      setLoading(false);
      return { success: false, hasDriveAccess: false };

    } catch (err: any) {
      console.error('Google認証エラー:', err.message);
      const errorMessage = err.response?.data?.error?.message ||
                           err.response?.data?.message ||
                           err.message ||
                           'ログイン処理中にエラーが発生しました';
      setError(errorMessage);
      setLoading(false);
      return { success: false, hasDriveAccess: false };
    }
  }, [setAuthState, notifyPortfolioContext]);

  // --- ログアウト ---
  const logout = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const logoutEndpoint = await getApiEndpoint('auth/logout');
      await authFetch(logoutEndpoint, 'post');
    } catch (err: any) {
      console.warn('ログアウトAPI呼び出しエラー:', err.message);
    } finally {
      setAuthState(null, false, false, null);
      notifyPortfolioContext(false, null);
      setLoading(false);
    }
  }, [setAuthState, notifyPortfolioContext]);

  // --- Drive API 認証開始 ---
  const initiateDriveAuth = useCallback(async (): Promise<boolean> => {
    try {
      const driveInitEndpoint = await getApiEndpoint('auth/google/drive/initiate');

      const response: any = await authFetch(driveInitEndpoint, 'get', null, {
        withCredentials: true,
      });

      if (response?.authUrl) {
        window.location.href = response.authUrl;
        return true;
      }

      setError('Drive API認証URLの取得に失敗しました');
      return false;
    } catch (err: any) {
      console.error('Drive API認証開始エラー:', err.message);

      if (err.response?.status === 401) {
        if (err.response?.data?.requiresReauth) {
          setError('再度ログインが必要です。');
          setAuthState(null, false, false, null);
        } else {
          setError('Google Driveへのアクセス権限がありません。再度認証してください。');
        }
      } else {
        setError('Drive API認証の開始に失敗しました');
      }
      return false;
    }
  }, [setAuthState]);

  // --- ポートフォリオコンテキスト参照設定 ---
  const setPortfolioContextRef = useCallback((context: PortfolioContextRef): void => {
    portfolioContextRef.current = context;
  }, []);

  // --- 初期化時のセッション確認 ---
  useEffect(() => {
    // まずローカルセッションでUI即座復元（トークンはメモリになし→refreshで取得）
    const stored = loadSession();
    if (stored) {
      setUser(stored.user);
      setIsAuthenticated(true);
      setHasDriveAccess(stored.hasDriveAccess || false);
      // JWT Access Token はlocalStorageに保存していないため、refreshで取得
    }

    // API確認（JWT refresh → fallback to session check）
    checkSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- 定期的なセッションチェック ---
  useEffect(() => {
    if (sessionIntervalRef.current) {
      clearInterval(sessionIntervalRef.current);
      sessionIntervalRef.current = null;
    }

    if (isAuthenticated) {
      sessionCheckFailureCount.current = 0;
      sessionIntervalRef.current = setInterval(() => {
        checkSession();
      }, SESSION_CHECK_INTERVAL_MS);

      return () => {
        if (sessionIntervalRef.current) {
          clearInterval(sessionIntervalRef.current);
          sessionIntervalRef.current = null;
        }
      };
    }
  }, [isAuthenticated, checkSession]);

  // --- タブ切り替え時のセッション確認（デバウンス付き） ---
  useEffect(() => {
    let visibilityTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleVisibilityChange = (): void => {
      if (!document.hidden && isAuthenticated) {
        if (sessionCheckFailureCount.current >= MAX_SESSION_CHECK_FAILURES) return;

        const timeSinceLastCheck = Date.now() - lastCheckTimeRef.current;
        if (timeSinceLastCheck < MIN_CHECK_INTERVAL_MS) return;

        if (visibilityTimeout) clearTimeout(visibilityTimeout);
        visibilityTimeout = setTimeout(() => {
          checkSession();
        }, VISIBILITY_CHECK_DEBOUNCE_MS);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityTimeout) clearTimeout(visibilityTimeout);
    };
  }, [isAuthenticated, checkSession]);

  // --- Context Value ---
  const value: AuthContextValue = {
    // State
    user,
    isAuthenticated,
    loading,
    error,
    hasDriveAccess,
    googleClientId,
    // Methods
    loginWithGoogle,
    logout,
    checkSession,
    initiateDriveAuth,
    setPortfolioContextRef,
    // Aliases (後方互換)
    handleLogout: logout,
    login: loginWithGoogle,
    authorizeDrive: initiateDriveAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
export const AuthConsumer = AuthContext.Consumer;
