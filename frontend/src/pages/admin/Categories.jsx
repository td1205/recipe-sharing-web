import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/AdminLayout';
import SkeletonLoader from '../../components/SkeletonLoader';
import toast from 'react-hot-toast';

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/admin/categories');
      if (res.data.success) {
        setCategories(res.data.categories);
      }
    } catch (err) {
      setError('Không thể tải danh mục');
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast.error('Vui lòng nhập tên danh mục');
    
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
      toast.error('Đã xảy ra lỗi!');
    }
  };

  const handleEdit = (cat) => {
    setIsEditing(true);
    setCurrentId(cat.id);
    setFormData({
      name: cat.name,
      description: cat.description || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa?')) {
      try {
        await axios.post(`/api/admin/categories/delete/${id}`);
        fetchCategories();
        toast.success('Đã xóa danh mục');
      } catch (err) {
        toast.error('Lỗi xóa danh mục');
      }
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

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <AdminLayout title="Quản lý Danh mục"><SkeletonLoader /></AdminLayout>;
  if (error) return <AdminLayout title="Quản lý Danh mục"><div className="error-msg">{error}</div></AdminLayout>;

  return (
    <AdminLayout title="Quản lý Danh mục">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 className="admin-header-title" style={{ margin: 0 }}>Danh sách Danh mục</h3>
        <div style={{ display: 'flex', gap: '15px' }}>
          <input 
            type="text" 
            placeholder="Tìm kiếm danh mục..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="admin-input"
            style={{ width: '250px', padding: '8px 12px' }}
          />
          <button 
            className="btn-auth" 
            onClick={openCreateModal}
            style={{ margin: 0, padding: '8px 16px',  width: 'auto' }}
          >
            <i className="fa-solid fa-plus"></i> Thêm mới
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'var(--color-bg-card)', padding: '30px', borderRadius: '8px', width: '600px', maxWidth: '90%',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--color-text-main)' }}>
              {isEditing ? 'Sửa danh mục' : 'Thêm danh mục mới'}
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontWeight: 'bold' }}>Tên danh mục:</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="admin-input"
                  style={{ marginTop: '5px' }}
                  placeholder="Nhập tên danh mục..."
                />
              </div>
              <div>
                <label style={{ fontWeight: 'bold' }}>Mô tả chi tiết:</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="admin-input"
                  style={{ marginTop: '5px', height: '120px', resize: 'vertical' }}
                  placeholder="Nhập mô tả danh mục..."
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn-delete" style={{ background: 'var(--color-secondary)' }} onClick={closeModal}>Hủy</button>
                <button type="submit" className="btn-auth" style={{ margin: 0, width: 'auto', padding: '10px 20px' }}>
                  {isEditing ? 'Cập nhật' : 'Thêm Danh mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Tên</th>
            <th>Mô tả</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {filteredCategories.length > 0 ? filteredCategories.map(c => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.name}</td>
              <td>{c.description}</td>
              <td style={{ minWidth: '150px' }}>
                <button className="btn-edit" onClick={() => handleEdit(c)}>Sửa</button>
                <button className="btn-delete" onClick={() => handleDelete(c.id)}>Xóa</button>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Không tìm thấy danh mục nào.</td>
            </tr>
          )}
        </tbody>
      </table>
    </AdminLayout>
  );
};

export default AdminCategories;
