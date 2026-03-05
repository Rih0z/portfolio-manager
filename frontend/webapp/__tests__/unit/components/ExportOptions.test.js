const React = require('react');
const { render, fireEvent } = require('@testing-library/react');
const ExportOptions = require('@/components/data/ExportOptions').default;
const { mockPortfolioContextData } = require('../../mocks/data');

vi.mock('@/hooks/usePortfolioContext', () => ({
  usePortfolioContext: vi.fn(),
}));

const { usePortfolioContext } = require('@/hooks/usePortfolioContext');

describe('ExportOptions component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.URL.createObjectURL = vi.fn(() => 'blob:url');
    global.URL.revokeObjectURL = vi.fn();
    document.createElement = vi.fn(() => ({ click: vi.fn() }));
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
    navigator.clipboard = { writeText: vi.fn().mockResolvedValue() };

    // Mock the hook to return portfolio context data
    usePortfolioContext.mockReturnValue({
      ...mockPortfolioContextData,
      exportData: () => mockPortfolioContextData,
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  test('copies portfolio data as JSON to clipboard', async () => {
    const { getByText } = render(React.createElement(ExportOptions, {}, null));
    fireEvent.click(getByText('クリップボードにコピー'));
    await Promise.resolve();
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    const json = navigator.clipboard.writeText.mock.calls[0][0];
    const parsed = JSON.parse(json);
    expect(parsed.baseCurrency).toBe('JPY');
    expect(parsed.currentAssets.length).toBe(2);
  });

  test('switches to CSV and copies CSV data', async () => {
    const { getByText } = render(React.createElement(ExportOptions, {}, null));
    fireEvent.click(getByText('CSV'));
    fireEvent.click(getByText('クリップボードにコピー'));
    await Promise.resolve();
    const csv = navigator.clipboard.writeText.mock.calls[0][0];
    expect(csv).toContain('# 保有資産');
    expect(csv).toContain('AAPL');
    expect(csv).toContain('exchangeRateSource');
  });

  test('downloads JSON file', () => {
    const anchor = { click: vi.fn() };
    document.createElement.mockReturnValue(anchor);
    const { getByText } = render(React.createElement(ExportOptions, {}, null));
    fireEvent.click(getByText('ダウンロード'));
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(anchor.click).toHaveBeenCalled();
  });
});
