# Contributing to Studytrix

Thank you for your interest in contributing to Studytrix! This project is maintained by the **Attendrix Team**, and we welcome community contributions that help improve the academic workspace experience.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](./README.md#code-of-conduct).

## General Guidelines

- **Professionalism**: Keep documentation and communication formal. Avoid the use of emojis in commit messages, documentation, and PR descriptions.
- **Strict Typing**: We enforce strict TypeScript across the entire codebase. Avoid the use of `any`.
- **Atomic Commits**: Ensure each commit represents a single, logical change.
- **Documentation**: If your change modifies or adds functionality, you must update the relevant documentation (`README.md`, `FEATURES.md`, `ARCHITECTURE.md`, `SYSTEM_CONTEXT.md`, or `VISUAL_SYSTEM.md`).

## Development Workflow

1. **Setup**: Follow the [Getting Started](./README.md#getting-started) guide.
2. **Branching**: Create a descriptive branch for your work:
    - `feature/new-capability`
    - `fix/bug-description`
    - `docs/refining-guide`
3. **Linting and Building**: Ensure your code passes all checks before submitting:
    ```bash
    npm run lint
    npx tsc --noEmit
    npm run build
    ```
4. **Pull Requests**: Submit your PR with a clear description of the problem solved and the implementation details.

## Technical Standards

### Feature Isolation
New capabilities should be isolated within the `features/` directory following our module layout pattern. Each module should have clear boundaries:
- `*.types.ts`: Domain and transport contracts.
- `*.service.ts`: Core business and orchestration logic.
- `*.store.ts`: Reactive state (Zustand).

### Design Integrity
Studytrix follows an "Academic Premium" visual system. When adding UI components:
- Use the defined typography and spacing rhythm in `VISUAL_SYSTEM.md`.
- Ensure mobile-first responsiveness.
- Adhere to the interaction patterns (long-press menus, tactile feedback).

## Questions?

If you have questions about the codebase or the contribution process, please reach out to the **Attendrix Team** or senior members of the **LaunchPad NITC Community**.
