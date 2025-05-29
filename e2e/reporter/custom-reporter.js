import fs from 'fs';
import path from 'path';

/**
 * カスタムレポーター for Playwright
 * AWS統合テストの詳細なレポートを生成
 */
class CustomReporter {
  constructor() {
    this.results = {
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0
      },
      tests: [],
      awsIntegration: {
        apiCalls: [],
        performance: [],
        errors: []
      },
      timestamp: new Date().toISOString()
    };
  }

  onBegin(config, suite) {
    console.log(`Starting test run with ${suite.allTests().length} tests`);
    this.startTime = Date.now();
  }

  onTestBegin(test) {
    console.log(`Running: ${test.title}`);
  }

  onTestEnd(test, result) {
    const testResult = {
      title: test.title,
      fullTitle: test.titlePath().join(' > '),
      status: result.status,
      duration: result.duration,
      error: result.error ? {
        message: result.error.message,
        stack: result.error.stack
      } : null,
      retry: result.retry,
      attachments: result.attachments || []
    };

    // AWS関連のテストを特別に処理
    if (test.title.includes('AWS') || test.title.includes('API')) {
      this.processAWSTest(testResult, result);
    }

    this.results.tests.push(testResult);
    this.results.summary.total++;
    this.results.summary[result.status]++;
  }

  processAWSTest(testResult, result) {
    // アタッチメントからAPIレスポンスを抽出
    const apiResponses = result.attachments
      .filter(a => a.name === 'api-response')
      .map(a => JSON.parse(a.body.toString()));

    apiResponses.forEach(response => {
      this.results.awsIntegration.apiCalls.push({
        test: testResult.title,
        endpoint: response.endpoint,
        status: response.status,
        duration: response.duration,
        timestamp: response.timestamp
      });

      // パフォーマンスメトリクス
      if (response.duration) {
        this.results.awsIntegration.performance.push({
          endpoint: response.endpoint,
          duration: response.duration,
          timestamp: response.timestamp
        });
      }
    });

    // エラーの記録
    if (testResult.error) {
      this.results.awsIntegration.errors.push({
        test: testResult.title,
        error: testResult.error,
        timestamp: new Date().toISOString()
      });
    }
  }

  onEnd(result) {
    this.results.summary.duration = Date.now() - this.startTime;
    
    // 結果をファイルに保存
    const reportDir = path.join(process.cwd(), 'e2e-report');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // JSON形式のレポート
    fs.writeFileSync(
      path.join(reportDir, 'aws-integration-report.json'),
      JSON.stringify(this.results, null, 2)
    );

    // HTMLレポートの生成
    this.generateHTMLReport(reportDir);

    // サマリーの出力
    console.log('\n=== Test Summary ===');
    console.log(`Total: ${this.results.summary.total}`);
    console.log(`Passed: ${this.results.summary.passed}`);
    console.log(`Failed: ${this.results.summary.failed}`);
    console.log(`Duration: ${this.results.summary.duration}ms`);
    
    if (this.results.awsIntegration.apiCalls.length > 0) {
      console.log('\n=== AWS Integration Summary ===');
      console.log(`API Calls: ${this.results.awsIntegration.apiCalls.length}`);
      
      const avgDuration = this.results.awsIntegration.performance
        .reduce((sum, p) => sum + p.duration, 0) / this.results.awsIntegration.performance.length;
      console.log(`Average API Response Time: ${avgDuration.toFixed(2)}ms`);
    }
  }

  generateHTMLReport(reportDir) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>AWS Integration Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .summary { background: #f0f0f0; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .passed { color: green; }
    .failed { color: red; }
    .skipped { color: orange; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f0f0f0; }
    .error { background: #ffe0e0; padding: 10px; margin: 10px 0; border-radius: 4px; }
    .performance-chart { margin: 20px 0; }
  </style>
</head>
<body>
  <h1>AWS Integration Test Report</h1>
  <div class="summary">
    <h2>Summary</h2>
    <p>Generated: ${this.results.timestamp}</p>
    <p>Duration: ${this.results.summary.duration}ms</p>
    <p>
      Total: ${this.results.summary.total} | 
      <span class="passed">Passed: ${this.results.summary.passed}</span> | 
      <span class="failed">Failed: ${this.results.summary.failed}</span> | 
      <span class="skipped">Skipped: ${this.results.summary.skipped}</span>
    </p>
  </div>

  <h2>Test Results</h2>
  <table>
    <thead>
      <tr>
        <th>Test</th>
        <th>Status</th>
        <th>Duration</th>
        <th>Error</th>
      </tr>
    </thead>
    <tbody>
      ${this.results.tests.map(test => `
        <tr>
          <td>${test.fullTitle}</td>
          <td class="${test.status}">${test.status}</td>
          <td>${test.duration}ms</td>
          <td>${test.error ? `<div class="error">${test.error.message}</div>` : ''}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>AWS API Performance</h2>
  <table>
    <thead>
      <tr>
        <th>Endpoint</th>
        <th>Response Time</th>
        <th>Timestamp</th>
      </tr>
    </thead>
    <tbody>
      ${this.results.awsIntegration.performance.map(perf => `
        <tr>
          <td>${perf.endpoint}</td>
          <td>${perf.duration}ms</td>
          <td>${new Date(perf.timestamp).toLocaleString()}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  ${this.results.awsIntegration.errors.length > 0 ? `
    <h2>Errors</h2>
    ${this.results.awsIntegration.errors.map(err => `
      <div class="error">
        <h3>${err.test}</h3>
        <p>${err.error.message}</p>
        <pre>${err.error.stack}</pre>
      </div>
    `).join('')}
  ` : ''}
</body>
</html>
    `;

    fs.writeFileSync(path.join(reportDir, 'aws-integration-report.html'), html);
  }
}

export default CustomReporter;