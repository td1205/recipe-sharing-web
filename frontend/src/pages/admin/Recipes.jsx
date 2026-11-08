import toast from 'react-hot-toast';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import SkeletonLoader from '../../components/SkeletonLoader';
import './admin.css';

const PAGE_SIZE = 20;

// Quản lý công thức (admin): list KHÔNG ảnh + tìm kiếm, lọc danh mục, sắp xếp.
// Backend: GET /api/recipes (lọc server-side), DELETE /api/recipes/:id (admin được phép).
const AdminRecipes = () => {
  const [categories, setCategories] = useState([]);
  const [refresh, setRefresh] = useState(0);
  const [recipes, setRecipes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let active = true;
    const fetchRecipes = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get('/api/recipes', { params: { page, limit: PAGE_SIZE, search: searchTerm, category: categoryFilter, sort: sortBy, view: 'admin' } });
        if (!active) return;
        setRecipes(res.data.recipes || []);
        setCategories(res.data.categories || []);
        setTotal(res.data.total || (res.data.recipes || []).length);
      } catch (err) {
        if (active) setError(err.response?.status === 403
          ? 'Phiên đăng nhập không còn quyền truy cập trang quản trị.'
          : 'Không thể tải danh sách công thức.');
      } finally {
        if (active) setLoading(false);
      }
    };
    const timer = setTimeout(fetchRecipes, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [page, searchTerm, categoryFilter, sortBy, refresh]);

  const filtered = recipes;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered;

  const resetPage = () => setPage(1);

  const handleDelete = async (recipe) => {
    if (!window.confirm(`Xoá vĩnh viễn công thức "${recipe.title}"? Toàn bộ bình luận, đánh giá và ảnh liên quan sẽ bị xoá.`)) return;
    setDeletingId(recipe.id);
    try {
      await axios.delete(`/api/recipes/${recipe.id}`);
      setRecipes((list) => list.filter((r) => r.id !== recipe.id));
      setTotal((t) => Math.max(0, t - 1));
      setRefresh(value => value + 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi xoá công thức');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout title="Quản lý Công thức">
      <div className="admin-shell">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Công thức</h1>
            <p className="admin-page-sub">Tìm kiếm, lọc, sắp xếp và xoá công thức vi phạm</p>
          </div>
        </div>

        <div className="admin-toolbar">
          <div className="admin-toolbar-filters">
            <select
              className="admin-select"
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); resetPage(); }}
              aria-label="Lọc theo danh mục"
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
            <select
              className="admin-select"
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); resetPage(); }}
              aria-label="Sắp xếp"
            >
              <option value="newest">Mới nhất trước</option>
              <option value="oldest">Cũ nhất trước</option>
              <option value="rating">Đánh giá cao nhất</option>
              <option value="popular">Nhiều lượt chấm nhất</option>
              <option value="title">Tên A–Z</option>
            </select>
          </div>
          <input
            type="search"
            className="admin-search"
            placeholder="Tìm theo tên món, tác giả…"
            aria-label="Tìm công thức"
            maxLength={200}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); resetPage(); }}
          />
        </div>

        {loading ? <SkeletonLoader /> : error ? (
          <div className="admin-alert-error" role="alert">{error}</div>
        ) : (
          <>
            <p className="admin-page-sub" style={{ marginBottom: '12px' }}>
              Hiển thị {pageItems.length} / {filtered.length.toLocaleString('vi-VN')} món (tổng {total.toLocaleString('vi-VN')})
            </p>
            <div className="admin-table-box">
              <table className="admin-card-table">
                <thead>
                  <tr>
                    <th style={{ width: '44%' }}>Món</th>
                    <th>Danh mục</th>
                    <th style={{ textAlign: 'center' }}>★</th>
                    <th style={{ textAlign: 'right' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 ? (
                    <tr><td colSpan="4" className="admin-empty-cell">Không có công thức phù hợp bộ lọc.</td></tr>
                  ) : pageItems.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link to={`/recipes/${r.id}`} className="admin-cell-title">{r.title}</Link>
                        <div className="admin-cell-sub">bởi {r.author_name || 'Ẩn danh'}</div>
                      </td>
                      <td>{r.category_name || '—'}</td>
                      <td style={{ textAlign: 'center' }} className="num">
                        {r.avg_rating ? Number(r.avg_rating).toFixed(1) : '—'}
                        <span className="admin-cell-sub"> ({r.total_ratings || 0})</span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Link to={`/recipes/edit/${r.id}`} className="admin-action-link" style={{ display: 'inline-block', padding: '5px 10px', fontSize: '13px' }}>
                          <i className="fa-solid fa-pen" aria-hidden="true"></i> Sửa
                        </Link>
                        <button
                          type="button"
                          className="admin-btn-icon admin-btn-icon-danger"
                          style={{ marginLeft: '8px' }}
                          onClick={() => handleDelete(r)}
                          disabled={deletingId === r.id}
                          title="Xoá công thức"
                          aria-label={`Xoá công thức ${r.title}`}
                        >
                          <i className="fa-solid fa-trash" aria-hidden="true"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <span className="admin-cell-sub">Trang {safePage}/{totalPages}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="admin-range-btn" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>← Trước</button>
                <button type="button" className="admin-range-btn" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>Sau →</button>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminRecipes;
