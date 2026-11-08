import AdminListToolbar from '../../components/AdminListToolbar';
import { AdminSortHeader } from '../../components/AdminSort';
import { moderationSortOptions } from '../../utils/adminSorting';
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
    sort: 'newest',
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
        <AdminListToolbar
          searchLabel="Tìm kiếm nhật ký"
          placeholder="Mã hành động, ID admin hoặc ID đối tượng…"
          search={filters.search}
          onSearch={(search) => update({ search }, { replace: true })}
          filters={[
            {
              key: 'action',
              label: 'Hành động',
              ariaLabel: 'Lọc hành động',
              value: filters.action,
              onChange: (action) => update({ action }),
              options: [['', 'Tất cả hành động'], ...Object.entries(actions)],
            },
            {
              key: 'type',
              label: 'Loại đối tượng',
              ariaLabel: 'Lọc đối tượng',
              value: filters.type,
              onChange: (type) => update({ type }),
              options: [
                ['', 'Tất cả đối tượng'],
                ['user', 'Tài khoản'],
                ['recipe', 'Công thức'],
                ['comment', 'Bình luận'],
                ['report', 'Báo cáo'],
              ],
            },
          ]}
          sort={filters.sort}
          onSort={(sort) => update({ sort })}
          sortOptions={moderationSortOptions}
          onReset={() =>
            update({
              search: '',
              action: '',
              type: '',
              sort: 'newest',
              page: 1,
            })
          }
        />
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
                  (label) =>
                    label === 'ID' || label === 'Thời gian' ? (
                      <AdminSortHeader
                        key={label}
                        value={filters.sort}
                        onChange={(sort) => update({ sort })}
                        ascending={label === 'ID' ? 'id_asc' : 'oldest'}
                        descending={label === 'ID' ? 'id_desc' : 'newest'}
                      >
                        {label}
                      </AdminSortHeader>
                    ) : (
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
