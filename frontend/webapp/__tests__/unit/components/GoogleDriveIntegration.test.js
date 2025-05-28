import React from 'react';
import { render, screen } from '@testing-library/react';
import GoogleDriveIntegration from '@/components/data/GoogleDriveIntegration';

jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('@/hooks/useGoogleDrive', () => ({ useGoogleDrive: jest.fn() }));
jest.mock('@/hooks/usePortfolioContext', () => ({ usePortfolioContext: jest.fn() }));

const { useAuth } = require('@/hooks/useAuth');
const { useGoogleDrive } = require('@/hooks/useGoogleDrive');
const { usePortfolioContext } = require('@/hooks/usePortfolioContext');

describe('GoogleDriveIntegration', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('prompts login when unauthenticated', () => {
    useAuth.mockReturnValue({ isAuthenticated: false });
    useGoogleDrive.mockReturnValue({});
    usePortfolioContext.mockReturnValue({});

    render(<GoogleDriveIntegration />);
    expect(
      screen.getByText('Google Driveと連携するにはログインしてください。')
    ).toBeInTheDocument();
  });
});
