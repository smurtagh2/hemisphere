/**
 * Hemisphere Type Definitions
 *
 * Shared TypeScript types for the Hemisphere learning application.
 */

/**
 * Learning Stage Types
 *
 * Three learning stages based on McGilchrist's hemisphere framework:
 * - Encounter (RH-Primary): Open, exploratory, holistic
 * - Analysis (LH-Primary): Focused, precise, analytical
 * - Return (RH-Primary, Enriched): Integrative, reflective, deepened
 */
export type LearningStage = 'encounter' | 'analysis' | 'return';

/**
 * Theme Types
 */
export type Theme = 'light' | 'dark';

/**
 * Component Size Variants
 */
export type ComponentSize = 'sm' | 'md' | 'lg';

/**
 * Button Variants
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/**
 * Input Types
 */
export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';

/**
 * Navigation Position
 */
export type NavPosition = 'top' | 'bottom';

/**
 * Progress Variant
 */
export type ProgressVariant = 'default' | 'success' | 'warning' | 'error';
