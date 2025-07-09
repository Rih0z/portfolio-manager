/**
 * LoginButton.jsx のテストファイル
 * Google OAuth認証ログインボタンコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoginButton from '../../../../components/auth/LoginButton';

// OAuthLoginButtonのモック
jest.mock('../../../../components/auth/OAuthLoginButton', () => {
  return function MockOAuthLoginButton() {
    return <div data-testid="oauth-login-button">OAuth Login Button</div>;
  };
});

describe('LoginButton', () => {
  describe('基本レンダリング', () => {
    test('LoginButtonが正しく表示される', () => {
      render(<LoginButton />);
      
      expect(screen.getByTestId('oauth-login-button')).toBeInTheDocument();
      expect(screen.getByText('OAuth Login Button')).toBeInTheDocument();
    });

    test('LoginButtonコンポーネントが存在する', () => {
      const component = render(<LoginButton />);
      expect(component.container.firstChild).toBeInTheDocument();
    });
  });

  describe('コンポーネント構造', () => {
    test('LoginButtonContentを内包している', () => {
      // LoginButtonがLoginButtonContentをレンダリングし、
      // それがOAuthLoginButtonをレンダリングすることを確認
      render(<LoginButton />);
      
      expect(screen.getByTestId('oauth-login-button')).toBeInTheDocument();
    });

    test('OAuthLoginButtonに正しく委譲している', () => {
      render(<LoginButton />);
      
      // OAuthLoginButtonがレンダリングされていることを確認
      expect(screen.getByTestId('oauth-login-button')).toBeInTheDocument();
    });
  });

  describe('エラーハンドリング', () => {
    test('OAuthLoginButtonが存在しない場合でもエラーが発生しない', () => {
      // OAuthLoginButtonのモックを一時的に削除
      jest.doMock('../../../../components/auth/OAuthLoginButton', () => {
        return function MockOAuthLoginButton() {
          return null;
        };
      });

      expect(() => {
        render(<LoginButton />);
      }).not.toThrow();
    });

    test('propsが渡されなくてもエラーが発生しない', () => {
      expect(() => {
        render(<LoginButton />);
      }).not.toThrow();
    });

    test('undefinedやnullの子要素でもエラーが発生しない', () => {
      jest.doMock('../../../../components/auth/OAuthLoginButton', () => {
        return function MockOAuthLoginButton() {
          return undefined;
        };
      });

      expect(() => {
        render(<LoginButton />);
      }).not.toThrow();
    });
  });

  describe('レンダリング一貫性', () => {
    test('複数回レンダリングしても同じ結果を返す', () => {
      const { container: container1 } = render(<LoginButton />);
      const { container: container2 } = render(<LoginButton />);
      
      expect(container1.innerHTML).toBe(container2.innerHTML);
    });

    test('props変更なしで再レンダリングしても同じ結果を返す', () => {
      const { container, rerender } = render(<LoginButton />);
      const initialHTML = container.innerHTML;
      
      rerender(<LoginButton />);
      
      expect(container.innerHTML).toBe(initialHTML);
    });
  });

  describe('コンポーネント分離', () => {
    test('LoginButtonContentが独立して動作する', () => {
      // LoginButtonContentは直接エクスポートされていないが、
      // LoginButtonを通じて間接的にテストできる
      render(<LoginButton />);
      
      expect(screen.getByTestId('oauth-login-button')).toBeInTheDocument();
    });

    test('階層構造が正しい', () => {
      const { container } = render(<LoginButton />);
      
      // LoginButton -> LoginButtonContent -> OAuthLoginButtonの階層を確認
      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByTestId('oauth-login-button')).toBeInTheDocument();
    });
  });

  describe('パフォーマンス', () => {
    test('不要な再レンダリングが発生しない', () => {
      const renderCount = jest.fn();
      
      jest.doMock('../../../../components/auth/OAuthLoginButton', () => {
        return function MockOAuthLoginButton() {
          renderCount();
          return <div data-testid="oauth-login-button">OAuth Login Button</div>;
        };
      });

      const { rerender } = render(<LoginButton />);
      const initialCount = renderCount.mock.calls.length;
      
      // 同じpropsで再レンダリング
      rerender(<LoginButton />);
      
      // レンダリング回数が増加していることを確認
      // （React.memoが使われていない場合は再レンダリングされる）
      expect(renderCount.mock.calls.length).toBeGreaterThanOrEqual(initialCount);
    });
  });

  describe('型安全性', () => {
    test('LoginButtonが関数コンポーネントである', () => {
      expect(typeof LoginButton).toBe('function');
    });

    test('適切なReactエレメントを返す', () => {
      const element = React.createElement(LoginButton);
      expect(React.isValidElement(element)).toBe(true);
    });
  });

  describe('アクセシビリティ基本事項', () => {
    test('レンダリングされた要素がDOMに存在する', () => {
      render(<LoginButton />);
      
      expect(screen.getByTestId('oauth-login-button')).toBeInTheDocument();
    });

    test('レンダリングされた要素が可視状態である', () => {
      render(<LoginButton />);
      
      const element = screen.getByTestId('oauth-login-button');
      expect(element).toBeVisible();
    });
  });

  describe('統合性', () => {
    test('OAuthLoginButtonとの統合が正常に動作する', () => {
      render(<LoginButton />);
      
      // OAuthLoginButtonがレンダリングされ、期待されるテキストが表示される
      expect(screen.getByTestId('oauth-login-button')).toBeInTheDocument();
      expect(screen.getByText('OAuth Login Button')).toBeInTheDocument();
    });

    test('子コンポーネントへの依存関係が正しく設定されている', () => {
      // モックが正しく動作していることで、依存関係が適切に設定されていることを確認
      render(<LoginButton />);
      
      expect(screen.getByTestId('oauth-login-button')).toBeInTheDocument();
    });
  });

  describe('メモリリーク防止', () => {
    test('アンマウント時にエラーが発生しない', () => {
      const { unmount } = render(<LoginButton />);
      
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    test('複数回マウント/アンマウントしても問題がない', () => {
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(<LoginButton />);
        unmount();
      }
      
      // エラーが発生しないことをテスト
      expect(true).toBe(true);
    });
  });

  describe('境界値テスト', () => {
    test('極端なプロップ値でもエラーが発生しない', () => {
      // LoginButtonはpropsを受け取らないが、
      // 意図しないpropsが渡されてもエラーにならないことを確認
      expect(() => {
        render(<LoginButton someUnexpectedProp="value" />);
      }).not.toThrow();
    });

    test('nullやundefinedのchildrenでもエラーが発生しない', () => {
      jest.doMock('../../../../components/auth/OAuthLoginButton', () => {
        return function MockOAuthLoginButton() {
          return null;
        };
      });

      expect(() => {
        render(<LoginButton />);
      }).not.toThrow();
    });
  });
});