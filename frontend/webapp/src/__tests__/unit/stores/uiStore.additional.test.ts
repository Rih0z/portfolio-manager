/**
 * UIストアの追加テスト（カバレッジ向上）
 *
 * @file src/__tests__/unit/stores/uiStore.additional.test.ts
 */

import { useUIStore } from '@/stores/uiStore';

// vitest.setup.ts で localStorage は vi.fn() モックとして定義されている
const mockGetItem = vi.mocked(localStorage.getItem);
const mockSetItem = vi.mocked(localStorage.setItem);

describe('useUIStore 追加テスト', () => {
  beforeEach(() => {
    useUIStore.setState({
      notifications: [],
      isLoading: false,
      theme: 'light',
      resolvedTheme: 'light',
    });
    vi.clearAllMocks();
  });

  // ─── addNotification ──────────────────────────────────────

  it('addNotificationがIDを返す', () => {
    const id = useUIStore.getState().addNotification('テスト通知');
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('addNotificationがnotificationsに追加する', () => {
    useUIStore.getState().addNotification('テスト通知', 'info');
    const notifications = useUIStore.getState().notifications;

    expect(notifications).toHaveLength(1);
    expect(notifications[0].message).toBe('テスト通知');
    expect(notifications[0].type).toBe('info');
  });

  it('error以外の通知は5秒後に自動削除される', () => {
    vi.useFakeTimers();
    useUIStore.getState().addNotification('成功', 'success');
    expect(useUIStore.getState().notifications).toHaveLength(1);

    vi.advanceTimersByTime(5001);
    expect(useUIStore.getState().notifications).toHaveLength(0);
    vi.useRealTimers();
  });

  it('error通知は自動削除されない', () => {
    vi.useFakeTimers();
    useUIStore.getState().addNotification('エラー', 'error');
    expect(useUIStore.getState().notifications).toHaveLength(1);

    vi.advanceTimersByTime(10000);
    expect(useUIStore.getState().notifications).toHaveLength(1);
    vi.useRealTimers();
  });

  it('warning通知は自動削除される', () => {
    vi.useFakeTimers();
    useUIStore.getState().addNotification('警告', 'warning');
    vi.advanceTimersByTime(5001);
    expect(useUIStore.getState().notifications).toHaveLength(0);
    vi.useRealTimers();
  });

  // ─── removeNotification ───────────────────────────────────

  it('removeNotificationが指定IDの通知を削除する', () => {
    const id = useUIStore.getState().addNotification('テスト', 'info');
    useUIStore.getState().removeNotification(id);
    expect(useUIStore.getState().notifications).toHaveLength(0);
  });

  it('存在しないIDの削除はエラーにならない', () => {
    useUIStore.getState().addNotification('テスト', 'info');
    useUIStore.getState().removeNotification('nonexistent');
    expect(useUIStore.getState().notifications).toHaveLength(1);
  });

  // ─── setLoading ───────────────────────────────────────────

  it('setLoadingがisLoadingを更新する', () => {
    useUIStore.getState().setLoading(true);
    expect(useUIStore.getState().isLoading).toBe(true);

    useUIStore.getState().setLoading(false);
    expect(useUIStore.getState().isLoading).toBe(false);
  });

  // ─── setTheme ─────────────────────────────────────────────

  it('setThemeがthemeとresolvedThemeを更新する', () => {
    useUIStore.getState().setTheme('dark');
    expect(useUIStore.getState().theme).toBe('dark');
    expect(useUIStore.getState().resolvedTheme).toBe('dark');

    useUIStore.getState().setTheme('light');
    expect(useUIStore.getState().theme).toBe('light');
    expect(useUIStore.getState().resolvedTheme).toBe('light');
  });

  it('setTheme("system")でresolvedThemeがシステム設定に基づく', () => {
    useUIStore.getState().setTheme('system');
    expect(useUIStore.getState().resolvedTheme).toBe('light');
    expect(useUIStore.getState().theme).toBe('system');
  });

  it('setThemeがpersist middlewareを通じてlocalStorageに保存する', () => {
    useUIStore.getState().setTheme('dark');
    // persist middleware が 'pfwise-ui' キーで自動保存する
    expect(mockSetItem).toHaveBeenCalledWith(
      'pfwise-ui',
      expect.stringContaining('"theme":"dark"')
    );
  });

  // ─── initializeTheme ──────────────────────────────────────

  it('initializeThemeが保存なしの場合lightをデフォルトにする', () => {
    useUIStore.getState().initializeTheme();
    expect(useUIStore.getState().theme).toBe('light');
  });

  it('initializeThemeがpersist復元済みのthemeを適用する', () => {
    // persist middleware が復元した状態をシミュレート
    useUIStore.setState({ theme: 'dark' });
    useUIStore.getState().initializeTheme();
    expect(useUIStore.getState().theme).toBe('dark');
    expect(useUIStore.getState().resolvedTheme).toBe('dark');
  });

  it('initializeThemeがsystem設定を適用する', () => {
    useUIStore.setState({ theme: 'system' });
    useUIStore.getState().initializeTheme();
    expect(useUIStore.getState().theme).toBe('system');
    expect(useUIStore.getState().resolvedTheme).toBe('light'); // JSDOM default
  });

  // ─── 複数通知 ─────────────────────────────────────────────

  it('複数の通知を管理できる', () => {
    useUIStore.getState().addNotification('通知1', 'info');
    useUIStore.getState().addNotification('通知2', 'success');
    useUIStore.getState().addNotification('通知3', 'error');

    expect(useUIStore.getState().notifications).toHaveLength(3);
  });
});
