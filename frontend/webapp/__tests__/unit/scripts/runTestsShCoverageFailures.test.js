const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

function withTempSetup(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rtcovfail-'));
  fs.mkdirSync(path.join(tmp, 'script'));
  const files = ['run-tests.sh', 'setup-test-env.js'];
  files.forEach(f => {
    const src = path.resolve(__dirname, '../../..', 'script', f);
    const dest = path.join(tmp, 'script', f);
    fs.copyFileSync(src, dest);
    if (f.endsWith('.sh')) fs.chmodSync(dest, 0o755);
  });
  fs.writeFileSync(path.join(tmp, 'package.json'), '{}');
  fs.copyFileSync(path.resolve(__dirname, '../../..', 'custom-reporter.js'), path.join(tmp, 'custom-reporter.js'));
  try {
    return fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

describe('run-tests.sh coverage failure cases', () => {
  const script = path.resolve(__dirname, '../../..', 'scripts/run-tests.sh');

  test('--validate-coverage warns when results are missing', () => {
    withTempSetup(tmp => {
      const bin = path.join(tmp, 'bin');
      fs.mkdirSync(bin);
      fs.writeFileSync(path.join(bin, 'npx'), '#!/bin/sh\n"$@"\n', { mode: 0o755 });
      fs.writeFileSync(path.join(bin, 'cross-env'), '#!/bin/sh\nshift\n"$@"\n', { mode: 0o755 });
      fs.writeFileSync(path.join(bin, 'jest'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });

      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
      const res = spawnSync('bash', [script, '--validate-coverage', 'all'], { cwd: tmp, env, encoding: 'utf8' });
      expect(res.status).toBe(0);
      expect(res.stdout).toContain('カバレッジファイルが見つかりません');
    });
  });

  test('html coverage opens report on macOS', () => {
    withTempSetup(tmp => {
      const bin = path.join(tmp, 'bin');
      fs.mkdirSync(bin);
      const openLog = path.join(tmp, 'open.log');
      fs.writeFileSync(path.join(bin, 'npx'), '#!/bin/sh\n"$@"\n', { mode: 0o755 });
      fs.writeFileSync(path.join(bin, 'cross-env'), '#!/bin/sh\nshift\n"$@"\n', { mode: 0o755 });
      fs.writeFileSync(path.join(bin, 'uname'), '#!/bin/sh\necho Darwin\n', { mode: 0o755 });
      fs.writeFileSync(path.join(bin, 'open'), `#!/bin/sh\necho \"$@\" > \"${openLog}\"\n`, { mode: 0o755 });

      const html = path.join(tmp, 'coverage/lcov-report/index.html');
      fs.mkdirSync(path.dirname(html), { recursive: true });
      fs.writeFileSync(html, '<html></html>');

      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
      const res = spawnSync('bash', [script, '--html-coverage', 'all'], { cwd: tmp, env, encoding: 'utf8' });
      const openCmd = fs.readFileSync(openLog, 'utf8').trim();
      expect(res.status).toBe(0);
      expect(openCmd).toContain('index.html');
      expect(res.stdout).toContain('HTMLカバレッジレポートを開いています');
    });
  });
});
