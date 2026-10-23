const fs = require('fs');
let txt = fs.readFileSync('frontend/src/index.css', 'utf8');

// Replace colors
txt = txt.replace(/--color-bg-body:.*?;/, '--color-bg-body: #1b2838;');
txt = txt.replace(/--color-bg-card:.*?;/, '--color-bg-card: #171a21;');
txt = txt.replace(/--color-bg-hover:.*?;/, '--color-bg-hover: #2a475e;');
txt = txt.replace(/--color-primary:.*?;/, '--color-primary: #66c0f4;');
txt = txt.replace(/--color-primary-hover:.*?;/, '--color-primary-hover: #417a9b;');
txt = txt.replace(/--color-primary-light:.*?;/, '--color-primary-light: #1a9fff;');
txt = txt.replace(/--color-danger:.*?;/, '--color-danger: #dc3545;');
txt = txt.replace(/--color-secondary:.*?;/, '--color-secondary: #2a475e;');
txt = txt.replace(/--color-text-main:.*?;/, '--color-text-main: #c7d5e0;');
txt = txt.replace(/--color-text-muted:.*?;/, '--color-text-muted: #8f98a0;');
txt = txt.replace(/--color-border:.*?;/, '--color-border: #2a475e;');

// Replace typography
txt = txt.replace(/--font-serif:.*?;/, "--font-serif: 'Inter', -apple-system, sans-serif;");
txt = txt.replace(/--text-body: 16px;/, "--text-body: 14px;");
txt = txt.replace(/--text-small: 14px;/, "--text-small: 12px;");
txt = txt.replace(/--radius-sm: 4px;/, "--radius-sm: 2px;");
txt = txt.replace(/--radius-md: 8px;/, "--radius-md: 4px;");

fs.writeFileSync('frontend/src/index.css', txt);
console.log('Updated index.css tokens to Steam Dark Mode');
