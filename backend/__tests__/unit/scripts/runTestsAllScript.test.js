const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const scriptPath = path.resolve(__dirname, '../../../scripts/run-tests.sh');
const fakeBinDir = path.resolve(__dirname, 'fakebin');

function runScript(args = [], env = {}) {
  const result = spawnSync('bash', [scriptPath, ...args], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${fakeBinDir}:${process.env.PATH}`, ...env }
  });
  return result;
}

describe('run-tests.sh all mode', () => {
  const resultsDir = path.resolve(__dirname, '../../../test-results');

  beforeAll(() => {
    if (!fs.existsSync(fakeBinDir)) {
      fs.mkdirSync(fakeBinDir, { recursive: true });
    }
  });

  beforeEach(() => {
    if (fs.existsSync(resultsDir)) fs.rmdirSync(resultsDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(resultsDir)) fs.rmdirSync(resultsDir, { recursive: true });
  });

  test('runs all tests with mock commands', () => {
    const result = runScript(['all'], { DEBUG: 'true' });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('すべてのテストを実行中');
    expect(result.stdout).toContain('テスト実行が成功しました');
  });

  test('warns when coverage file missing', () => {
    const result = runScript(['all']);
    expect(result.stdout).toContain('カバレッジ結果ファイルが見つかりません');
  });
});
