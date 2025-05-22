/**
 * ファイルパス: __test__/unit/components/ToastNotification.test.js
 *
 * ToastNotificationコンポーネントの単体テスト
 * メッセージ表示、自動消去、手動閉じる動作をテスト
 *
 * @author プロジェクトチーム
 * @created 2025-05-21
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import ToastNotification from '@/components/common/ToastNotification';

describe('ToastNotificationコンポーネント', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('指定されたメッセージを表示し、時間経過後に自動で閉じる', () => {
    render(<ToastNotification message="Hello" duration={1000} />);

    expect(screen.getByText('Hello')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });

  it('閉じるボタンで手動で閉じることができる', async () => {
    const handleClose = jest.fn();
    render(<ToastNotification message="Bye" onClose={handleClose} />);

    expect(screen.getByText('Bye')).toBeInTheDocument();

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.click(screen.getByRole('button'));

    act(() => {
      jest.runAllTimers();
    });

    expect(screen.queryByText('Bye')).not.toBeInTheDocument();
    expect(handleClose).toHaveBeenCalled();
  });
});
