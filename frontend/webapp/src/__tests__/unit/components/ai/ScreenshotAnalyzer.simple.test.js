/**
 * ScreenshotAnalyzer の最小テスト（レンダリング問題のデバッグ用）
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// i18nextのモック
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'ja' }
  })
}));

// 最小のコンポーネントを直接定義してテスト
const SimpleScreenshotAnalyzer = () => {
  return <div>テスト用コンポーネント</div>;
};

describe('Simple ScreenshotAnalyzer Test', () => {
  it('最小コンポーネントがレンダリングできる', () => {
    render(<SimpleScreenshotAnalyzer />);
    expect(screen.getByText('テスト用コンポーネント')).toBeInTheDocument();
  });
});