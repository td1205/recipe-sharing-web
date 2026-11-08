import AdminListToolbar from '../../components/AdminListToolbar';
import AdminDataPanel from '../../components/AdminDataPanel';
import useAdminResource from '../../hooks/useAdminResource';
import React, { useState } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/AdminLayout';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import './admin.css';
import { AdminSortHeader } from '../../components/AdminSort';
import { commentSortOptions } from '../../utils/adminSorting';
import useAdminListState from '../../hooks/useAdminListState';

const AdminComments = () => {
  const [{ search: searchTerm, sort: sortBy, page }, updateList] =
    useAdminListState(
      { search: '', sort: 'newest', page: 1 },
      { sort: commentSortOptions.map((option) => option.value) },
    );
  const [revision, setRevision] = useState(0);
  const resource = useAdminResource(
    '/api/admin/comments',
    { search: searchTerm, sort: sortBy, page, limit: 20 },
    revision,
  );
  const filtered = resource.data?.items || [];
  const setSortBy = (sort) => updateList({ sort });

  const fetchComments = () => setRevision((value) => value + 1);

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa bình luận này?')) return;
    try {
      await axios.delete(`/api/admin/comments/${id}`);
      toast.success('Xóa bình luận thành công!');
      fetchComments();
    } catch (err) {
      toast.error('Lỗi xóa bình luận');
    }
  };

  return (
    <AdminLayout title="Quản lý Bình luận">
      <div className="admin-shell">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Bình luận</h1>
            <p className="admin-page-sub">Rà soát và xóa bình luận vi phạm</p>
          </div>
        </div>

        <AdminListToolbar
          searchLabel="Tìm kiếm bình luận"
          placeholder="Nội dung, người viết hoặc công thức…"
          search={searchTerm}
          onSearch={(search) => updateList({ search }, { replace: true })}
          sort={sortBy}
          onSort={setSortBy}
          sortOptions={commentSortOptions}
          onReset={() => updateList({ search: '', sort: 'newest', page: 1 })}
        />
        <AdminDataPanel
          resource={resource}
          onRetry={fetchComments}
          onPage={(page) => updateList({ page })}
          showEmptyMessage={false}
        >
          <table className="admin-card-table">
            <caption className="admin-sr-only">
              Bình luận. Chọn tiêu đề cột để thay đổi chiều sắp xếp.
            </caption>
            <thead>
              <tr>
                <AdminSortHeader
                  value={sortBy}
                  onChange={setSortBy}
                  ascending="id_asc"
                  descending="id_desc"
                >
                  ID
                </AdminSortHeader>
                <AdminSortHeader
                  value={sortBy}
                  onChange={setSortBy}
                  ascending="user_asc"
                  descending="user_desc"
                >
                  Người dùng
                </AdminSortHeader>
                <AdminSortHeader
                  value={sortBy}
                  onChange={setSortBy}
                  ascending="recipe_asc"
                  descending="recipe_desc"
                >
                  Công thức
                </AdminSortHeader>
                <th>Nội dung</th>
                <AdminSortHeader
                  value={sortBy}
                  onChange={setSortBy}
                  ascending="oldest"
                  descending="newest"
                >
                  Ngày
                </AdminSortHeader>
                <th style={{ width: '90px', textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="admin-empty-cell">
                    Không có dữ liệu phù hợp.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id}>
                    <td className="admin-cell-sub">#{c.id}</td>
                    <td>{c.users?.username || '—'}</td>
                    <td>
                      <Link
                        to={`/recipes/${c.recipe_id}`}
                        className="admin-cell-title"
                      >
                        {c.recipes?.title || '—'}
                      </Link>
                    </td>
                    <td
                      style={{
                        maxWidth: '360px',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {c.content}
                    </td>
                    <td className="admin-cell-sub">
                      {c.created_at
                        ? new Date(c.created_at).toLocaleDateString('vi-VN')
                        : ''}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="admin-btn-icon admin-btn-icon-danger"
                        onClick={() => handleDelete(c.id)}
                        aria-label={`Xóa bình luận ${c.id}`}
                      >
                        <i className="fa-solid fa-trash" aria-hidden="true"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </AdminDataPanel>
      </div>
    </AdminLayout>
  );
};

export default AdminComments;
