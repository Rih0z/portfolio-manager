/**
 * DarkCardコンポーネントのユニットテスト
 * 
 * テスト対象:
 * - 基本的なレンダリング
 * - 全てのvariant（default, elevated, minimal, accent, success, warning, danger）
 * - glow、hoverプロパティ
 * - サブコンポーネント（Title, Content, Footer, Header）
 * - propsの渡し方とクラス名の結合
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DarkCard from '../../../../components/common/DarkCard';

describe('DarkCard', () => {
  describe('基本的なレンダリング', () => {
    test('childrenが正しくレンダリングされる', () => {
      render(
        <DarkCard>
          <p>Test content</p>
        </DarkCard>
      );
      
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    test('デフォルトクラスが適用される', () => {
      render(
        <DarkCard data-testid="dark-card">
          Content
        </DarkCard>
      );
      
      const card = screen.getByTestId('dark-card');
      expect(card).toHaveClass('bg-dark-200', 'border', 'border-dark-400', 'shadow-medium');
      expect(card).toHaveClass('rounded-2xl', 'p-4', 'sm:p-6');
    });

    test('カスタムクラス名が追加される', () => {
      render(
        <DarkCard className="custom-class" data-testid="dark-card">
          Content
        </DarkCard>
      );
      
      const card = screen.getByTestId('dark-card');
      expect(card).toHaveClass('custom-class');
    });

    test('追加のpropsが正しく渡される', () => {
      render(
        <DarkCard data-testid="dark-card" role="article" aria-label="Test card">
          Content
        </DarkCard>
      );
      
      const card = screen.getByTestId('dark-card');
      expect(card).toHaveAttribute('role', 'article');
      expect(card).toHaveAttribute('aria-label', 'Test card');
    });
  });

  describe('variant プロパティ', () => {
    test('elevated variant', () => {
      render(
        <DarkCard variant="elevated" data-testid="dark-card">
          Content
        </DarkCard>
      );
      
      const card = screen.getByTestId('dark-card');
      expect(card).toHaveClass('bg-dark-200', 'border', 'border-dark-400', 'shadow-large');
    });

    test('minimal variant', () => {
      render(
        <DarkCard variant="minimal" data-testid="dark-card">
          Content
        </DarkCard>
      );
      
      const card = screen.getByTestId('dark-card');
      expect(card).toHaveClass('bg-dark-300/50', 'border', 'border-dark-500');
    });

    test('accent variant', () => {
      render(
        <DarkCard variant="accent" data-testid="dark-card">
          Content
        </DarkCard>
      );
      
      const card = screen.getByTestId('dark-card');
      expect(card).toHaveClass('bg-gradient-to-br', 'from-dark-200', 'to-dark-300', 'border', 'border-primary-500/30');
    });

    test('success variant', () => {
      render(
        <DarkCard variant="success" data-testid="dark-card">
          Content
        </DarkCard>
      );
      
      const card = screen.getByTestId('dark-card');
      expect(card).toHaveClass('bg-dark-200', 'border', 'border-success-500/30', 'shadow-lg', 'shadow-success-500/10');
    });

    test('warning variant', () => {
      render(
        <DarkCard variant="warning" data-testid="dark-card">
          Content
        </DarkCard>
      );
      
      const card = screen.getByTestId('dark-card');
      expect(card).toHaveClass('bg-dark-200', 'border', 'border-warning-500/30', 'shadow-lg', 'shadow-warning-500/10');
    });

    test('danger variant', () => {
      render(
        <DarkCard variant="danger" data-testid="dark-card">
          Content
        </DarkCard>
      );
      
      const card = screen.getByTestId('dark-card');
      expect(card).toHaveClass('bg-dark-200', 'border', 'border-danger-500/30', 'shadow-lg', 'shadow-danger-500/10');
    });

    test('未知のvariantはdefaultにフォールバック', () => {
      render(
        <DarkCard variant="unknown" data-testid="dark-card">
          Content
        </DarkCard>
      );
      
      const card = screen.getByTestId('dark-card');
      expect(card).toHaveClass('bg-dark-200', 'border', 'border-dark-400', 'shadow-medium');
    });
  });

  describe('glow と hover プロパティ', () => {
    test('glow=trueの場合、shadow-glowクラスが追加される', () => {
      render(
        <DarkCard glow={true} data-testid="dark-card">
          Content
        </DarkCard>
      );
      
      const card = screen.getByTestId('dark-card');
      expect(card).toHaveClass('shadow-glow');
    });

    test('glow=falseの場合、shadow-glowクラスが追加されない', () => {
      render(
        <DarkCard glow={false} data-testid="dark-card">
          Content
        </DarkCard>
      );
      
      const card = screen.getByTestId('dark-card');
      expect(card).not.toHaveClass('shadow-glow');
    });

    test('hoverのデフォルト（true）でhoverクラスが追加される', () => {
      render(
        <DarkCard data-testid="dark-card">
          Content
        </DarkCard>
      );
      
      const card = screen.getByTestId('dark-card');
      expect(card).toHaveClass('hover:shadow-large', 'hover:border-dark-300', 'transition-all', 'duration-300');
    });

    test('hover=falseの場合、hoverクラスが追加されない', () => {
      render(
        <DarkCard hover={false} data-testid="dark-card">
          Content
        </DarkCard>
      );
      
      const card = screen.getByTestId('dark-card');
      expect(card).not.toHaveClass('hover:shadow-large', 'hover:border-dark-300', 'transition-all', 'duration-300');
    });
  });

  describe('DarkCard.Title サブコンポーネント', () => {
    test('基本的なレンダリング', () => {
      render(
        <DarkCard.Title>
          Test Title
        </DarkCard.Title>
      );
      
      const title = screen.getByText('Test Title');
      expect(title).toBeInTheDocument();
      expect(title.tagName).toBe('H3');
      expect(title).toHaveClass('text-gray-100', 'text-lg', 'font-bold');
    });

    test('sizeプロパティ: sm', () => {
      render(
        <DarkCard.Title size="sm">
          Small Title
        </DarkCard.Title>
      );
      
      const title = screen.getByText('Small Title');
      expect(title).toHaveClass('text-sm', 'font-semibold');
    });

    test('sizeプロパティ: md', () => {
      render(
        <DarkCard.Title size="md">
          Medium Title
        </DarkCard.Title>
      );
      
      const title = screen.getByText('Medium Title');
      expect(title).toHaveClass('text-base', 'font-semibold');
    });

    test('sizeプロパティ: xl', () => {
      render(
        <DarkCard.Title size="xl">
          Extra Large Title
        </DarkCard.Title>
      );
      
      const title = screen.getByText('Extra Large Title');
      expect(title).toHaveClass('text-xl', 'font-bold');
    });

    test('sizeプロパティ: 2xl', () => {
      render(
        <DarkCard.Title size="2xl">
          2XL Title
        </DarkCard.Title>
      );
      
      const title = screen.getByText('2XL Title');
      expect(title).toHaveClass('text-2xl', 'font-bold');
    });

    test('カスタムクラス名が追加される', () => {
      render(
        <DarkCard.Title className="custom-title-class">
          Custom Title
        </DarkCard.Title>
      );
      
      const title = screen.getByText('Custom Title');
      expect(title).toHaveClass('custom-title-class');
    });
  });

  describe('DarkCard.Content サブコンポーネント', () => {
    test('基本的なレンダリング', () => {
      render(
        <DarkCard.Content>
          Test Content
        </DarkCard.Content>
      );
      
      const content = screen.getByText('Test Content');
      expect(content).toBeInTheDocument();
      expect(content).toHaveClass('text-gray-300');
    });

    test('カスタムクラス名が追加される', () => {
      render(
        <DarkCard.Content className="custom-content-class">
          Custom Content
        </DarkCard.Content>
      );
      
      const content = screen.getByText('Custom Content');
      expect(content).toHaveClass('text-gray-300', 'custom-content-class');
    });
  });

  describe('DarkCard.Footer サブコンポーネント', () => {
    test('基本的なレンダリング', () => {
      render(
        <DarkCard.Footer>
          Test Footer
        </DarkCard.Footer>
      );
      
      const footer = screen.getByText('Test Footer');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('pt-4', 'border-t', 'border-dark-400');
    });

    test('カスタムクラス名が追加される', () => {
      render(
        <DarkCard.Footer className="custom-footer-class">
          Custom Footer
        </DarkCard.Footer>
      );
      
      const footer = screen.getByText('Custom Footer');
      expect(footer).toHaveClass('pt-4', 'border-t', 'border-dark-400', 'custom-footer-class');
    });
  });

  describe('DarkCard.Header サブコンポーネント', () => {
    test('基本的なレンダリング', () => {
      render(
        <DarkCard.Header>
          Test Header
        </DarkCard.Header>
      );
      
      const header = screen.getByText('Test Header');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('pb-4', 'border-b', 'border-dark-400', 'mb-4');
    });

    test('カスタムクラス名が追加される', () => {
      render(
        <DarkCard.Header className="custom-header-class">
          Custom Header
        </DarkCard.Header>
      );
      
      const header = screen.getByText('Custom Header');
      expect(header).toHaveClass('pb-4', 'border-b', 'border-dark-400', 'mb-4', 'custom-header-class');
    });
  });

  describe('統合テスト', () => {
    test('完全なカード構造のレンダリング', () => {
      render(
        <DarkCard variant="accent" glow={true} data-testid="full-card">
          <DarkCard.Header>
            <DarkCard.Title size="xl">Card Title</DarkCard.Title>
          </DarkCard.Header>
          <DarkCard.Content>
            This is the card content
          </DarkCard.Content>
          <DarkCard.Footer>
            <button>Action Button</button>
          </DarkCard.Footer>
        </DarkCard>
      );
      
      // カード本体の確認
      const card = screen.getByTestId('full-card');
      expect(card).toHaveClass('bg-gradient-to-br', 'from-dark-200', 'to-dark-300');
      expect(card).toHaveClass('shadow-glow');
      
      // サブコンポーネントの確認
      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('This is the card content')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument();
    });
  });
});