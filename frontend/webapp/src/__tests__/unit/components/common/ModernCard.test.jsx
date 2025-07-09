/**
 * ModernCardコンポーネントのユニットテスト
 * 
 * テスト対象:
 * - 基本的なレンダリングとプロパティ
 * - hover、gradient、shadowプロパティの動作
 * - サブコンポーネント（Header, Title, Content, Footer, Value, Icon）
 * - 値のフォーマット機能（通貨、パーセンテージ、数値）
 * - 変化量の表示とカラーリング
 * - クリックイベントとカーソル
 * - アクセシビリティ
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ModernCard from '../../../../components/common/ModernCard';

describe('ModernCard', () => {
  describe('基本的なレンダリング', () => {
    test('childrenが正しくレンダリングされる', () => {
      render(
        <ModernCard>
          <p>Test content</p>
        </ModernCard>
      );
      
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    test('デフォルトのクラスが適用される', () => {
      const { container } = render(
        <ModernCard data-testid="modern-card">
          Content
        </ModernCard>
      );
      
      const card = container.firstChild;
      expect(card).toHaveClass('bg-white', 'backdrop-blur-sm', 'border', 'border-secondary-200/50');
      expect(card).toHaveClass('rounded-2xl', 'p-6', 'shadow-lg');
      expect(card).toHaveClass('hover:shadow-xl', 'hover:-translate-y-1');
      expect(card).toHaveClass('transition-all', 'duration-300', 'ease-out');
    });

    test('カスタムクラス名が追加される', () => {
      const { container } = render(
        <ModernCard className="custom-class">
          Content
        </ModernCard>
      );
      
      const card = container.firstChild;
      expect(card).toHaveClass('custom-class');
    });

    test('追加のpropsが正しく渡される', () => {
      render(
        <ModernCard data-testid="test-card" aria-label="Test card">
          Content
        </ModernCard>
      );
      
      const card = screen.getByTestId('test-card');
      expect(card).toHaveAttribute('aria-label', 'Test card');
    });
  });

  describe('hover プロパティ', () => {
    test('hover=true（デフォルト）でhoverクラスが適用される', () => {
      const { container } = render(
        <ModernCard>Content</ModernCard>
      );
      
      const card = container.firstChild;
      expect(card).toHaveClass('hover:shadow-xl', 'hover:-translate-y-1');
    });

    test('hover=falseでhoverクラスが適用されない', () => {
      const { container } = render(
        <ModernCard hover={false}>Content</ModernCard>
      );
      
      const card = container.firstChild;
      expect(card).not.toHaveClass('hover:shadow-xl', 'hover:-translate-y-1');
    });
  });

  describe('gradient プロパティ', () => {
    test('gradient=falseでグラデーションクラスが適用されない', () => {
      const { container } = render(
        <ModernCard gradient={false}>Content</ModernCard>
      );
      
      const card = container.firstChild;
      expect(card).not.toHaveClass('bg-gradient-to-br', 'from-white', 'to-secondary-50/50');
    });

    test('gradient=trueでグラデーションクラスが適用される', () => {
      const { container } = render(
        <ModernCard gradient={true}>Content</ModernCard>
      );
      
      const card = container.firstChild;
      expect(card).toHaveClass('bg-gradient-to-br', 'from-white', 'to-secondary-50/50');
    });
  });

  describe('カスタマイズプロパティ', () => {
    test('カスタムpadding', () => {
      const { container } = render(
        <ModernCard padding="p-4">Content</ModernCard>
      );
      
      const card = container.firstChild;
      expect(card).toHaveClass('p-4');
      expect(card).not.toHaveClass('p-6');
    });

    test('カスタムrounded', () => {
      const { container } = render(
        <ModernCard rounded="rounded-lg">Content</ModernCard>
      );
      
      const card = container.firstChild;
      expect(card).toHaveClass('rounded-lg');
      expect(card).not.toHaveClass('rounded-2xl');
    });

    test('shadow=falseでシャドウが適用されない', () => {
      const { container } = render(
        <ModernCard shadow={false}>Content</ModernCard>
      );
      
      const card = container.firstChild;
      expect(card).not.toHaveClass('shadow-lg');
    });
  });

  describe('クリック機能', () => {
    test('onClickが提供された場合、cursor-pointerクラスが適用される', () => {
      const handleClick = jest.fn();
      const { container } = render(
        <ModernCard onClick={handleClick}>Content</ModernCard>
      );
      
      const card = container.firstChild;
      expect(card).toHaveClass('cursor-pointer');
    });

    test('onClickが呼ばれる', () => {
      const handleClick = jest.fn();
      const { container } = render(
        <ModernCard onClick={handleClick}>Content</ModernCard>
      );
      
      const card = container.firstChild;
      fireEvent.click(card);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('onClickがない場合、cursor-pointerクラスが適用されない', () => {
      const { container } = render(
        <ModernCard>Content</ModernCard>
      );
      
      const card = container.firstChild;
      expect(card).not.toHaveClass('cursor-pointer');
    });
  });

  describe('ModernCard.Header サブコンポーネント', () => {
    test('基本的なレンダリング', () => {
      render(
        <ModernCard.Header>
          Header Content
        </ModernCard.Header>
      );
      
      const header = screen.getByText('Header Content');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('mb-4');
    });

    test('カスタムクラス名が追加される', () => {
      render(
        <ModernCard.Header className="custom-header">
          Header Content
        </ModernCard.Header>
      );
      
      const header = screen.getByText('Header Content');
      expect(header).toHaveClass('mb-4', 'custom-header');
    });
  });

  describe('ModernCard.Title サブコンポーネント', () => {
    test('基本的なレンダリング（デフォルトサイズ）', () => {
      render(
        <ModernCard.Title>
          Test Title
        </ModernCard.Title>
      );
      
      const title = screen.getByText('Test Title');
      expect(title).toBeInTheDocument();
      expect(title.tagName).toBe('H3');
      expect(title).toHaveClass('text-secondary-900', 'text-xl', 'font-bold');
    });

    test('sizeプロパティ: sm', () => {
      render(
        <ModernCard.Title size="sm">
          Small Title
        </ModernCard.Title>
      );
      
      const title = screen.getByText('Small Title');
      expect(title).toHaveClass('text-base', 'font-semibold');
    });

    test('sizeプロパティ: md', () => {
      render(
        <ModernCard.Title size="md">
          Medium Title
        </ModernCard.Title>
      );
      
      const title = screen.getByText('Medium Title');
      expect(title).toHaveClass('text-lg', 'font-semibold');
    });

    test('sizeプロパティ: xl', () => {
      render(
        <ModernCard.Title size="xl">
          Extra Large Title
        </ModernCard.Title>
      );
      
      const title = screen.getByText('Extra Large Title');
      expect(title).toHaveClass('text-2xl', 'font-bold');
    });

    test('カスタムクラス名が追加される', () => {
      render(
        <ModernCard.Title className="custom-title">
          Custom Title
        </ModernCard.Title>
      );
      
      const title = screen.getByText('Custom Title');
      expect(title).toHaveClass('custom-title');
    });
  });

  describe('ModernCard.Content サブコンポーネント', () => {
    test('基本的なレンダリング', () => {
      render(
        <ModernCard.Content>
          Test Content
        </ModernCard.Content>
      );
      
      const content = screen.getByText('Test Content');
      expect(content).toBeInTheDocument();
    });

    test('カスタムクラス名が追加される', () => {
      render(
        <ModernCard.Content className="custom-content">
          Custom Content
        </ModernCard.Content>
      );
      
      const content = screen.getByText('Custom Content');
      expect(content).toHaveClass('custom-content');
    });
  });

  describe('ModernCard.Footer サブコンポーネント', () => {
    test('基本的なレンダリング', () => {
      render(
        <ModernCard.Footer>
          Footer Content
        </ModernCard.Footer>
      );
      
      const footer = screen.getByText('Footer Content');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('mt-4', 'pt-4', 'border-t', 'border-secondary-200/50');
    });

    test('カスタムクラス名が追加される', () => {
      render(
        <ModernCard.Footer className="custom-footer">
          Custom Footer
        </ModernCard.Footer>
      );
      
      const footer = screen.getByText('Custom Footer');
      expect(footer).toHaveClass('mt-4', 'pt-4', 'border-t', 'border-secondary-200/50', 'custom-footer');
    });
  });

  describe('ModernCard.Value サブコンポーネント', () => {
    test('基本的な数値表示', () => {
      render(
        <ModernCard.Value 
          value={1000000}
          label="総額"
        />
      );
      
      expect(screen.getByText('1,000,000')).toBeInTheDocument();
      expect(screen.getByText('総額')).toBeInTheDocument();
    });

    test('通貨フォーマット', () => {
      render(
        <ModernCard.Value 
          value={1000000}
          format="currency"
          label="資産総額"
        />
      );
      
      expect(screen.getByText('¥1,000,000')).toBeInTheDocument();
      expect(screen.getByText('資産総額')).toBeInTheDocument();
    });

    test('パーセンテージフォーマット', () => {
      render(
        <ModernCard.Value 
          value={15.5}
          format="percentage"
          label="利回り"
        />
      );
      
      expect(screen.getByText('15.5%')).toBeInTheDocument();
      expect(screen.getByText('利回り')).toBeInTheDocument();
    });

    test('正の変化量表示（positive）', () => {
      render(
        <ModernCard.Value 
          value={1000000}
          change={50000}
          changeType="positive"
        />
      );
      
      const changeElement = screen.getByText(/\+50,000/);
      expect(changeElement).toBeInTheDocument();
      expect(changeElement).toHaveClass('text-success-600');
    });

    test('負の変化量表示（negative）', () => {
      render(
        <ModernCard.Value 
          value={1000000}
          change={-30000}
          changeType="negative"
        />
      );
      
      const changeElement = screen.getByText(/-30,000/);
      expect(changeElement).toBeInTheDocument();
      expect(changeElement).toHaveClass('text-danger-600');
    });

    test('中立の変化量表示（neutral）', () => {
      render(
        <ModernCard.Value 
          value={1000000}
          change={0}
          changeType="neutral"
        />
      );
      
      const changeElement = screen.getByText(/0/);
      expect(changeElement).toBeInTheDocument();
      expect(changeElement).toHaveClass('text-secondary-500');
    });

    test('通貨フォーマットの変化量', () => {
      render(
        <ModernCard.Value 
          value={1000000}
          change={50000}
          changeType="positive"
          format="currency"
        />
      );
      
      expect(screen.getByText('¥1,000,000')).toBeInTheDocument();
      expect(screen.getByText(/\+¥50,000/)).toBeInTheDocument();
    });

    test('パーセンテージフォーマットの変化量', () => {
      render(
        <ModernCard.Value 
          value={15.5}
          change={2.5}
          changeType="positive"
          format="percentage"
        />
      );
      
      expect(screen.getByText('15.5%')).toBeInTheDocument();
      expect(screen.getByText(/\+2.5%/)).toBeInTheDocument();
    });

    test('labelがない場合', () => {
      render(
        <ModernCard.Value value={1000000} />
      );
      
      expect(screen.getByText('1,000,000')).toBeInTheDocument();
      expect(screen.queryByText('総額')).not.toBeInTheDocument();
    });

    test('changeがundefinedの場合', () => {
      render(
        <ModernCard.Value value={1000000} label="総額" />
      );
      
      expect(screen.getByText('1,000,000')).toBeInTheDocument();
      expect(screen.getByText('総額')).toBeInTheDocument();
      expect(screen.queryByText(/\+/)).not.toBeInTheDocument();
    });

    test('カスタムクラス名が追加される', () => {
      render(
        <ModernCard.Value 
          value={1000000}
          className="custom-value"
        />
      );
      
      const valueContainer = screen.getByText('1,000,000').closest('div');
      expect(valueContainer).toHaveClass('custom-value');
    });
  });

  describe('ModernCard.Icon サブコンポーネント', () => {
    test('基本的なアイコン表示', () => {
      render(
        <ModernCard.Icon icon={<span>🔥</span>} />
      );
      
      expect(screen.getByText('🔥')).toBeInTheDocument();
    });

    test('デフォルトカラー（primary）', () => {
      const { container } = render(
        <ModernCard.Icon icon={<span>🔥</span>} />
      );
      
      expect(container.firstChild).toHaveClass('text-primary-600');
    });

    test('カスタムカラー', () => {
      const { container } = render(
        <ModernCard.Icon icon={<span>🔥</span>} color="success" />
      );
      
      expect(container.firstChild).toHaveClass('text-success-600');
    });

    test('全てのカラーオプション', () => {
      const colors = ['primary', 'secondary', 'success', 'warning', 'danger'];
      const expectedClasses = [
        'text-primary-600',
        'text-secondary-600', 
        'text-success-600',
        'text-warning-600',
        'text-danger-600'
      ];

      colors.forEach((color, index) => {
        const { container, unmount } = render(
          <ModernCard.Icon icon={<span>{color}</span>} color={color} />
        );
        
        expect(container.firstChild).toHaveClass(expectedClasses[index]);
        unmount();
      });
    });

    test('カスタムクラス名が追加される', () => {
      const { container } = render(
        <ModernCard.Icon 
          icon={<span>🔥</span>}
          className="custom-icon"
        />
      );
      
      expect(container.firstChild).toHaveClass('text-primary-600', 'custom-icon');
    });
  });

  describe('統合テスト', () => {
    test('完全なカード構造のレンダリング', () => {
      render(
        <ModernCard 
          gradient={true}
          hover={true}
          onClick={() => {}}
          data-testid="complete-card"
        >
          <ModernCard.Header>
            <ModernCard.Title size="xl">
              ポートフォリオサマリー
            </ModernCard.Title>
          </ModernCard.Header>
          <ModernCard.Content>
            <ModernCard.Value 
              value={1000000}
              label="総資産"
              change={50000}
              changeType="positive"
              format="currency"
            />
          </ModernCard.Content>
          <ModernCard.Footer>
            <ModernCard.Icon icon={<span>📊</span>} color="primary" />
          </ModernCard.Footer>
        </ModernCard>
      );
      
      // カード本体の確認
      const card = screen.getByTestId('complete-card');
      expect(card).toHaveClass('bg-gradient-to-br', 'cursor-pointer');
      
      // サブコンポーネントの確認
      expect(screen.getByText('ポートフォリオサマリー')).toBeInTheDocument();
      expect(screen.getByText('¥1,000,000')).toBeInTheDocument();
      expect(screen.getByText('総資産')).toBeInTheDocument();
      expect(screen.getByText(/\+¥50,000/)).toBeInTheDocument();
      expect(screen.getByText('📊')).toBeInTheDocument();
    });
  });

  describe('エッジケース', () => {
    test('nullまたはundefinedの値でもエラーにならない', () => {
      expect(() => {
        render(<ModernCard.Value value={null} />);
      }).not.toThrow();
      
      expect(() => {
        render(<ModernCard.Value value={undefined} />);
      }).not.toThrow();
    });

    test('0の値が正しく表示される', () => {
      render(
        <ModernCard.Value value={0} format="currency" />
      );
      
      expect(screen.getByText('¥0')).toBeInTheDocument();
    });

    test('未知のフォーマットタイプ', () => {
      render(
        <ModernCard.Value value={1000} format="unknown" />
      );
      
      expect(screen.getByText('1,000')).toBeInTheDocument();
    });

    test('未知のアイコンカラー', () => {
      const { container } = render(
        <ModernCard.Icon icon={<span>🔥</span>} color="unknown" />
      );
      
      // 未知のカラーの場合、対応するクラスが適用されない
      expect(container.firstChild).not.toHaveClass('text-unknown-600');
    });
  });
});