const fs = require('fs'); 
const files = ['Dashboard.jsx', 'Users.jsx', 'Categories.jsx', 'Comments.jsx', 'Recipes.jsx', 'Articles.jsx']; 
files.forEach(file => { 
  try { 
    const p = 'pages/admin/' + file; 
    let c = fs.readFileSync(p, 'utf8'); 
    
    // Add Articles to sidebars
    if (c.includes('Quản lý Bình luận') && !c.includes('/admin/articles')) {
      c = c.replace(/Quản lý Bình luận<\/Link><\/li>/g, 'Quản lý Bình luận</Link></li>\n            <li><Link to="/admin/articles">Quản lý Bài viết</Link></li>'); 
      c = c.replace(/Quản lý Bình luận<\/Link><\/li>/g, 'Quản lý Bình luận</Link></li>\n            <li><Link to="/admin/articles">Quản lý Bài viết</Link></li>'); // fallback for bold
    }
    
    // Admin Articles is missing sidebar
    if (file === 'Articles.jsx' && !c.includes('admin-sidebar')) {
      c = c.replace('<div className="admin-container">', '<div className="admin-sidebar">\n          <ul>\n            <li><Link to="/admin/dashboard">Tổng quan</Link></li>\n            <li><Link to="/admin/categories">Quản lý Danh mục</Link></li>\n            <li><Link to="/admin/recipes">Quản lý Công thức</Link></li>\n            <li><Link to="/admin/users">Quản lý Người dùng</Link></li>\n            <li><Link to="/admin/comments">Quản lý Bình luận</Link></li>\n            <li><Link to="/admin/articles" style={{ fontWeight: "bold" }}>Quản lý Bài viết</Link></li>\n          </ul>\n        </div>\n        <div className="admin-container">');
      if (!c.includes('import { Link }')) {
        c = c.replace("import MainLayout from '../../components/MainLayout';", "import MainLayout from '../../components/MainLayout';\nimport { Link } from 'react-router-dom';");
      }
    }
    
    fs.writeFileSync(p, c); 
    console.log('Updated', file);
  } catch(e){
    console.error(e);
  } 
});

// Also update Navbar
let nav = fs.readFileSync('components/Navbar.jsx', 'utf8');
nav = nav.replace(/<Link to=\"\/\" className=\"nav-link\">Mẹo & Thủ thuật ▾<\/Link>/, '<Link to="/articles" className="nav-link">Mẹo & Thủ thuật ▾</Link>');
fs.writeFileSync('components/Navbar.jsx', nav);
console.log('Updated Navbar');
