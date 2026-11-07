import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/AdminLayout';
import SkeletonLoader from '../../components/SkeletonLoader';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import './admin.css';

const AdminComments = () => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');

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
    const sorted = [...list];
    if (sortBy === 'oldest') sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    else sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // newest
    return sorted;
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
            <select
              className="admin-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sắp xếp bình luận"
            >
              <option value="newest">Mới nhất trước</option>
              <option value="oldest">Cũ nhất trước</option>
            </select>
          </div>
          <input
            type="search"
            className="admin-search"
            placeholder="Tìm theo nội dung, người bình luận, món…"
            aria-label="Tìm bình luận"
            maxLength={200}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <p className="admin-page-sub" style={{ marginBottom: '12px' }}>
          Hiển thị {filtered.length.toLocaleString('vi-VN')} / {comments.length.toLocaleString('vi-VN')} bình luận
        </p>

        <div className="admin-table-box">
          <table className="admin-card-table">
            <thead>
              <tr>
                <th style={{ width: '6%' }}>ID</th>
                <th style={{ width: '14%' }}>Người dùng</th>
                <th style={{ width: '20%' }}>Công thức</th>
                <th>Nội dung</th>
                <th style={{ width: '12%' }}>Ngày</th>
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
