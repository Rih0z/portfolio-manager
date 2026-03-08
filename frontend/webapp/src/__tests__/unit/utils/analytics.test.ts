/**
 * Analytics ユーティリティの単体テスト
 *
 * @file src/__tests__/unit/utils/analytics.test.ts
 */

// analytics.ts は内部で `initialized` フラグを保持するため、
// テスト間の状態分離のために動的インポートを使用
describe('analytics', () => {
  let initGA: typeof import('@/utils/analytics').initGA;
  let trackEvent: typeof import('@/utils/analytics').trackEvent;
  let trackPageView: typeof import('@/utils/analytics').trackPageView;
  let AnalyticsEvents: typeof import('@/utils/analytics').AnalyticsEvents;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubGlobal('gtag', undefined);
    (window as any).dataLayer = undefined;

    const mod = await import('@/utils/analytics');
    initGA = mod.initGA;
    trackEvent = mod.trackEvent;
    trackPageView = mod.trackPageView;
    AnalyticsEvents = mod.AnalyticsEvents;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('AnalyticsEvents', () => {
    it('定義済みイベント名が存在する', () => {
      expect(AnalyticsEvents.LOGIN).toBe('login');
      expect(AnalyticsEvents.CSV_IMPORT).toBe('csv_import');
      expect(AnalyticsEvents.CHECKOUT_START).toBe('checkout_start');
      expect(AnalyticsEvents.GOAL_CREATE).toBe('goal_create');
      expect(AnalyticsEvents.SHARE_CREATE).toBe('share_create');
      expect(AnalyticsEvents.REFERRAL_CODE_COPY).toBe('referral_code_copy');
    });
  });

  describe('initGA', () => {
    it('開発環境ではスキップする（DEV=true）', () => {
      // process.env.NODE_ENV = 'test' (DEV相当)
      initGA('G-TEST123');
      // gtagが設定されないことを確認
      expect(window.gtag).toBeUndefined();
    });

    it('measurementIdがない場合はスキップする', () => {
      initGA();
      expect(window.gtag).toBeUndefined();
    });
  });

  describe('trackEvent', () => {
    it('未初期化の場合は何もしない', () => {
      // gtag未設定の状態でエラーなく呼べる
      expect(() => trackEvent('test_event', { key: 'value' })).not.toThrow();
    });

    it('gtagが未定義の場合は何もしない', () => {
      expect(() => trackEvent('test_event')).not.toThrow();
    });
  });

  describe('trackPageView', () => {
    it('未初期化の場合は何もしない', () => {
      expect(() => trackPageView('/test')).not.toThrow();
    });
  });
});
