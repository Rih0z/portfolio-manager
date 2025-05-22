const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  createTestDirectories,
  setupEnvironmentVariables,
  checkMockSetup,
  validateJestConfiguration,
  prepareTestEnvironment,
  checkDependencies
} = require('../../../script/setup-test-env');

// Helper to run each function in isolated temp directory
function withTempDir(fn) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-'));
  const originalCwd = process.cwd();
  process.chdir(tmpDir);
  try {
    return fn(tmpDir);
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

describe('setup-test-env functions', () => {
  test('createTestDirectories creates expected folders', () => {
    withTempDir(() => {
      createTestDirectories();
      expect(fs.existsSync('test-results')).toBe(true);
      expect(fs.existsSync('coverage')).toBe(true);
      expect(fs.existsSync('__tests__/unit')).toBe(true);
      expect(fs.existsSync('__mocks__/axios')).toBe(true);
    });
  });

  test('.env.test is generated with coverage target', () => {
    withTempDir(() => {
      process.env.COVERAGE_TARGET = 'initial';
      setupEnvironmentVariables();
      const env = fs.readFileSync('.env.test', 'utf8');
      expect(env).toContain('COVERAGE_TARGET=initial');
    });
  });

  test('checkMockSetup writes mock files', () => {
    withTempDir(() => {
      checkMockSetup();
      expect(fs.existsSync('__mocks__/styleMock.js')).toBe(true);
      expect(fs.existsSync('__mocks__/fileMock.js')).toBe(true);
      expect(fs.existsSync('__mocks__/axios.js')).toBe(true);
    });
  });

  test('validateJestConfiguration finds jest.config.js', () => {
    withTempDir(() => {
      fs.writeFileSync('jest.config.js', 'module.exports = { collectCoverage: true, coverageDirectory: "coverage", coverageReporters: ["json"], reporters: [] };');
      validateJestConfiguration();
      // simply ensure file exists and no error thrown
      expect(fs.existsSync('jest.config.js')).toBe(true);
    });
  });

  test('prepareTestEnvironment cleans previous reports', () => {
    withTempDir(() => {
      fs.mkdirSync('test-results', { recursive: true });
      fs.writeFileSync('test-results/junit.xml', 'old');
      prepareTestEnvironment();
      expect(fs.existsSync('test-results/junit.xml')).toBe(false);
      expect(fs.existsSync('test-results/.test-mode')).toBe(true);
    });
  });

  test('checkDependencies runs with empty package.json', () => {
    withTempDir(() => {
      fs.writeFileSync('package.json', JSON.stringify({}));
      checkDependencies();
      expect(fs.existsSync('package.json')).toBe(true);
    });
  });
});
