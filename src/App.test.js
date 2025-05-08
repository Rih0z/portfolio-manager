/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/App.test.js 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-03-01 10:00:00 
 * 
 * 更新履歴: 
 * - 2025-03-01 10:00:00 Koki Riho 初回作成
 * - 2025-05-08 11:20:00 Koki Riho ファイルヘッダーを追加
 * 
 * 説明: 
 * App コンポーネントのテストファイル。
 * Create React App のデフォルトテスト設定を使用して、Appコンポーネントが正常にレンダリングされることを確認する。
 * 実際のアプリケーションの機能テストは別のテストファイルで実施される。
 */

import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
