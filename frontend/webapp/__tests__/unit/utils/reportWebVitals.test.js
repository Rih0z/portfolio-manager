import reportWebVitals from '@/reportWebVitals';

// Mockオブジェクトを定義
const mockGetCLS = jest.fn();
const mockGetFID = jest.fn();
const mockGetFCP = jest.fn();
const mockGetLCP = jest.fn();
const mockGetTTFB = jest.fn();

// web-vitalsモジュールをモック
jest.mock('web-vitals', () => ({
  getCLS: mockGetCLS,
  getFID: mockGetFID,
  getFCP: mockGetFCP,
  getLCP: mockGetLCP,
  getTTFB: mockGetTTFB,
}));

describe('reportWebVitals utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls web-vitals functions when callback provided', async () => {
    const cb = jest.fn();
    
    // reportWebVitalsを呼び出す
    reportWebVitals(cb);
    
    // 動的インポートが完了するまで待つ
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 各メトリクス関数が呼び出されたことを確認
    expect(mockGetCLS).toHaveBeenCalledWith(cb);
    expect(mockGetFID).toHaveBeenCalledWith(cb);
    expect(mockGetFCP).toHaveBeenCalledWith(cb);
    expect(mockGetLCP).toHaveBeenCalledWith(cb);
    expect(mockGetTTFB).toHaveBeenCalledWith(cb);
  });

  it('does nothing when callback is missing', () => {
    reportWebVitals();
    expect(mockGetCLS).not.toHaveBeenCalled();
  });

  it('does nothing when callback is not a function', () => {
    reportWebVitals('not a function');
    expect(mockGetCLS).not.toHaveBeenCalled();
  });
});
