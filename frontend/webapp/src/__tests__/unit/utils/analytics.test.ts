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
    // スクリプトタグのクリーンアップ
    document.querySelectorAll('script[src*="googletagmanager"]').forEach((el) => el.remove());
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

    it('Phase 5-C 通知・ソーシャル・リファラル関連のイベント名が存在する', () => {
      expect(AnalyticsEvents.ALERT_RULE_CREATE).toBe('alert_rule_create');
      expect(AnalyticsEvents.ALERT_RULE_DELETE).toBe('alert_rule_delete');
      expect(AnalyticsEvents.ALERT_TRIGGERED).toBe('alert_triggered');
      expect(AnalyticsEvents.NOTIFICATION_READ).toBe('notification_read');
      expect(AnalyticsEvents.SHARE_VIEW).toBe('share_view');
      expect(AnalyticsEvents.SHARE_DELETE).toBe('share_delete');
      expect(AnalyticsEvents.PEER_COMPARISON_VIEW).toBe('peer_comparison_view');
      expect(AnalyticsEvents.SHARE_CTA_CLICK).toBe('share_cta_click');
      expect(AnalyticsEvents.REFERRAL_CODE_APPLY).toBe('referral_code_apply');
      expect(AnalyticsEvents.REFERRAL_SIGNUP).toBe('referral_signup');
    });

    it('Phase 7-C NPS調査関連のイベント名が存在する', () => {
      expect(AnalyticsEvents.NPS_SUBMIT).toBe('nps_submit');
      expect(AnalyticsEvents.NPS_DISMISS).toBe('nps_dismiss');
    });

    it('その他のイベント名が定義されている', () => {
      expect(AnalyticsEvents.LANDING_VIEW).toBe('landing_view');
      expect(AnalyticsEvents.DASHBOARD_VIEW).toBe('dashboard_view');
      expect(AnalyticsEvents.PRICING_VIEW).toBe('pricing_view');
      expect(AnalyticsEvents.SIMULATION_RUN).toBe('simulation_run');
      expect(AnalyticsEvents.PNL_VIEW).toBe('pnl_view');
      expect(AnalyticsEvents.PORTFOLIO_SYNC).toBe('portfolio_sync');
      expect(AnalyticsEvents.GOAL_UPDATE).toBe('goal_update');
      expect(AnalyticsEvents.GOAL_DELETE).toBe('goal_delete');
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

    it('空文字のmeasurementIdではスキップする', () => {
      initGA('');
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

    it('paramsなしでもエラーなく呼べる', () => {
      expect(() => trackEvent('test_event')).not.toThrow();
    });
  });

  describe('trackPageView', () => {
    it('未初期化の場合は何もしない', () => {
      expect(() => trackPageView('/test')).not.toThrow();
    });
  });
});

/**
 * 本番環境（import.meta.env.DEV = false）での動作テスト
 *
 * import.meta.env.DEV を false に上書きし、GA4の初期化・イベント送信・
 * ページビュー計測の本番パスをカバーする。
 */
describe('analytics (production mode)', () => {
  let initGA: typeof import('@/utils/analytics').initGA;
  let trackEvent: typeof import('@/utils/analytics').trackEvent;
  let trackPageView: typeof import('@/utils/analytics').trackPageView;
  let AnalyticsEvents: typeof import('@/utils/analytics').AnalyticsEvents;

  // import.meta.env.DEV の元の値を保存
  const originalDev = import.meta.env.DEV;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubGlobal('gtag', undefined);
    (window as any).dataLayer = undefined;

    // 本番環境をシミュレート
    import.meta.env.DEV = false;

    const mod = await import('@/utils/analytics');
    initGA = mod.initGA;
    trackEvent = mod.trackEvent;
    trackPageView = mod.trackPageView;
    AnalyticsEvents = mod.AnalyticsEvents;
  });

  afterEach(() => {
    import.meta.env.DEV = originalDev;
    vi.unstubAllGlobals();
    // スクリプトタグのクリーンアップ
    document.querySelectorAll('script[src*="googletagmanager"]').forEach((el) => el.remove());
  });

  describe('initGA (production)', () => {
    it('本番環境でスクリプトタグを挿入しGA4を初期化する', () => {
      initGA('G-PROD123');

      // スクリプトタグの挿入を確認
      const scripts = document.querySelectorAll('script[src*="googletagmanager"]');
      expect(scripts.length).toBe(1);
      const script = scripts[0] as HTMLScriptElement;
      expect(script.async).toBe(true);
      expect(script.src).toContain('G-PROD123');

      // window.dataLayerが初期化されていることを確認
      expect(window.dataLayer).toBeDefined();
      expect(Array.isArray(window.dataLayer)).toBe(true);

      // window.gtagが関数として設定されていることを確認
      expect(typeof window.gtag).toBe('function');
    });

    it('gtagの呼び出しがdataLayerにpushされる', () => {
      initGA('G-PROD123');

      // initGA内で gtag('js', ...) と gtag('config', ...) が呼ばれるため
      // dataLayerに少なくとも2つのエントリがある
      expect(window.dataLayer.length).toBeGreaterThanOrEqual(2);
    });

    it('初期化済みの場合は二重初期化しない', () => {
      initGA('G-PROD123');
      const firstScriptCount = document.querySelectorAll('script[src*="googletagmanager"]').length;

      // 2回目の呼び出し
      initGA('G-PROD123');
      const secondScriptCount = document.querySelectorAll('script[src*="googletagmanager"]').length;

      expect(firstScriptCount).toBe(1);
      expect(secondScriptCount).toBe(1);
    });

    it('measurementIdがない場合は初期化しない', () => {
      initGA();

      const scripts = document.querySelectorAll('script[src*="googletagmanager"]');
      expect(scripts.length).toBe(0);
      expect(window.gtag).toBeUndefined();
    });

    it('既存のdataLayerがある場合はそれを使用する', () => {
      const existingDataLayer = [{ existing: true }];
      (window as any).dataLayer = existingDataLayer;

      initGA('G-PROD123');

      // 既存のdataLayerが保持され、新しいエントリが追加される
      expect(window.dataLayer.length).toBeGreaterThan(1);
    });

    it('document.createElement が例外を投げた場合はエラーをキャッチする', () => {
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'script') {
          throw new Error('DOM manipulation failed');
        }
        return originalCreateElement(tag);
      });

      // エラーを投げずにサイレントに失敗する
      expect(() => initGA('G-PROD123')).not.toThrow();

      vi.restoreAllMocks();
    });
  });

  describe('trackEvent (production - initialized)', () => {
    beforeEach(() => {
      // GA4を初期化してtrackEventが動作する状態にする
      initGA('G-PROD123');
    });

    it('初期化済みの場合にgtagを呼び出す', () => {
      const gtagSpy = vi.fn();
      window.gtag = gtagSpy;

      trackEvent('test_event', { key: 'value' });

      expect(gtagSpy).toHaveBeenCalledWith('event', 'test_event', { key: 'value' });
    });

    it('paramsなしでイベントを送信できる', () => {
      const gtagSpy = vi.fn();
      window.gtag = gtagSpy;

      trackEvent('simple_event');

      expect(gtagSpy).toHaveBeenCalledWith('event', 'simple_event', undefined);
    });

    it('複数のパラメータを持つイベントを送信できる', () => {
      const gtagSpy = vi.fn();
      window.gtag = gtagSpy;

      trackEvent(AnalyticsEvents.CHECKOUT_START, {
        plan: 'premium',
        price: 980,
        currency: 'JPY',
      });

      expect(gtagSpy).toHaveBeenCalledWith('event', 'checkout_start', {
        plan: 'premium',
        price: 980,
        currency: 'JPY',
      });
    });

    it('gtagが例外を投げた場合はサイレントフェイルする', () => {
      window.gtag = vi.fn().mockImplementation(() => {
        throw new Error('gtag error');
      });

      expect(() => trackEvent('error_event', { key: 'value' })).not.toThrow();
    });
  });

  describe('trackPageView (production - initialized)', () => {
    beforeEach(() => {
      initGA('G-PROD123');
    });

    it('初期化済みの場合にpage_viewイベントを送信する', () => {
      const gtagSpy = vi.fn();
      window.gtag = gtagSpy;

      trackPageView('/dashboard');

      expect(gtagSpy).toHaveBeenCalledWith('event', 'page_view', {
        page_path: '/dashboard',
        page_title: document.title,
      });
    });

    it('異なるパスでページビューを追跡できる', () => {
      const gtagSpy = vi.fn();
      window.gtag = gtagSpy;

      trackPageView('/settings');

      expect(gtagSpy).toHaveBeenCalledWith('event', 'page_view', {
        page_path: '/settings',
        page_title: document.title,
      });
    });

    it('gtagが例外を投げた場合はサイレントフェイルする', () => {
      window.gtag = vi.fn().mockImplementation(() => {
        throw new Error('gtag error');
      });

      expect(() => trackPageView('/error-page')).not.toThrow();
    });
  });

  describe('trackEvent / trackPageView (production - not initialized)', () => {
    it('initGA未呼び出しの場合、trackEventは何もしない', () => {
      const gtagSpy = vi.fn();
      vi.stubGlobal('gtag', gtagSpy);

      trackEvent('test_event');

      // initialized が false なので gtag は呼ばれない
      expect(gtagSpy).not.toHaveBeenCalled();
    });

    it('initGA未呼び出しの場合、trackPageViewは何もしない', () => {
      const gtagSpy = vi.fn();
      vi.stubGlobal('gtag', gtagSpy);

      trackPageView('/test');

      expect(gtagSpy).not.toHaveBeenCalled();
    });

    it('gtagが設定されていても初期化フラグがfalseなら何もしない', () => {
      // initGAを呼ばずにwindow.gtagだけ設定
      window.gtag = vi.fn();

      trackEvent('some_event');
      trackPageView('/some-page');

      expect(window.gtag).not.toHaveBeenCalled();
    });
  });
});
