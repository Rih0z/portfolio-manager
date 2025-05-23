const fs = require('fs');
const path = require('path');

const {
  roundToTwo,
  validateCoverageMetric,
  extractFromDetailedResults,
  extractFromSummary,
  extractFromFinalCoverage,
  getCoverageTarget,
  generateDemoCoverageData,
  generateBarChart,
  generateLineChart,
  loadCoverageHistory,
  saveCoverageHistory,
  embedChartsInReport,
} = require('../../../script/generate-coverage-chart');

function withTempDir(fn) {
  const tmp = fs.mkdtempSync(path.join(fs.mkdtempSync('/tmp/pm-'), '')); // nested for isolation
  const cwd = process.cwd();
  process.chdir(tmp);
  try {
    return fn(tmp);
  } finally {
    process.chdir(cwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

describe('generate-coverage-chart helpers', () => {
  test('roundToTwo handles numbers and invalid input', () => {
    expect(roundToTwo(123.456)).toBe(123.46);
    expect(roundToTwo('abc')).toBe(0);
  });

  test('validateCoverageMetric normalizes metrics', () => {
    const metric = validateCoverageMetric({ covered: 5, total: 10, pct: 0 });
    expect(metric).toEqual({ covered: 5, total: 10, pct: 50 });
  });

  test('extract functions convert coverage formats', () => {
    const detail = { coverageMap: { total: { statements: { covered: 1, total: 2, pct: 50 }, branches: { covered: 1, total: 2, pct: 50 }, functions: { covered: 1, total: 2, pct: 50 }, lines: { covered: 1, total: 2, pct: 50 } } } };
    const summary = { total: { statements: { covered: 1, total: 2, pct: 50 }, branches: { covered: 1, total: 2, pct: 50 }, functions: { covered: 1, total: 2, pct: 50 }, lines: { covered: 1, total: 2, pct: 50 } } };
    expect(extractFromDetailedResults(detail)).toEqual(extractFromSummary(summary));

    const final = {
      file1: {
        s: { 1: 1, 2: 0 },
        b: { 1: [1, 0] },
        f: { 1: 1, 2: 0 },
        l: { 1: 1, 2: 0 },
      },
    };
    const res = extractFromFinalCoverage(final);
    expect(res.statements.total).toBe(2);
    expect(res.statements.covered).toBe(1);
    expect(res.branches.total).toBe(2);
    expect(res.functions.total).toBe(2);
  });

  test('getCoverageTarget falls back to initial', () => {
    process.env.COVERAGE_TARGET = 'final';
    expect(getCoverageTarget()).toBe('final');
    process.env.COVERAGE_TARGET = 'unknown';
    expect(getCoverageTarget()).toBe('initial');
  });

  test('generateDemoCoverageData uses target level', () => {
    process.env.COVERAGE_TARGET = 'mid';
    const data = generateDemoCoverageData();
    expect(data.statements.pct).toBeCloseTo(48);
  });

  test('history helpers read and write json', () => {
    withTempDir(() => {
      expect(loadCoverageHistory()).toEqual([]);
      const coverage = { statements: { pct: 50 }, branches: { pct: 50 }, functions: { pct: 50 }, lines: { pct: 50 } };
      saveCoverageHistory(coverage);
      const history = loadCoverageHistory();
      expect(history.length).toBe(1);
      expect(history[0].statements).toBe(50);
    });
  });

  test('embedChartsInReport injects charts', () => {
    withTempDir(() => {
      const report = path.resolve('./test-results/visual-report.html');
      fs.mkdirSync(path.dirname(report), { recursive: true });
      fs.writeFileSync(report, '<html><body>content</body></html>');
      embedChartsInReport('<svg id="bar"></svg>', '<svg id="line"></svg>');
      const html = fs.readFileSync(report, 'utf8');
      expect(html).toContain('coverage-charts');
      expect(html).toContain('id="bar"');
      expect(html).toContain('id="line"');
    });
  });

  test('chart generators return svg strings', () => {
    const coverage = {
      statements: { pct: 80, covered: 8, total: 10 },
      branches: { pct: 70, covered: 7, total: 10 },
      functions: { pct: 90, covered: 9, total: 10 },
      lines: { pct: 85, covered: 17, total: 20 },
    };
    const bar = generateBarChart(coverage, 'initial');
    const line = generateLineChart(coverage, [], 'initial');
    expect(bar.startsWith('<svg')).toBe(true);
    expect(line.startsWith('<svg')).toBe(true);
  });
});
