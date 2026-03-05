import React from 'react';
import { render, screen } from '@testing-library/react';
import GoogleDriveIntegration from '@/components/data/GoogleDriveIntegration';

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('@/hooks/useGoogleDrive', () => ({ useGoogleDrive: vi.fn() }));
vi.mock('@/hooks/usePortfolioContext', () => ({ usePortfolioContext: vi.fn() }));

const { useAuth } = require('@/hooks/useAuth');
const { useGoogleDrive } = require('@/hooks/useGoogleDrive');
const { usePortfolioContext } = require('@/hooks/usePortfolioContext');

describe('GoogleDriveIntegration', () => {
  afterEach(() => {
    vi.clearAllMocks();
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
