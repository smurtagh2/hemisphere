/**
 * UI Components Index
 *
 * Centralized exports for all Hemisphere UI primitives.
 * These components are stage-aware and automatically adapt their styling
 * based on the current learning stage (Encounter, Analysis, Return).
 */

// Button
export { Button } from './Button';
export type { ButtonProps } from './Button';

// Card
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './Card';
export type {
  CardProps,
  CardHeaderProps,
  CardTitleProps,
  CardDescriptionProps,
  CardContentProps,
  CardFooterProps,
} from './Card';

// Input
export { Input } from './Input';
export type { InputProps } from './Input';

// TextArea
export { TextArea } from './TextArea';
export type { TextAreaProps } from './TextArea';

// Progress
export { Progress, CircularProgress, IndeterminateProgress } from './Progress';
export type {
  ProgressProps,
  CircularProgressProps,
  IndeterminateProgressProps,
} from './Progress';

// TopBar
export { TopBar, TopBarAction, TopBarTitle } from './TopBar';
export type { TopBarProps, TopBarActionProps, TopBarTitleProps } from './TopBar';

// BottomNav
export {
  BottomNav,
  HomeIcon,
  ExploreIcon,
  BookmarkIcon,
  ProfileIcon,
} from './BottomNav';
export type { BottomNavProps, BottomNavItem } from './BottomNav';

// ThemeToggle
export { ThemeToggle } from './ThemeToggle';
