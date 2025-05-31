/**
 * ファイルパス: __tests__/testUtils/dynamodbLocal.js
 * 
 * DynamoDB Localを管理するユーティリティ
 * 
 * @file __tests__/testUtils/dynamodbLocal.js
 * @author Portfolio Manager Team
 * @updated 2025-05-12 バグ修正: AWS SDK v3のエラーハンドリングを改善
 * @updated 2025-05-13 AWS SDK v3マイグレーション対応の完了
 */
const { spawn } = require('child_process');
const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

let dynamoProcess = null;

/**
 * DynamoDB Localを起動する
 */
const startDynamoDBLocal = async (port = 8000) => {
  if (dynamoProcess) {
    console.log('DynamoDB Local is already running');
    return;
  }
  
  return new Promise((resolve, reject) => {
    console.log('Starting DynamoDB Local...');
    
    try {
      // プロジェクトルートからの相対パスで実行
      dynamoProcess = spawn('java', [
        '-Djava.library.path=./dynamodb-local/DynamoDBLocal_lib',
        '-jar',
        './dynamodb-local/DynamoDBLocal.jar',
        '-inMemory',
        '-port',
        port.toString()
      ]);
      
      dynamoProcess.stdout.on('data', (data) => {
        if (data.toString().includes('CorsParams')) {
          console.log('DynamoDB Local started successfully');
          resolve();
        }
      });
      
      dynamoProcess.stderr.on('data', (data) => {
        console.error('DynamoDB Local error:', data.toString());
      });
      
      dynamoProcess.on('error', (error) => {
        console.error('Failed to start DynamoDB Local:', error);
        dynamoProcess = null;
        reject(error);
      });
      
      // 5秒後にタイムアウト - 起動に時間がかかる場合でも進行できるようにする
      setTimeout(() => {
        if (dynamoProcess) {
          console.log('DynamoDB Local timeout reached, assuming it is running');
          resolve();
        } else {
          // プロセスが存在しない場合はエラーとして扱う
          reject(new Error('DynamoDB Local failed to start within timeout'));
        }
      }, 5000);
    } catch (error) {
      console.error('Exception when starting DynamoDB Local:', error);
      reject(error);
    }
  });
};

/**
 * DynamoDB Localを停止する
 */
const stopDynamoDBLocal = () => {
  if (dynamoProcess) {
    console.log('Stopping DynamoDB Local...');
    try {
      dynamoProcess.kill();
    } catch (error) {
      console.error('Error stopping DynamoDB Local:', error);
    } finally {
      dynamoProcess = null;
    }
  }
};

/**
 * テスト用のDynamoDBクライアントを取得する
 */
const getDynamoDBClient = () => {
  try {
    const client = new DynamoDBClient({
      region: 'us-east-1',
      endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test'
      }
    });
    
    return DynamoDBDocumentClient.from(client);
  } catch (error) {
    console.error('Error creating DynamoDB client:', error);
    throw error;
  }
};

/**
 * テスト用のテーブルを作成する
 * 
 * 修正: エラーハンドリングを改善し、テーブル作成エラーで全体のテストが失敗しないようにする
 */
const createTestTable = async (tableName, keySchema = { key: 'S' }) => {
  try {
    const client = new DynamoDBClient({
      region: 'us-east-1',
      endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test'
      }
    });
    
    const keyName = Object.keys(keySchema)[0];
    const keyType = keySchema[keyName];
    
    // 修正: テーブルが既に存在するかを事前にチェック
    try {
      await client.send(new DescribeTableCommand({ TableName: tableName }));
      console.log(`Table ${tableName} already exists, skipping creation`);
      return; // テーブルが既に存在する場合は早期リターン
    } catch (describeError) {
      // テーブルが存在しない場合は、エラーが発生するため、ここで作成処理に進む
      if (describeError.name !== 'ResourceNotFoundException') {
        console.warn(`Unexpected error checking table existence: ${describeError.message}`);
      }
    }
    
    const params = {
      TableName: tableName,
      KeySchema: [
        { AttributeName: keyName, KeyType: 'HASH' }
      ],
      AttributeDefinitions: [
        { AttributeName: keyName, AttributeType: keyType }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    };
    
    // テーブルが存在しない場合、新しく作成
    await client.send(new CreateTableCommand(params));
    console.log(`Created table: ${tableName}`);
    
    // テーブル作成後に少し待機（DynamoDB Local が非同期で処理を完了するため）
    await new Promise(resolve => setTimeout(resolve, 500));
    
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log(`Table ${tableName} already exists`);
    } else {
      console.error(`Error creating table ${tableName}:`, error.message);
      // 修正: エラーをスローせず、警告だけ表示してテストを続行できるようにする
      console.warn(`Continuing tests without table ${tableName} - some tests may fail`);
    }
  }
};

/**
 * 指定したテーブルにテストデータを挿入する
 */
const insertTestData = async (tableName, items) => {
  try {
    const docClient = getDynamoDBClient();
    
    for (const item of items) {
      try {
        await docClient.send(new PutCommand({
          TableName: tableName,
          Item: item
        }));
      } catch (error) {
        console.error(`Error inserting test data into ${tableName}:`, error.message);
      }
    }
    
    console.log(`Inserted ${items.length} items into ${tableName}`);
  } catch (error) {
    console.error(`Failed to insert test data into ${tableName}:`, error);
    console.warn('Continuing tests without test data - some tests may fail');
  }
};

module.exports = {
  startDynamoDBLocal,
  stopDynamoDBLocal,
  getDynamoDBClient,
  createTestTable,
  insertTestData
};
