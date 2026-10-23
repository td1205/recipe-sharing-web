const fs = require('fs');
const path = require('path');

const colorMap = {
  '#F9F9F9': 'var(--color-bg-body)',
  '#FFFFFF': 'var(--color-bg-card)',
  '#fff': 'var(--color-bg-card)',
  '#F8FAFC': 'var(--color-bg-hover)',
  '#F8F8F8': 'var(--color-bg-hover)',
  '#4F7F41': 'var(--color-primary)',
  '#388E3C': 'var(--color-primary-hover)',
  '#dc3545': 'var(--color-danger)',
  '#6B7280': 'var(--color-secondary)',
  '#333333': 'var(--color-text-main)',
  '#333': 'var(--color-text-main)',
  '#6c757d': 'var(--color-text-muted)',
  '#E2E8F0': 'var(--color-border)',
  '#eee': 'var(--color-border)'
};

const walk = (dir) => {
  fs.readdirSync(dir).forEach(file => {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      walk(p);
    } else if (p.endsWith('.jsx')) {
      let c = fs.readFileSync(p, 'utf8');
      let changed = false;
      for (const [hex, variable] of Object.entries(colorMap)) {
        // use regex to match hex colors ignoring case, but avoid matching words that happen to be hex
        const regex = new RegExp(hex + '(?![a-zA-Z0-9])', 'gi');
        if (c.match(regex)) {
          c = c.replace(regex, variable);
          changed = true;
        }
      }
      
      if (changed) {
        fs.writeFileSync(p, c);
        console.log('Updated hex colors in: ' + p);
      }
    }
  });
};

walk('frontend/src');
