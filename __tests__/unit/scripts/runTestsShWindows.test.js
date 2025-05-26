const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

function withTempSetup(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rtwin-'));
  fs.mkdirSync(path.join(tmp, 'script'));
  const files = ['run-tests.sh', 'setup-test-env.js'];
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

describe('run-tests.sh windows behaviour', () => {
  const script = path.resolve(__dirname, '../../../script/run-tests.sh');

  test('--visual opens report using start on Windows', () => {
    withTempSetup(tmp => {
      const bin = path.join(tmp, 'bin');
      fs.mkdirSync(bin);
      const log = path.join(tmp, 'start.log');
      fs.writeFileSync(path.join(bin, 'npx'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
      fs.writeFileSync(path.join(bin, 'cross-env'), '#!/bin/sh\nshift\n"$@"\n', { mode: 0o755 });
      fs.writeFileSync(path.join(bin, 'uname'), '#!/bin/sh\necho MINGW64_NT-10.0\n', { mode: 0o755 });
      fs.writeFileSync(path.join(bin, 'start'), `#!/bin/sh\necho \"$@\" > \"${log}\"\n`, { mode: 0o755 });
      fs.mkdirSync(path.join(tmp, 'test-results'), { recursive: true });
      fs.writeFileSync(path.join(tmp, 'test-results/visual-report.html'), '<html></html>');
      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
      const res = spawnSync('bash', [script, '--visual', 'unit'], { cwd: tmp, env, encoding: 'utf8' });
      const cmd = fs.readFileSync(log, 'utf8').trim();
      expect(res.status).toBe(0);
      expect(cmd).toContain('visual-report.html');
      expect(res.stdout).toContain('テスト結果をビジュアルレポートで表示します');
    });
  });
});
