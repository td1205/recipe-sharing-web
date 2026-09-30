import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/AdminLayout';
import SkeletonLoader from '../../components/SkeletonLoader';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const AdminComments = () => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const handleDelete = async (id) => {
    if (window.confirm('Xóa bình luận này?')) {
      try {
        await axios.delete(`/api/admin/comments/${id}`);
        toast.success('Xóa bình luận thành công!');
        fetchComments();
      } catch (err) {
        toast.error('Lỗi xóa bình luận');
      }
    }
  };

  if (loading) return <AdminLayout title="Quản lý Bình luận"><SkeletonLoader /></AdminLayout>;
  if (error) return <AdminLayout title="Quản lý Bình luận"><div className="error-msg">{error}</div></AdminLayout>;

  return (
    <AdminLayout title="Quản lý Bình luận">
      <h3 className="admin-header-title">Danh sách Bình luận</h3>
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Người dùng</th>
            <th>Công thức</th>
            <th>Nội dung</th>
            <th>Ngày</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {comments.map(c => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.users?.username}</td>
              <td><Link to={`/recipes/${c.recipe_id}`}>{c.recipes?.title}</Link></td>
              <td>{c.content}</td>
              <td>{new Date(c.created_at).toLocaleDateString('vi-VN')}</td>
              <td>
                <button className="btn-delete" onClick={() => handleDelete(c.id)}>Xóa</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminLayout>
  );
};

export default AdminComments;
