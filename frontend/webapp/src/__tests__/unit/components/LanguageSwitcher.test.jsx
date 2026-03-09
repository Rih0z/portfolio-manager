import { vi } from "vitest";
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LanguageSwitcher from '../../../components/common/LanguageSwitcher';

// changeLanguageのモック関数を先に定義
const mockChangeLanguage = vi.fn().mockResolvedValue(undefined);

// Mock i18n hooks
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      language: 'ja',
      changeLanguage: mockChangeLanguage
    }
  })
}));

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders language switcher with main button', () => {
    render(<LanguageSwitcher />);

    const buttons = screen.getAllByRole('button');
    // メインボタン + 2つの言語オプション = 3つ以上
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  it('displays current language (日本語)', () => {
    render(<LanguageSwitcher />);

    const japaneseTexts = screen.getAllByText(/日本語/);
    expect(japaneseTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('shows both language options', () => {
    render(<LanguageSwitcher />);

    expect(screen.getByText(/English/)).toBeInTheDocument();
    expect(screen.getAllByText(/日本語/).length).toBeGreaterThanOrEqual(1);
  });

  it('calls changeLanguage with "en" when English is selected', () => {
    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByText(/English/));

    expect(mockChangeLanguage).toHaveBeenCalledWith('en');
  });

  it('calls changeLanguage with "ja" when 日本語 is selected', () => {
    render(<LanguageSwitcher />);

    const japaneseTexts = screen.getAllByText(/日本語/);
    fireEvent.click(japaneseTexts[japaneseTexts.length - 1]);

    expect(mockChangeLanguage).toHaveBeenCalledWith('ja');
  });

  it('renders dropdown menu', () => {
    render(<LanguageSwitcher />);

    const dropdown = document.querySelector('.absolute');
    expect(dropdown).toBeInTheDocument();
  });

  it('renders flag emojis for each language', () => {
    render(<LanguageSwitcher />);

    const japanFlags = screen.getAllByText('🇯🇵');
    const usFlags = screen.getAllByText('🇺🇸');
    expect(japanFlags.length).toBeGreaterThanOrEqual(1);
    expect(usFlags.length).toBeGreaterThanOrEqual(1);
  });

  it('marks current language with checkmark indicator', () => {
    render(<LanguageSwitcher />);

    // 日本語が選択中なので、日本語ボタンにはbg-blue-50クラスがある
    const buttons = screen.getAllByRole('button');
    const jaButton = buttons.find(btn => btn.textContent?.includes('日本語') && btn.classList.contains('bg-blue-50'));
    expect(jaButton).toBeTruthy();
  });

  it('handles rapid language switching without crash', () => {
    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByText(/English/));
    const japaneseTexts = screen.getAllByText(/日本語/);
    fireEvent.click(japaneseTexts[japaneseTexts.length - 1]);

    expect(mockChangeLanguage).toHaveBeenCalledTimes(2);
    expect(mockChangeLanguage).toHaveBeenCalledWith('en');
    expect(mockChangeLanguage).toHaveBeenCalledWith('ja');
  });
});
