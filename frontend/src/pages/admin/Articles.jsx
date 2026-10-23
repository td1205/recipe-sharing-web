import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import SkeletonLoader from '../../components/SkeletonLoader';
import toast from 'react-hot-toast';

const AdminArticles = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    image_url: ''
  });

  const fetchArticles = async () => {
    try {
      const res = await axios.get('/api/articles');
      if (res.data.success) {
        setArticles(res.data.articles);
      }
    } catch (err) {
      setError('Không thể tải bài viết');
      toast.error('Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return toast.error('Vui lòng nhập đủ Tiêu đề và Nội dung');
    
    try {
      if (isEditing) {
        await axios.put(`/api/articles/${currentId}`, formData);
        toast.success('Cập nhật thành công!');
      } else {
        await axios.post('/api/articles', formData);
        toast.success('Thêm mới thành công!');
      }
      
      closeModal();
      fetchArticles();
    } catch (err) {
      toast.error('Đã xảy ra lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleEdit = (article) => {
    setIsEditing(true);
    setCurrentId(article.id);
    setFormData({
      title: article.title,
      content: article.content,
      image_url: article.image_url || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa bài viết này không?')) {
      try {
        await axios.delete(`/api/articles/${id}`);
        fetchArticles();
        toast.success('Xóa thành công');
      } catch (err) {
        toast.error('Lỗi xóa bài viết');
      }
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({ title: '', content: '', image_url: '' });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setCurrentId(null);
    setFormData({ title: '', content: '', image_url: '' });
  };

  const filteredArticles = articles.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <AdminLayout title="Quản lý Bài viết"><SkeletonLoader /></AdminLayout>;
  if (error) return <AdminLayout title="Quản lý Bài viết"><div className="error-msg">{error}</div></AdminLayout>;

  return (
    <AdminLayout title="Quản lý Bài viết">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 className="admin-header-title" style={{ margin: 0 }}>Danh sách Bài viết</h3>
        <div style={{ display: 'flex', gap: '15px' }}>
          <input 
            type="text" 
            placeholder="Tìm kiếm bài viết..." 
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
              {isEditing ? 'Sửa bài viết' : 'Thêm bài viết mới'}
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontWeight: 'bold' }}>Tiêu đề:</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="admin-input"
                  style={{ marginTop: '5px' }}
                  placeholder="Nhập tiêu đề bài viết..."
                />
              </div>
              <div>
                <label style={{ fontWeight: 'bold' }}>Ảnh bìa:</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => {
                    // Logic upload cloud sẽ được xử lý sau
                    // Tạm thời lưu tên file hoặc bỏ qua
                  }}
                  className="admin-input"
                  style={{ marginTop: '5px', padding: '8px' }}
                />
              </div>
              <div>
                <label style={{ fontWeight: 'bold' }}>Nội dung chi tiết:</label>
                <textarea 
                  value={formData.content}
                  onChange={e => setFormData({...formData, content: e.target.value})}
                  className="admin-input"
                  style={{ marginTop: '5px', height: '120px', resize: 'vertical' }}
                  placeholder="Nhập nội dung bài viết..."
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn-delete" style={{ background: 'var(--color-secondary)' }} onClick={closeModal}>Hủy</button>
                <button type="submit" className="btn-auth" style={{ margin: 0, width: 'auto', padding: '10px 20px' }}>
                  {isEditing ? 'Cập nhật' : 'Thêm Bài viết'}
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
            <th>Ảnh</th>
            <th>Tiêu đề</th>
            <th>Lượt xem</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {filteredArticles.length > 0 ? filteredArticles.map(a => (
            <tr key={a.id}>
              <td>{a.id}</td>
              <td>
                {a.image_url ? (
                  <img src={a.image_url} alt="Cover" style={{ width: '60px', height: '40px', objectFit: 'cover' }} />
                ) : 'Không có'}
              </td>
              <td>
                <Link to={`/articles/${a.id}`} target="_blank" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 'bold' }}>
                  {a.title}
                </Link>
              </td>
              <td>{a.views}</td>
              <td>
                <button className="btn-edit" onClick={() => handleEdit(a)}>Sửa</button>
                <button className="btn-delete" onClick={() => handleDelete(a.id)}>Xóa</button>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>Không tìm thấy bài viết nào.</td>
            </tr>
          )}
        </tbody>
      </table>
    </AdminLayout>
  );
};

export default AdminArticles;
