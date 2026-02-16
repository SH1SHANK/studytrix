# Visual System

## Design Intent

Studytrix UI should feel focused, readable, and tactile across mobile-first academic workflows.

Core principles:

- Fast comprehension over visual noise.
- Strong hierarchy between course, folder, and file states.
- Touch-friendly interactions with clear feedback.
- Subtle motion that supports orientation, not decoration.

## Typography

- Heading and navigation family: `Outfit`
- Body and metadata family: `Switzer`
- Weight range: `400`, `500`, `600`
- Keep dense data readable with consistent line-height and spacing rhythm.

## Color and Surface Language

- Neutral base surfaces with warm stone palette.
- Accent for primary actions and active states.
- Elevated surfaces for command and contextual menus.
- Interactive states must always define hover, active, and focus-visible variants.

## Layout System

### Mobile-First Frame

- Header with contextual academic state.
- Scrollable content body for dashboard/file lists.
- Persistent command affordance near bottom safe area.

### Spacing Rhythm

- 4px scale: `4, 8, 12, 16, 20, 24, 32`
- Card internals prioritize `12-16px` padding for compact scanability.
- Row heights target at least `44px` for touch reliability.

## Component Interaction Patterns

### Folder and File Rows

- Hover: subtle tint or elevation only.
- Active/pressed: quick scale down and stronger surface shift.
- Selection: accent border or badge state, never color-only semantics.

### Popovers and Menus

- Clear sectioning: primary actions, utility actions, destructive actions.
- Menu body should favor short labels + descriptive secondary text where needed.
- Destructive actions separated with spacing and warning styling.

### Modal and Dialog Behavior

- Use concise title + purpose-driven description.
- Primary action placement must be consistent.
- Include keyboard escape, click outside, and explicit close affordances.

## Motion Guidelines

- Allowed: opacity + transform transitions.
- Keep durations between `120ms` and `220ms`.
- Use easing that decelerates into final state.
- Stagger list reveals only for first-load context building.

## Haptic and Feedback Guidelines

- Trigger light haptic feedback on high-value mobile actions:
  - Open file actions menu
  - Confirm download/offline toggle
  - Destructive confirmations
- Pair haptics with visible state change; never rely on haptics alone.

## Accessibility Baseline

- Minimum `44x44px` interactive targets.
- Keyboard navigation for command and menu flows.
- WCAG AA contrast for text and control states.
- Focus-visible rings on all actionable controls.

## Performance and UX Optimizations

- Avoid layout-shifting animations.
- Memoize heavy lists and virtualize when list depth grows.
- Keep shadows and blur effects restrained for mobile GPU efficiency.
- Load media progressively and stream where possible.

## Content Tone

- Action labels should be explicit and short.
- Helper text should clarify impact, not repeat label text.
- Error copy should be calm, actionable, and non-technical.
