/**
 * AWS Secrets Manager にAPI Secretを作成するスクリプト
 * 一度だけ実行して、シークレットを作成します
 */

const { SecretsManagerClient, CreateSecretCommand, UpdateSecretCommand } = require('@aws-sdk/client-secrets-manager');
const fs = require('fs');
const path = require('path');

const client = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-west-2'
});

async function createOrUpdateApiSecret() {
  const secretName = 'pfwise-api/api-secret';
  
  // /tmp/api-secret.txtから読み込み（既に生成済み）
  const secretValue = fs.readFileSync('/tmp/api-secret.txt', 'utf8').trim();
  
  try {
    // まず作成を試みる
    await client.send(new CreateSecretCommand({
      Name: secretName,
      Description: 'API Secret for pfwise API protection',
      SecretString: secretValue
    }));
    
    console.log('✅ API Secret created successfully in AWS Secrets Manager');
    console.log(`Secret Name: ${secretName}`);
    console.log('Secret Value: [HIDDEN]');
    
  } catch (error) {
    if (error.name === 'ResourceExistsException') {
      // 既に存在する場合は更新
      try {
        await client.send(new UpdateSecretCommand({
          SecretId: secretName,
          SecretString: secretValue
        }));
        
        console.log('✅ API Secret updated successfully in AWS Secrets Manager');
        console.log(`Secret Name: ${secretName}`);
        console.log('Secret Value: [HIDDEN]');
        
      } catch (updateError) {
        console.error('❌ Failed to update secret:', updateError.message);
        process.exit(1);
      }
    } else {
      console.error('❌ Failed to create secret:', error.message);
      process.exit(1);
    }
  }
  
  // Cloudflare用の環境変数ファイルを作成（ローカル参照用）
  const envContent = `# Cloudflare Pages Environment Variables
# Add these to your Cloudflare Pages settings
API_SECRET=${secretValue}
REACT_APP_API_BASE_URL=https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod
`;
  
  const envPath = path.join(__dirname, '..', '..', 'cloudflare-env.txt');
  fs.writeFileSync(envPath, envContent);
  
  console.log('\n📝 Cloudflare environment variables saved to:');
  console.log(envPath);
  console.log('\n⚠️  IMPORTANT: Add the API_SECRET value to Cloudflare Pages environment variables');
  console.log('⚠️  Then delete the cloudflare-env.txt file for security');
  
  // 一時ファイルを削除
  fs.unlinkSync('/tmp/api-secret.txt');
  console.log('\n🗑️  Temporary secret file deleted');
}

// 実行
createOrUpdateApiSecret().catch(console.error);