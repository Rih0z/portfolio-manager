/**
 * Atlassian Button Component
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/components/atlassian/Button.jsx
 * 
 * 作成者: Koki Riho (https://github.com/Rih0z)
 * 作成日: 2025-08-22 09:50:00
 * 
 * 説明:
 * Atlassian Design System準拠のButtonコンポーネント。
 * Primary、Secondary、Link variantsをサポート。
 * WCAG 2.1 AA準拠のアクセシビリティ対応。
 */

import React, { forwardRef } from 'react';
import { designTokens, colorUtilities } from '../../tokens/atlassian-tokens';

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon = null,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  onClick,
  type = 'button',
  ...props
}, ref) => {
  
  // Variant styles based on Atlassian Design System
  const variantStyles = {
    primary: {
      background: disabled 
        ? designTokens.colors.neutral[200]
        : designTokens.colors.primary[500],
      color: disabled 
        ? designTokens.colors.neutral[500]
        : '#FFFFFF',
      border: 'none',
      hover: {
        background: designTokens.colors.primary[600]
      },
      focus: {
        boxShadow: `0 0 0 2px ${colorUtilities.withOpacity(designTokens.colors.primary[500], 0.4)}`
      }
    },
    
    secondary: {
      background: disabled
        ? designTokens.colors.neutral[100]
        : designTokens.colors.neutral[50],
      color: disabled
        ? designTokens.colors.neutral[400]
        : designTokens.colors.neutral[800],
      border: `1px solid ${disabled 
        ? designTokens.colors.neutral[200]
        : designTokens.colors.neutral[300]}`,
      hover: {
        background: designTokens.colors.neutral[100]
      },
      focus: {
        boxShadow: `0 0 0 2px ${colorUtilities.withOpacity(designTokens.colors.primary[500], 0.4)}`
      }
    },
    
    link: {
      background: 'transparent',
      color: disabled
        ? designTokens.colors.neutral[400] 
        : designTokens.colors.primary[500],
      border: 'none',
      hover: {
        color: designTokens.colors.primary[600],
        textDecoration: 'underline'
      },
      focus: {
        boxShadow: `0 0 0 2px ${colorUtilities.withOpacity(designTokens.colors.primary[500], 0.4)}`,
        outline: 'none'
      }
    },

    danger: {
      background: disabled
        ? designTokens.colors.neutral[200]
        : designTokens.colors.danger[500],
      color: disabled
        ? designTokens.colors.neutral[500]
        : '#FFFFFF',
      border: 'none',
      hover: {
        background: designTokens.colors.danger[600]
      },
      focus: {
        boxShadow: `0 0 0 2px ${colorUtilities.withOpacity(designTokens.colors.danger[500], 0.4)}`
      }
    }
  };

  // Size styles
  const sizeStyles = {
    small: {
      padding: `${designTokens.spacing.sm} ${designTokens.spacing.md}`,
      fontSize: designTokens.typography.fontSize.small,
      lineHeight: designTokens.typography.lineHeight.small,
      minHeight: '32px'
    },
    medium: {
      padding: `${designTokens.spacing.md} ${designTokens.spacing.xl}`,
      fontSize: designTokens.typography.fontSize.body,
      lineHeight: designTokens.typography.lineHeight.body,
      minHeight: '40px'
    },
    large: {
      padding: `${designTokens.spacing.lg} ${designTokens.spacing['2xl']}`,
      fontSize: designTokens.typography.fontSize.h500,
      lineHeight: designTokens.typography.lineHeight.h500,
      minHeight: '48px'
    }
  };

  const currentVariant = variantStyles[variant];
  const currentSize = sizeStyles[size];

  // Base styles (always applied)
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: designTokens.spacing.sm,
    fontFamily: designTokens.typography.fontFamily.primary,
    fontWeight: designTokens.typography.fontWeight.medium,
    borderRadius: designTokens.borderRadius.md,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease-in-out',
    textDecoration: 'none',
    width: fullWidth ? '100%' : 'auto',
    position: 'relative',
    outline: 'none',
    ...currentVariant,
    ...currentSize
  };

  // Loading spinner component
  const LoadingSpinner = () => (
    <svg 
      className="animate-spin" 
      width="16" 
      height="16" 
      viewBox="0 0 24 24" 
      fill="none"
    >
      <circle 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeDasharray="31.416" 
        strokeDashoffset="31.416"
        style={{
          animation: 'spin 1s linear infinite, dash 1.5s ease-in-out infinite'
        }}
      />
    </svg>
  );

  const handleClick = (event) => {
    if (disabled || loading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  const handleKeyDown = (event) => {
    // Enter or Space key activation (accessibility)
    if ((event.key === 'Enter' || event.key === ' ') && !disabled && !loading) {
      event.preventDefault();
      onClick?.(event);
    }
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={className}
      style={baseStyles}
      // Accessibility attributes
      aria-disabled={disabled || loading}
      aria-label={loading ? 'Loading...' : props['aria-label']}
      role="button"
      tabIndex={disabled ? -1 : 0}
      {...props}
    >
      {/* Left icon */}
      {icon && iconPosition === 'left' && !loading && (
        <span className="button-icon" style={{ display: 'flex', alignItems: 'center' }}>
          {icon}
        </span>
      )}
      
      {/* Loading spinner */}
      {loading && (
        <LoadingSpinner />
      )}
      
      {/* Button content */}
      <span 
        className="button-content"
        style={{ 
          opacity: loading ? 0.7 : 1,
          display: 'flex',
          alignItems: 'center'
        }}
      >
        {children}
      </span>
      
      {/* Right icon */}
      {icon && iconPosition === 'right' && !loading && (
        <span className="button-icon" style={{ display: 'flex', alignItems: 'center' }}>
          {icon}
        </span>
      )}
    </button>
  );
});

Button.displayName = 'AtlassianButton';

export default Button;