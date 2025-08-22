/**
 * Atlassian Card Component
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/components/atlassian/Card.jsx
 * 
 * 作成者: Koki Riho (https://github.com/Rih0z)
 * 作成日: 2025-08-22 09:55:00
 * 
 * 説明:
 * Atlassian Design System準拠のCardコンポーネント。
 * Elevation system対応、ダークテーマ対応、レスポンシブ対応。
 */

import React, { forwardRef } from 'react';
import { designTokens, colorUtilities } from '../../tokens/atlassian-tokens';

const Card = forwardRef(({
  children,
  elevation = 'medium',
  padding = 'medium', 
  className = '',
  hoverable = false,
  clickable = false,
  onClick,
  style = {},
  ...props
}, ref) => {

  // Elevation styles (shadow system)
  const elevationStyles = {
    none: {
      boxShadow: designTokens.boxShadow.none,
      border: `1px solid ${designTokens.colors.neutral[200]}`
    },
    low: {
      boxShadow: designTokens.boxShadow.sm,
      border: 'none'
    },
    medium: {
      boxShadow: designTokens.boxShadow.md,
      border: 'none'
    },
    high: {
      boxShadow: designTokens.boxShadow.lg,
      border: 'none'
    },
    overlay: {
      boxShadow: designTokens.boxShadow.xl,
      border: 'none'
    }
  };

  // Padding styles
  const paddingStyles = {
    none: { padding: '0' },
    small: { padding: designTokens.spacing.md },
    medium: { padding: designTokens.spacing.xl },
    large: { padding: designTokens.spacing['2xl'] },
    xlarge: { padding: designTokens.spacing['3xl'] }
  };

  // Dark theme support
  const isDarkTheme = document.documentElement.classList.contains('dark');
  
  // Base styles
  const baseStyles = {
    backgroundColor: isDarkTheme 
      ? colorUtilities.dark.surface
      : designTokens.colors.neutral[50],
    borderRadius: designTokens.borderRadius.lg,
    position: 'relative',
    transition: 'all 0.2s ease-in-out',
    overflow: 'hidden',
    ...elevationStyles[elevation],
    ...paddingStyles[padding],
    cursor: clickable || onClick ? 'pointer' : 'default',
    ...style
  };

  // Hover styles for interactive cards
  const hoverStyles = (hoverable || clickable || onClick) ? {
    ':hover': {
      boxShadow: designTokens.boxShadow.lg,
      transform: 'translateY(-1px)'
    }
  } : {};

  // Focus styles for accessibility
  const focusStyles = clickable || onClick ? {
    outline: 'none',
    ':focus': {
      boxShadow: `${elevationStyles[elevation].boxShadow}, 0 0 0 2px ${colorUtilities.withOpacity(designTokens.colors.primary[500], 0.4)}`
    }
  } : {};

  const handleClick = (event) => {
    if (onClick) {
      onClick(event);
    }
  };

  const handleKeyDown = (event) => {
    // Enter or Space key activation for clickable cards
    if ((clickable || onClick) && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      handleClick(event);
    }
  };

  return (
    <div
      ref={ref}
      className={className}
      style={baseStyles}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      // Accessibility attributes for clickable cards
      role={clickable || onClick ? 'button' : 'article'}
      tabIndex={clickable || onClick ? 0 : -1}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'AtlassianCard';

// Card Header subcomponent
export const CardHeader = ({ children, className = '', style = {} }) => (
  <div
    className={className}
    style={{
      marginBottom: designTokens.spacing.lg,
      paddingBottom: designTokens.spacing.lg,
      borderBottom: `1px solid ${designTokens.colors.neutral[200]}`,
      ...style
    }}
  >
    {children}
  </div>
);

// Card Content subcomponent  
export const CardContent = ({ children, className = '', style = {} }) => (
  <div
    className={className}
    style={{
      ...style
    }}
  >
    {children}
  </div>
);

// Card Footer subcomponent
export const CardFooter = ({ children, className = '', style = {} }) => (
  <div
    className={className}
    style={{
      marginTop: designTokens.spacing.lg,
      paddingTop: designTokens.spacing.lg,
      borderTop: `1px solid ${designTokens.colors.neutral[200]}`,
      display: 'flex',
      justifyContent: 'flex-end',
      gap: designTokens.spacing.md,
      ...style
    }}
  >
    {children}
  </div>
);

// Card Actions subcomponent (for buttons)
export const CardActions = ({ children, align = 'right', className = '', style = {} }) => {
  const alignmentStyles = {
    left: { justifyContent: 'flex-start' },
    center: { justifyContent: 'center' },
    right: { justifyContent: 'flex-end' },
    between: { justifyContent: 'space-between' }
  };

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        gap: designTokens.spacing.md,
        marginTop: designTokens.spacing.lg,
        ...alignmentStyles[align],
        ...style
      }}
    >
      {children}
    </div>
  );
};

export default Card;