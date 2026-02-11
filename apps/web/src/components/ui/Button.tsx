/**
 * Button Component
 *
 * Stage-aware button component with multiple variants and sizes.
 * Automatically adapts styling based on the current learning stage.
 */

import React from 'react';
import type { ButtonVariant, ComponentSize } from '../../types';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Button variant determines visual style
   * @default 'primary'
   */
  variant?: ButtonVariant;

  /**
   * Button size
   * @default 'md'
   */
  size?: ComponentSize;

  /**
   * Full width button
   * @default false
   */
  fullWidth?: boolean;

  /**
   * Disabled state
   * @default false
   */
  disabled?: boolean;

  /**
   * Loading state - shows loading indicator
   * @default false
   */
  loading?: boolean;

  /**
   * Optional icon to display before children
   */
  iconBefore?: React.ReactNode;

  /**
   * Optional icon to display after children
   */
  iconAfter?: React.ReactNode;

  /**
   * Button content
   */
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  iconBefore,
  iconAfter,
  children,
  className = '',
  ...props
}: ButtonProps) {
  // Base styles
  const baseStyles = `
    inline-flex items-center justify-center gap-2
    font-semibold transition-all
    rounded-element cursor-pointer
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
    active:scale-[0.98]
  `;

  // Size styles
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  // Variant styles
  const variantStyles = {
    primary: `
      bg-accent-primary text-neutral-white
      hover:bg-accent-secondary
      focus-visible:ring-accent-primary
      transition-[background-color,transform] duration-short ease-stage
    `,
    secondary: `
      bg-bg-secondary text-text-primary
      border border-accent-primary
      hover:bg-accent-primary hover:text-neutral-white
      focus-visible:ring-accent-primary
      transition-[background-color,border-color,color,transform] duration-short ease-stage
    `,
    ghost: `
      bg-transparent text-text-primary
      hover:bg-bg-secondary
      focus-visible:ring-accent-primary
      transition-[background-color,transform] duration-short ease-stage
    `,
    danger: `
      bg-error text-neutral-white
      hover:opacity-90
      focus-visible:ring-error
      transition-[opacity,transform] duration-short ease-stage
    `,
  };

  // Width styles
  const widthStyles = fullWidth ? 'w-full' : '';

  // Combine all styles
  const combinedClassName = `
    ${baseStyles}
    ${sizeStyles[size]}
    ${variantStyles[variant]}
    ${widthStyles}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <button
      className={combinedClassName}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <>
          <LoadingSpinner size={size} />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {iconBefore && <span className="inline-flex shrink-0">{iconBefore}</span>}
          <span>{children}</span>
          {iconAfter && <span className="inline-flex shrink-0">{iconAfter}</span>}
        </>
      )}
    </button>
  );
}

/**
 * Loading Spinner Component
 */
function LoadingSpinner({ size }: { size: ComponentSize }) {
  const sizeMap = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <svg
      className={`${sizeMap[size]} animate-spin`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
