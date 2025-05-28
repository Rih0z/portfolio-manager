const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function withTempDir(fn) {
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'gcc-'));
  const cwd = process.cwd();
  process.chdir(tmp);
  try {
    return fn(tmp);
  } finally {
    process.chdir(cwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

describe('generate-coverage-chart CLI', () => {
  const script = path.resolve(__dirname, '../../../scripts/generate-coverage-chart.js');

  test('runs main and outputs svg files', () => {
    withTempDir(() => {
      const coverage = {
        total: {
          statements: { covered: 1, total: 1, pct: 100 },
          branches: { covered: 1, total: 1, pct: 100 },
          functions: { covered: 1, total: 1, pct: 100 },
          lines: { covered: 1, total: 1, pct: 100 }
        }
      };
      fs.mkdirSync('coverage', { recursive: true });
      fs.writeFileSync('coverage/coverage-summary.json', JSON.stringify(coverage));
      fs.mkdirSync('test-results', { recursive: true });
      fs.writeFileSync('test-results/visual-report.html', '<html><body></body></html>');

      const env = { ...process.env, COVERAGE_TARGET: 'initial' };
      const res = spawnSync('node', [script], { encoding: 'utf8', env });
      expect(res.status).toBe(0);
      expect(fs.existsSync('test-results/coverage-bar-chart.svg')).toBe(true);
      expect(fs.existsSync('test-results/coverage-line-chart.svg')).toBe(true);
    });
  });
});
