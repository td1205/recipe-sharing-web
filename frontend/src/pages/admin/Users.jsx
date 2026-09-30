import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/AdminLayout';
import SkeletonLoader from '../../components/SkeletonLoader';
import toast from 'react-hot-toast';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/admin/users');
      if (res.data.success) {
        setUsers(res.data.users);
      }
    } catch (err) {
      setError('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateRole = async (user, newRole) => {
    try {
      await axios.post(`/api/admin/users/edit/${user.id}`, { 
        fullname: user.fullname, 
        email: user.email, 
        role: newRole 
      });
      toast.success('Cập nhật vai trò thành công!');
      fetchUsers();
    } catch (err) {
      toast.error('Lỗi cập nhật vai trò');
    }
  };

  if (loading) return <AdminLayout title="Quản lý Người dùng"><SkeletonLoader /></AdminLayout>;
  if (error) return <AdminLayout title="Quản lý Người dùng"><div className="error-msg">{error}</div></AdminLayout>;

  return (
    <AdminLayout title="Quản lý Người dùng">
      <h3 className="admin-header-title">Danh sách Người dùng</h3>
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Tên đăng nhập</th>
            <th>Email</th>
            <th>Vai trò</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.username}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>
                <select 
                  value={u.role} 
                  onChange={(e) => handleUpdateRole(u, e.target.value)}
                  className="admin-input"
                  style={{ width: '100px' }}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminLayout>
  );
};

export default AdminUsers;
