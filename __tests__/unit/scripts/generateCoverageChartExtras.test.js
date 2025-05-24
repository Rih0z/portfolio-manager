const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  debugLog,
  loadCoverageData,
  embedChartsInReport,
} = require('../../../script/generate-coverage-chart');

function withTempDir(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gcc-extra-'));
  const cwd = process.cwd();
  process.chdir(tmp);
  try {
    return fn(tmp);
  } finally {
    process.chdir(cwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

describe('generate-coverage-chart extras', () => {
  afterEach(() => {
    delete process.env.DEBUG;
    jest.restoreAllMocks();
  });

  test('debugLog outputs when DEBUG is true', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    process.env.DEBUG = 'true';
    debugLog('msg', { a: 1 });
    expect(spy).toHaveBeenCalledWith('[DEBUG] msg');
    expect(spy).toHaveBeenCalledWith(JSON.stringify({ a: 1 }, null, 2));
  });

  test('loadCoverageData returns null when no files', () => {
    withTempDir(() => {
      expect(loadCoverageData()).toBeNull();
    });
  });

  test('embedChartsInReport warns when report missing', () => {
    withTempDir(() => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      embedChartsInReport('<svg></svg>', '<svg></svg>');
      expect(warn).toHaveBeenCalled();
    });
  });

  test('embedChartsInReport warns on malformed html', () => {
    withTempDir(() => {
      const report = path.resolve('./test-results/visual-report.html');
      fs.mkdirSync(path.dirname(report), { recursive: true });
      fs.writeFileSync(report, '<html>bad');
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      embedChartsInReport('<svg></svg>', '<svg></svg>');
      expect(warn).toHaveBeenCalled();
      const html = fs.readFileSync(report, 'utf8');
      expect(html).toBe('<html>bad');
    });
  });
});
