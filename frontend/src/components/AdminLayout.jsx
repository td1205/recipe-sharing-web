import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import MainLayout from './MainLayout';

const AdminLayout = ({ children, title = 'Admin Panel' }) => {
  const location = useLocation();
  const path = location.pathname;

  const isActive = (route) => path === route ? { fontWeight: 'bold', color: 'var(--color-primary)', background: 'var(--color-primary-light)', borderColor: 'var(--color-primary)' } : {};

  return (
    <MainLayout hideSidebar>
      <div className="admin-container" style={{ display: 'flex', gap: '20px', minHeight: '80vh', padding: '20px' }}>
        
        {/* Sidebar dùng chung cho Admin */}
        <aside className="admin-sidebar" style={{ width: '280px', flexShrink: 0 }}>
          <h2 style={{ padding: '0 15px', marginBottom: '20px', fontSize: '20px', color: 'var(--color-text-main)' }}>{title}</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li>
              <Link to="/admin/dashboard" style={isActive('/admin/dashboard')}>
                <i className="fa-solid fa-chart-pie" style={{ width: '25px' }}></i> Tổng quan
              </Link>
            </li>
            <li>
              <Link to="/admin/categories" style={isActive('/admin/categories')}>
                <i className="fa-solid fa-layer-group" style={{ width: '25px' }}></i> Quản lý Danh mục
              </Link>
            </li>
            <li>
              <Link to="/admin/users" style={isActive('/admin/users')}>
                <i className="fa-solid fa-users" style={{ width: '25px' }}></i> Quản lý Người dùng
              </Link>
            </li>
            <li>
              <Link to="/admin/comments" style={isActive('/admin/comments')}>
                <i className="fa-solid fa-comments" style={{ width: '25px' }}></i> Quản lý Bình luận
              </Link>
            </li>
            <li>
              <Link to="/admin/articles" style={isActive('/admin/articles')}>
                <i className="fa-solid fa-newspaper" style={{ width: '25px' }}></i> Quản lý Bài viết
              </Link>
            </li>
          </ul>
        </aside>
        
        {/* Nội dung chính của từng trang Admin */}
        <div className="admin-content" style={{ flex: 1 }}>
          {children}
        </div>

      </div>
    </MainLayout>
  );
};

export default AdminLayout;
