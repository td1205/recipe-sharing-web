const fs = require('fs');
let txt = fs.readFileSync('frontend/src/tasty.css', 'utf8');

// Fix .auth-btn font-size back to var(--text-small)
txt = txt.replace(/\.auth-btn\s*\{[^}]*\}/, 
`.auth-btn {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  font-size: var(--text-small);
  font-weight: 600;
  transition: all 0.2s ease;
  cursor: pointer;
}`);

// Fix .section-header h2 to use var(--text-h2) instead of 20px
txt = txt.replace(/\.section-header h2\s*\{[^}]*\}/, 
`.section-header h2 {
  font-family: var(--font-serif);
  font-size: var(--text-h2);
  margin-bottom: 20px;
  text-transform: uppercase;
  letter-spacing: 1px;
}`);

// Fix .hero-content h1 to be slightly smaller and use the right token if needed, or leave at 42px
// 42px is okay for hero, but maybe it was conflicting. I'll just remove uppercase from trending-grid.
txt = txt.replace(/\.trending-grid\s*\{[^}]*\}/, 
`.trending-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}`);

fs.writeFileSync('frontend/src/tasty.css', txt);
console.log('Fixed tasty.css typography');
