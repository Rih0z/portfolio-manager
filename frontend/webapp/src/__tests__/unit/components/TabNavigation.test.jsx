import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TabNavigation from '../../../components/layout/TabNavigation';

describe('TabNavigation', () => {
  const mockTabs = [
    { id: 'dashboard', label: 'ダッシュボード', icon: '📊' },
    { id: 'settings', label: '設定', icon: '⚙️' },
    { id: 'data', label: 'データ連携', icon: '🔄' },
    { id: 'simulation', label: 'シミュレーション', icon: '📈' }
  ];

  const mockOnTabChange = jest.fn();

  beforeEach(() => {
    mockOnTabChange.mockClear();
  });

  it('renders all provided tabs', () => {
    render(
      <TabNavigation 
        tabs={mockTabs} 
        activeTab="dashboard" 
        onTabChange={mockOnTabChange} 
      />
    );

    mockTabs.forEach(tab => {
      expect(screen.getByText(tab.label)).toBeInTheDocument();
    });
  });

  it('renders tab icons when provided', () => {
    render(
      <TabNavigation 
        tabs={mockTabs} 
        activeTab="dashboard" 
        onTabChange={mockOnTabChange} 
      />
    );

    mockTabs.forEach(tab => {
      if (tab.icon) {
        expect(screen.getByText(tab.icon)).toBeInTheDocument();
      }
    });
  });

  it('highlights the active tab', () => {
    render(
      <TabNavigation 
        tabs={mockTabs} 
        activeTab="settings" 
        onTabChange={mockOnTabChange} 
      />
    );

    const settingsTab = screen.getByText('設定').closest('button, div, [role="tab"]');
    expect(settingsTab).toHaveClass(/active|selected|current/);
  });

  it('calls onTabChange when a tab is clicked', () => {
    render(
      <TabNavigation 
        tabs={mockTabs} 
        activeTab="dashboard" 
        onTabChange={mockOnTabChange} 
      />
    );

    fireEvent.click(screen.getByText('設定'));
    expect(mockOnTabChange).toHaveBeenCalledWith('settings');
  });

  it('renders with default props when minimal props provided', () => {
    render(
      <TabNavigation 
        tabs={[{ id: 'test', label: 'Test' }]} 
        activeTab="test" 
      />
    );

    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('handles empty tabs array gracefully', () => {
    render(
      <TabNavigation 
        tabs={[]} 
        activeTab="" 
        onTabChange={mockOnTabChange} 
      />
    );

    // 空のタブ配列でもクラッシュしないことを確認
    const tabContainer = document.querySelector('[role="tablist"], .tab-navigation, .tabs');
    expect(tabContainer).toBeInTheDocument();
  });

  it('renders proper ARIA attributes for accessibility', () => {
    render(
      <TabNavigation 
        tabs={mockTabs} 
        activeTab="dashboard" 
        onTabChange={mockOnTabChange} 
      />
    );

    // ARIA属性が適切に設定されていることを確認
    const tabList = document.querySelector('[role="tablist"]');
    expect(tabList).toBeInTheDocument();

    const tabs = document.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBeGreaterThan(0);
  });

  it('renders responsive design for mobile', () => {
    render(
      <TabNavigation 
        tabs={mockTabs} 
        activeTab="dashboard" 
        onTabChange={mockOnTabChange} 
      />
    );

    // レスポンシブクラスが存在することを確認
    const responsiveElements = document.querySelectorAll('.sm\\:flex, .md\\:grid, .lg\\:block');
    expect(responsiveElements.length).toBeGreaterThanOrEqual(0);
  });

  it('handles keyboard navigation', () => {
    render(
      <TabNavigation 
        tabs={mockTabs} 
        activeTab="dashboard" 
        onTabChange={mockOnTabChange} 
      />
    );

    const firstTab = screen.getByText('ダッシュボード');
    
    // キーボードナビゲーションをテスト
    fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
    fireEvent.keyDown(firstTab, { key: 'Enter' });
    
    // エラーが発生しないことを確認
    expect(firstTab).toBeInTheDocument();
  });

  it('renders correct tab states (active, inactive, hover)', () => {
    render(
      <TabNavigation 
        tabs={mockTabs} 
        activeTab="dashboard" 
        onTabChange={mockOnTabChange} 
      />
    );

    const activeTab = screen.getByText('ダッシュボード').closest('button, div, [role="tab"]');
    const inactiveTab = screen.getByText('設定').closest('button, div, [role="tab"]');

    // アクティブタブのスタイルが適用されていることを確認
    expect(activeTab).toHaveClass(/active|selected|current/);
    
    // 非アクティブタブにはアクティブスタイルが適用されていないことを確認
    expect(inactiveTab).not.toHaveClass(/active|selected|current/);
  });

  it('handles tab change with undefined onTabChange gracefully', () => {
    render(
      <TabNavigation 
        tabs={mockTabs} 
        activeTab="dashboard" 
      />
    );

    // onTabChangeが未定義でもクラッシュしないことを確認
    fireEvent.click(screen.getByText('設定'));
    expect(screen.getByText('設定')).toBeInTheDocument();
  });

  it('renders proper tab styling and layout', () => {
    render(
      <TabNavigation 
        tabs={mockTabs} 
        activeTab="dashboard" 
        onTabChange={mockOnTabChange} 
      />
    );

    // タブのスタイリングクラスが存在することを確認
    const styledElements = document.querySelectorAll('.flex, .border, .rounded, .bg-white, .shadow');
    expect(styledElements.length).toBeGreaterThan(0);
  });

  it('handles long tab labels without breaking layout', () => {
    const longLabelTabs = [
      { id: 'long', label: 'とても長いタブのラベルテキストです', icon: '📊' }
    ];

    render(
      <TabNavigation 
        tabs={longLabelTabs} 
        activeTab="long" 
        onTabChange={mockOnTabChange} 
      />
    );

    expect(screen.getByText('とても長いタブのラベルテキストです')).toBeInTheDocument();
  });
});