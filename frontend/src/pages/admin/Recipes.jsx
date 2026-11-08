import AdminListToolbar from '../../components/AdminListToolbar';
import AdminDataPanel from '../../components/AdminDataPanel';
import useAdminResource from '../../hooks/useAdminResource';
import toast from 'react-hot-toast';
import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import './admin.css';
import { AdminSortHeader } from '../../components/AdminSort';
import { recipeSortOptions } from '../../utils/adminSorting';
import useAdminListState from '../../hooks/useAdminListState';

// Quản lý công thức (admin): list KHÔNG ảnh + tìm kiếm, lọc danh mục, sắp xếp.
// Backend: GET /api/recipes (lọc server-side), DELETE /api/recipes/:id (admin được phép).
const AdminRecipes = () => {
  const [refresh, setRefresh] = useState(0);
  const [
    { search: searchTerm, category: categoryFilter, sort: sortBy, page },
    updateList,
  ] = useAdminListState(
    { search: '', category: '', sort: 'newest', page: 1 },
    { sort: recipeSortOptions.map((option) => option.value) },
  );
  const setSortBy = (sort) => updateList({ sort });
  const setPage = (page) => updateList({ page });
  const [deletingId, setDeletingId] = useState(null);

  const resource = useAdminResource(
    '/api/recipes',
    {
      page,
      limit: 20,
      search: searchTerm,
      category: categoryFilter,
      sort: sortBy,
      view: 'admin',
    },
    refresh,
  );
  const categories = resource.data?.categories || [];
  const pageItems = resource.data?.items || [];

  const handleDelete = async (recipe) => {
    if (
      !window.confirm(
        `Xoá vĩnh viễn công thức "${recipe.title}"? Toàn bộ bình luận, đánh giá và ảnh liên quan sẽ bị xoá.`,
      )
    )
      return;
    setDeletingId(recipe.id);
    try {
      await axios.delete(`/api/recipes/${recipe.id}`);
      setRefresh((value) => value + 1);
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
            <p className="admin-page-sub">
              Tìm kiếm, lọc, sắp xếp và xoá công thức vi phạm
            </p>
          </div>
        </div>

        <AdminListToolbar
          searchLabel="Tìm kiếm công thức"
          placeholder="Tên món hoặc tên tác giả hiển thị…"
          search={searchTerm}
          onSearch={(search) => updateList({ search }, { replace: true })}
          sort={sortBy}
          onSort={setSortBy}
          sortOptions={recipeSortOptions}
          onReset={() =>
            updateList({ search: '', category: '', sort: 'newest', page: 1 })
          }
          filters={[
            {
              key: 'category',
              label: 'Danh mục',
              ariaLabel: 'Lọc theo danh mục',
              value: categoryFilter,
              onChange: (category) => updateList({ category }),
              options: [
                ['', 'Tất cả danh mục'],
                ...categories.map((c) => [String(c.id), c.name]),
              ],
            },
          ]}
        />
        <AdminDataPanel
          resource={resource}
          onRetry={() => setRefresh((value) => value + 1)}
          onPage={setPage}
          showEmptyMessage={false}
        >
          <table className="admin-card-table">
            <caption className="admin-sr-only">
              Công thức. Chọn tiêu đề cột để thay đổi chiều sắp xếp.
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
                  ascending="title"
                  descending="title_desc"
                >
                  Món
                </AdminSortHeader>
                <th>Danh mục</th>
                <AdminSortHeader
                  value={sortBy}
                  onChange={setSortBy}
                  ascending="rating_asc"
                  descending="rating"
                >
                  Điểm
                </AdminSortHeader>
                <AdminSortHeader
                  value={sortBy}
                  onChange={setSortBy}
                  ascending="ratings_asc"
                  descending="popular"
                >
                  Lượt đánh giá
                </AdminSortHeader>
                <AdminSortHeader
                  value={sortBy}
                  onChange={setSortBy}
                  ascending="views_asc"
                  descending="views_desc"
                >
                  Lượt xem
                </AdminSortHeader>
                <AdminSortHeader
                  value={sortBy}
                  onChange={setSortBy}
                  ascending="oldest"
                  descending="newest"
                >
                  Ngày đăng
                </AdminSortHeader>
                <th style={{ textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan="8" className="admin-empty-cell">
                    Không có dữ liệu phù hợp.
                  </td>
                </tr>
              ) : (
                pageItems.map((r) => (
                  <tr key={r.id}>
                    <td className="admin-cell-sub">#{r.id}</td>
                    <td>
                      <Link
                        to={`/recipes/${r.id}`}
                        className="admin-cell-title"
                      >
                        {r.title}
                      </Link>
                      <div className="admin-cell-sub">
                        bởi {r.author_name || 'Ẩn danh'}
                      </div>
                    </td>
                    <td>{r.category_name || '—'}</td>
                    <td style={{ textAlign: 'center' }} className="num">
                      {r.avg_rating ? Number(r.avg_rating).toFixed(1) : '—'}
                    </td>
                    <td className="num">{r.total_ratings || 0}</td>
                    <td className="num">{r.view_count || 0}</td>
                    <td className="admin-cell-sub">
                      {r.created_at
                        ? new Date(r.created_at).toLocaleDateString('vi-VN')
                        : '—'}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Link
                        to={`/recipes/edit/${r.id}`}
                        className="admin-action-link"
                        style={{
                          display: 'inline-block',
                          padding: '5px 10px',
                          fontSize: '13px',
                        }}
                      >
                        <i className="fa-solid fa-pen" aria-hidden="true"></i>{' '}
                        Sửa
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
                ))
              )}
            </tbody>
          </table>
        </AdminDataPanel>
      </div>
    </AdminLayout>
  );
};

export default AdminRecipes;
