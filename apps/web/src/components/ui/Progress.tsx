/**
 * Progress Component
 *
 * Stage-aware progress bar with multiple variants and label support.
 * Includes both linear and circular progress indicators.
 */

import React from 'react';
import type { ProgressVariant } from '../../types';

/**
 * Linear Progress Bar
 */
export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Progress value (0-100)
   */
  value: number;

  /**
   * Progress variant
   * @default 'default'
   */
  variant?: ProgressVariant;

  /**
   * Show label
   * @default false
   */
  showLabel?: boolean;

  /**
   * Custom label (overrides percentage)
   */
  label?: string;

  /**
   * Bar height
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Show percentage text inline
   * @default false
   */
  showPercentage?: boolean;

  /**
   * Animated progress (smooth transitions)
   * @default true
   */
  animated?: boolean;
}

export function Progress({
  value,
  variant = 'default',
  showLabel = false,
  label,
  size = 'md',
  showPercentage = false,
  animated = true,
  className = '',
  ...props
}: ProgressProps) {
  // Clamp value between 0 and 100
  const clampedValue = Math.min(100, Math.max(0, value));

  // Size styles
  const sizeStyles = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  // Variant colors
  const variantColors = {
    default: 'bg-accent-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error',
  };

  return (
    <div className={className} {...props}>
      {/* Label and percentage */}
      {(showLabel || showPercentage) && (
        <div className="flex items-center justify-between mb-2 text-sm">
          {showLabel && (
            <span className="text-text-secondary">
              {label || 'Progress'}
            </span>
          )}
          {showPercentage && (
            <span className="text-text-primary font-medium">
              {Math.round(clampedValue)}%
            </span>
          )}
        </div>
      )}

      {/* Progress bar container */}
      <div
        className={`
          w-full rounded-full overflow-hidden
          bg-bg-secondary
          ${sizeStyles[size]}
        `.trim().replace(/\s+/g, ' ')}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
      >
        {/* Progress bar fill */}
        <div
          className={`
            h-full rounded-full
            ${variantColors[variant]}
            ${animated ? 'transition-[width] duration-medium ease-stage' : ''}
          `.trim().replace(/\s+/g, ' ')}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Circular Progress Component
 */
export interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Progress value (0-100)
   */
  value: number;

  /**
   * Progress variant
   * @default 'default'
   */
  variant?: ProgressVariant;

  /**
   * Circle size
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Show percentage in center
   * @default true
   */
  showPercentage?: boolean;

  /**
   * Custom label (overrides percentage)
   */
  label?: string;

  /**
   * Stroke width
   * @default 8
   */
  strokeWidth?: number;
}

export function CircularProgress({
  value,
  variant = 'default',
  size = 'md',
  showPercentage = true,
  label,
  strokeWidth = 8,
  className = '',
  ...props
}: CircularProgressProps) {
  // Clamp value between 0 and 100
  const clampedValue = Math.min(100, Math.max(0, value));

  // Size dimensions
  const sizeMap = {
    sm: 48,
    md: 64,
    lg: 96,
    xl: 128,
  };

  const dimension = sizeMap[size];
  const radius = (dimension - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedValue / 100) * circumference;

  // Variant colors
  const variantColors = {
    default: 'stroke-accent-primary',
    success: 'stroke-success',
    warning: 'stroke-warning',
    error: 'stroke-error',
  };

  // Font size for center text
  const fontSizeMap = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  };

  return (
    <div
      className={`relative inline-flex ${className}`.trim()}
      style={{ width: dimension, height: dimension }}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || 'Progress'}
      {...props}
    >
      <svg
        width={dimension}
        height={dimension}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          className="stroke-bg-secondary"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          className={`${variantColors[variant]} transition-[stroke-dashoffset] duration-medium ease-stage`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>

      {/* Center text */}
      {(showPercentage || label) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-semibold text-text-primary ${fontSizeMap[size]}`.trim()}>
            {label || `${Math.round(clampedValue)}%`}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Indeterminate Progress (Loading state)
 */
export interface IndeterminateProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Progress variant
   * @default 'default'
   */
  variant?: ProgressVariant;

  /**
   * Bar height
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
}

export function IndeterminateProgress({
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}: IndeterminateProgressProps) {
  // Size styles
  const sizeStyles = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  // Variant colors
  const variantColors = {
    default: 'bg-accent-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error',
  };

  return (
    <div
      className={`w-full rounded-full overflow-hidden bg-bg-secondary ${sizeStyles[size]} ${className}`.trim()}
      role="progressbar"
      aria-label="Loading"
      aria-busy="true"
      {...props}
    >
      <div
        className={`
          h-full rounded-full
          ${variantColors[variant]}
          animate-[indeterminate_1.5s_ease-in-out_infinite]
        `.trim().replace(/\s+/g, ' ')}
        style={{
          animation: 'indeterminate 1.5s ease-in-out infinite',
        }}
      />
    </div>
  );
}
