import AdminListToolbar from '../../components/AdminListToolbar';
import { AdminSortHeader } from '../../components/AdminSort';
import { moderationSortOptions } from '../../utils/adminSorting';
import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import AdminPageHeader from '../../components/AdminPageHeader';
import AdminDataPanel from '../../components/AdminDataPanel';
import ConfirmDialog from '../../components/ConfirmDialog';
import useAdminListState from '../../hooks/useAdminListState';
import useAdminResource from '../../hooks/useAdminResource';
import { apiErrorMessage } from '../../utils/apiError';

const labels = {
  Pending: 'Chờ xử lý',
  Resolved: 'Đã xử lý',
  Rejected: 'Đã từ chối',
};
export default function Reports() {
  const [filters, update] = useAdminListState({
    search: '',
    status: 'Pending',
    type: '',
    page: 1,
    sort: 'newest',
  });
  const [revision, setRevision] = useState(0);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const resource = useAdminResource(
    '/api/admin/reports',
    { ...filters, limit: 20 },
    revision,
  );
  const refresh = () => setRevision((value) => value + 1);
  const resolve = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await axios.patch(`/api/admin/reports/${confirm.id}`, {
        status: confirm.status,
      });
      toast.success('Đã cập nhật báo cáo');
      setConfirm(null);
      refresh();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không thể xử lý báo cáo'));
      refresh();
    } finally {
      setBusy(false);
    }
  };
  return (
    <AdminLayout title="Báo cáo vi phạm">
      <div className="admin-shell">
        <AdminPageHeader
          title="Báo cáo vi phạm"
          subtitle="Rà soát nội dung được thành viên báo cáo. Xử lý trạng thái không tự xóa nội dung."
        />
        <AdminListToolbar
          searchLabel="Tìm kiếm báo cáo"
          placeholder="Lý do, ID báo cáo hoặc ID nội dung…"
          search={filters.search}
          onSearch={(search) => update({ search }, { replace: true })}
          filters={[
            {
              key: 'status',
              label: 'Trạng thái',
              ariaLabel: 'Trạng thái báo cáo',
              value: filters.status,
              onChange: (status) => update({ status }),
              options: [['', 'Tất cả trạng thái'], ...Object.entries(labels)],
            },
            {
              key: 'type',
              label: 'Loại nội dung',
              ariaLabel: 'Loại báo cáo',
              value: filters.type,
              onChange: (type) => update({ type }),
              options: [
                ['', 'Tất cả nội dung'],
                ['recipe', 'Công thức'],
                ['comment', 'Bình luận'],
              ],
            },
          ]}
          sort={filters.sort}
          onSort={(sort) => update({ sort })}
          sortOptions={moderationSortOptions}
          onReset={() =>
            update({
              search: '',
              status: 'Pending',
              type: '',
              sort: 'newest',
              page: 1,
            })
          }
        />
        <AdminDataPanel
          resource={resource}
          onRetry={refresh}
          onPage={(page) => update({ page })}
        >
          <table className="admin-card-table">
            <caption className="admin-sr-only">
              Danh sách báo cáo vi phạm
            </caption>
            <thead>
              <tr>
                {[
                  'ID',
                  'Nội dung',
                  'Người báo cáo',
                  'Lý do',
                  'Trạng thái',
                  'Thời gian',
                  'Hành động',
                ].map((label) =>
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
                  <td className="admin-text-wrap">
                    {row.recipe || row.comment ? (
                      <Link
                        to={`/recipes/${row.recipe_id || row.comment.recipe_id}`}
                      >
                        {row.target_type === 'recipe'
                          ? row.recipe.title
                          : `Bình luận #${row.target_id}`}
                      </Link>
                    ) : (
                      `Nội dung đã xóa (#${row.target_id})`
                    )}
                    {row.comment && <p>{row.comment.content}</p>}
                  </td>
                  <td>{row.reporter?.username || 'Tài khoản đã xóa'}</td>
                  <td className="admin-text-wrap">{row.reason}</td>
                  <td>
                    {labels[row.status]}
                    {row.resolved_at && (
                      <div className="admin-cell-sub">
                        {row.resolver?.username || 'Admin đã xóa'} ·{' '}
                        {new Date(row.resolved_at).toLocaleString('vi-VN')}
                      </div>
                    )}
                  </td>
                  <td>{new Date(row.created_at).toLocaleString('vi-VN')}</td>
                  <td>
                    {row.status === 'Pending' && (
                      <div className="admin-toolbar-filters">
                        <button
                          className="admin-range-btn"
                          onClick={() =>
                            setConfirm({ id: row.id, status: 'Resolved' })
                          }
                        >
                          Đã xử lý
                        </button>
                        <button
                          className="admin-range-btn"
                          onClick={() =>
                            setConfirm({ id: row.id, status: 'Rejected' })
                          }
                        >
                          Từ chối
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminDataPanel>
        {confirm && (
          <ConfirmDialog
            isOpen
            title="Xác nhận xử lý báo cáo"
            message={`Báo cáo #${confirm.id}: ${labels[confirm.status]}. Thao tác được ghi vào nhật ký; nội dung không bị xóa tự động.`}
            confirmLabel="Xác nhận"
            busy={busy}
            onConfirm={resolve}
            onClose={() => {
              if (!busy) setConfirm(null);
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}
