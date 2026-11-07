import React from 'react';

const AdminPageHeader = ({ title, subtitle, actions }) => (
  <div className="admin-page-header">
    <div className="admin-page-heading">
      <h1 className="admin-page-title">{title}</h1>
      {subtitle && <p className="admin-page-sub">{subtitle}</p>}
    </div>
    {actions && <div className="admin-page-actions">{actions}</div>}
  </div>
);

export default AdminPageHeader;
