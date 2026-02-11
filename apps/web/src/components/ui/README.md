# Hemisphere UI Components

Stage-aware React components that automatically adapt their styling based on the current learning stage (Encounter, Analysis, Return).

## Core Principles

### Stage Awareness

All components respond to the `data-stage` attribute on their container or ancestor element:

- **Encounter** (RH-Primary): Warm colors, organic shapes, slower motion, serif typography
- **Analysis** (LH-Primary): Cool colors, geometric shapes, quick motion, sans-serif typography
- **Return** (RH-Primary, Enriched): Deep warm colors, rich shapes, contemplative motion, serif typography

### Design Tokens

Components use CSS custom properties from `tokens.css` that automatically update based on stage:

```css
/* Stage-aware tokens */
--bg-primary
--bg-secondary
--text-primary
--text-secondary
--accent-primary
--accent-secondary
--radius-element
--radius-card
--duration-short
--ease
```

## Components

### Button

Multi-variant button with stage-aware styling, loading states, and accessibility features.

```tsx
import { Button } from '@/components/ui';

// Basic usage
<Button variant="primary" onClick={handleClick}>
  Click Me
</Button>

// With states
<Button variant="secondary" size="lg" loading disabled>
  Submit
</Button>

// With icons
<Button iconBefore={<Icon />} iconAfter={<Icon />}>
  Action
</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'ghost' | 'danger'
- `size`: 'sm' | 'md' | 'lg'
- `fullWidth`: boolean
- `loading`: boolean
- `disabled`: boolean
- `iconBefore`, `iconAfter`: React.ReactNode

### Card

Flexible container component with subcomponents for structured layouts.

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui';

<Card glow hoverable>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description text</CardDescription>
  </CardHeader>
  <CardContent>
    Main content here
  </CardContent>
  <CardFooter>
    Footer actions
  </CardFooter>
</Card>
```

**Props:**
- `glow`: boolean - Stage-aware glow effect
- `hoverable`: boolean - Scale on hover
- `padding`: 'none' | 'sm' | 'md' | 'lg'
- `background`: 'primary' | 'secondary' | 'transparent'

### Input

Text input with label, validation states, and icon support.

```tsx
import { Input } from '@/components/ui';

<Input
  label="Email"
  type="email"
  placeholder="you@example.com"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  helperText="We'll never share your email"
  error={errors.email}
  required
/>
```

**Props:**
- `type`: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
- `size`: 'sm' | 'md' | 'lg'
- `label`: string
- `helperText`: string
- `error`: string
- `success`: boolean
- `fullWidth`: boolean
- `iconBefore`, `iconAfter`: React.ReactNode

### TextArea

Multi-line text input with character counting and auto-resize.

```tsx
import { TextArea } from '@/components/ui';

<TextArea
  label="Description"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  minRows={4}
  maxRows={10}
  autoResize
  showCount
  maxLength={500}
  helperText="Provide a detailed description"
/>
```

**Props:**
- `size`: 'sm' | 'md' | 'lg'
- `label`: string
- `helperText`: string
- `error`: string
- `success`: boolean
- `fullWidth`: boolean
- `showCount`: boolean
- `autoResize`: boolean
- `minRows`: number
- `maxRows`: number

### Progress

Linear and circular progress indicators with multiple variants.

```tsx
import { Progress, CircularProgress, IndeterminateProgress } from '@/components/ui';

// Linear progress
<Progress
  value={75}
  variant="success"
  showLabel
  showPercentage
  label="Completion"
/>

// Circular progress
<CircularProgress
  value={65}
  size="lg"
  variant="default"
/>

// Indeterminate (loading)
<IndeterminateProgress variant="default" />
```

**Props:**

Progress:
- `value`: number (0-100)
- `variant`: 'default' | 'success' | 'warning' | 'error'
- `size`: 'sm' | 'md' | 'lg'
- `showLabel`: boolean
- `showPercentage`: boolean
- `label`: string
- `animated`: boolean

CircularProgress:
- `value`: number (0-100)
- `variant`: 'default' | 'success' | 'warning' | 'error'
- `size`: 'sm' | 'md' | 'lg' | 'xl'
- `showPercentage`: boolean
- `label`: string
- `strokeWidth`: number

### TopBar

Top navigation bar with title, back button, and actions.

```tsx
import { TopBar, TopBarAction } from '@/components/ui';

<TopBar
  title="Page Title"
  showBack
  onBack={() => router.back()}
  sticky
  actions={
    <>
      <TopBarAction
        icon={<SearchIcon />}
        label="Search"
        onClick={handleSearch}
      />
      <TopBarAction
        icon={<SettingsIcon />}
        label="Settings"
        onClick={handleSettings}
      />
    </>
  }
/>
```

**Props:**
- `title`: string
- `showBack`: boolean
- `onBack`: () => void
- `actions`: React.ReactNode
- `leftContent`, `centerContent`, `rightContent`: React.ReactNode
- `sticky`: boolean
- `showBorder`: boolean
- `blur`: boolean
- `transparent`: boolean

### BottomNav

Bottom navigation bar for mobile-first navigation.

```tsx
import { BottomNav, HomeIcon, ExploreIcon } from '@/components/ui';

const navItems = [
  {
    id: 'home',
    label: 'Home',
    icon: <HomeIcon />,
    onClick: () => navigate('/'),
  },
  {
    id: 'explore',
    label: 'Explore',
    icon: <ExploreIcon />,
    badge: 3,
    onClick: () => navigate('/explore'),
  },
];

<BottomNav
  items={navItems}
  activeId="home"
  showLabels
/>
```

**Props:**
- `items`: BottomNavItem[]
- `activeId`: string
- `showLabels`: boolean
- `blur`: boolean
- `showBorder`: boolean

**BottomNavItem:**
```typescript
{
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}
```

## Usage Examples

### Stage-Aware Layout

```tsx
'use client';

import { useState } from 'react';
import { TopBar, Card, Button, BottomNav } from '@/components/ui';
import type { LearningStage } from '@/types';

export function MyPage() {
  const [stage, setStage] = useState<LearningStage>('encounter');

  return (
    <div data-stage={stage} className="min-h-screen-safe bg-bg-primary stage-transition">
      <TopBar title="My Page" />

      <main className="max-w-content-reading mx-auto p-6">
        <Card>
          <h2>Stage: {stage}</h2>
          <Button onClick={() => setStage('analysis')}>
            Switch to Analysis
          </Button>
        </Card>
      </main>

      <BottomNav items={navItems} activeId="home" />
    </div>
  );
}
```

### Form Example

```tsx
import { useState } from 'react';
import { Card, CardContent, Input, TextArea, Button } from '@/components/ui';

export function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validation and submission logic
  };

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            required
          />

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            required
          />

          <TextArea
            label="Message"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            minRows={4}
            autoResize
            showCount
            maxLength={500}
            error={errors.message}
            required
          />

          <Button type="submit" fullWidth>
            Send Message
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

## Accessibility

All components follow WCAG 2.1 AA standards:

- Semantic HTML elements
- ARIA labels and roles
- Keyboard navigation support
- Focus indicators
- Screen reader friendly
- Color contrast compliance
- Motion preferences respected

## Testing

To view all components in action, use the Showcase component:

```tsx
import { UIShowcase } from '@/components/ui/Showcase';

export default function ShowcasePage() {
  return <UIShowcase />;
}
```

## Customization

Components can be customized via:

1. **Tailwind classes**: Pass additional classes via `className` prop
2. **Design tokens**: Modify values in `tokens.css`
3. **Composition**: Use subcomponents for flexible layouts
4. **Props**: Most components accept standard HTML attributes

Example:
```tsx
<Button
  className="shadow-lg hover:shadow-xl"
  style={{ minWidth: '200px' }}
>
  Custom Button
</Button>
```
