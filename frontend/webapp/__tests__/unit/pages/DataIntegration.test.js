import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

jest.mock('@/components/data/ExportOptions', () => () => <div>ExportOptions</div>);
jest.mock('@/components/data/ImportOptions', () => () => <div>ImportOptions</div>);
jest.mock('@/components/data/GoogleDriveIntegration', () => () => <div>GoogleDriveIntegration</div>);

const { useAuth } = require('@/hooks/useAuth');

import DataIntegration from '@/pages/DataIntegration';

describe('DataIntegration page', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows GoogleDriveIntegration when authenticated', () => {
    useAuth.mockReturnValue({ isAuthenticated: true });

    render(<DataIntegration />);

    expect(screen.getByText('GoogleDriveIntegration')).toBeInTheDocument();
  });

  it('shows login prompt when not authenticated', () => {
    useAuth.mockReturnValue({ isAuthenticated: false });

    render(<DataIntegration />);

    expect(screen.queryByText('GoogleDriveIntegration')).not.toBeInTheDocument();
    expect(
      screen.getByText('Google ドライブ連携')
    ).toBeInTheDocument();
  });
});
