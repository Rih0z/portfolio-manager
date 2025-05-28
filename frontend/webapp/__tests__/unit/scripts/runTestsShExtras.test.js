const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

function withTempSetup(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rtext-'));
  fs.mkdirSync(path.join(tmp, 'script'));
  const files = ['run-tests.sh', 'setup-test-env.js', 'generate-coverage-chart.js'];
  files.forEach(f => {
    const src = path.resolve(__dirname, '../../../script', f);
    const dest = path.join(tmp, 'script', f);
    fs.copyFileSync(src, dest);
    if (f.endsWith('.sh')) fs.chmodSync(dest, 0o755);
  });
  fs.writeFileSync(path.join(tmp, 'package.json'), '{}');
  fs.copyFileSync(path.resolve(__dirname, '../../../custom-reporter.js'), path.join(tmp, 'custom-reporter.js'));
  try {
    return fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

describe('run-tests.sh extra options', () => {
  const script = path.resolve(__dirname, '../../../scripts/run-tests.sh');

  test('--verbose-coverage prints debug info', () => {
    withTempSetup(tmp => {
      const bin = path.join(tmp, 'bin');
      fs.mkdirSync(bin);
      const log = path.join(tmp, 'cmd.log');
      fs.writeFileSync(path.join(bin, 'npx'), `#!/bin/sh\necho \"$@\" > \"${log}\"\n`, { mode: 0o755 });
      fs.writeFileSync(path.join(bin, 'cross-env'), '#!/bin/sh\nshift\n"$@"\n', { mode: 0o755 });

      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
      const res = spawnSync('bash', [path.join(tmp, 'scripts/run-tests.sh'), '--verbose-coverage', 'unit'], { cwd: tmp, env, encoding: 'utf8' });
      const cmd = fs.readFileSync(log, 'utf8');
      expect(res.status).toBe(0);
      expect(res.stdout).toContain('[DEBUG]');
      expect(cmd).toContain('--coverage');
    });
  });

  test('--detect-open-handles adds option', () => {
    withTempSetup(tmp => {
      const bin = path.join(tmp, 'bin');
      fs.mkdirSync(bin);
      const log = path.join(tmp, 'cmd.log');
      fs.writeFileSync(path.join(bin, 'npx'), `#!/bin/sh\necho \"$@\" > \"${log}\"\n`, { mode: 0o755 });
      fs.writeFileSync(path.join(bin, 'cross-env'), '#!/bin/sh\nshift\n"$@"\n', { mode: 0o755 });

      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
      const res = spawnSync('bash', [path.join(tmp, 'scripts/run-tests.sh'), '--detect-open-handles', 'unit'], { cwd: tmp, env, encoding: 'utf8' });
      const cmd = fs.readFileSync(log, 'utf8');
      expect(res.status).toBe(0);
      expect(cmd).toContain('--detectOpenHandles');
    });
  });

  test('--validate-coverage fails without reporter', () => {
    withTempSetup(tmp => {
      fs.unlinkSync(path.join(tmp, 'custom-reporter.js'));
      const res = spawnSync('bash', [path.join(tmp, 'scripts/run-tests.sh'), '--validate-coverage', 'unit'], { cwd: tmp, encoding: 'utf8' });
      expect(res.status).not.toBe(0);
      expect(res.stdout).toContain('カバレッジ設定の検証に失敗しました');
    });
  });

  test('-m and -f options set env vars', () => {
    withTempSetup(tmp => {
      const bin = path.join(tmp, 'bin');
      fs.mkdirSync(bin);
      const log = path.join(tmp, 'cmd.log');
      fs.writeFileSync(path.join(bin, 'npx'), `#!/bin/sh\necho \"$@\" > \"${log}\"\n`, { mode: 0o755 });
      fs.writeFileSync(path.join(bin, 'cross-env'), '#!/bin/sh\nshift\n"$@"\n', { mode: 0o755 });

      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
      const res = spawnSync('bash', [path.join(tmp, 'scripts/run-tests.sh'), '-m', '-f', '-t', 'final', 'unit'], { cwd: tmp, env, encoding: 'utf8' });
      const cmd = fs.readFileSync(log, 'utf8');
      expect(res.status).toBe(0);
      expect(res.stdout).toContain('APIモック使用モードが有効です');
      expect(res.stdout).toContain('テスト強制実行モードが有効です');
      expect(res.stdout).toContain('カバレッジ目標: 最終段階 (70-80%)');
      expect(cmd).toContain('USE_API_MOCKS=true');
      expect(cmd).toContain('FORCE_TESTS=true');
    });
  });

  test('specific without pattern errors', () => {
    withTempSetup(tmp => {
      const result = spawnSync('bash', [path.join(tmp, 'scripts/run-tests.sh'), 'specific'], { cwd: tmp, encoding: 'utf8' });
      expect(result.status).not.toBe(0);
      expect(result.stdout).toContain('specific テスト種別を使用する場合は');
    });
  });
});
