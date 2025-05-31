const CustomReporter = require('../../custom-reporter');

describe('CustomReporter utility methods', () => {
  test('getCoverageThresholds returns expected values', () => {
    const reporter = new CustomReporter({}, {});
    expect(reporter.getCoverageThresholds('mid')).toEqual({
      statements: 60,
      branches: 50,
      functions: 60,
      lines: 60
    });
    // unknown level falls back to initial
    expect(reporter.getCoverageThresholds('unknown')).toEqual({
      statements: 30,
      branches: 20,
      functions: 25,
      lines: 30
    });
  });

  test('getTargetLevelName returns human friendly name', () => {
    const reporter = new CustomReporter({}, {});
    expect(reporter.getTargetLevelName('mid')).toBe('中間段階 (40-60%)');
    expect(reporter.getTargetLevelName('other')).toBe('初期段階 (20-30%)');
  });

  test('status helpers return correct indicators', () => {
    const reporter = new CustomReporter({}, {});
    expect(reporter.getStatusSymbol(80, 70)).toBe('✅ 達成');
    expect(reporter.getStatusSymbol(50, 70)).toBe('❌ 未達成');
    expect(reporter.getStatusEmoji(80, 70)).toBe('✅');
    expect(reporter.getStatusEmoji(50, 60)).toBe('❌');
  });

  test('createDemoCoverageMap builds coverageMap based on target', () => {
    process.env.COVERAGE_TARGET = 'final';
    const reporter = new CustomReporter({}, {});
    reporter.createDemoCoverageMap();
    const summary = reporter.results.coverageMap.getCoverageSummary().toJSON();
    expect(summary.statements.pct).toBe(64); // 80 * 0.8
    expect(summary.branches.pct).toBe(56);   // 70 * 0.8
    expect(summary.functions.pct).toBe(64);  // 80 * 0.8
    expect(summary.lines.pct).toBe(64);      // 80 * 0.8
    delete process.env.COVERAGE_TARGET;
  });
});

describe('coverage map creation', () => {
  test('createCoverageMapFromData generates correct summary', () => {
    const reporter = new CustomReporter({}, {});
    const coverageData = {
      '/tmp/file.js': {
        s: { '1': 1, '2': 0 },
        f: { '1': 1 },
        b: { '1': [1, 0] },
        l: { '1': 1, '2': 0 }
      }
    };

    reporter.createCoverageMapFromData(coverageData);
    const summary = reporter.results.coverageMap.getCoverageSummary().toJSON();
    expect(summary.statements.pct).toBeCloseTo(50);
    expect(summary.branches.pct).toBeCloseTo(50);
    expect(summary.functions.pct).toBeCloseTo(100);
    expect(summary.lines.pct).toBeCloseTo(50);
  });

  test('createSimpleCoverageMap uses summary data', () => {
    const reporter = new CustomReporter({}, {});
    const summaryData = {
      total: {
        statements: { covered: 80, total: 100, pct: 80 },
        branches: { covered: 40, total: 80, pct: 50 },
        functions: { covered: 10, total: 20, pct: 50 },
        lines: { covered: 80, total: 100, pct: 80 }
      },
      '/tmp/file.js': {
        statements: { covered: 80, total: 100, pct: 80 },
        branches: { covered: 40, total: 80, pct: 50 },
        functions: { covered: 10, total: 20, pct: 50 },
        lines: { covered: 80, total: 100, pct: 80 }
      }
    };

    reporter.createSimpleCoverageMap(summaryData);
    const summary = reporter.results.coverageMap.getCoverageSummary().toJSON();
    expect(summary.statements.pct).toBe(80);
    const files = reporter.results.coverageMap.getFileCoverageInfo();
    expect(files[0].filename).toBe('/tmp/file.js');
    expect(files[0].statements.pct).toBe(80);
  });
});
