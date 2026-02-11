/**
 * UI Components Showcase
 *
 * Demonstrates all UI primitives across the three learning stages.
 * Use this as a reference for component usage and stage-aware behavior.
 */

'use client';

import React, { useState } from 'react';
import type { LearningStage } from '../../types';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  TextArea,
  Progress,
  CircularProgress,
  IndeterminateProgress,
  TopBar,
  TopBarAction,
  BottomNav,
  HomeIcon,
  ExploreIcon,
  BookmarkIcon,
  ProfileIcon,
} from './index';

export function UIShowcase() {
  const [stage, setStage] = useState<LearningStage>('encounter');
  const [activeNav, setActiveNav] = useState('home');
  const [inputValue, setInputValue] = useState('');
  const [textareaValue, setTextareaValue] = useState('');
  const [progress, setProgress] = useState(65);

  const navItems = [
    { id: 'home', label: 'Home', icon: <HomeIcon />, onClick: () => setActiveNav('home') },
    { id: 'explore', label: 'Explore', icon: <ExploreIcon />, onClick: () => setActiveNav('explore') },
    { id: 'saved', label: 'Saved', icon: <BookmarkIcon />, badge: 3, onClick: () => setActiveNav('saved') },
    { id: 'profile', label: 'Profile', icon: <ProfileIcon />, onClick: () => setActiveNav('profile') },
  ];

  return (
    <div
      data-stage={stage}
      className="min-h-screen-safe bg-bg-primary stage-transition pb-20"
    >
      {/* Top Navigation */}
      <TopBar
        title="UI Components"
        showBack
        onBack={() => console.log('Back clicked')}
        actions={
          <TopBarAction
            icon={<SettingsIcon />}
            label="Settings"
            onClick={() => console.log('Settings clicked')}
          />
        }
      />

      {/* Main Content */}
      <div className="max-w-content-dashboard mx-auto p-6 space-y-8">
        {/* Stage Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Learning Stage</CardTitle>
            <CardDescription>
              Switch between stages to see how components adapt their styling
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant={stage === 'encounter' ? 'primary' : 'secondary'}
                onClick={() => setStage('encounter')}
              >
                Encounter
              </Button>
              <Button
                variant={stage === 'analysis' ? 'primary' : 'secondary'}
                onClick={() => setStage('analysis')}
              >
                Analysis
              </Button>
              <Button
                variant={stage === 'return' ? 'primary' : 'secondary'}
                onClick={() => setStage('return')}
              >
                Return
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>
              Stage-aware buttons with multiple variants and sizes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Variants */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-text-secondary">Variants</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
              </div>
            </div>

            {/* Sizes */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-text-secondary">Sizes</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
            </div>

            {/* States */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-text-secondary">States</p>
              <div className="flex flex-wrap gap-2">
                <Button disabled>Disabled</Button>
                <Button loading>Loading</Button>
                <Button fullWidth>Full Width</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards */}
        <Card>
          <CardHeader>
            <CardTitle>Cards</CardTitle>
            <CardDescription>
              Flexible container components with optional glow effects
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card hoverable>
                <CardHeader>
                  <CardTitle as="h4">Hoverable Card</CardTitle>
                  <CardDescription>
                    Hover over me for a subtle scale effect
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card glow>
                <CardHeader>
                  <CardTitle as="h4">Glow Card</CardTitle>
                  <CardDescription>
                    Stage-aware glow effect (visible in RH stages)
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle>Form Inputs</CardTitle>
            <CardDescription>
              Text inputs and textareas with validation states
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="Enter your email"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              helperText="We'll never share your email"
            />

            <Input
              label="Error State"
              type="text"
              error="This field is required"
            />

            <Input
              label="Success State"
              type="text"
              success
              value="Valid input"
              onChange={() => {}}
            />

            <TextArea
              label="Description"
              placeholder="Enter a description..."
              value={textareaValue}
              onChange={(e) => setTextareaValue(e.target.value)}
              helperText="Maximum 500 characters"
              showCount
              maxLength={500}
              minRows={4}
            />
          </CardContent>
        </Card>

        {/* Progress Bars */}
        <Card>
          <CardHeader>
            <CardTitle>Progress Indicators</CardTitle>
            <CardDescription>
              Linear and circular progress with variants
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Linear Progress */}
            <div className="space-y-4">
              <p className="text-sm font-medium text-text-secondary">Linear Progress</p>
              <Progress value={progress} showLabel showPercentage label="Completion" />

              <div className="flex gap-2">
                <Button size="sm" onClick={() => setProgress(Math.max(0, progress - 10))}>
                  -10%
                </Button>
                <Button size="sm" onClick={() => setProgress(Math.min(100, progress + 10))}>
                  +10%
                </Button>
              </div>

              <Progress value={75} variant="success" showPercentage />
              <Progress value={50} variant="warning" showPercentage />
              <Progress value={25} variant="error" showPercentage />
              <IndeterminateProgress />
            </div>

            {/* Circular Progress */}
            <div className="space-y-4">
              <p className="text-sm font-medium text-text-secondary">Circular Progress</p>
              <div className="flex flex-wrap gap-6">
                <CircularProgress value={progress} size="sm" />
                <CircularProgress value={progress} size="md" />
                <CircularProgress value={progress} size="lg" />
                <CircularProgress value={100} size="md" variant="success" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stage Information */}
        <Card glow>
          <CardHeader>
            <CardTitle>Current Stage: {stage}</CardTitle>
            <CardDescription>
              {stage === 'encounter' && 'Warm, organic, expansive - Right Hemisphere primary'}
              {stage === 'analysis' && 'Cool, precise, structured - Left Hemisphere primary'}
              {stage === 'return' && 'Deep warm, reflective - Right Hemisphere enriched'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-text-primary font-body leading-body">
              Notice how the colors, typography, spacing, and motion timing all shift
              to support the current learning stage. This creates a cohesive experience
              that reinforces the attentional mode.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="secondary" fullWidth>
              Learn More About Stages
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <BottomNav items={navItems} activeId={activeNav} />
    </div>
  );
}

/**
 * Settings Icon
 */
function SettingsIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 1V3M12 21V23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M1 12H3M21 12H23M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
