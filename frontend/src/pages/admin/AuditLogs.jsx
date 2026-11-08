import React, { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import AdminPageHeader from '../../components/AdminPageHeader';
import AdminDataPanel from '../../components/AdminDataPanel';
import useAdminListState from '../../hooks/useAdminListState';
import useAdminResource from '../../hooks/useAdminResource';

const actions = {
  'user.ban': 'Khóa tài khoản',
  'user.unban': 'Mở khóa tài khoản',
  'user.role': 'Thay đổi quyền',
  'user.edit': 'Sửa tài khoản',
  'user.delete': 'Xóa tài khoản',
  'recipe.delete': 'Xóa công thức',
  'comment.delete': 'Xóa bình luận',
  'report.resolve': 'Xử lý báo cáo',
  'report.reject': 'Từ chối báo cáo',
};
export default function AuditLogs() {
  const [filters, update] = useAdminListState({
    search: '',
    action: '',
    type: '',
    page: 1,
  });
  const [revision, setRevision] = useState(0);
  const resource = useAdminResource(
    '/api/admin/audit-logs',
    { ...filters, limit: 20 },
    revision,
  );
  return (
    <AdminLayout title="Nhật ký quản trị">
      <div className="admin-shell">
        <AdminPageHeader
          title="Nhật ký quản trị"
          subtitle="Lịch sử thao tác đã thực hiện. ID được giữ lại ngay cả khi tài khoản hoặc nội dung đã bị xóa."
        />
        <div className="admin-toolbar">
          <input
            className="admin-search"
            aria-label="Tìm nhật ký"
            placeholder="ID admin, ID đối tượng hoặc mã hành động…"
            maxLength={100}
            value={filters.search}
            onChange={(event) =>
              update({ search: event.target.value }, { replace: true })
            }
          />
          <div className="admin-toolbar-filters">
            <select
              className="admin-select"
              aria-label="Lọc hành động"
              value={filters.action}
              onChange={(event) => update({ action: event.target.value })}
            >
              <option value="">Tất cả hành động</option>
              {Object.entries(actions).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              className="admin-select"
              aria-label="Lọc đối tượng"
              value={filters.type}
              onChange={(event) => update({ type: event.target.value })}
            >
              <option value="">Tất cả đối tượng</option>
              <option value="user">Tài khoản</option>
              <option value="recipe">Công thức</option>
              <option value="comment">Bình luận</option>
              <option value="report">Báo cáo</option>
            </select>
          </div>
        </div>
        <AdminDataPanel
          resource={resource}
          onRetry={() => setRevision((value) => value + 1)}
          onPage={(page) => update({ page })}
        >
          <table className="admin-card-table">
            <caption className="admin-sr-only">
              Nhật ký các thao tác quản trị
            </caption>
            <thead>
              <tr>
                {['ID', 'Admin', 'Hành động', 'Đối tượng', 'Thời gian'].map(
                  (label) => (
                    <th scope="col" key={label}>
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {resource.data?.items.map((row) => (
                <tr key={row.id}>
                  <td>#{row.id}</td>
                  <td>#{row.admin_id}</td>
                  <td>{actions[row.action] || row.action}</td>
                  <td>
                    {row.target_type} #{row.target_id}
                  </td>
                  <td>{new Date(row.created_at).toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminDataPanel>
      </div>
    </AdminLayout>
  );
}
