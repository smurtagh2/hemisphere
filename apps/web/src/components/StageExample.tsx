/**
 * Stage Example Component
 *
 * Demonstrates how to use stage-aware design tokens in components.
 * This component shows the visual differences between the three learning stages.
 */

import React from 'react';

type LearningStage = 'encounter' | 'analysis' | 'return';

interface StageExampleProps {
  stage: LearningStage;
  children: React.ReactNode;
}

export function StageExample({ stage, children }: StageExampleProps) {
  return (
    <div
      data-stage={stage}
      className="stage-transition min-h-screen-safe bg-bg-primary text-text-primary p-6"
    >
      <div className="max-w-content-reading mx-auto">
        {/* Stage indicator */}
        <div className="stage-indicator mb-8">
          <span className="stage-indicator-dot" />
          <span className="capitalize">{stage} Stage</span>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Card component with stage-aware styling
 */
interface StageCardProps {
  title: string;
  description: string;
  highlight?: boolean;
}

export function StageCard({ title, description, highlight = false }: StageCardProps) {
  return (
    <div
      className={`
        card
        ${highlight ? 'card-glow' : ''}
        transition-all duration-medium ease-stage
        hover:scale-[1.02]
      `}
    >
      <h3 className="text-xl font-semibold mb-3 text-text-primary">
        {title}
      </h3>
      <p className="text-text-secondary font-body leading-body">
        {description}
      </p>
    </div>
  );
}

/**
 * Button component with stage-aware styling
 */
interface StageButtonProps {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
  onClick?: () => void;
}

export function StageButton({ variant = 'primary', children, onClick }: StageButtonProps) {
  const className = variant === 'primary' ? 'btn btn-primary' : 'btn btn-secondary';

  return (
    <button
      className={className}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/**
 * Input component with stage-aware styling
 */
interface StageInputProps {
  label: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  multiline?: boolean;
}

export function StageInput({
  label,
  placeholder,
  value,
  onChange,
  multiline = false,
}: StageInputProps) {
  const InputElement = multiline ? 'textarea' : 'input';
  const className = multiline ? 'input textarea' : 'input';

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-primary">
        {label}
      </label>
      <InputElement
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
}

/**
 * Progress bar component with stage-aware styling
 */
interface StageProgressProps {
  value: number; // 0-100
  label?: string;
}

export function StageProgress({ value, label }: StageProgressProps) {
  return (
    <div className="space-y-2">
      {label && (
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">{label}</span>
          <span className="text-text-primary font-medium">{value}%</span>
        </div>
      )}
      <div className="progress-bar">
        <div
          className="progress-bar-fill"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Full example page showing all three stages
 */
export function StageComparison() {
  return (
    <div className="grid md:grid-cols-3 gap-4 p-4">
      {/* Encounter Stage */}
      <div data-stage="encounter" className="stage-transition bg-bg-primary p-6 rounded-card">
        <h2 className="text-2xl font-display font-bold mb-4 text-text-primary">
          Encounter
        </h2>
        <p className="text-text-secondary mb-6 font-encounter">
          Warm, inviting, and expansive. This stage uses organic shapes and flowing motion.
        </p>
        <StageCard
          title="The Hook"
          description="An intriguing question or paradox that invites curiosity and open exploration."
          highlight
        />
      </div>

      {/* Analysis Stage */}
      <div data-stage="analysis" className="stage-transition bg-bg-primary p-6 rounded-card">
        <h2 className="text-2xl font-display font-bold mb-4 text-text-primary">
          Analysis
        </h2>
        <p className="text-text-secondary mb-6 font-analysis">
          Cool, structured, and precise. This stage uses geometric shapes and quick motion.
        </p>
        <StageCard
          title="Practice"
          description="Focused exercises with immediate feedback to build precise understanding."
        />
      </div>

      {/* Return Stage */}
      <div data-stage="return" className="stage-transition bg-bg-primary p-6 rounded-card">
        <h2 className="text-2xl font-display font-bold mb-4 text-text-primary">
          Return
        </h2>
        <p className="text-text-secondary mb-6 font-encounter">
          Deep, reflective, and integrative. This stage uses rich colors and slow motion.
        </p>
        <StageCard
          title="Integration"
          description="Return to the whole with new understanding, making connections across contexts."
          highlight
        />
      </div>
    </div>
  );
}
