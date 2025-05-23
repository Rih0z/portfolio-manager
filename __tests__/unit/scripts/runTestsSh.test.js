const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

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

  test('runs all tests using stubbed npx', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'npx-'));
    const bin = path.join(tmp, 'bin');
    fs.mkdirSync(bin);
    const log = path.join(tmp, 'log');
    fs.writeFileSync(
      path.join(bin, 'npx'),
      `#!/bin/sh\necho "$@" > "${log}"\n`,
      { mode: 0o755 }
    );

    const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
    const result = spawnSync('bash', [script, 'all'], { encoding: 'utf8', env });

    const cmd = fs.readFileSync(log, 'utf8');

    // clean up
    fs.rmSync(tmp, { recursive: true, force: true });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('すべてのテストを実行中');
    expect(cmd).toContain('jest');
  });
});
