/**
 * TopBar Component
 *
 * Stage-aware top navigation bar with title, actions, and back button support.
 * Automatically adapts styling based on the current learning stage.
 */

import React from 'react';

export interface TopBarProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * TopBar title
   */
  title?: string;

  /**
   * Show back button
   * @default false
   */
  showBack?: boolean;

  /**
   * Back button click handler
   */
  onBack?: () => void;

  /**
   * Actions to display on the right side
   */
  actions?: React.ReactNode;

  /**
   * Left side content (overrides back button and title if provided)
   */
  leftContent?: React.ReactNode;

  /**
   * Center content (overrides title if provided)
   */
  centerContent?: React.ReactNode;

  /**
   * Right side content (overrides actions if provided)
   */
  rightContent?: React.ReactNode;

  /**
   * Sticky positioning
   * @default true
   */
  sticky?: boolean;

  /**
   * Show bottom border
   * @default true
   */
  showBorder?: boolean;

  /**
   * Background blur effect
   * @default true
   */
  blur?: boolean;

  /**
   * Transparent background
   * @default false
   */
  transparent?: boolean;
}

export function TopBar({
  title,
  showBack = false,
  onBack,
  actions,
  leftContent,
  centerContent,
  rightContent,
  sticky = true,
  showBorder = true,
  blur = true,
  transparent = false,
  className = '',
  children,
  ...props
}: TopBarProps) {
  // Base styles
  const baseStyles = `
    flex items-center justify-between gap-4
    w-full px-4 py-3 safe-top
    transition-all duration-short ease-stage
    z-50
  `;

  // Position styles
  const positionStyles = sticky ? 'sticky top-0' : 'relative';

  // Background styles
  const backgroundStyles = transparent
    ? 'bg-transparent'
    : blur
    ? 'bg-bg-primary/95 backdrop-blur-sm'
    : 'bg-bg-primary';

  // Border styles
  const borderStyles = showBorder ? 'border-b border-bg-secondary' : '';

  // Combine all styles
  const combinedClassName = `
    ${baseStyles}
    ${positionStyles}
    ${backgroundStyles}
    ${borderStyles}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <header className={combinedClassName} {...props}>
      {/* Left section */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {leftContent ? (
          leftContent
        ) : (
          <>
            {showBack && (
              <button
                onClick={onBack}
                className="
                  p-2 -ml-2 rounded-element
                  text-text-primary hover:bg-bg-secondary
                  transition-colors duration-short ease-stage
                  focus:outline-none focus:ring-2 focus:ring-accent-primary
                "
                aria-label="Go back"
              >
                <BackIcon />
              </button>
            )}
            {title && (
              <h1 className="text-lg font-semibold text-text-primary truncate">
                {title}
              </h1>
            )}
          </>
        )}
      </div>

      {/* Center section */}
      {centerContent && (
        <div className="flex items-center justify-center flex-shrink-0">
          {centerContent}
        </div>
      )}

      {/* Right section */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {rightContent ? rightContent : actions}
      </div>

      {/* Optional children (e.g., search bar below) */}
      {children}
    </header>
  );
}

/**
 * TopBar Action Button
 */
export interface TopBarActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Icon to display
   */
  icon: React.ReactNode;

  /**
   * Action label (for accessibility)
   */
  label: string;
}

export function TopBarAction({
  icon,
  label,
  className = '',
  ...props
}: TopBarActionProps) {
  return (
    <button
      className={`
        p-2 rounded-element
        text-text-primary hover:bg-bg-secondary
        transition-colors duration-short ease-stage
        focus:outline-none focus:ring-2 focus:ring-accent-primary
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      aria-label={label}
      {...props}
    >
      {icon}
    </button>
  );
}

/**
 * TopBar Title Component (for custom layouts)
 */
export interface TopBarTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export function TopBarTitle({ children, className = '', ...props }: TopBarTitleProps) {
  return (
    <h1
      className={`text-lg font-semibold text-text-primary ${className}`.trim()}
      {...props}
    >
      {children}
    </h1>
  );
}

/**
 * Back Icon Component
 */
function BackIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M15 18L9 12L15 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
