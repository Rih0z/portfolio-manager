/**
 * ファイルパス: __test__/unit/components/ErrorBoundary.test.js
 *
 * ErrorBoundaryコンポーネントの単体テスト
 * 子コンポーネントで発生した例外のハンドリングをテスト
 *
 * @author プロジェクトチーム
 * @created 2025-05-21
 */

import React from 'react';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { render, screen } from '@testing-library/react';

// エラーを投げるテスト用コンポーネント
const BrokenComponent = () => {
  throw new Error('Test error');
};

describe('ErrorBoundaryコンポーネント', () => {
  it('子コンポーネントでエラーが発生した場合にフォールバックUIを表示する', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('コンポーネントの読み込み中にエラーが発生しました')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('エラーが発生しない場合は子要素を表示する', () => {
    render(
      <ErrorBoundary>
        <div>正常表示</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('正常表示')).toBeInTheDocument();
  });
});
