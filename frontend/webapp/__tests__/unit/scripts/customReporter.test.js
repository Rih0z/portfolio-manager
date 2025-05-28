const CustomReporter = require('../../../custom-reporter');

function createReporter() {
  return new CustomReporter({}, {});
}

describe('CustomReporter helpers', () => {
  test('threshold and name helpers', () => {
    const reporter = createReporter();
    expect(reporter.getCoverageThresholds('mid').statements).toBe(60);
    expect(reporter.getCoverageThresholds('unknown').statements).toBe(30);
    expect(reporter.getTargetLevelName('final')).toBe('最終段階 (70-80%)');
    expect(reporter.getStatusSymbol(80, 70)).toBe('✅ 達成');
    expect(reporter.getStatusSymbol(60, 70)).toBe('❌ 未達成');
    expect(reporter.getStatusEmoji(5, 10)).toBe('❌');
  });

  test('createDemoCoverageMap populates results', () => {
    const reporter = createReporter();
    process.env.COVERAGE_TARGET = 'final';
    reporter.createDemoCoverageMap();
    const total = reporter.results.coverageMap.getCoverageSummary().toJSON();
    expect(total.lines.pct).toBeGreaterThan(0);
    expect(reporter.results.coverageMap.getFileCoverageInfo().length).toBeGreaterThan(0);
  });

  test('createCoverageMapFromData builds coverage map', () => {
    const reporter = createReporter();
    const data = {
      'src/foo.js': {
        s: { 1: 1, 2: 0 },
        b: { 1: [1, 0] },
        f: { 1: 1, 2: 0 },
        l: { 1: 1, 2: 0 }
      }
    };
    reporter.createCoverageMapFromData(data);
    const summary = reporter.results.coverageMap.getCoverageSummary().toJSON();
    expect(summary.statements.total).toBe(2);
    expect(summary.branches.total).toBe(2);
    expect(summary.functions.total).toBe(2);
    expect(summary.lines.total).toBe(2);
  });

  test('printSummary logs information', () => {
    const reporter = createReporter();
    reporter.startTime = 0;
    reporter.endTime = 1000;
    reporter.results.coverageMap = {
      getCoverageSummary: () => ({
        toJSON: () => ({
          statements: { pct: 50, covered: 1, total: 2 },
          branches: { pct: 50, covered: 1, total: 2 },
          functions: { pct: 50, covered: 1, total: 2 },
          lines: { pct: 50, covered: 1, total: 2 }
        })
      }),
      getFileCoverageInfo: () => []
    };
    const logs = [];
    jest.spyOn(console, 'log').mockImplementation(msg => logs.push(msg));
    const results = { numTotalTests: 1, numPassedTests: 1, numFailedTests: 0, numPendingTests: 0 };
    reporter.printSummary(results);
    expect(logs.join('\n')).toContain('テスト実行結果');
    expect(logs.join('\n')).toContain('カバレッジ情報');
    console.log.mockRestore();
  });
});
