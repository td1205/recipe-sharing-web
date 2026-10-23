const fs = require('fs');
const files = ['Dashboard.jsx', 'Users.jsx', 'Categories.jsx', 'Comments.jsx', 'Articles.jsx'];
files.forEach(file => {
  try {
    const p = 'pages/admin/' + file;
    let c = fs.readFileSync(p, 'utf8');
    c = c.replace(/<li><Link to="\/admin\/articles">Quản lý Bài viết<\/Link><\/li>\s*<li><Link to="\/admin\/articles">Quản lý Bài viết<\/Link><\/li>/g, '<li><Link to="/admin/articles">Quản lý Bài viết</Link></li>');
    fs.writeFileSync(p, c);
  } catch(e){}
});
