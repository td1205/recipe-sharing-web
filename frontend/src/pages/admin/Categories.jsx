import AdminListToolbar from '../../components/AdminListToolbar';
import AdminDataPanel from '../../components/AdminDataPanel';
import useAdminResource from '../../hooks/useAdminResource';
import { apiErrorMessage } from '../../utils/apiError';
import Modal from '../../components/Modal';
import React, { useState } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/AdminLayout';
import toast from 'react-hot-toast';
import { AdminSortHeader } from '../../components/AdminSort';
import { categorySortOptions } from '../../utils/adminSorting';
import useAdminListState from '../../hooks/useAdminListState';

const AdminCategories = () => {
  const [saving, setSaving] = useState(false);
  const [{ search: searchTerm, sort: sortBy, page }, updateList] =
    useAdminListState(
      { search: '', sort: 'name', page: 1 },
      { sort: categorySortOptions.map((option) => option.value) },
    );
  const [revision, setRevision] = useState(0);
  const resource = useAdminResource(
    '/api/admin/categories',
    { search: searchTerm, sort: sortBy, page, limit: 20 },
    revision,
  );
  const filteredCategories = resource.data?.items || [];
  const setSortBy = (sort) => updateList({ sort });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const [formData, setFormData] = useState({ name: '', description: '' });

  const fetchCategories = () => setRevision((value) => value + 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!formData.name) return toast.error('Vui lòng nhập tên danh mục');

    setSaving(true);
    try {
      if (isEditing) {
        await axios.post(`/api/admin/categories/edit/${currentId}`, formData);
        toast.success('Cập nhật thành công!');
      } else {
        await axios.post('/api/admin/categories/create', formData);
        toast.success('Thêm danh mục thành công!');
      }

      closeModal();
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Đã xảy ra lỗi!');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (cat) => {
    setIsEditing(true);
    setCurrentId(cat.id);
    setFormData({
      name: cat.name,
      description: cat.description || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (cat) => {
    const recipeCount = cat._count?.recipes || 0;
    const message =
      recipeCount > 0
        ? `NGUY HIỂM: Danh mục "${cat.name}" đang có ${recipeCount} món ăn. Xoá danh mục sẽ XOÁ LUÔN ${recipeCount} món này (kèm bình luận, đánh giá). Xác nhận xoá?`
        : `Xoá danh mục "${cat.name}"?`;
    if (!window.confirm(message)) return;
    try {
      await axios.post(`/api/admin/categories/delete/${cat.id}`);
      toast.success('Đã xóa danh mục');
      fetchCategories();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Lỗi xóa danh mục'));
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({ name: '', description: '' });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setCurrentId(null);
    setFormData({ name: '', description: '' });
  };

  return (
    <AdminLayout title="Quản lý Danh mục">
      <div className="admin-shell">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Danh mục</h1>
            <p className="admin-page-sub">Thêm, sửa, xoá danh mục món ăn</p>
          </div>
          <button
            type="button"
            className="admin-action-link"
            onClick={openCreateModal}
          >
            Thêm danh mục
          </button>
        </div>
        <AdminListToolbar
          searchLabel="Tìm kiếm danh mục"
          placeholder="Tên hoặc mô tả danh mục…"
          search={searchTerm}
          onSearch={(search) => updateList({ search }, { replace: true })}
          sort={sortBy}
          onSort={setSortBy}
          sortOptions={categorySortOptions}
          onReset={() => updateList({ search: '', sort: 'name', page: 1 })}
        />

        {isModalOpen && (
          <Modal
            title={isEditing ? 'Sửa danh mục' : 'Thêm danh mục mới'}
            onClose={closeModal}
            busy={saving}
          >
            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}
            >
              <div>
                <label htmlFor="category-name" style={{ fontWeight: 'bold' }}>
                  Tên danh mục:
                </label>
                <input
                  id="category-name"
                  maxLength={100}
                  required
                  disabled={saving}
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="admin-input"
                  style={{ marginTop: '5px' }}
                  placeholder="Nhập tên danh mục..."
                />
              </div>
              <div>
                <label
                  htmlFor="category-description"
                  style={{ fontWeight: 'bold' }}
                >
                  Mô tả chi tiết:
                </label>
                <textarea
                  id="category-description"
                  maxLength={10000}
                  disabled={saving}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="admin-input"
                  style={{
                    marginTop: '5px',
                    height: '120px',
                    resize: 'vertical',
                  }}
                  placeholder="Nhập mô tả danh mục..."
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  marginTop: '10px',
                }}
              >
                <button
                  type="button"
                  className="btn-delete"
                  style={{ background: 'var(--color-secondary)' }}
                  disabled={saving}
                  onClick={closeModal}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-auth"
                  style={{ margin: 0, width: 'auto', padding: '10px 20px' }}
                >
                  {isEditing ? 'Cập nhật' : 'Thêm Danh mục'}
                </button>
              </div>
            </form>
          </Modal>
        )}

        <AdminDataPanel
          resource={resource}
          onRetry={fetchCategories}
          onPage={(page) => updateList({ page })}
          showEmptyMessage={false}
        >
          <table className="admin-card-table">
            <caption className="admin-sr-only">
              Danh mục. Chọn tiêu đề cột để thay đổi chiều sắp xếp.
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
                  ascending="name"
                  descending="name_desc"
                >
                  Tên
                </AdminSortHeader>
                <th>Mô tả</th>
                <AdminSortHeader
                  value={sortBy}
                  onChange={setSortBy}
                  ascending="count_asc"
                  descending="count"
                >
                  Số món
                </AdminSortHeader>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.length > 0 ? (
                filteredCategories.map((c) => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{c.name}</td>
                    <td>{c.description}</td>
                    <td
                      style={{
                        textAlign: 'center',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {c._count?.recipes || 0}
                    </td>
                    <td style={{ minWidth: '150px' }}>
                      <button
                        className="btn-edit"
                        onClick={() => handleEdit(c)}
                      >
                        Sửa
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(c)}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    style={{ textAlign: 'center', padding: '20px' }}
                  >
                    Không có dữ liệu phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </AdminDataPanel>
      </div>
    </AdminLayout>
  );
};

export default AdminCategories;
