const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const { setupEnvironmentVariables } = require('../../../script/setup-test-env');

function withTempDir(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ste-'));
  const cwd = process.cwd();
  process.chdir(tmp);
  try {
    return fn(tmp);
  } finally {
    process.chdir(cwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

describe('setup-test-env extras', () => {
  const script = path.resolve(__dirname, '../../../script/setup-test-env.js');
  const origEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...origEnv };
  });

  test('invalid coverage target resets to initial', () => {
    withTempDir(() => {
      process.env.COVERAGE_TARGET = 'weird';
      setupEnvironmentVariables();
      expect(process.env.COVERAGE_TARGET).toBe('initial');
    });
  });

  test('cli execution creates directories', () => {
    withTempDir(tmp => {
      const env = { ...process.env, COVERAGE_TARGET: 'initial' };
      const res = spawnSync('node', [script], { cwd: tmp, env, encoding: 'utf8' });
      expect(res.status).toBe(0);
      expect(fs.existsSync(path.join(tmp, 'test-results'))).toBe(true);
      expect(res.stdout).toContain('テスト環境のセットアップが完了しました');
    });
  });
});
