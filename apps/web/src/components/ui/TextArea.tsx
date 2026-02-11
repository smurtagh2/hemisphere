/**
 * TextArea Component
 *
 * Stage-aware multi-line text input with label, error states, and accessibility features.
 */

import React, { forwardRef } from 'react';
import type { ComponentSize } from '../../types';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * TextArea size
   * @default 'md'
   */
  size?: ComponentSize;

  /**
   * Label text
   */
  label?: string;

  /**
   * Helper text shown below textarea
   */
  helperText?: string;

  /**
   * Error message
   */
  error?: string;

  /**
   * Success state
   * @default false
   */
  success?: boolean;

  /**
   * Full width textarea
   * @default true
   */
  fullWidth?: boolean;

  /**
   * Show character count
   * @default false
   */
  showCount?: boolean;

  /**
   * Auto-resize based on content
   * @default false
   */
  autoResize?: boolean;

  /**
   * Minimum number of rows
   * @default 3
   */
  minRows?: number;

  /**
   * Maximum number of rows (for auto-resize)
   */
  maxRows?: number;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea(
    {
      size = 'md',
      label,
      helperText,
      error,
      success = false,
      fullWidth = true,
      showCount = false,
      autoResize = false,
      minRows = 3,
      maxRows,
      className = '',
      id,
      disabled,
      required,
      maxLength,
      value,
      onChange,
      ...props
    },
    ref
  ) {
    // Generate ID for accessibility
    const textareaId = id || `textarea-${Math.random().toString(36).substring(7)}`;
    const helperTextId = `${textareaId}-helper`;
    const errorId = `${textareaId}-error`;

    // Character count
    const currentLength = typeof value === 'string' ? value.length : 0;

    // Base styles
    const baseStyles = `
      bg-bg-secondary text-text-primary
      border border-transparent rounded-element
      transition-[border-color,background-color] duration-short ease-stage
      focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary
      placeholder:text-text-secondary
      disabled:opacity-50 disabled:cursor-not-allowed
      resize-vertical
    `;

    // Size styles
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-3 text-base',
      lg: 'px-5 py-4 text-lg',
    };

    // State styles
    const stateStyles = error
      ? 'border-error focus:border-error focus:ring-error'
      : success
      ? 'border-success focus:border-success focus:ring-success'
      : '';

    // Width styles
    const widthStyles = fullWidth ? 'w-full' : '';

    // Resize styles
    const resizeStyles = autoResize ? 'resize-none' : '';

    // Combine textarea styles
    const textareaClassName = `
      ${baseStyles}
      ${sizeStyles[size]}
      ${stateStyles}
      ${widthStyles}
      ${resizeStyles}
      ${className}
    `.trim().replace(/\s+/g, ' ');

    // Handle auto-resize
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (autoResize) {
        const textarea = e.target;
        textarea.style.height = 'auto';
        const newHeight = textarea.scrollHeight;
        const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
        const minHeight = lineHeight * minRows;
        const maxHeight = maxRows ? lineHeight * maxRows : Infinity;
        textarea.style.height = `${Math.min(Math.max(newHeight, minHeight), maxHeight)}px`;
      }
      onChange?.(e);
    };

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {/* Label */}
        {label && (
          <label
            htmlFor={textareaId}
            className="block mb-2 text-sm font-medium text-text-primary"
          >
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </label>
        )}

        {/* TextArea */}
        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          value={value}
          onChange={handleChange}
          rows={minRows}
          className={textareaClassName}
          aria-describedby={
            error ? errorId : helperText ? helperTextId : undefined
          }
          aria-invalid={error ? true : undefined}
          {...props}
        />

        {/* Character count, helper text, or error message */}
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <div className="flex-1">
            {error && (
              <p
                id={errorId}
                className="text-sm text-error"
                role="alert"
              >
                {error}
              </p>
            )}
            {!error && helperText && (
              <p
                id={helperTextId}
                className="text-sm text-text-secondary"
              >
                {helperText}
              </p>
            )}
          </div>

          {showCount && maxLength && (
            <span
              className={`text-sm ${
                currentLength > maxLength * 0.9
                  ? 'text-warning'
                  : 'text-text-secondary'
              }`}
              aria-live="polite"
            >
              {currentLength} / {maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);
