import { StageComparison } from '@/components/StageExample';

export default function Home() {
  return (
    <main className="min-h-screen bg-bg-primary">
      <div className="container mx-auto py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold text-text-primary mb-4">
            Hemisphere Design System
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Stage-aware design tokens for the three learning stages: Encounter, Analysis, and Return
          </p>
        </div>

        <StageComparison />

        <div className="mt-12 text-center">
          <p className="text-sm text-text-secondary">
            Each stage has its own color palette, typography, motion, and spacing.
          </p>
        </div>
      </div>
    </main>
  );
}
