const { spawnSync } = require('child_process');
const path = require('path');

const scriptPath = path.resolve(__dirname, '../../../scripts/run-tests.sh');

function runScript(args = []) {
  const result = spawnSync('bash', [scriptPath, ...args], { encoding: 'utf8' });
  return result;
}

describe('run-tests.sh CLI basic behaviour', () => {
  test('--help displays usage and exits with code 0', () => {
    const result = runScript(['--help']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('テスト実行ヘルプ');
  });

  test('missing test type shows error and exit code 1', () => {
    const result = runScript([]);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('テスト種別を指定してください');
  });

  test('specific test type without pattern exits with error', () => {
    const result = runScript(['specific']);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('specific テスト種別を使用する場合');
  });

  test('unknown option shows error and exit code 1', () => {
    const result = runScript(['--unknown', 'unit']);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('不明なオプション');
  });

  test('invalid coverage target exits with error', () => {
    const result = runScript(['-t', 'invalid', 'unit']);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('不明なカバレッジ目標段階');
  });
});
