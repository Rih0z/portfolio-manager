/**
 * Atlassian Design Tokens
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/tokens/atlassian-tokens.js
 * 
 * 作成者: Koki Riho (https://github.com/Rih0z)
 * 作成日: 2025-08-22 09:45:00
 * 
 * 説明:
 * Atlassian Design System準拠のDesign Tokens定義。
 * エンタープライズレベルの色彩・タイポグラフィ・スペーシング体系を提供。
 * 第8条準拠: https://atlassian.design/components に準拠
 */

// Atlassian Design System準拠カラーパレット
export const designTokens = {
  colors: {
    // Primary Colors (Atlassian Blue系)
    primary: {
      50: '#E3F2FD',
      100: '#BBDEFB', 
      200: '#90CAF9',
      300: '#64B5F6',
      400: '#42A5F5',
      500: '#0052CC', // Atlassian Primary Blue
      600: '#0747A6',
      700: '#253858',
      800: '#172B4D',
      900: '#091E42'
    },

    // Success Colors (Green系)
    success: {
      50: '#E3FCEF',
      100: '#ABF5D1',
      200: '#79E2B2',
      300: '#57D9A3',
      400: '#36B37E',
      500: '#00875A', // Atlassian Success Green
      600: '#006644',
      700: '#005A32',
      800: '#004B27',
      900: '#003D1C'
    },

    // Warning Colors (Orange系) 
    warning: {
      50: '#FFF8E1',
      100: '#FFECB3',
      200: '#FFE082',
      300: '#FFD54F',
      400: '#FFCA28',
      500: '#FF8B00', // Atlassian Warning Orange
      600: '#FF6F00',
      700: '#F57C00',
      800: '#EF6C00',
      900: '#E65100'
    },

    // Danger Colors (Red系)
    danger: {
      50: '#FFEBEE',
      100: '#FFCDD2',
      200: '#EF9A9A',
      300: '#E57373',
      400: '#EF5350',
      500: '#DE350B', // Atlassian Danger Red
      600: '#D32F2F',
      700: '#C62828',
      800: '#B71C1C',
      900: '#C62828'
    },

    // Neutral Colors (Gray系)
    neutral: {
      50: '#FAFBFC',  // Lightest
      100: '#F4F5F7',
      200: '#EBECF0', 
      300: '#DFE1E6',
      400: '#B3BAC5',
      500: '#8993A4', // Mid neutral
      600: '#6B778C',
      700: '#505F79',
      800: '#42526E',
      900: '#253858'  // Darkest
    },

    // Dark Theme Support  
    dark: {
      100: '#161A1E', // 最暗背景
      200: '#1D2125', // カード背景
      300: '#22272B', // 要素背景
      400: '#2C3539', // ボーダー/セパレーター
      500: '#454F59'  // アクティブ要素
    }
  },

  // Typography Scale (Atlassian準拠)
  typography: {
    fontFamily: {
      primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: 'SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, Courier, monospace'
    },
    
    fontSize: {
      // Headings
      h900: '35px',   // h1 - Page titles
      h800: '29px',   // h1 - Section titles  
      h700: '24px',   // h2 - Subsection titles
      h600: '20px',   // h3 - Component titles
      h500: '16px',   // h4 - Small headings
      h400: '14px',   // h5 - Labels
      h300: '12px',   // h6 - Captions
      
      // Body text
      body: '14px',   // Standard body text
      small: '12px',  // Small text
      caption: '11px' // Captions and labels
    },
    
    lineHeight: {
      h900: '40px',
      h800: '32px', 
      h700: '28px',
      h600: '24px',
      h500: '20px',
      h400: '20px',
      h300: '16px',
      body: '20px',
      small: '16px',
      caption: '16px'
    },
    
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },

  // Spacing Scale (8px grid system)
  spacing: {
    xs: '2px',    // 0.25 * 8px
    sm: '4px',    // 0.5 * 8px  
    md: '8px',    // 1 * 8px - Base unit
    lg: '12px',   // 1.5 * 8px
    xl: '16px',   // 2 * 8px
    '2xl': '24px', // 3 * 8px
    '3xl': '32px', // 4 * 8px
    '4xl': '40px', // 5 * 8px
    '5xl': '48px', // 6 * 8px
    '6xl': '64px'  // 8 * 8px
  },

  // Border Radius
  borderRadius: {
    none: '0px',
    sm: '4px',     // Small components
    md: '8px',     // Standard components  
    lg: '12px',    // Cards
    xl: '16px',    // Large cards
    '2xl': '24px', // Modals
    full: '9999px' // Pills/badges
  },

  // Shadows (Elevation system)
  boxShadow: {
    none: 'none',
    sm: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
    md: '0 4px 6px rgba(0, 0, 0, 0.16), 0 2px 4px rgba(0, 0, 0, 0.12)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    xl: '0 19px 38px rgba(0, 0, 0, 0.30), 0 15px 12px rgba(0, 0, 0, 0.22)',
  },

  // Z-Index layering
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100, 
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800
  },

  // Breakpoints (Responsive design)
  screens: {
    xs: '475px',
    sm: '640px',  
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  }
};

// Color utility functions
export const colorUtilities = {
  // Get color with opacity
  withOpacity: (color, opacity) => {
    if (color.startsWith('#')) {
      // Convert hex to rgba
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16); 
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  },

  // Get semantic color by intent
  semantic: {
    primary: designTokens.colors.primary[500],
    success: designTokens.colors.success[500], 
    warning: designTokens.colors.warning[500],
    danger: designTokens.colors.danger[500],
    neutral: designTokens.colors.neutral[500]
  },

  // Dark theme colors
  dark: {
    surface: designTokens.colors.dark[200],
    background: designTokens.colors.dark[100],
    border: designTokens.colors.dark[400],
    text: designTokens.colors.neutral[50]
  }
};

export default designTokens;