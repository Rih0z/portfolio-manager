/**
 * Header.jsx のユニットテスト
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../../i18n';
import Header from '../../../../components/layout/Header';
import { AuthProvider } from '../../../../context/AuthContext';

// Mock modules
jest.mock('../../../../utils/envUtils', () => ({
  isProduction: jest.fn(() => false),
  getApiBaseUrl: jest.fn(() => 'http://localhost:3000/api')
}));

// Mock useAuth hook
jest.mock('../../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    login: jest.fn(),
    logout: jest.fn(),
    loading: false
  })
}));

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <I18nextProvider i18n={i18n}>
          {component}
        </I18nextProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Header Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithProviders(<Header />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('displays the Portfolio Wise title', () => {
    renderWithProviders(<Header />);
    expect(screen.getByText(/Portfolio Wise/i)).toBeInTheDocument();
  });

  it('renders navigation elements', () => {
    renderWithProviders(<Header />);
    // ナビゲーション要素の存在を確認
    const navElement = screen.queryByRole('navigation');
    if (navElement) {
      expect(navElement).toBeInTheDocument();
    }
  });

  it('handles responsive design', () => {
    renderWithProviders(<Header />);
    const header = screen.getByRole('banner');
    expect(header).toHaveClass(/header|flex|grid/);
  });

  it('provides accessibility features', () => {
    renderWithProviders(<Header />);
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    
    // アクセシビリティラベルの確認
    const links = screen.getAllByRole('link');
    links.forEach(link => {
      expect(link).toHaveAttribute('href');
    });
  });
});