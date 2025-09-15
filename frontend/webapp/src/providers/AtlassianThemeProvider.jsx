/**
 * Atlassianテーマプロバイダー
 * CLAUDE.md第8条準拠: https://atlassian.design/components準拠
 * 
 * アプリケーション全体にAtlassianデザインシステムのテーマを提供
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

// Atlassianテーマコンテキスト
const AtlassianThemeContext = createContext();

/**
 * Atlassianテーマプロバイダーコンポーネント
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - 子コンポーネント
 * @param {'light'|'dark'} props.defaultTheme - デフォルトテーマ
 */
export const AtlassianThemeProvider = ({ 
  children, 
  defaultTheme = 'light' 
}) => {
  const [theme, setTheme] = useState(defaultTheme);
  const [colorMode, setColorMode] = useState('light');

  // システムテーマの検出
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (theme === 'system') {
        setColorMode(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    
    // 初期設定
    if (theme === 'system') {
      setColorMode(mediaQuery.matches ? 'dark' : 'light');
    } else {
      setColorMode(theme);
    }

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // テーマ変更処理
  const changeTheme = (newTheme) => {
    setTheme(newTheme);
    
    if (newTheme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setColorMode(mediaQuery.matches ? 'dark' : 'light');
    } else {
      setColorMode(newTheme);
    }
    
    // ローカルストレージに保存
    localStorage.setItem('atlassian-theme', newTheme);
  };

  // HTMLクラスの管理
  useEffect(() => {
    const root = document.documentElement;
    
    // 既存のテーマクラスをクリア
    root.classList.remove('light', 'dark');
    
    // 新しいテーマクラスを追加
    root.classList.add(colorMode);
    
    // Atlassianデザインシステム用のカスタムプロパティ設定
    if (colorMode === 'dark') {
      root.style.setProperty('--atlassian-surface', '#1D2125');
      root.style.setProperty('--atlassian-surface-overlay', '#22272B');
      root.style.setProperty('--atlassian-text', '#B6C2CF');
      root.style.setProperty('--atlassian-text-subtle', '#9FADBC');
    } else {
      root.style.setProperty('--atlassian-surface', '#FFFFFF');
      root.style.setProperty('--atlassian-surface-overlay', '#FAFBFC');
      root.style.setProperty('--atlassian-text', '#172B4D');
      root.style.setProperty('--atlassian-text-subtle', '#6B778C');
    }
  }, [colorMode]);

  // テーマ初期化（ローカルストレージから復元）
  useEffect(() => {
    const savedTheme = localStorage.getItem('atlassian-theme');
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme);
    }
  }, []);

  // Atlassianデザイントークン
  const tokens = {
    // カラートークン
    color: {
      text: {
        primary: colorMode === 'dark' ? '#B6C2CF' : '#172B4D',
        secondary: colorMode === 'dark' ? '#9FADBC' : '#6B778C',
        disabled: colorMode === 'dark' ? '#738496' : '#A5ADBA',
        inverse: colorMode === 'dark' ? '#1D2125' : '#FFFFFF',
      },
      background: {
        default: colorMode === 'dark' ? '#1D2125' : '#FFFFFF',
        subtle: colorMode === 'dark' ? '#22272B' : '#FAFBFC',
        card: colorMode === 'dark' ? '#282E33' : '#FFFFFF',
      },
      border: {
        default: colorMode === 'dark' ? '#374151' : '#DFE1E6',
        subtle: colorMode === 'dark' ? '#2D3748' : '#EBECF0',
      },
      // ブランドカラー
      brand: {
        primary: '#0052CC',
        secondary: '#0747A6',
      },
      // セマンティックカラー
      semantic: {
        success: '#36B37E',
        warning: '#FFAB00',
        danger: '#FF5630',
        info: '#00B8D9',
      }
    },
    
    // スペーシングトークン
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px',
      xxl: '32px',
    },
    
    // タイポグラフィトークン
    typography: {
      fontSize: {
        small: '12px',
        medium: '14px',
        large: '16px',
        xlarge: '20px',
        xxlarge: '24px',
      },
      lineHeight: {
        small: '16px',
        medium: '20px',
        large: '24px',
        xlarge: '28px',
        xxlarge: '32px',
      },
      fontWeight: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      }
    },
    
    // 境界線の丸み
    borderRadius: {
      small: '3px',
      medium: '6px',
      large: '12px',
    },
    
    // シャドウ
    shadow: {
      card: colorMode === 'dark' 
        ? '0 1px 3px rgba(0, 0, 0, 0.5)' 
        : '0 1px 3px rgba(9, 30, 66, 0.25)',
      overlay: colorMode === 'dark'
        ? '0 8px 16px rgba(0, 0, 0, 0.6)'
        : '0 8px 16px rgba(9, 30, 66, 0.25)',
    }
  };

  const contextValue = {
    theme,
    colorMode,
    changeTheme,
    tokens,
    // ユーティリティ関数
    isDark: colorMode === 'dark',
    isLight: colorMode === 'light',
  };

  return (
    <AtlassianThemeContext.Provider value={contextValue}>
      <div 
        className={`atlassian-theme-root ${colorMode}`}
        data-theme={theme}
        data-color-mode={colorMode}
      >
        {children}
      </div>
    </AtlassianThemeContext.Provider>
  );
};

/**
 * Atlassianテーマコンテキストを使用するカスタムフック
 * 
 * @returns {Object} テーマ関連の状態と関数
 */
export const useAtlassianTheme = () => {
  const context = useContext(AtlassianThemeContext);
  
  if (!context) {
    throw new Error('useAtlassianTheme must be used within AtlassianThemeProvider');
  }
  
  return context;
};

/**
 * デザイントークンにアクセスするカスタムフック
 * 
 * @returns {Object} Atlassianデザイントークン
 */
export const useAtlassianTokens = () => {
  const { tokens } = useAtlassianTheme();
  return tokens;
};

export default AtlassianThemeProvider;