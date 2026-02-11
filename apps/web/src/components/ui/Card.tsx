/**
 * Card Component
 *
 * Stage-aware card container with automatic styling adaptation.
 * Supports optional glow effects in RH-primary stages (Encounter/Return).
 */

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Enable glow effect (automatically stage-aware)
   * @default false
   */
  glow?: boolean;

  /**
   * Enable hover effects
   * @default false
   */
  hoverable?: boolean;

  /**
   * Padding size
   * @default 'md'
   */
  padding?: 'none' | 'sm' | 'md' | 'lg';

  /**
   * Background variant
   * @default 'secondary'
   */
  background?: 'primary' | 'secondary' | 'transparent';

  /**
   * Card content
   */
  children: React.ReactNode;
}

export function Card({
  glow = false,
  hoverable = false,
  padding = 'md',
  background = 'secondary',
  children,
  className = '',
  ...props
}: CardProps) {
  // Base styles
  const baseStyles = `
    rounded-card
    transition-all duration-medium ease-stage
  `;

  // Padding styles
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  // Background styles
  const backgroundStyles = {
    primary: 'bg-bg-primary',
    secondary: 'bg-bg-secondary',
    transparent: 'bg-transparent',
  };

  // Glow styles
  const glowStyles = glow ? 'shadow-glow' : '';

  // Hover styles
  const hoverStyles = hoverable ? 'hover:scale-[1.02] hover:shadow-lg cursor-pointer' : '';

  // Combine all styles
  const combinedClassName = `
    ${baseStyles}
    ${paddingStyles[padding]}
    ${backgroundStyles[background]}
    ${glowStyles}
    ${hoverStyles}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={combinedClassName} {...props}>
      {children}
    </div>
  );
}

/**
 * Card Header Component
 */
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Header content
   */
  children: React.ReactNode;
}

export function CardHeader({ children, className = '', ...props }: CardHeaderProps) {
  return (
    <div
      className={`mb-4 ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Card Title Component
 */
export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /**
   * Title content
   */
  children: React.ReactNode;

  /**
   * Heading level
   * @default 'h3'
   */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export function CardTitle({ children, as = 'h3', className = '', ...props }: CardTitleProps) {
  const Component = as;

  return (
    <Component
      className={`text-xl font-semibold text-text-primary font-display ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * Card Description Component
 */
export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /**
   * Description content
   */
  children: React.ReactNode;
}

export function CardDescription({ children, className = '', ...props }: CardDescriptionProps) {
  return (
    <p
      className={`text-text-secondary font-body leading-body ${className}`.trim()}
      {...props}
    >
      {children}
    </p>
  );
}

/**
 * Card Content Component
 */
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Content
   */
  children: React.ReactNode;
}

export function CardContent({ children, className = '', ...props }: CardContentProps) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

/**
 * Card Footer Component
 */
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Footer content
   */
  children: React.ReactNode;
}

export function CardFooter({ children, className = '', ...props }: CardFooterProps) {
  return (
    <div
      className={`mt-4 pt-4 border-t border-bg-primary/50 ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
