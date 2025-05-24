const React = require('react');
const { render, fireEvent } = require('@testing-library/react');
const ExportOptions = require('@/components/data/ExportOptions').default;
const { PortfolioContext } = require('@/context/PortfolioContext');
const { mockPortfolioContextData } = require('../../mocks/data');

describe('ExportOptions component', () => {
  const Wrapper = ({ children }) => (
    React.createElement(PortfolioContext.Provider, { value: mockPortfolioContextData }, children)
  );
  beforeEach(() => {
    jest.useFakeTimers();
    global.URL.createObjectURL = jest.fn(() => 'blob:url');
    global.URL.revokeObjectURL = jest.fn();
    document.createElement = jest.fn(() => ({ click: jest.fn() }));
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();
    navigator.clipboard = { writeText: jest.fn().mockResolvedValue() };
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('copies portfolio data as JSON to clipboard', async () => {
    const { getByText } = render(React.createElement(ExportOptions, {}, null), { wrapper: Wrapper });
    fireEvent.click(getByText('クリップボードにコピー'));
    await Promise.resolve();
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    const json = navigator.clipboard.writeText.mock.calls[0][0];
    const parsed = JSON.parse(json);
    expect(parsed.baseCurrency).toBe('JPY');
    expect(parsed.currentAssets.length).toBe(2);
  });

  test('switches to CSV and copies CSV data', async () => {
    const { getByText } = render(React.createElement(ExportOptions, {}, null), { wrapper: Wrapper });
    fireEvent.click(getByText('CSV'));
    fireEvent.click(getByText('クリップボードにコピー'));
    await Promise.resolve();
    const csv = navigator.clipboard.writeText.mock.calls[0][0];
    expect(csv).toContain('# 保有資産');
    expect(csv).toContain('AAPL');
    expect(csv).toContain('exchangeRateSource');
  });

  test('downloads JSON file', () => {
    const anchor = { click: jest.fn() };
    document.createElement.mockReturnValue(anchor);
    const { getByText } = render(React.createElement(ExportOptions, {}, null), { wrapper: Wrapper });
    fireEvent.click(getByText('ダウンロード'));
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(anchor.click).toHaveBeenCalled();
  });
});
