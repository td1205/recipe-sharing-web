import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/AdminLayout';
import SkeletonLoader from '../../components/SkeletonLoader';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import './admin.css';
import { AdminSortSelect, AdminSortHeader } from '../../components/AdminSort';
import { sortAdminRows, commentSortOptions } from '../../utils/adminSorting';
import useAdminListState from '../../hooks/useAdminListState';

const AdminComments = () => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [{ search: searchTerm, sort: sortBy }, updateList] = useAdminListState(
    { search: '', sort: 'newest' }, { sort: commentSortOptions.map(option => option.value) },
  );
  const setSortBy = sort => updateList({ sort });

  const fetchComments = async () => {
    try {
      const res = await axios.get('/api/admin/comments');
      if (res.data.success) {
        setComments(res.data.comments);
      }
    } catch (err) {
      setError('Không thể tải bình luận');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = comments.filter((c) => {
      if (!q) return true;
      return (
        String(c.content || '').toLowerCase().includes(q) ||
        String(c.users?.username || '').toLowerCase().includes(q) ||
        String(c.recipes?.title || '').toLowerCase().includes(q)
      );
    });
    return sortAdminRows(list, sortBy, commentSortOptions);
  }, [comments, searchTerm, sortBy]);

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

  if (loading) return <AdminLayout title="Quản lý Bình luận"><SkeletonLoader /></AdminLayout>;
  if (error) return <AdminLayout title="Quản lý Bình luận"><div className="admin-alert-error" role="alert">{error}</div></AdminLayout>;

  return (
    <AdminLayout title="Quản lý Bình luận">
      <div className="admin-shell">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Bình luận</h1>
            <p className="admin-page-sub">Rà soát và xóa bình luận vi phạm</p>
          </div>
        </div>

        <div className="admin-toolbar">
          <div className="admin-toolbar-filters">
            <AdminSortSelect label="Sắp xếp bình luận" value={sortBy} onChange={setSortBy} options={commentSortOptions} />
          </div>
          <input
            type="search"
            className="admin-search"
            placeholder="Tìm theo nội dung, người bình luận, món…"
            aria-label="Tìm bình luận"
            maxLength={200}
            value={searchTerm}
            onChange={(e) => updateList({ search: e.target.value }, { replace: true })}
          />
        </div>

        <p className="admin-page-sub" style={{ marginBottom: '12px' }}>
          Hiển thị {filtered.length.toLocaleString('vi-VN')} / {comments.length.toLocaleString('vi-VN')} bình luận
        </p>

        <div className="admin-table-box">
          <table className="admin-card-table">
            <thead>
              <tr>
                <AdminSortHeader value={sortBy} onChange={setSortBy} ascending="id_asc" descending="id_desc">ID</AdminSortHeader>
                <AdminSortHeader value={sortBy} onChange={setSortBy} ascending="user_asc" descending="user_desc">Người dùng</AdminSortHeader>
                <AdminSortHeader value={sortBy} onChange={setSortBy} ascending="recipe_asc" descending="recipe_desc">Công thức</AdminSortHeader>
                <th>Nội dung</th>
                <AdminSortHeader value={sortBy} onChange={setSortBy} ascending="oldest" descending="newest">Ngày</AdminSortHeader>
                <th style={{ width: '90px', textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" className="admin-empty-cell">Không có bình luận phù hợp.</td></tr>
              ) : filtered.map((c) => (
                <tr key={c.id}>
                  <td className="admin-cell-sub">#{c.id}</td>
                  <td>{c.users?.username || '—'}</td>
                  <td><Link to={`/recipes/${c.recipe_id}`} className="admin-cell-title">{c.recipes?.title || '—'}</Link></td>
                  <td style={{ maxWidth: '360px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.content}</td>
                  <td className="admin-cell-sub">{c.created_at ? new Date(c.created_at).toLocaleDateString('vi-VN') : ''}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminComments;
