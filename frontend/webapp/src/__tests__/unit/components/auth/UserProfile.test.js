/**
 * UserProfile.jsx のテストファイル
 * ログインユーザーのプロフィール表示コンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserProfile from '../../../../components/auth/UserProfile';

// React i18nextのモック
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'ja' }
  })
}));

// useAuthフックのモック
const mockHandleLogout = jest.fn();
jest.mock('../../../../hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

describe('UserProfile Component', () => {
  const { useAuth } = require('../../../../hooks/useAuth');

  beforeEach(() => {
    jest.clearAllMocks();
    
    // console.errorのモック
    console.error = jest.fn();
  });

  describe('レンダリング', () => {
    test('ユーザーがログインしていない場合は何も表示されない', () => {
      useAuth.mockReturnValue({
        user: null,
        handleLogout: mockHandleLogout
      });

      const { container } = render(<UserProfile />);
      
      expect(container.firstChild).toBeNull();
    });

    test('ユーザー情報（画像あり）が正しく表示される', () => {
      const mockUser = {
        name: 'テストユーザー',
        picture: 'https://example.com/avatar.jpg'
      };

      useAuth.mockReturnValue({
        user: mockUser,
        handleLogout: mockHandleLogout
      });

      render(<UserProfile />);
      
      expect(screen.getByText('テストユーザー')).toBeInTheDocument();
      expect(screen.getByText('ログアウト')).toBeInTheDocument();
      
      const avatar = screen.getByRole('img');
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      expect(avatar).toHaveAttribute('alt', 'テストユーザー');
      expect(avatar).toHaveClass('w-8', 'h-8', 'rounded-full');
    });

    test('ユーザー情報（画像なし）が正しく表示される', () => {
      const mockUser = {
        name: 'テストユーザー',
        picture: null
      };

      useAuth.mockReturnValue({
        user: mockUser,
        handleLogout: mockHandleLogout
      });

      render(<UserProfile />);
      
      expect(screen.getByText('テストユーザー')).toBeInTheDocument();
      expect(screen.getByText('ログアウト')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    test('ユーザー名が空の場合でも表示される', () => {
      const mockUser = {
        name: '',
        picture: 'https://example.com/avatar.jpg'
      };

      useAuth.mockReturnValue({
        user: mockUser,
        handleLogout: mockHandleLogout
      });

      render(<UserProfile />);
      
      // 空文字の場合、<p>要素は存在するがテキストコンテンツがない
      const nameElement = screen.getByRole('paragraph');
      expect(nameElement).toBeInTheDocument();
      expect(nameElement).toHaveTextContent('');
      expect(screen.getByText('ログアウト')).toBeInTheDocument();
    });

    test('pictureプロパティが存在しない場合', () => {
      const mockUser = {
        name: 'テストユーザー'
        // pictureプロパティなし
      };

      useAuth.mockReturnValue({
        user: mockUser,
        handleLogout: mockHandleLogout
      });

      render(<UserProfile />);
      
      expect(screen.getByText('テストユーザー')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });

  describe('ログアウト処理', () => {
    const mockUser = {
      name: 'テストユーザー',
      picture: 'https://example.com/avatar.jpg'
    };

    test('ログアウトボタンのクリックでhandleLogoutが呼ばれる', async () => {
      mockHandleLogout.mockResolvedValue();

      useAuth.mockReturnValue({
        user: mockUser,
        handleLogout: mockHandleLogout
      });

      render(<UserProfile />);
      
      const logoutButton = screen.getByText('ログアウト');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(mockHandleLogout).toHaveBeenCalledTimes(1);
      });
    });

    test('ログアウト処理中の状態表示', async () => {
      mockHandleLogout.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      useAuth.mockReturnValue({
        user: mockUser,
        handleLogout: mockHandleLogout
      });

      render(<UserProfile />);
      
      const logoutButton = screen.getByText('ログアウト');
      fireEvent.click(logoutButton);

      // ログアウト中の表示を確認
      expect(screen.getByText('ログアウト中...')).toBeInTheDocument();
      expect(screen.getByText('ログアウト中...')).toBeDisabled();

      // ログアウト完了まで待機
      await waitFor(() => {
        expect(mockHandleLogout).toHaveBeenCalled();
      });
    });

    test('ログアウト処理でエラーが発生した場合', async () => {
      const errorMessage = 'Logout failed';
      mockHandleLogout.mockRejectedValue(new Error(errorMessage));

      useAuth.mockReturnValue({
        user: mockUser,
        handleLogout: mockHandleLogout
      });

      render(<UserProfile />);
      
      const logoutButton = screen.getByText('ログアウト');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('ログアウト処理エラー:', expect.any(Error));
      });

      // エラー後はログアウト中の状態が解除される
      expect(screen.getByText('ログアウト')).toBeInTheDocument();
      expect(screen.getByText('ログアウト')).not.toBeDisabled();
    });

    test('ログアウト処理中はボタンが無効化される', async () => {
      let resolveLogout;
      mockHandleLogout.mockImplementation(() => new Promise(resolve => {
        resolveLogout = resolve;
      }));

      useAuth.mockReturnValue({
        user: mockUser,
        handleLogout: mockHandleLogout
      });

      render(<UserProfile />);
      
      const logoutButton = screen.getByText('ログアウト');
      fireEvent.click(logoutButton);

      // ログアウト中はボタンが無効化されている
      const logoutingButton = screen.getByText('ログアウト中...');
      expect(logoutingButton).toBeDisabled();

      // 複数回クリックしても追加で呼ばれない
      fireEvent.click(logoutingButton);
      fireEvent.click(logoutingButton);

      expect(mockHandleLogout).toHaveBeenCalledTimes(1);

      // ログアウト完了
      resolveLogout();
      await waitFor(() => {
        expect(screen.getByText('ログアウト')).not.toBeDisabled();
      });
    });
  });

  describe('コンポーネントの構造とスタイル', () => {
    const mockUser = {
      name: 'テストユーザー',
      picture: 'https://example.com/avatar.jpg'
    };

    test('正しいCSSクラスが適用されている', () => {
      useAuth.mockReturnValue({
        user: mockUser,
        handleLogout: mockHandleLogout
      });

      render(<UserProfile />);
      
      // メインコンテナのクラス
      const container = screen.getByText('テストユーザー').closest('div').parentElement;
      expect(container).toHaveClass('flex', 'items-center', 'space-x-2');

      // アバター画像のクラス
      const avatar = screen.getByRole('img');
      expect(avatar).toHaveClass('w-8', 'h-8', 'rounded-full');

      // テキストコンテナのクラス
      const textContainer = screen.getByText('テストユーザー').parentElement;
      expect(textContainer).toHaveClass('text-sm');

      // ユーザー名のクラス
      const userName = screen.getByText('テストユーザー');
      expect(userName).toHaveClass('font-medium');

      // ログアウトボタンのクラス
      const logoutButton = screen.getByText('ログアウト');
      expect(logoutButton).toHaveClass('text-xs', 'text-blue-200', 'hover:text-white');
    });

    test('ログアウト中のボタンスタイル', async () => {
      mockHandleLogout.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      useAuth.mockReturnValue({
        user: mockUser,
        handleLogout: mockHandleLogout
      });

      render(<UserProfile />);
      
      const logoutButton = screen.getByText('ログアウト');
      fireEvent.click(logoutButton);

      const logoutingButton = await screen.findByText('ログアウト中...');
      expect(logoutingButton).toHaveClass('text-xs', 'text-blue-200', 'hover:text-white');
      expect(logoutingButton).toBeDisabled();
    });
  });

  describe('エッジケースのテスト', () => {
    test('handleLogoutが未定義の場合', () => {
      const mockUser = {
        name: 'テストユーザー',
        picture: 'https://example.com/avatar.jpg'
      };

      useAuth.mockReturnValue({
        user: mockUser,
        handleLogout: undefined
      });

      expect(() => {
        render(<UserProfile />);
      }).not.toThrow();

      // ボタンは表示されるが、クリックしてもエラーが発生する可能性
      const logoutButton = screen.getByText('ログアウト');
      expect(logoutButton).toBeInTheDocument();
    });

    test('ユーザーオブジェクトが空の場合', () => {
      useAuth.mockReturnValue({
        user: {},
        handleLogout: mockHandleLogout
      });

      render(<UserProfile />);
      
      // nameが未定義でも表示される
      expect(screen.getByText('ログアウト')).toBeInTheDocument();
      // pictureが未定義なのでアバターは表示されない
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    test('非同期ログアウト処理が瞬時に完了する場合', async () => {
      mockHandleLogout.mockResolvedValue();

      useAuth.mockReturnValue({
        user: { name: 'テストユーザー' },
        handleLogout: mockHandleLogout
      });

      render(<UserProfile />);
      
      const logoutButton = screen.getByText('ログアウト');
      fireEvent.click(logoutButton);

      // 瞬時に完了するため、"ログアウト中..."は一時的にしか表示されない可能性
      await waitFor(() => {
        expect(mockHandleLogout).toHaveBeenCalled();
      });
    });
  });
});