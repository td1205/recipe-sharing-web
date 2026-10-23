const fs = require('fs');
const path = require('path');
const files = ['RecipeDetail.jsx', 'RecipeCreate.jsx', 'RecipeEdit.jsx', 'ArticleDetail.jsx'];
files.forEach(f => {
  const p = path.join('frontend/src/pages', f);
  if(fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    c = c.replace(/alert\(/g, 'toast.error(');
    if(c.includes('toast.error') && !c.includes('react-hot-toast')) {
      c = c.replace(/import React/, "import toast from 'react-hot-toast';\nimport React");
    }
    fs.writeFileSync(p, c);
    console.log('Replaced alerts in', p);
  }
});
