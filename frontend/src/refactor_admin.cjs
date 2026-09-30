const fs = require('fs');

const files = ['Dashboard.jsx', 'Users.jsx', 'Categories.jsx', 'Comments.jsx', 'Articles.jsx'];

files.forEach(file => {
  try {
    const p = 'pages/admin/' + file;
    let c = fs.readFileSync(p, 'utf8');
    
    // Import AdminLayout if not imported
    if (!c.includes('AdminLayout')) {
      c = c.replace(/import MainLayout from '(.*?)MainLayout';/, "import AdminLayout from '../../components/AdminLayout';");
    }
    
    // Remove MainLayout hideSidebar, admin-container, admin-sidebar, admin-content wrappers
    // Dashboard.jsx case
    if (file === 'Dashboard.jsx') {
      c = c.replace(/<MainLayout hideSidebar>[\s\S]*?<div className="admin-content"[^>]*>/, '<AdminLayout title="Bảng điều khiển">');
      c = c.replace(/<\/div>\s*<\/div>\s*<\/MainLayout>/, '</AdminLayout>');
    } 
    else if (file === 'Users.jsx' || file === 'Categories.jsx' || file === 'Comments.jsx') {
      c = c.replace(/<MainLayout hideSidebar>[\s\S]*?<div className="admin-content"[^>]*>/, '<AdminLayout>');
      c = c.replace(/<\/div>\s*<\/div>\s*<\/MainLayout>/, '</AdminLayout>');
    }
    else if (file === 'Articles.jsx') {
      c = c.replace(/<MainLayout hideSidebar>[\s\S]*?<div className="admin-content"[^>]*>/, '<AdminLayout title="Quản lý Bài viết">');
      c = c.replace(/<\/div>\s*<\/div>\s*<\/MainLayout>/, '</AdminLayout>');
    }

    fs.writeFileSync(p, c);
    console.log('Refactored', file);
  } catch (err) {
    console.error('Error refactoring', file, err);
  }
});
