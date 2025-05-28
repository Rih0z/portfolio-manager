const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const scriptPath = path.resolve(__dirname, '../../../scripts/run-tests.sh');
const fakeBinDir = path.resolve(__dirname, 'fakebin');

function runScript(args = [], env = {}) {
  return spawnSync('bash', [scriptPath, ...args], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${fakeBinDir}:${process.env.PATH}`, ...env }
  });
}

describe('run-tests.sh --force-coverage and --verbose-coverage', () => {
  const resultsDir = path.resolve(__dirname, '../../../test-results');

  beforeAll(() => {
    if (!fs.existsSync(fakeBinDir)) {
      fs.mkdirSync(fakeBinDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(resultsDir)) fs.rmdirSync(resultsDir, { recursive: true });
  });

  test('force coverage option enables coverage output', () => {
    const result = runScript(['--force-coverage', 'all']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('カバレッジ計測を強制的に有効化しています');
  });

  test('verbose coverage shows jest command', () => {
    const result = runScript(['--verbose-coverage', 'all']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('実行するJestコマンド');
  });
});
