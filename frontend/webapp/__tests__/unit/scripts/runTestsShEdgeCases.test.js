const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

function withTempSetup(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rt-edge-'));
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

describe('run-tests.sh edge cases', () => {
  const script = path.resolve(__dirname, '../../../scripts/run-tests.sh');

  test('custom config path is used when provided', () => {
    withTempSetup(tmp => {
      const bin = path.join(tmp, 'bin');
      fs.mkdirSync(bin);
      const log = path.join(tmp, 'cmd.log');
      fs.writeFileSync(path.join(bin, 'cross-env'), '#!/bin/sh\nshift\n"$@"\n', { mode: 0o755 });
      fs.writeFileSync(path.join(bin, 'jest'), `#!/bin/sh\necho \"$@\" > \"${log}\"\n`, { mode: 0o755 });

      const custom = path.join(tmp, 'my-jest.config.js');
      fs.writeFileSync(custom, 'module.exports = {}');

      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
      const res = spawnSync('bash', [script, '--config', custom, '--debug', 'unit'], { cwd: tmp, env, encoding: 'utf8' });
      const cmd = fs.readFileSync(log, 'utf8');

      expect(res.status).toBe(0);
      expect(cmd).toContain(`--config ${custom}`);
      expect(res.stdout).toContain(`使用する設定ファイル: ${custom}`);
    });
  });

  test('fails when jest and npx are missing', () => {
    withTempSetup(tmp => {
      const bin = path.join(tmp, 'bin');
      fs.mkdirSync(bin);
      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
      const res = spawnSync('bash', [script, 'unit'], { cwd: tmp, env, encoding: 'utf8' });
      expect(res.status).not.toBe(0);
      expect(res.stdout).toContain('cross-envが見つからないため');
    });
  });
});
