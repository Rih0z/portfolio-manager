import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import TabNavigation from '@/components/layout/TabNavigation';

describe('TabNavigation', () => {
  it('renders navigation links', () => {
    render(
      <MemoryRouter>
        <TabNavigation />
      </MemoryRouter>
    );
    expect(screen.getByText('ホーム')).toBeInTheDocument();
    expect(screen.getByText('設定')).toBeInTheDocument();
    expect(screen.getByText('シミュレーション')).toBeInTheDocument();
    expect(screen.getByText('データ')).toBeInTheDocument();
  });
});
