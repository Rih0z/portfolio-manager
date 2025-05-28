/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/setupTests.js 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-03-01 10:00:00 
 * 
 * 更新履歴: 
 * - 2025-03-01 10:00:00 Koki Riho 初回作成
 * - 2025-05-08 11:20:00 Koki Riho ファイルヘッダーを追加
 * - 2025-05-26 MSWセットアップを追加
 * 
 * 説明: 
 * テスト環境のセットアップを行うファイル。
 * Jest DOM拡張を含み、DOMノードに対するカスタムマッチャーを追加する。
 * MSWによるAPIモックの設定も行う。
 * Create React Appのデフォルト設定に含まれており、テストスイートの実行前に自動的に実行される。
 */
// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// MSWのセットアップ
import { setupServer } from 'msw/node';
import { handlers } from '../__tests__/mocks/handlers';

// APIモックサーバーの作成
export const server = setupServer(...handlers);

// テスト実行前にサーバーを起動
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn'
  });
});

// 各テスト後にハンドラーをリセット
afterEach(() => {
  server.resetHandlers();
});

// すべてのテスト終了後にサーバーを停止
afterAll(() => {
  server.close();
});

// テスト環境の確認
if (process.env.USE_API_MOCKS === 'true') {
  console.log('✓ APIモックが有効になっています');
}
