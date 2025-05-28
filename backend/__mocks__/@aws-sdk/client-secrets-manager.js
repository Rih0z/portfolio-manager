/**
 * AWS SDK v3 Secrets Manager Client Mock
 */
'use strict';

class SecretsManagerClient {
  constructor(config = {}) {
    this.config = config;
  }

  async send(command) {
    if (command instanceof GetSecretValueCommand) {
      // テスト用のモックレスポンス
      return {
        SecretString: JSON.stringify({
          ALPHA_VANTAGE_API_KEY: 'test_alpha_vantage_key',
          ALPACA_API_KEY: 'test_alpaca_key',
          ALPACA_API_SECRET: 'test_alpaca_secret',
          GITHUB_TOKEN: 'test_github_token',
          GOOGLE_CLIENT_ID: 'test_google_client_id',
          GOOGLE_CLIENT_SECRET: 'test_google_client_secret',
          ADMIN_API_KEY: 'test_admin_key',
          CRON_SECRET: 'test_cron_secret',
          OPEN_EXCHANGE_RATES_APP_ID: 'test_exchange_id',
          FIXER_API_KEY: 'test_fixer_key',
          YAHOO_FINANCE_API_KEY: 'test_yahoo_key'
        })
      };
    }
    
    throw new Error(`Mock not implemented for command: ${command.constructor.name}`);
  }
}

class GetSecretValueCommand {
  constructor(input) {
    this.input = input;
  }
}

module.exports = {
  SecretsManagerClient,
  GetSecretValueCommand
};