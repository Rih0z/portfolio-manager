/**
 * CopyToClipboard smoke render tests
 *
 * コピー機能コンポーネントの基本レンダリングを検証する。
 * @file src/__tests__/unit/components/ai/CopyToClipboard.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// --- Mock dependencies ---
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ja' },
  }),
}));

vi.mock('../../../../lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

import CopyToClipboard from '../../../../components/ai/CopyToClipboard';

describe('CopyToClipboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render in button mode by default', () => {
    render(<CopyToClipboard text="test text" />);
    expect(screen.getByTestId('copy-to-clipboard')).toBeInTheDocument();
    expect(screen.getByText('コピー')).toBeInTheDocument();
  });

  it('should render in icon mode', () => {
    render(<CopyToClipboard text="test text" mode="icon" />);
    expect(screen.getByTestId('copy-to-clipboard')).toBeInTheDocument();
    expect(screen.queryByText('コピー')).not.toBeInTheDocument();
  });
});
