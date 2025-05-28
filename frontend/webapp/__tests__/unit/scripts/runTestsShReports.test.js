const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

function withTempSetup(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rtrep-'));
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

describe('run-tests.sh report options', () => {
  const script = path.resolve(__dirname, '../../../scripts/run-tests.sh');

  test('--visual option opens report', () => {
    withTempSetup(tmp => {
      const bin = path.join(tmp, 'bin');
      fs.mkdirSync(bin);
      const log = path.join(tmp, 'open.log');
      fs.writeFileSync(path.join(bin, 'npx'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
      fs.writeFileSync(path.join(bin, 'cross-env'), '#!/bin/sh\nshift\n"$@"\n', { mode: 0o755 });
      fs.writeFileSync(path.join(bin, 'xdg-open'), `#!/bin/sh\necho \"$@\" > \"${log}\"\n`, { mode: 0o755 });
      fs.mkdirSync(path.join(tmp, 'test-results'), { recursive: true });
      fs.writeFileSync(path.join(tmp, 'test-results/visual-report.html'), '<html></html>');
      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
      const res = spawnSync('bash', [path.join(tmp, 'scripts/run-tests.sh'), '--visual', 'unit'], { cwd: tmp, env, encoding: 'utf8' });
      const openCmd = fs.readFileSync(log, 'utf8').trim();
      expect(res.status).toBe(0);
      expect(res.stdout).toContain('テスト結果をビジュアルレポートで表示します');
      expect(openCmd).toContain('visual-report.html');
    });
  });

  test('--junit adds reporter', () => {
    withTempSetup(tmp => {
      const bin = path.join(tmp, 'bin');
      fs.mkdirSync(bin);
      const log = path.join(tmp, 'cmd.log');
      fs.writeFileSync(path.join(bin, 'npx'), `#!/bin/sh\necho \"$@\" > \"${log}\"\n`, { mode: 0o755 });
      fs.writeFileSync(path.join(bin, 'cross-env'), '#!/bin/sh\nshift\n"$@"\n', { mode: 0o755 });
      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
      const res = spawnSync('bash', [path.join(tmp, 'scripts/run-tests.sh'), '--junit', 'unit'], { cwd: tmp, env, encoding: 'utf8' });
      const cmd = fs.readFileSync(log, 'utf8');
      expect(res.status).toBe(0);
      expect(cmd).toContain('jest-junit');
    });
  });

  test('--validate-coverage succeeds with files', () => {
    withTempSetup(tmp => {
      const bin = path.join(tmp, 'bin');
      fs.mkdirSync(bin);
      const log = path.join(tmp, 'cmd.log');
      fs.writeFileSync(path.join(bin, 'npx'), `#!/bin/sh\nmkdir -p test-results coverage\necho '{"coverageMap":{}}' > test-results/detailed-results.json\necho '{}' > coverage/coverage-final.json\necho '{}' > coverage/coverage-summary.json\necho \"$@\" > \"${log}\"\n`, { mode: 0o755 });
      fs.writeFileSync(path.join(bin, 'cross-env'), '#!/bin/sh\nshift\n"$@"\n', { mode: 0o755 });
      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
      const res = spawnSync('bash', [path.join(tmp, 'scripts/run-tests.sh'), '--validate-coverage', '-d', 'unit'], { cwd: tmp, env, encoding: 'utf8' });
      expect(res.status).toBe(0);
      expect(res.stdout).toContain('カバレッジ結果の検証を開始');
      expect(res.stdout).toContain('カバレッジ結果の検証完了');
    });
  });
});
