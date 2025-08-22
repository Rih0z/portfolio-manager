/**
 * Atlassian Modal Component
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/components/atlassian/Modal.jsx
 * 
 * 作成者: Koki Riho (https://github.com/Rih0z)
 * 作成日: 2025-08-22 10:15:00
 * 
 * 説明:
 * Atlassian Design System準拠のModalコンポーネント。
 * アクセシビリティ対応、フォーカス管理、エスケープキー対応。
 */

import React, { useEffect, useRef, forwardRef } from 'react';
import { designTokens, colorUtilities } from '../../tokens/atlassian-tokens';

const Modal = forwardRef(({
  isOpen = false,
  onClose,
  title,
  children,
  size = 'medium',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
  overlayClassName = '',
  ...props
}, ref) => {

  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Size configurations
  const sizeConfig = {
    small: {
      maxWidth: '400px',
      width: '90vw'
    },
    medium: {
      maxWidth: '600px',
      width: '90vw'
    },
    large: {
      maxWidth: '800px',
      width: '95vw'
    },
    xlarge: {
      maxWidth: '1000px',
      width: '95vw'
    },
    fullscreen: {
      maxWidth: '100vw',
      width: '100vw',
      height: '100vh',
      borderRadius: '0'
    }
  };

  // Dark theme support
  const isDarkTheme = document.documentElement.classList.contains('dark');

  // Overlay styles
  const overlayStyles = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colorUtilities.withOpacity('#000000', 0.6),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: size === 'fullscreen' ? '0' : designTokens.spacing.lg,
    zIndex: designTokens.zIndex.modal,
    opacity: isOpen ? 1 : 0,
    visibility: isOpen ? 'visible' : 'hidden',
    transition: 'opacity 0.2s ease-in-out, visibility 0.2s ease-in-out'
  };

  // Modal content styles
  const modalStyles = {
    backgroundColor: isDarkTheme 
      ? colorUtilities.dark.surface
      : designTokens.colors.neutral[50],
    borderRadius: size === 'fullscreen' ? '0' : designTokens.borderRadius.lg,
    boxShadow: designTokens.boxShadow.xl,
    position: 'relative',
    maxHeight: size === 'fullscreen' ? '100vh' : '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    outline: 'none',
    transform: isOpen ? 'scale(1)' : 'scale(0.95)',
    transition: 'transform 0.2s ease-in-out',
    ...sizeConfig[size]
  };

  // Close button styles
  const closeButtonStyles = {
    position: 'absolute',
    top: designTokens.spacing.lg,
    right: designTokens.spacing.lg,
    background: 'transparent',
    border: 'none',
    borderRadius: designTokens.borderRadius.md,
    padding: designTokens.spacing.sm,
    cursor: 'pointer',
    color: isDarkTheme 
      ? colorUtilities.dark.text
      : designTokens.colors.neutral[600],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    zIndex: 1,
    transition: 'all 0.2s ease-in-out',
    ':hover': {
      backgroundColor: isDarkTheme 
        ? colorUtilities.dark.background
        : designTokens.colors.neutral[100]
    },
    ':focus': {
      outline: `2px solid ${designTokens.colors.primary[500]}`,
      outlineOffset: '1px'
    }
  };

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeOnEscape, isOpen, onClose]);

  // Handle focus management
  useEffect(() => {
    if (!isOpen) return;

    // Store previously focused element
    previousFocusRef.current = document.activeElement;

    // Focus the modal
    if (modalRef.current) {
      modalRef.current.focus();
    }

    // Prevent body scrolling
    const originalBodyStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      // Restore body scrolling
      document.body.style.overflow = originalBodyStyle;

      // Restore focus to previous element
      if (previousFocusRef.current && previousFocusRef.current.focus) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]);

  // Handle focus trap
  const handleKeyDown = (event) => {
    if (event.key === 'Tab') {
      const modal = modalRef.current;
      if (!modal) return;

      const focusableElements = modal.querySelectorAll(
        'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          event.preventDefault();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          event.preventDefault();
        }
      }
    }
  };

  const handleOverlayClick = (event) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose?.();
    }
  };

  const handleCloseClick = () => {
    onClose?.();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`atlassian-modal-overlay ${overlayClassName}`}
        style={overlayStyles}
        onClick={handleOverlayClick}
        aria-hidden="true"
      >
        {/* Modal Content */}
        <div
          ref={ref || modalRef}
          className={`atlassian-modal ${className}`}
          style={modalStyles}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "modal-title" : undefined}
          tabIndex={-1}
          {...props}
        >
          {/* Close Button */}
          {showCloseButton && (
            <button
              style={closeButtonStyles}
              onClick={handleCloseClick}
              aria-label="Close modal"
              type="button"
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}

          {/* Modal Content */}
          {children}
        </div>
      </div>
    </>
  );
});

Modal.displayName = 'AtlassianModal';

// Modal Header subcomponent
export const ModalHeader = ({ children, className = '', style = {} }) => {
  const isDarkTheme = document.documentElement.classList.contains('dark');

  return (
    <div
      className={`atlassian-modal-header ${className}`}
      style={{
        padding: `${designTokens.spacing.xl} ${designTokens.spacing.xl} ${designTokens.spacing.lg}`,
        borderBottom: `1px solid ${
          isDarkTheme 
            ? colorUtilities.dark.border
            : designTokens.colors.neutral[200]
        }`,
        flexShrink: 0,
        ...style
      }}
    >
      {typeof children === 'string' ? (
        <h2 
          id="modal-title"
          style={{
            margin: 0,
            fontSize: designTokens.typography.fontSize.h600,
            lineHeight: designTokens.typography.lineHeight.h600,
            fontWeight: designTokens.typography.fontWeight.semibold,
            color: isDarkTheme 
              ? colorUtilities.dark.text
              : designTokens.colors.neutral[800]
          }}
        >
          {children}
        </h2>
      ) : (
        children
      )}
    </div>
  );
};

// Modal Body subcomponent
export const ModalBody = ({ children, className = '', style = {} }) => (
  <div
    className={`atlassian-modal-body ${className}`}
    style={{
      padding: designTokens.spacing.xl,
      flex: 1,
      overflow: 'auto',
      ...style
    }}
  >
    {children}
  </div>
);

// Modal Footer subcomponent
export const ModalFooter = ({ children, align = 'right', className = '', style = {} }) => {
  const alignmentStyles = {
    left: { justifyContent: 'flex-start' },
    center: { justifyContent: 'center' },
    right: { justifyContent: 'flex-end' },
    between: { justifyContent: 'space-between' }
  };

  const isDarkTheme = document.documentElement.classList.contains('dark');

  return (
    <div
      className={`atlassian-modal-footer ${className}`}
      style={{
        padding: `${designTokens.spacing.lg} ${designTokens.spacing.xl} ${designTokens.spacing.xl}`,
        borderTop: `1px solid ${
          isDarkTheme 
            ? colorUtilities.dark.border
            : designTokens.colors.neutral[200]
        }`,
        display: 'flex',
        gap: designTokens.spacing.md,
        flexShrink: 0,
        ...alignmentStyles[align],
        ...style
      }}
    >
      {children}
    </div>
  );
};

// Confirmation Modal - specialized modal for confirmations
export const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  ...props
}) => {
  const handleConfirm = () => {
    onConfirm?.();
    onClose?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="small"
      {...props}
    >
      <ModalHeader>{title}</ModalHeader>
      <ModalBody>
        <p style={{
          margin: 0,
          fontSize: designTokens.typography.fontSize.body,
          lineHeight: designTokens.typography.lineHeight.body,
          color: document.documentElement.classList.contains('dark')
            ? colorUtilities.dark.text
            : designTokens.colors.neutral[700]
        }}>
          {message}
        </p>
      </ModalBody>
      <ModalFooter>
        <button
          onClick={onClose}
          style={{
            padding: `${designTokens.spacing.md} ${designTokens.spacing.xl}`,
            fontSize: designTokens.typography.fontSize.body,
            fontWeight: designTokens.typography.fontWeight.medium,
            borderRadius: designTokens.borderRadius.md,
            border: `1px solid ${designTokens.colors.neutral[300]}`,
            backgroundColor: designTokens.colors.neutral[50],
            color: designTokens.colors.neutral[800],
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out'
          }}
        >
          {cancelText}
        </button>
        <button
          onClick={handleConfirm}
          style={{
            padding: `${designTokens.spacing.md} ${designTokens.spacing.xl}`,
            fontSize: designTokens.typography.fontSize.body,
            fontWeight: designTokens.typography.fontWeight.medium,
            borderRadius: designTokens.borderRadius.md,
            border: 'none',
            backgroundColor: designTokens.colors[confirmVariant][500],
            color: '#FFFFFF',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out'
          }}
        >
          {confirmText}
        </button>
      </ModalFooter>
    </Modal>
  );
};

export default Modal;