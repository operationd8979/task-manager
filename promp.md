# Mobile Application Standards

This repository contains the complete product specification for a React Native application.

The implementation MUST follow the standards below unless the specification explicitly overrides them.

---

# General Principles

- Mobile-first experience.
- Native feeling instead of web feeling.
- Production-ready architecture.
- Clean architecture.
- Reusable components.
- Generic implementation instead of feature-specific code.
- High maintainability.
- Consistent code style.
- Accessibility by default.
- Offline-friendly whenever possible.

---

# UX Principles

The application should feel like a premium native mobile application.

Every screen should satisfy:

- Complete common tasks within 1–2 user interactions.
- Never require unnecessary navigation.
- Minimize typing.
- Always prefer selection over typing.
- Always provide sensible default values.
- Reduce cognitive load.
- Keep layouts clean and uncluttered.
- Important actions should always be visible.

---

# Mobile Interaction

Prefer native mobile interactions.

Use gestures whenever appropriate.

Examples include:

- Swipe actions
- Pull to refresh
- Drag and drop
- Bottom sheet
- Long press actions
- Floating Action Button
- Haptic feedback
- Native date/time pickers
- Infinite scrolling
- Momentum scrolling
- Sticky headers

Avoid interactions that feel like desktop websites.

---

# UI Design

Use a clean modern design.

Requirements:

- Consistent spacing system.
- Consistent typography.
- Consistent color palette.
- Consistent elevation/shadow.
- Rounded corners.
- Proper empty states.
- Proper loading skeletons.
- Proper error states.
- Proper success feedback.

Never leave blank screens.

---

# User Friendly Defaults

Every form should:

- Preselect reasonable defaults.
- Remember previous selections whenever possible.
- Autofocus only when appropriate.
- Reduce manual input.
- Validate while typing.
- Show actionable error messages.

---

# Navigation

Navigation should feel fast.

Prefer:

- Bottom tabs
- Stack navigation
- Bottom sheets
- Modal for temporary workflows

Avoid deep navigation chains.

---

# Performance

Optimize for low-end devices.

Requirements:

- Virtualized lists.
- Lazy loading.
- Memoization where appropriate.
- Avoid unnecessary re-rendering.
- Avoid unnecessary network requests.
- Avoid duplicated state.
- Keep bundle size small.
- Avoid blocking the JS thread.

---

# Memory Management

Prevent memory leaks.

Always:

- Remove listeners.
- Cancel timers.
- Cancel network requests.
- Dispose subscriptions.
- Clean up animations.
- Release camera resources.
- Release microphone resources.
- Release websocket connections.

Never leave resources alive after screen unmount.

---

# State Management

Use predictable state.

Rules:

- Local state when possible.
- Shared state only when necessary.
- Avoid deeply nested state.
- Normalize data.
- Avoid duplicated sources of truth.

---

# Error Handling

Every async operation must include:

- Loading state
- Success state
- Empty state
- Error state
- Retry action

Never silently ignore failures.

---

# Theming

All UI must support centralized theming.

Requirements:

- Single source of truth.
- Light mode.
- Dark mode.
- Semantic colors.
- Component tokens.
- Typography tokens.
- Spacing tokens.
- Radius tokens.

Hardcoded colors are forbidden.

---

# Accessibility

Every screen must support:

- Screen readers.
- Dynamic font scaling.
- Proper touch targets.
- High contrast.
- Keyboard accessibility where applicable.

---

# Component Standards

Components should be:

- Small
- Reusable
- Generic
- Testable

Avoid large monolithic components.

---

# Forms

Forms should:

- Validate immediately.
- Show inline validation.
- Keep entered values.
- Support keyboard navigation.
- Scroll automatically to invalid fields.

---

# Lists

Lists should support:

- Pull to refresh.
- Infinite loading.
- Skeleton loading.
- Empty state.
- Search.
- Filtering.
- Sorting.
- Swipe actions when meaningful.

---

# Animations

Animations should:

- Be subtle.
- Run at 60 FPS.
- Never block interaction.
- Improve usability rather than decoration.

---

# Code Quality

Generate production-quality code.

Requirements:

- Strong TypeScript typing.
- No any.
- No duplicated logic.
- No dead code.
- No magic numbers.
- Meaningful naming.
- Clear folder structure.

---

# Testing

Business logic should be testable.

Generate code that is compatible with:

- Unit tests
- Component tests
- Integration tests

---

# Security

Never:

- Store secrets in source code.
- Log sensitive data.
- Expose API keys.
- Trust client-side validation.

---

# Output Expectation

Every generated feature should include:

- Native mobile UX
- Production-ready architecture
- High performance
- Consistent theming
- Reusable components
- Clean code
- Responsive layouts
- Proper loading/error/empty states
- Memory-safe implementation
- Accessibility support