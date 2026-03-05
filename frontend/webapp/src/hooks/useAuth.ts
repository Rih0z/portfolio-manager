/**
 * useAuth - 認証状態アクセスフック
 *
 * Zustand authStore のセレクタフック。
 * AuthContext は廃止。全コンポーネントはこのフック経由で認証状態にアクセスする。
 */
import { useAuthStore } from '../stores/authStore';

export interface AuthContextValue {
  user: any;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  hasDriveAccess: boolean;
  googleClientId: string;
  loginWithGoogle: (credentialResponse: any) => Promise<any>;
  logout: () => Promise<void>;
  checkSession: () => Promise<boolean>;
  initiateDriveAuth: () => Promise<boolean>;
  handleLogout: () => Promise<void>;
  login: (credentialResponse: any) => Promise<any>;
  authorizeDrive: () => Promise<boolean>;
  // 後方互換: ContextConnector 用（noop）
  setPortfolioContextRef?: (context: any) => void;
}

export const useAuth = (): AuthContextValue => {
  const store = useAuthStore();

  return {
    ...store,
    // setPortfolioContextRef is no longer needed (stores communicate directly)
    setPortfolioContextRef: () => {},
  };
};

export default useAuth;
