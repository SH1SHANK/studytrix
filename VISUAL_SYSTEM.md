# Visual System

## Design Intent

Studytrix implements an **Academic Premium** design language. It should feel focused, readable, and tactile across mobile-first academic workflows, bridging the gap between a utility tool and a refined workspace.

Core principles:
- **Clarity over Clutter**: Fast comprehension over visual noise.
- **Hierarchy**: Strong visual distinction between departments, courses, folders, and files.
- **Intentionality**: Touch-friendly interactions with explicit feedback loops.
- **Orienting Motion**: Subtle animations that support spatial orientation rather than decoration.

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

### Folder and File Interactions

- **Standard Tap**: Immediate navigation or preview launch.
- **Long-Press (Tactile)**: Triggers haptic feedback and opens the contextual action menu (Share, Star, Offline, Delete).
- **Persistent Grid Menus**: For desktop/tablet layouts, actions are accessible via a secondary menu trigger within the entity card.
- **Hover Transitions**: Subtle surface tint and elevation shift to indicate interactivity.
- **Selection State**: Indicated via high-contrast borders and badge states, ensuring visibility across different device brightness levels.

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

## Feedback Systems

- **Tactile Feedback**: Medium-impact haptics on long-press menu triggers and high-value actions (Offline toggle, ZIP generation).
- **Visual Affirmation**: Use of "Sonner" toasts for action confirmations (e.g., "ZIP Ready", "Download Started").
- **Motion Persistence**: All menu entries use a coordinated staggered entry (Framer Motion) to guide the eye toward primary actions.

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
