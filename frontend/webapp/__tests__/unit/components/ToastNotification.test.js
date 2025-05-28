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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import ToastNotification from '@/components/common/ToastNotification';

describe('ToastNotificationコンポーネント', () => {
  beforeEach(() => {
    jest.useFakeTimers('legacy');
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
    jest.useRealTimers();
    const handleClose = jest.fn();
    render(<ToastNotification message="Bye" onClose={handleClose} />);

    expect(screen.getByText('Bye')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.queryByText('Bye')).not.toBeInTheDocument();
    });
    expect(handleClose).toHaveBeenCalled();
  });

  it('type と position に応じたクラスを適用する', () => {
    const { container } = render(
      <ToastNotification message="Info" type="success" position="top" />
    );

    const wrapper = container.firstChild.firstChild;
    expect(wrapper.className).toContain('border-green-500');
  });

  it('duration=0 の場合は自動で閉じない', () => {
    render(<ToastNotification message="Persist" duration={0} />);

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.getByText('Persist')).toBeInTheDocument();
  });
});
