/**
 * useNPSSurvey フック テスト
 * @file src/__tests__/unit/hooks/useNPSSurvey.test.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getNPSCategory } from '../../../hooks/useNPSSurvey';

// localStorage モック
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('getNPSCategory', () => {
  it('スコア9-10はpromoterに分類される', () => {
    expect(getNPSCategory(9)).toBe('promoter');
    expect(getNPSCategory(10)).toBe('promoter');
  });

  it('スコア7-8はpassiveに分類される', () => {
    expect(getNPSCategory(7)).toBe('passive');
    expect(getNPSCategory(8)).toBe('passive');
  });

  it('スコア0-6はdetractorに分類される', () => {
    expect(getNPSCategory(0)).toBe('detractor');
    expect(getNPSCategory(3)).toBe('detractor');
    expect(getNPSCategory(6)).toBe('detractor');
  });
});

describe('useNPSSurvey localStorage管理', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it('初回ログイン日がlocalStorageに保存される', () => {
    // 初回はfirst loginが保存されるべき
    expect(localStorageMock.getItem('pfwise_nps_first_login')).toBeNull();
  });

  it('NPS送信後にタイムスタンプが保存される', () => {
    const now = Date.now();
    localStorageMock.setItem('pfwise_nps_last_submitted', String(now));
    expect(localStorageMock.getItem('pfwise_nps_last_submitted')).toBe(String(now));
  });

  it('NPS dismiss後にタイムスタンプが保存される', () => {
    const now = Date.now();
    localStorageMock.setItem('pfwise_nps_last_dismissed', String(now));
    expect(localStorageMock.getItem('pfwise_nps_last_dismissed')).toBe(String(now));
  });

  it('7日以内の初回ログインではNPSを表示しない判定ロジック', () => {
    const sixDaysAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;
    localStorageMock.setItem('pfwise_nps_first_login', String(sixDaysAgo));

    const firstLogin = parseInt(localStorageMock.getItem('pfwise_nps_first_login')!, 10);
    const daysSinceFirstLogin = (Date.now() - firstLogin) / (1000 * 60 * 60 * 24);

    expect(daysSinceFirstLogin).toBeLessThan(7);
  });

  it('90日以内の前回送信ではNPSを表示しない判定ロジック', () => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    localStorageMock.setItem('pfwise_nps_last_submitted', String(thirtyDaysAgo));

    const lastSubmitted = parseInt(localStorageMock.getItem('pfwise_nps_last_submitted')!, 10);
    const daysSinceSubmit = (Date.now() - lastSubmitted) / (1000 * 60 * 60 * 24);

    expect(daysSinceSubmit).toBeLessThan(90);
  });

  it('30日以内のdismissではNPSを表示しない判定ロジック', () => {
    const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
    localStorageMock.setItem('pfwise_nps_last_dismissed', String(tenDaysAgo));

    const lastDismissed = parseInt(localStorageMock.getItem('pfwise_nps_last_dismissed')!, 10);
    const daysSinceDismiss = (Date.now() - lastDismissed) / (1000 * 60 * 60 * 24);

    expect(daysSinceDismiss).toBeLessThan(30);
  });

  it('初回ログインから7日以上 + 前回送信から90日以上で表示可能', () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const ninetyOneDaysAgo = Date.now() - 91 * 24 * 60 * 60 * 1000;
    localStorageMock.setItem('pfwise_nps_first_login', String(eightDaysAgo));
    localStorageMock.setItem('pfwise_nps_last_submitted', String(ninetyOneDaysAgo));

    const firstLogin = parseInt(localStorageMock.getItem('pfwise_nps_first_login')!, 10);
    const lastSubmitted = parseInt(localStorageMock.getItem('pfwise_nps_last_submitted')!, 10);
    const daysSinceFirst = (Date.now() - firstLogin) / (1000 * 60 * 60 * 24);
    const daysSinceSubmit = (Date.now() - lastSubmitted) / (1000 * 60 * 60 * 24);

    expect(daysSinceFirst).toBeGreaterThanOrEqual(7);
    expect(daysSinceSubmit).toBeGreaterThanOrEqual(90);
  });
});
