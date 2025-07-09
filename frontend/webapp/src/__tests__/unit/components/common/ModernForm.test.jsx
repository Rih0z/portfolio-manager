/**
 * ModernForm.jsx のテストファイル
 * モダンフォームコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ModernForm from '../../../../components/common/ModernForm';

// ModernCardコンポーネントのモック
jest.mock('../../../../components/common/ModernCard', () => {
  const MockModernCard = ({ children, className, ...props }) => (
    <div className={`modern-card ${className}`} {...props}>{children}</div>
  );
  MockModernCard.Header = ({ children }) => <div className="card-header">{children}</div>;
  MockModernCard.Title = ({ children }) => <h2 className="card-title">{children}</h2>;
  MockModernCard.Content = ({ children }) => <div className="card-content">{children}</div>;
  MockModernCard.Footer = ({ children }) => <div className="card-footer">{children}</div>;
  return MockModernCard;
});

// ModernInputコンポーネントのモック
jest.mock('../../../../components/common/ModernInput', () => {
  const React = require('react');
  return React.forwardRef(function MockModernInput({ className, ...props }, ref) {
    return (
      <input 
        ref={ref}
        className={`modern-input ${className || ''}`} 
        {...props} 
      />
    );
  });
});

// ModernButtonコンポーネントのモック
jest.mock('../../../../components/common/ModernButton', () => {
  const MockModernButton = ({ children, ...props }) => (
    <button className="modern-button" {...props}>{children}</button>
  );
  return MockModernButton;
});

describe('ModernForm', () => {
  describe('基本機能', () => {
    test('子コンテンツを表示する', () => {
      render(
        <ModernForm>
          <input data-testid="test-input" />
        </ModernForm>
      );
      
      expect(screen.getByTestId('test-input')).toBeInTheDocument();
    });

    test('フォーム送信時にonSubmitが呼ばれる', () => {
      const mockSubmit = jest.fn();
      render(
        <ModernForm onSubmit={mockSubmit}>
          <button type="submit">送信</button>
        </ModernForm>
      );
      
      fireEvent.click(screen.getByText('送信'));
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });

    test('フォーム送信時にデフォルトの動作が防がれる', () => {
      const mockPreventDefault = jest.fn();
      const mockSubmit = jest.fn();
      
      render(
        <ModernForm onSubmit={mockSubmit}>
          <button type="submit">送信</button>
        </ModernForm>
      );
      
      const form = screen.getByRole('button').closest('form');
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      submitEvent.preventDefault = mockPreventDefault;
      
      fireEvent(form, submitEvent);
      expect(mockPreventDefault).toHaveBeenCalled();
    });

    test('onSubmitが未定義でもエラーが発生しない', () => {
      render(
        <ModernForm>
          <button type="submit">送信</button>
        </ModernForm>
      );
      
      expect(() => {
        fireEvent.click(screen.getByText('送信'));
      }).not.toThrow();
    });
  });

  describe('タイトルと説明', () => {
    test('タイトルが表示される', () => {
      render(<ModernForm title="テストフォーム" />);
      expect(screen.getByText('テストフォーム')).toBeInTheDocument();
    });

    test('説明が表示される', () => {
      render(
        <ModernForm 
          title="テストフォーム" 
          description="これはテスト用のフォームです"
        />
      );
      expect(screen.getByText('これはテスト用のフォームです')).toBeInTheDocument();
    });

    test('タイトルなしの場合はヘッダーが表示されない', () => {
      render(<ModernForm description="説明のみ" />);
      expect(screen.queryByText('説明のみ')).not.toBeInTheDocument();
    });

    test('タイトルありで説明なしの場合', () => {
      render(<ModernForm title="タイトルのみ" />);
      expect(screen.getByText('タイトルのみ')).toBeInTheDocument();
    });
  });

  describe('アクション', () => {
    test('アクションボタンが表示される', () => {
      const actions = [
        <button key="cancel">キャンセル</button>,
        <button key="submit">送信</button>
      ];
      
      render(<ModernForm actions={actions} />);
      
      expect(screen.getByText('キャンセル')).toBeInTheDocument();
      expect(screen.getByText('送信')).toBeInTheDocument();
    });

    test('アクションなしの場合はフッターが表示されない', () => {
      render(<ModernForm title="テスト" />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('カスタムクラスとProps', () => {
    test('カスタムクラスが適用される', () => {
      render(<ModernForm className="custom-form" title="テスト" />);
      const formContainer = screen.getByText('テスト').closest('.modern-card');
      expect(formContainer).toHaveClass('custom-form');
    });

    test('追加のpropsが渡される', () => {
      render(<ModernForm data-testid="custom-form" title="テスト" />);
      const formContainer = screen.getByTestId('custom-form');
      expect(formContainer).toBeInTheDocument();
    });
  });
});

describe('ModernForm.Field', () => {
  const { Field } = ModernForm;

  describe('基本機能', () => {
    test('ラベルと子コンテンツを表示する', () => {
      render(
        <Field label="名前">
          <input data-testid="name-input" />
        </Field>
      );
      
      expect(screen.getByText('名前')).toBeInTheDocument();
      expect(screen.getByTestId('name-input')).toBeInTheDocument();
    });

    test('必須マークが表示される', () => {
      render(
        <Field label="メールアドレス" required>
          <input />
        </Field>
      );
      
      expect(screen.getByText('メールアドレス')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    test('エラーメッセージが表示される', () => {
      render(
        <Field label="パスワード" error="パスワードは8文字以上で入力してください">
          <input />
        </Field>
      );
      
      expect(screen.getByText('パスワードは8文字以上で入力してください')).toBeInTheDocument();
    });

    test('ラベルなしでも正常に動作する', () => {
      render(
        <Field>
          <input data-testid="no-label-input" />
        </Field>
      );
      
      expect(screen.getByTestId('no-label-input')).toBeInTheDocument();
    });
  });

  describe('カスタムクラス', () => {
    test('カスタムクラスが適用される', () => {
      render(
        <Field className="custom-field" label="テスト">
          <input />
        </Field>
      );
      
      const fieldContainer = screen.getByText('テスト').closest('.custom-field');
      expect(fieldContainer).toBeInTheDocument();
    });
  });
});

describe('ModernForm.InlineEdit', () => {
  const { InlineEdit } = ModernForm;

  describe('基本機能', () => {
    test('初期値が表示される', () => {
      render(<InlineEdit value="初期値" />);
      expect(screen.getByText('初期値')).toBeInTheDocument();
    });

    test('プレースホルダーが表示される', () => {
      render(<InlineEdit value="" placeholder="値を入力" />);
      expect(screen.getByText('値を入力')).toBeInTheDocument();
    });

    test('クリックで編集モードになる', () => {
      render(<InlineEdit value="編集テスト" />);
      
      fireEvent.click(screen.getByText('編集テスト'));
      expect(screen.getByDisplayValue('編集テスト')).toBeInTheDocument();
    });

    test('無効化状態では編集できない', () => {
      render(<InlineEdit value="無効化テスト" disabled />);
      
      fireEvent.click(screen.getByText('無効化テスト'));
      expect(screen.queryByDisplayValue('無効化テスト')).not.toBeInTheDocument();
    });
  });

  describe('編集機能', () => {
    test('値を変更して保存できる', async () => {
      const mockSave = jest.fn();
      render(<InlineEdit value="元の値" onSave={mockSave} />);
      
      // 編集モードに入る
      fireEvent.click(screen.getByText('元の値'));
      
      // 値を変更
      const input = screen.getByDisplayValue('元の値');
      fireEvent.change(input, { target: { value: '新しい値' } });
      
      // 保存ボタンをクリック
      fireEvent.click(screen.getByTitle('保存'));
      
      expect(mockSave).toHaveBeenCalledWith('新しい値');
    });

    test('Enterキーで保存できる', () => {
      const mockSave = jest.fn();
      render(<InlineEdit value="テスト" onSave={mockSave} />);
      
      fireEvent.click(screen.getByText('テスト'));
      const input = screen.getByDisplayValue('テスト');
      fireEvent.change(input, { target: { value: '更新値' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(mockSave).toHaveBeenCalledWith('更新値');
    });

    test('Escapeキーでキャンセルできる', () => {
      const mockCancel = jest.fn();
      render(<InlineEdit value="テスト" onCancel={mockCancel} />);
      
      fireEvent.click(screen.getByText('テスト'));
      const input = screen.getByDisplayValue('テスト');
      fireEvent.change(input, { target: { value: '変更値' } });
      fireEvent.keyDown(input, { key: 'Escape' });
      
      expect(mockCancel).toHaveBeenCalled();
      expect(screen.getByText('テスト')).toBeInTheDocument();
    });

    test('キャンセルボタンで編集をキャンセルできる', () => {
      const mockCancel = jest.fn();
      render(<InlineEdit value="テスト" onCancel={mockCancel} />);
      
      fireEvent.click(screen.getByText('テスト'));
      const input = screen.getByDisplayValue('テスト');
      fireEvent.change(input, { target: { value: '変更値' } });
      fireEvent.click(screen.getByTitle('キャンセル'));
      
      expect(mockCancel).toHaveBeenCalled();
      expect(screen.getByText('テスト')).toBeInTheDocument();
    });
  });

  describe('フォーカス機能', () => {
    test('編集モードに入ると入力フィールドにフォーカスされる', async () => {
      render(<InlineEdit value="フォーカステスト" />);
      
      fireEvent.click(screen.getByText('フォーカステスト'));
      
      await waitFor(() => {
        const input = screen.getByDisplayValue('フォーカステスト');
        expect(input).toHaveFocus();
      });
    });
  });

  describe('型とプレースホルダー', () => {
    test('number型の入力フィールドが使用される', () => {
      render(<InlineEdit value="123" type="number" />);
      
      fireEvent.click(screen.getByText('123'));
      const input = screen.getByDisplayValue('123');
      expect(input).toHaveAttribute('type', 'number');
    });

    test('プレースホルダーが編集モードで適用される', () => {
      render(<InlineEdit value="" placeholder="数値を入力" />);
      
      fireEvent.click(screen.getByText('数値を入力'));
      const input = screen.getByPlaceholderText('数値を入力');
      expect(input).toBeInTheDocument();
    });
  });

  describe('カスタムクラス', () => {
    test('カスタムクラスが適用される', () => {
      render(<InlineEdit value="テスト" className="custom-inline-edit" />);
      
      const button = screen.getByText('テスト');
      expect(button).toHaveClass('custom-inline-edit');
    });

    test('無効化状態でもカスタムクラスが適用される', () => {
      render(<InlineEdit value="テスト" disabled className="custom-disabled" />);
      
      const span = screen.getByText('テスト');
      expect(span).toHaveClass('custom-disabled');
    });
  });

  describe('エッジケース', () => {
    test('onSaveが未定義でも保存時にエラーが発生しない', () => {
      render(<InlineEdit value="テスト" />);
      
      fireEvent.click(screen.getByText('テスト'));
      const input = screen.getByDisplayValue('テスト');
      
      expect(() => {
        fireEvent.keyDown(input, { key: 'Enter' });
      }).not.toThrow();
    });

    test('onCancelが未定義でもキャンセル時にエラーが発生しない', () => {
      render(<InlineEdit value="テスト" />);
      
      fireEvent.click(screen.getByText('テスト'));
      const input = screen.getByDisplayValue('テスト');
      
      expect(() => {
        fireEvent.keyDown(input, { key: 'Escape' });
      }).not.toThrow();
    });

    test('値が空文字の場合はプレースホルダーが表示される', () => {
      render(<InlineEdit value="" placeholder="空の値" />);
      expect(screen.getByText('空の値')).toBeInTheDocument();
    });
  });
});