/**
 * Atlassian Input/Form Component
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/components/atlassian/Input.jsx
 * 
 * 作成者: Koki Riho (https://github.com/Rih0z)
 * 作成日: 2025-08-22 10:05:00
 * 
 * 説明:
 * Atlassian Design System準拠のInput/Formコンポーネント。
 * WCAG 2.1 AA準拠、バリデーション機能、エラーハンドリング対応。
 */

import React, { forwardRef, useState } from 'react';
import { designTokens, colorUtilities } from '../../tokens/atlassian-tokens';

const Input = forwardRef(({
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  invalid = false,
  required = false,
  label,
  helperText,
  errorMessage,
  size = 'medium',
  fullWidth = false,
  className = '',
  id,
  name,
  autoComplete,
  maxLength,
  minLength,
  pattern,
  ...props
}, ref) => {

  const [focused, setFocused] = useState(false);

  // Size styles
  const sizeStyles = {
    small: {
      padding: `${designTokens.spacing.sm} ${designTokens.spacing.md}`,
      fontSize: designTokens.typography.fontSize.small,
      lineHeight: designTokens.typography.lineHeight.small,
      minHeight: '32px'
    },
    medium: {
      padding: `${designTokens.spacing.md} ${designTokens.spacing.lg}`,
      fontSize: designTokens.typography.fontSize.body,
      lineHeight: designTokens.typography.lineHeight.body,
      minHeight: '40px'
    },
    large: {
      padding: `${designTokens.spacing.lg} ${designTokens.spacing.xl}`,
      fontSize: designTokens.typography.fontSize.h500,
      lineHeight: designTokens.typography.lineHeight.h500,
      minHeight: '48px'
    }
  };

  // Dark theme support
  const isDarkTheme = document.documentElement.classList.contains('dark');

  // Base input styles
  const baseStyles = {
    width: fullWidth ? '100%' : 'auto',
    fontFamily: designTokens.typography.fontFamily.primary,
    fontWeight: designTokens.typography.fontWeight.regular,
    borderRadius: designTokens.borderRadius.md,
    border: `2px solid ${
      invalid 
        ? designTokens.colors.danger[500]
        : focused 
        ? designTokens.colors.primary[500]
        : designTokens.colors.neutral[300]
    }`,
    backgroundColor: disabled 
      ? designTokens.colors.neutral[100]
      : isDarkTheme 
      ? colorUtilities.dark.surface
      : designTokens.colors.neutral[50],
    color: disabled
      ? designTokens.colors.neutral[400]
      : isDarkTheme
      ? colorUtilities.dark.text
      : designTokens.colors.neutral[800],
    transition: 'all 0.2s ease-in-out',
    outline: 'none',
    cursor: disabled ? 'not-allowed' : 'text',
    ...sizeStyles[size]
  };

  // Focus styles
  const focusStyles = focused ? {
    boxShadow: `0 0 0 1px ${colorUtilities.withOpacity(
      invalid ? designTokens.colors.danger[500] : designTokens.colors.primary[500], 
      0.4
    )}`
  } : {};

  // Label styles
  const labelStyles = {
    display: 'block',
    marginBottom: designTokens.spacing.sm,
    fontSize: designTokens.typography.fontSize.body,
    fontWeight: designTokens.typography.fontWeight.medium,
    color: isDarkTheme 
      ? colorUtilities.dark.text
      : designTokens.colors.neutral[700],
    cursor: disabled ? 'not-allowed' : 'pointer'
  };

  // Helper text styles
  const helperTextStyles = {
    marginTop: designTokens.spacing.sm,
    fontSize: designTokens.typography.fontSize.small,
    lineHeight: designTokens.typography.lineHeight.small,
    color: invalid
      ? designTokens.colors.danger[500]
      : isDarkTheme
      ? colorUtilities.dark.text
      : designTokens.colors.neutral[600]
  };

  const handleFocus = (event) => {
    if (!disabled) {
      setFocused(true);
    }
    props.onFocus?.(event);
  };

  const handleBlur = (event) => {
    setFocused(false);
    props.onBlur?.(event);
  };

  const inputId = id || `input-${name}` || `input-${Date.now()}`;

  return (
    <div className={`atlassian-input-wrapper ${className}`} style={{ width: fullWidth ? '100%' : 'auto' }}>
      {/* Label */}
      {label && (
        <label 
          htmlFor={inputId}
          style={labelStyles}
        >
          {label}
          {required && (
            <span 
              style={{ 
                color: designTokens.colors.danger[500],
                marginLeft: designTokens.spacing.xs 
              }}
              aria-label="Required field"
            >
              *
            </span>
          )}
        </label>
      )}

      {/* Input field */}
      <input
        ref={ref}
        id={inputId}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        maxLength={maxLength}
        minLength={minLength}
        pattern={pattern}
        style={{
          ...baseStyles,
          ...focusStyles
        }}
        // Accessibility attributes
        aria-invalid={invalid}
        aria-required={required}
        aria-describedby={
          helperText || errorMessage 
            ? `${inputId}-description`
            : undefined
        }
        {...props}
      />

      {/* Helper text or error message */}
      {(helperText || errorMessage) && (
        <div
          id={`${inputId}-description`}
          style={helperTextStyles}
          role={invalid ? 'alert' : 'description'}
        >
          {invalid ? errorMessage : helperText}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'AtlassianInput';

// Textarea component
export const Textarea = forwardRef(({
  value,
  onChange,
  placeholder,
  disabled = false,
  invalid = false,
  required = false,
  label,
  helperText,
  errorMessage,
  rows = 4,
  fullWidth = false,
  className = '',
  id,
  name,
  maxLength,
  minLength,
  ...props
}, ref) => {

  const [focused, setFocused] = useState(false);

  // Dark theme support
  const isDarkTheme = document.documentElement.classList.contains('dark');

  // Base textarea styles
  const baseStyles = {
    width: fullWidth ? '100%' : 'auto',
    minHeight: `${40 + (rows - 1) * 20}px`,
    padding: `${designTokens.spacing.md} ${designTokens.spacing.lg}`,
    fontFamily: designTokens.typography.fontFamily.primary,
    fontWeight: designTokens.typography.fontWeight.regular,
    fontSize: designTokens.typography.fontSize.body,
    lineHeight: designTokens.typography.lineHeight.body,
    borderRadius: designTokens.borderRadius.md,
    border: `2px solid ${
      invalid 
        ? designTokens.colors.danger[500]
        : focused 
        ? designTokens.colors.primary[500]
        : designTokens.colors.neutral[300]
    }`,
    backgroundColor: disabled 
      ? designTokens.colors.neutral[100]
      : isDarkTheme 
      ? colorUtilities.dark.surface
      : designTokens.colors.neutral[50],
    color: disabled
      ? designTokens.colors.neutral[400]
      : isDarkTheme
      ? colorUtilities.dark.text
      : designTokens.colors.neutral[800],
    transition: 'all 0.2s ease-in-out',
    outline: 'none',
    cursor: disabled ? 'not-allowed' : 'text',
    resize: 'vertical'
  };

  // Focus styles
  const focusStyles = focused ? {
    boxShadow: `0 0 0 1px ${colorUtilities.withOpacity(
      invalid ? designTokens.colors.danger[500] : designTokens.colors.primary[500], 
      0.4
    )}`
  } : {};

  const handleFocus = (event) => {
    if (!disabled) {
      setFocused(true);
    }
    props.onFocus?.(event);
  };

  const handleBlur = (event) => {
    setFocused(false);
    props.onBlur?.(event);
  };

  const textareaId = id || `textarea-${name}` || `textarea-${Date.now()}`;

  return (
    <div className={`atlassian-textarea-wrapper ${className}`} style={{ width: fullWidth ? '100%' : 'auto' }}>
      {/* Label */}
      {label && (
        <label 
          htmlFor={textareaId}
          style={{
            display: 'block',
            marginBottom: designTokens.spacing.sm,
            fontSize: designTokens.typography.fontSize.body,
            fontWeight: designTokens.typography.fontWeight.medium,
            color: isDarkTheme 
              ? colorUtilities.dark.text
              : designTokens.colors.neutral[700],
            cursor: disabled ? 'not-allowed' : 'pointer'
          }}
        >
          {label}
          {required && (
            <span 
              style={{ 
                color: designTokens.colors.danger[500],
                marginLeft: designTokens.spacing.xs 
              }}
              aria-label="Required field"
            >
              *
            </span>
          )}
        </label>
      )}

      {/* Textarea field */}
      <textarea
        ref={ref}
        id={textareaId}
        name={name}
        value={value}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        rows={rows}
        maxLength={maxLength}
        minLength={minLength}
        style={{
          ...baseStyles,
          ...focusStyles
        }}
        // Accessibility attributes
        aria-invalid={invalid}
        aria-required={required}
        aria-describedby={
          helperText || errorMessage 
            ? `${textareaId}-description`
            : undefined
        }
        {...props}
      />

      {/* Helper text or error message */}
      {(helperText || errorMessage) && (
        <div
          id={`${textareaId}-description`}
          style={{
            marginTop: designTokens.spacing.sm,
            fontSize: designTokens.typography.fontSize.small,
            lineHeight: designTokens.typography.lineHeight.small,
            color: invalid
              ? designTokens.colors.danger[500]
              : isDarkTheme
              ? colorUtilities.dark.text
              : designTokens.colors.neutral[600]
          }}
          role={invalid ? 'alert' : 'description'}
        >
          {invalid ? errorMessage : helperText}
        </div>
      )}
    </div>
  );
});

Textarea.displayName = 'AtlassianTextarea';

// Select component
export const Select = forwardRef(({
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  disabled = false,
  invalid = false,
  required = false,
  label,
  helperText,
  errorMessage,
  size = 'medium',
  fullWidth = false,
  className = '',
  id,
  name,
  ...props
}, ref) => {

  const [focused, setFocused] = useState(false);

  // Size styles (same as Input)
  const sizeStyles = {
    small: {
      padding: `${designTokens.spacing.sm} ${designTokens.spacing.md}`,
      fontSize: designTokens.typography.fontSize.small,
      lineHeight: designTokens.typography.lineHeight.small,
      minHeight: '32px'
    },
    medium: {
      padding: `${designTokens.spacing.md} ${designTokens.spacing.lg}`,
      fontSize: designTokens.typography.fontSize.body,
      lineHeight: designTokens.typography.lineHeight.body,
      minHeight: '40px'
    },
    large: {
      padding: `${designTokens.spacing.lg} ${designTokens.spacing.xl}`,
      fontSize: designTokens.typography.fontSize.h500,
      lineHeight: designTokens.typography.lineHeight.h500,
      minHeight: '48px'
    }
  };

  // Dark theme support
  const isDarkTheme = document.documentElement.classList.contains('dark');

  // Base select styles
  const baseStyles = {
    width: fullWidth ? '100%' : 'auto',
    fontFamily: designTokens.typography.fontFamily.primary,
    fontWeight: designTokens.typography.fontWeight.regular,
    borderRadius: designTokens.borderRadius.md,
    border: `2px solid ${
      invalid 
        ? designTokens.colors.danger[500]
        : focused 
        ? designTokens.colors.primary[500]
        : designTokens.colors.neutral[300]
    }`,
    backgroundColor: disabled 
      ? designTokens.colors.neutral[100]
      : isDarkTheme 
      ? colorUtilities.dark.surface
      : designTokens.colors.neutral[50],
    color: disabled
      ? designTokens.colors.neutral[400]
      : isDarkTheme
      ? colorUtilities.dark.text
      : designTokens.colors.neutral[800],
    transition: 'all 0.2s ease-in-out',
    outline: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 9-7 7-7-7"/></svg>')}")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '16px 16px',
    paddingRight: designTokens.spacing['3xl'],
    ...sizeStyles[size]
  };

  const handleFocus = (event) => {
    if (!disabled) {
      setFocused(true);
    }
    props.onFocus?.(event);
  };

  const handleBlur = (event) => {
    setFocused(false);
    props.onBlur?.(event);
  };

  const selectId = id || `select-${name}` || `select-${Date.now()}`;

  return (
    <div className={`atlassian-select-wrapper ${className}`} style={{ width: fullWidth ? '100%' : 'auto' }}>
      {/* Label */}
      {label && (
        <label 
          htmlFor={selectId}
          style={{
            display: 'block',
            marginBottom: designTokens.spacing.sm,
            fontSize: designTokens.typography.fontSize.body,
            fontWeight: designTokens.typography.fontWeight.medium,
            color: isDarkTheme 
              ? colorUtilities.dark.text
              : designTokens.colors.neutral[700],
            cursor: disabled ? 'not-allowed' : 'pointer'
          }}
        >
          {label}
          {required && (
            <span 
              style={{ 
                color: designTokens.colors.danger[500],
                marginLeft: designTokens.spacing.xs 
              }}
              aria-label="Required field"
            >
              *
            </span>
          )}
        </label>
      )}

      {/* Select field */}
      <select
        ref={ref}
        id={selectId}
        name={name}
        value={value}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        required={required}
        style={baseStyles}
        // Accessibility attributes
        aria-invalid={invalid}
        aria-required={required}
        aria-describedby={
          helperText || errorMessage 
            ? `${selectId}-description`
            : undefined
        }
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option, index) => (
          <option 
            key={option.value || index} 
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>

      {/* Helper text or error message */}
      {(helperText || errorMessage) && (
        <div
          id={`${selectId}-description`}
          style={{
            marginTop: designTokens.spacing.sm,
            fontSize: designTokens.typography.fontSize.small,
            lineHeight: designTokens.typography.lineHeight.small,
            color: invalid
              ? designTokens.colors.danger[500]
              : isDarkTheme
              ? colorUtilities.dark.text
              : designTokens.colors.neutral[600]
          }}
          role={invalid ? 'alert' : 'description'}
        >
          {invalid ? errorMessage : helperText}
        </div>
      )}
    </div>
  );
});

Select.displayName = 'AtlassianSelect';

export default Input;