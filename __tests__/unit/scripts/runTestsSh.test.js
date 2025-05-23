const { spawnSync } = require('child_process');
const path = require('path');

describe('run-tests.sh helper', () => {
  const script = path.resolve(__dirname, '../../../script/run-tests.sh');

  test('prints help with --help', () => {
    const result = spawnSync('bash', [script, '--help'], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Portfolio Manager テスト実行ヘルプ');
  });

  test('fails with unknown option', () => {
    const result = spawnSync('bash', [script, '--unknown'], { encoding: 'utf8' });
    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('不明なオプション');
  });
});
