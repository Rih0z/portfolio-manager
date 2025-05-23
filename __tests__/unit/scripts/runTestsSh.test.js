const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

function withTempSetup(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rt-'));
  fs.mkdirSync(path.join(tmp, 'script'));
  const files = ['run-tests.sh', 'setup-test-env.js', 'generate-coverage-chart.js'];
  files.forEach(f => {
    const src = path.resolve(__dirname, '../../../script', f);
    const dest = path.join(tmp, 'script', f);
    fs.copyFileSync(src, dest);
    if (f.endsWith('.sh')) fs.chmodSync(dest, 0o755);
  });
  fs.copyFileSync(path.resolve(__dirname, '../../../custom-reporter.js'), path.join(tmp, 'custom-reporter.js'));
  fs.writeFileSync(path.join(tmp, 'package.json'), '{}');
  try {
    return fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

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
    // stub cross-env so the script uses npx
    fs.writeFileSync(
      path.join(bin, 'cross-env'),
      '#!/bin/sh\nshift\n"$@"\n',
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

  test('fails when no test type is given', () => {
    withTempSetup(tmp => {
      const result = spawnSync('bash', [path.join(tmp, 'script/run-tests.sh')], { cwd: tmp, encoding: 'utf8' });
      expect(result.status).not.toBe(0);
      expect(result.stdout).toContain('テスト種別を指定してください');
    });
  });

  test('invalid coverage target exits with error', () => {
    withTempSetup(tmp => {
      const result = spawnSync('bash', [path.join(tmp, 'script/run-tests.sh'), '--target', 'foo', 'all'], { cwd: tmp, encoding: 'utf8' });
      expect(result.status).not.toBe(0);
      expect(result.stdout).toContain('不明なカバレッジ目標段階');
    });
  });

  test('--clean removes previous reports', () => {
    withTempSetup(tmp => {
      const bin = path.join(tmp, 'bin');
      fs.mkdirSync(bin);
      const log = path.join(tmp, 'cmd.log');
      fs.writeFileSync(path.join(bin, 'npx'), `#!/bin/sh\necho "$@" >> "${log}"\n`, { mode: 0o755 });

      const oldCov = path.join(tmp, 'coverage', 'old.json');
      const oldLog = path.join(tmp, 'test-results', 'old.log');
      fs.mkdirSync(path.dirname(oldCov), { recursive: true });
      fs.writeFileSync(oldCov, '{}');
      fs.mkdirSync(path.dirname(oldLog), { recursive: true });
      fs.writeFileSync(oldLog, 'x');

      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
      const res = spawnSync('bash', [path.join(tmp, 'script/run-tests.sh'), '--clean', 'all'], { cwd: tmp, env, encoding: 'utf8' });

      expect(res.status).toBe(0);
      expect(fs.existsSync(oldCov)).toBe(false);
      expect(fs.existsSync(oldLog)).toBe(false);
      expect(fs.existsSync(path.join(tmp, 'coverage'))).toBe(true);
      expect(fs.existsSync(path.join(tmp, 'test-results'))).toBe(true);
    });
  });

  test('--chart triggers coverage chart generation', () => {
    withTempSetup(tmp => {
      const bin = path.join(tmp, 'bin');
      fs.mkdirSync(bin);
      const log = path.join(tmp, 'cmd.log');
      fs.writeFileSync(path.join(bin, 'npx'), `#!/bin/sh\necho "$@" >> "${log}"\n`, { mode: 0o755 });
      fs.writeFileSync(path.join(bin, 'cross-env'), '#!/bin/sh\nshift\n"$@"\n', { mode: 0o755 });

      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
      const res = spawnSync('bash', [path.join(tmp, 'script/run-tests.sh'), '--chart', 'all'], { cwd: tmp, env, encoding: 'utf8' });

      const cmd = fs.readFileSync(log, 'utf8');
      expect(res.status).toBe(0);
      expect(cmd).toContain('generate-coverage-chart.js');
    });
  });

  test('--html-coverage opens report', () => {
    withTempSetup(tmp => {
      const bin = path.join(tmp, 'bin');
      fs.mkdirSync(bin);
      const log = path.join(tmp, 'open.log');
      fs.writeFileSync(path.join(bin, 'npx'), `#!/bin/sh\necho "$@" >> "${path.join(tmp, 'npx.log')}"\n`, { mode: 0o755 });
      fs.writeFileSync(path.join(bin, 'xdg-open'), `#!/bin/sh\necho "$@" >> "${log}"\n`, { mode: 0o755 });

      const html = path.join(tmp, 'coverage/lcov-report/index.html');
      fs.mkdirSync(path.dirname(html), { recursive: true });
      fs.writeFileSync(html, '<html></html>');

      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
      const res = spawnSync('bash', [path.join(tmp, 'script/run-tests.sh'), '--html-coverage', 'all'], { cwd: tmp, env, encoding: 'utf8' });

      const openCmd = fs.readFileSync(log, 'utf8').trim();
      expect(res.status).toBe(0);
      expect(openCmd).toContain('index.html');
      expect(res.stdout).toContain('HTMLカバレッジレポートを開いています');
    });
  });

  test('falls back when cross-env is missing', () => {
    withTempSetup(tmp => {
      const bin = path.join(tmp, 'bin');
      fs.mkdirSync(bin);
      const log = path.join(tmp, 'cmd.log');
      fs.writeFileSync(path.join(bin, 'jest'), `#!/bin/sh\necho \"$@\" > \"${log}\"\n`, { mode: 0o755 });

      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
      const res = spawnSync('bash', [path.join(tmp, 'script/run-tests.sh'), 'all'], { cwd: tmp, env, encoding: 'utf8' });

      const cmd = fs.readFileSync(log, 'utf8');
      expect(res.status).toBe(0);
      expect(res.stdout).toContain('cross-envが見つからないため');
      expect(cmd).toContain('--config=jest.config.js');
    });
  });

  test('runs specific pattern tests', () => {
    withTempSetup(tmp => {
      const bin = path.join(tmp, 'bin');
      fs.mkdirSync(bin);
      const log = path.join(tmp, 'cmd.log');
      fs.writeFileSync(path.join(bin, 'npx'), `#!/bin/sh\necho \"$@\" > \"${log}\"\n`, { mode: 0o755 });
      fs.writeFileSync(path.join(bin, 'cross-env'), '#!/bin/sh\nshift\n"$@"\n', { mode: 0o755 });

      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
      const res = spawnSync('bash', [path.join(tmp, 'script/run-tests.sh'), '-s', 'foo', 'specific'], { cwd: tmp, env, encoding: 'utf8' });

      const cmd = fs.readFileSync(log, 'utf8');
      expect(res.status).toBe(0);
      expect(res.stdout).toContain('特定のパターンに一致するテストを実行中');
      expect(cmd).toContain('--testPathPattern="foo"');
    });
  });

  test('ignore coverage errors sets exit code to zero', () => {
    withTempSetup(tmp => {
      const bin = path.join(tmp, 'bin');
      fs.mkdirSync(bin);
      const log = path.join(tmp, 'cmd.log');
      fs.writeFileSync(path.join(bin, 'npx'), `#!/bin/sh\necho \"$@\" > \"${log}\"\n`, { mode: 0o755 });
      fs.writeFileSync(path.join(bin, 'cross-env'), '#!/bin/sh\nshift\n"$@"\n', { mode: 0o755 });
      fs.writeFileSync(path.join(bin, 'jest'), `#!/bin/sh\nmkdir -p test-results\necho '{"numFailedTests":0,"coverageMap":{}}' > test-results/detailed-results.json\nexit 1\n`, { mode: 0o755 });

      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
      const res = spawnSync('bash', [path.join(tmp, 'script/run-tests.sh'), '-i', 'all'], { cwd: tmp, env, encoding: 'utf8' });

      expect(res.status).toBe(0);
      expect(res.stdout).toContain('テスト自体は成功しています');
    });
  });
});
