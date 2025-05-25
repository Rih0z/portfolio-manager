const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

function withTempSetup(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rtnative-'));
  fs.mkdirSync(path.join(tmp, 'script'));
  const files = ['run-tests.sh', 'setup-test-env.js'];
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

describe('run-tests.sh with local jest', () => {
  const script = path.resolve(__dirname, '../../../script/run-tests.sh');

  test('uses local jest when cross-env is missing', () => {
    withTempSetup(tmp => {
      const bin = path.join(tmp, 'bin');
      fs.mkdirSync(bin);
      const argsLog = path.join(tmp, 'args.log');
      const envLog = path.join(tmp, 'env.log');
      fs.writeFileSync(
        path.join(bin, 'jest'),
        `#!/bin/sh\necho \"$@\" > \"${argsLog}\"\nprintenv > \"${envLog}\"\n`,
        { mode: 0o755 }
      );

      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
      const res = spawnSync('bash', [path.join(tmp, 'script/run-tests.sh'), 'all'], { cwd: tmp, env, encoding: 'utf8' });
      const args = fs.readFileSync(argsLog, 'utf8');
      const envOut = fs.readFileSync(envLog, 'utf8');
      expect(res.status).toBe(0);
      expect(res.stdout).toContain('cross-envが見つからないため');
      expect(args.trim().startsWith('jest')).toBe(true);
      expect(envOut).toContain('JEST_COVERAGE=true');
    });
  });
});
