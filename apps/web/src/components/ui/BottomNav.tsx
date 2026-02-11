/**
 * BottomNav Component
 *
 * Stage-aware bottom navigation bar for mobile-first navigation.
 * Supports multiple nav items with icons, labels, and active states.
 */

import React from 'react';

export interface BottomNavItem {
  /**
   * Unique identifier
   */
  id: string;

  /**
   * Navigation label
   */
  label: string;

  /**
   * Icon component or element
   */
  icon: React.ReactNode;

  /**
   * Optional badge count
   */
  badge?: number;

  /**
   * Click handler
   */
  onClick?: () => void;

  /**
   * Custom href for link navigation
   */
  href?: string;

  /**
   * Disabled state
   * @default false
   */
  disabled?: boolean;
}

export interface BottomNavProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Navigation items
   */
  items: BottomNavItem[];

  /**
   * Currently active item ID
   */
  activeId?: string;

  /**
   * Show labels
   * @default true
   */
  showLabels?: boolean;

  /**
   * Background blur effect
   * @default true
   */
  blur?: boolean;

  /**
   * Show top border
   * @default true
   */
  showBorder?: boolean;
}

export function BottomNav({
  items,
  activeId,
  showLabels = true,
  blur = true,
  showBorder = true,
  className = '',
  ...props
}: BottomNavProps) {
  // Base styles
  const baseStyles = `
    fixed bottom-0 left-0 right-0
    flex items-center justify-around
    w-full px-2 py-2 safe-bottom
    transition-all duration-short ease-stage
    z-50
  `;

  // Background styles
  const backgroundStyles = blur
    ? 'bg-bg-primary/95 backdrop-blur-sm'
    : 'bg-bg-primary';

  // Border styles
  const borderStyles = showBorder ? 'border-t border-bg-secondary' : '';

  // Combine all styles
  const combinedClassName = `
    ${baseStyles}
    ${backgroundStyles}
    ${borderStyles}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <nav
      className={combinedClassName}
      role="navigation"
      aria-label="Bottom navigation"
      {...props}
    >
      {items.map((item) => (
        <BottomNavItem
          key={item.id}
          item={item}
          isActive={item.id === activeId}
          showLabel={showLabels}
        />
      ))}
    </nav>
  );
}

/**
 * BottomNav Item Component
 */
interface BottomNavItemProps {
  item: BottomNavItem;
  isActive: boolean;
  showLabel: boolean;
}

function BottomNavItem({ item, isActive, showLabel }: BottomNavItemProps) {
  const { label, icon, badge, onClick, href, disabled } = item;

  // Base styles
  const baseStyles = `
    relative flex flex-col items-center justify-center gap-1
    min-w-[64px] px-3 py-2 rounded-element
    transition-all duration-short ease-stage
    focus:outline-none focus:ring-2 focus:ring-accent-primary
  `;

  // State styles
  const stateStyles = disabled
    ? 'opacity-40 cursor-not-allowed'
    : isActive
    ? 'text-accent-primary'
    : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary';

  // Combine styles
  const combinedClassName = `
    ${baseStyles}
    ${stateStyles}
  `.trim().replace(/\s+/g, ' ');

  // Common content
  const content = (
    <>
      {/* Icon with badge */}
      <div className="relative">
        <div className={`w-6 h-6 ${isActive ? 'scale-110' : ''}`.trim()}>
          {icon}
        </div>
        {badge !== undefined && badge > 0 && (
          <span
            className="
              absolute -top-1 -right-1
              flex items-center justify-center
              min-w-[18px] h-[18px] px-1
              text-xs font-semibold
              bg-error text-neutral-white
              rounded-full
            "
            aria-label={`${badge} notifications`}
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>

      {/* Label */}
      {showLabel && (
        <span
          className={`
            text-xs font-medium truncate max-w-full
            transition-all duration-short ease-stage
            ${isActive ? 'font-semibold' : ''}
          `.trim().replace(/\s+/g, ' ')}
        >
          {label}
        </span>
      )}

      {/* Active indicator */}
      {isActive && (
        <div
          className="
            absolute -top-1 left-1/2 -translate-x-1/2
            w-12 h-1 rounded-full
            bg-accent-primary
          "
          aria-hidden="true"
        />
      )}
    </>
  );

  // Render as link or button
  if (href && !disabled) {
    return (
      <a
        href={href}
        className={combinedClassName}
        aria-label={label}
        aria-current={isActive ? 'page' : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={combinedClassName}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      type="button"
    >
      {content}
    </button>
  );
}

/**
 * Common icon components for BottomNav
 */

export function HomeIcon() {
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
        d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 22V12H15V22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ExploreIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r="8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 21L16.65 16.65"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BookmarkIcon() {
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
        d="M19 21L12 16L5 21V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H17C17.5304 3 18.0391 3.21071 18.4142 3.58579C18.7893 3.96086 19 4.46957 19 5V21Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ProfileIcon() {
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
        d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="7"
        r="4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
