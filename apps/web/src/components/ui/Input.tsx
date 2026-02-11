/**
 * Input Component
 *
 * Stage-aware text input with label, error states, and accessibility features.
 */

import React, { forwardRef } from 'react';
import type { InputType, ComponentSize } from '../../types';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /**
   * Input type
   * @default 'text'
   */
  type?: InputType;

  /**
   * Input size
   * @default 'md'
   */
  size?: ComponentSize;

  /**
   * Label text
   */
  label?: string;

  /**
   * Helper text shown below input
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
   * Full width input
   * @default true
   */
  fullWidth?: boolean;

  /**
   * Optional icon to display before input
   */
  iconBefore?: React.ReactNode;

  /**
   * Optional icon to display after input
   */
  iconAfter?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      type = 'text',
      size = 'md',
      label,
      helperText,
      error,
      success = false,
      fullWidth = true,
      iconBefore,
      iconAfter,
      className = '',
      id,
      disabled,
      required,
      ...props
    },
    ref
  ) {
    // Generate ID for accessibility
    const inputId = id || `input-${Math.random().toString(36).substring(7)}`;
    const helperTextId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    // Base styles
    const baseStyles = `
      bg-bg-secondary text-text-primary
      border border-transparent rounded-element
      transition-[border-color,background-color] duration-short ease-stage
      focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary
      placeholder:text-text-secondary
      disabled:opacity-50 disabled:cursor-not-allowed
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

    // Icon padding adjustments
    const iconPaddingStyles = iconBefore ? 'pl-10' : iconAfter ? 'pr-10' : '';

    // Combine input styles
    const inputClassName = `
      ${baseStyles}
      ${sizeStyles[size]}
      ${stateStyles}
      ${widthStyles}
      ${iconPaddingStyles}
      ${className}
    `.trim().replace(/\s+/g, ' ');

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block mb-2 text-sm font-medium text-text-primary"
          >
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </label>
        )}

        {/* Input wrapper with icons */}
        <div className="relative">
          {/* Icon before */}
          {iconBefore && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
              {iconBefore}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            required={required}
            className={inputClassName}
            aria-describedby={
              error ? errorId : helperText ? helperTextId : undefined
            }
            aria-invalid={error ? true : undefined}
            {...props}
          />

          {/* Icon after */}
          {iconAfter && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
              {iconAfter}
            </div>
          )}
        </div>

        {/* Helper text or error message */}
        {error && (
          <p
            id={errorId}
            className="mt-1.5 text-sm text-error"
            role="alert"
          >
            {error}
          </p>
        )}
        {!error && helperText && (
          <p
            id={helperTextId}
            className="mt-1.5 text-sm text-text-secondary"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
