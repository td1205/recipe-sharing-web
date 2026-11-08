# Project Guidelines for AI Agents

Hello AI, when you are working on this project (Recipe Sharing Web), you MUST adhere to the following rules at all times:

## 1. Design & UI
- **Strictly Follow `design.md`**: Before creating any new UI components, ALWAYS read `design.md`. Do not create arbitrary UI patterns that conflict with the established "BBC Good Food" minimalist aesthetic.
- **Use Design Tokens**: Never hardcode hex colors, typography, or spacing arbitrarily. Always use the CSS variables defined in `frontend/src/index.css` (e.g., `var(--color-primary)`, `var(--font-serif)`).
- **Component Reuse**: Prioritize reusing existing components (like `RecipeCard`, `AdminLayout`) before creating new ones. Do not duplicate UI logic.
- **Inline Styles**: Do not strictly forbid inline styles, but heavily restrict them. Only use inline styles for genuinely dynamic values (like progress bar width, dynamic background images, etc.). For static styling, use utility classes or design tokens.

## 2. Technology Stack & Behavior
- **Frontend**: React + Vite + React Router. 
- **Notifications**: Do not use native `alert()`. Use `react-hot-toast` for all notifications. (Exception: `window.confirm()` is temporarily acceptable for destructive actions until a global ConfirmModal is built).
- **Scope Restriction**: When asked to modify the UI/Frontend, DO NOT arbitrarily change backend APIs, database logic, or data structures unless explicitly requested.

## 3. Workflow & Verification
- **Test States**: Always ensure you handle and test loading, empty, and error states.
- **Responsiveness**: Verify that changes don't break the responsive layout across Mobile, Tablet, and Desktop breakpoints.
- **Visual Checks**: Do not claim that you have visually verified the UI unless you have actually run the app and checked the render output.
- **Forms & Modals**: Create forms inside of pop-up Modals for Admin Create/Edit actions to save space. (Exception: Complex user-facing forms like `RecipeCreate` and `RecipeEdit` should remain full-page routes due to their length and complexity).
- **Loading States & Skeleton Screens**: Use `<SkeletonLoader />` with the current editorial light theme and CSS tokens. Do not introduce Steam/dark backgrounds or unstyled loading text. Preserve the shared homepage/admin typography (`--font-home`) already selected by the project owner.

# Project AI Instructions

## Skills

When working on this project, automatically select
relevant installed skills:

- Security audit → security-audit
- React performance → vercel-react-best-practices
- React architecture → vercel-composition-patterns
- UI/UX and accessibility → web-design-guidelines
- Browser and functional testing → playwright-cli

## Rules

1. Automatically select relevant skills based on the task.
2. Load and follow the selected skill instructions.
3. Do not use unrelated skills.
4. For audits, report PASS, FAIL, NOT VERIFIED.
5. Provide file paths, line numbers, and evidence.
6. Do not modify code unless explicitly requested.
7. Do not change database data or run migrations without approval.
8. Distinguish source-code inspection from executed tests.
