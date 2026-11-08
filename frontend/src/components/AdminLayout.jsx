import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import MainLayout from './MainLayout';
import '../pages/Home.css';
import '../pages/admin/admin.css';

const ADMIN_NAV_ITEMS = [
  { route: '/admin/dashboard', icon: 'fa-chart-pie', label: 'Tổng quan' },
  { route: '/admin/recipes', icon: 'fa-utensils', label: 'Quản lý Công thức' },
  { route: '/admin/categories', icon: 'fa-layer-group', label: 'Quản lý Danh mục' },
  { route: '/admin/users', icon: 'fa-users', label: 'Quản lý Người dùng' },
  { route: '/admin/comments', icon: 'fa-comments', label: 'Quản lý Bình luận' },
  { route: '/admin/reports', icon: 'fa-flag', label: 'Báo cáo vi phạm' },
  { route: '/admin/audit-logs', icon: 'fa-clock-rotate-left', label: 'Nhật ký quản trị' },
  { route: '/admin/recommender', icon: 'fa-lightbulb', label: 'Hệ thống gợi ý' },
];

const AdminLayout = ({ children, title = 'Admin Panel', className }) => {
  const { pathname } = useLocation();

  return (
    <MainLayout hideSidebar className={`admin-layout home-typography ${className || ''}`}>
      <div className="admin-container">
        <aside className="admin-sidebar">
          <h2 className="admin-sidebar-title">{title}</h2>
          <nav aria-label="Điều hướng quản trị">
            <ul className="admin-sidebar-nav">
              {ADMIN_NAV_ITEMS.map(({ route, icon, label }) => {
                const active = pathname === route;
                return (
                  <li key={route}>
                    <Link className={active ? 'active' : ''} to={route} aria-current={active ? 'page' : undefined}>
                      <i className={`fa-solid ${icon}`} aria-hidden="true"></i>
                      <span>{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>
        <div className="admin-content">{children}</div>
      </div>
    </MainLayout>
  );
};

export default AdminLayout;
