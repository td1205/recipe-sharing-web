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
- **Loading States & Skeleton Screens**: ALWAYS use `<SkeletonLoader />` or proper Dark Mode compatible loading components for fetching states (e.g. `if (loading)`). NEVER use plain text like "Đang tải..." floating on an unstyled/transparent div that could cause the browser to flash a default white background. The loading state must strictly adhere to the Steam UI Dark Mode aesthetic (`#1b2838`, `#2a323f`) to protect user eyes and ensure a premium, seamless experience.
