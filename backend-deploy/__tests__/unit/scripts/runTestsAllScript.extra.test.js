const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const scriptPath = path.resolve(__dirname, '../../../scripts/run-tests.sh');
const fakeBinDir = path.resolve(__dirname, 'fakebin');

function runScript(args = [], env = {}) {
  return spawnSync('bash', [scriptPath, ...args], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${fakeBinDir}:${process.env.PATH}`, ...env }
  });
}

describe('run-tests.sh additional options', () => {
  const resultsDir = path.resolve(__dirname, '../../../test-results');
  const coverageFile = path.join(resultsDir, 'detailed-results.json');

  beforeAll(() => {
    if (!fs.existsSync(fakeBinDir)) {
      fs.mkdirSync(fakeBinDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(coverageFile)) fs.unlinkSync(coverageFile);
    if (fs.existsSync(resultsDir)) fs.rmdirSync(resultsDir, { recursive: true });
  });

  test('--chart generates coverage chart when data exists', () => {
    fs.mkdirSync(resultsDir, { recursive: true });
    fs.writeFileSync(
      coverageFile,
      JSON.stringify({
        coverageMap: { total: { statements: { pct: 90, covered: 9, total: 10 }, branches: { pct: 80, covered: 8, total: 10 }, functions: { pct: 70, covered: 7, total: 10 }, lines: { pct: 95, covered: 19, total: 20 } } }
      })
    );

    const result = runScript(['--chart', 'all'], { DEBUG: 'true' });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('カバレッジチャートを生成しています');
    expect(result.stdout).toContain('カバレッジチャートが生成されました');
  });

  test('clean option and final target', () => {
    const result = runScript(['-c', '-t', 'final', 'all']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('クリーンアップ完了');
    expect(result.stdout).toContain('カバレッジ目標: 最終段階');
    expect(result.stdout).toContain('coverage-final.json ファイルが見つかりました');
  });
});
