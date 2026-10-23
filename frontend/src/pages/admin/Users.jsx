import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/AdminLayout';
import SkeletonLoader from '../../components/SkeletonLoader';
import toast from 'react-hot-toast';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPasswordUser, setEditingPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');

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
      toast.success('Cập nhật vai trò thành công!', { style: { background: 'var(--color-bg-body)', color: 'var(--color-text-main)' } });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật vai trò');
      fetchUsers();
    }
  };

  const handleBanToggle = async (user) => {
    if (!window.confirm(`Bạn có chắc muốn ${user.is_banned ? 'mở khóa' : 'khóa'} tài khoản của ${user.username}?`)) return;
    try {
      await axios.post(`/api/admin/users/ban/${user.id}`, {
        is_banned: !user.is_banned
      });
      toast.success(user.is_banned ? 'Đã mở khóa tài khoản!' : 'Đã khóa tài khoản!', { style: { background: 'var(--color-bg-body)', color: 'var(--color-text-main)' } });
      fetchUsers();
    } catch (err) {
      toast.error('Lỗi khi cập nhật trạng thái');
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`NGUY HIỂM: Bạn có chắc muốn xóa vĩnh viễn tài khoản ${user.username}? Toàn bộ công thức của họ cũng sẽ bị xóa.`)) return;
    try {
      await axios.post(`/api/admin/users/delete/${user.id}`);
      toast.success('Đã xóa tài khoản!', { style: { background: 'var(--color-bg-body)', color: 'var(--color-text-main)' } });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa người dùng');
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Mật khẩu phải từ 6 ký tự');
      return;
    }
    try {
      await axios.post(`/api/admin/users/password/${editingPasswordUser.id}`, { newPassword });
      toast.success('Đổi mật khẩu thành công!', { style: { background: 'var(--color-bg-body)', color: 'var(--color-text-main)' } });
      setEditingPasswordUser(null);
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi đổi mật khẩu');
    }
  };

  if (loading) return <AdminLayout title="Quản lý Người dùng"><SkeletonLoader /></AdminLayout>;
  if (error) return <AdminLayout title="Quản lý Người dùng"><div className="error-msg">{error}</div></AdminLayout>;

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout title="Quản lý Người dùng">
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        
        {/* Tiêu đề & Công cụ tìm kiếm */}
        <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h2 style={{ fontSize: '28px', margin: '0 0 5px 0', color: '#fff', fontWeight: '300' }}>Thành viên</h2>
            <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '15px' }}>Quản lý tài khoản, phân quyền và trạng thái hoạt động</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <i className="fa-solid fa-search" style={{ position: 'absolute', left: '15px', top: '12px', color: 'var(--color-text-muted)' }}></i>
              <input 
                type="text" 
                placeholder="Tìm kiếm username, email..." 
                className="admin-input"
                style={{ paddingLeft: '40px', width: '300px', borderRadius: '20px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Bảng dữ liệu */}
        <div style={{ 
          background: 'rgba(27, 40, 56, 0.6)', 
          border: '1px solid var(--color-border)', 
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(16, 24, 34, 0.8)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '15px 20px', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: '600', fontSize: '13px' }}>ID</th>
                  <th style={{ padding: '15px 20px', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: '600', fontSize: '13px' }}>NGƯỜI DÙNG</th>
                  <th style={{ padding: '15px 20px', textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: '600', fontSize: '13px' }}>HOẠT ĐỘNG</th>
                  <th style={{ padding: '15px 20px', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: '600', fontSize: '13px' }}>VAI TRÒ</th>
                  <th style={{ padding: '15px 20px', textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: '600', fontSize: '13px' }}>TRẠNG THÁI</th>
                  <th style={{ padding: '15px 20px', textAlign: 'right', color: 'var(--color-text-muted)', fontWeight: '600', fontSize: '13px' }}>HÀNH ĐỘNG</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>Không tìm thấy người dùng nào.</td></tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.2s' }} className="admin-table-row">
                      <td style={{ padding: '15px 20px', color: 'var(--color-text-muted)' }}>#{u.id}</td>
                      <td style={{ padding: '15px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <img src={u.avatar_url || 'https://via.placeholder.com/40'} alt="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                          <div>
                            <div style={{ color: '#fff', fontWeight: '500', fontSize: '15px' }}>{u.username}</div>
                            <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '15px 20px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                          <span title="Số công thức" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><i className="fa-solid fa-utensils"></i> {u._count?.recipes || 0}</span>
                          <span title="Số bình luận" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><i className="fa-solid fa-comments"></i> {u._count?.comments || 0}</span>
                        </div>
                      </td>
                      <td style={{ padding: '15px 20px' }}>
                        <select 
                          value={u.role || 'user'} 
                          onChange={(e) => handleUpdateRole(u, e.target.value)}
                          className="admin-input"
                          style={{ 
                            width: '100px', 
                            padding: '6px 10px', 
                            borderRadius: '4px',
                            background: u.role === 'admin' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.05)',
                            color: u.role === 'admin' ? '#38bdf8' : 'var(--color-text-main)',
                            border: `1px solid ${u.role === 'admin' ? 'rgba(56, 189, 248, 0.3)' : 'var(--color-border)'}`
                          }}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td style={{ padding: '15px 20px', textAlign: 'center' }}>
                        {u.is_banned ? (
                          <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>BỊ KHÓA</span>
                        ) : (
                          <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>HOẠT ĐỘNG</span>
                        )}
                      </td>
                      <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                        <button 
                          className="btn-secondary" 
                          onClick={() => setEditingPasswordUser(u)}
                          title="Đổi mật khẩu"
                          style={{ padding: '6px 12px', marginRight: '10px', color: '#38bdf8', borderColor: '#38bdf8', background: 'transparent' }}
                        >
                          <i className="fa-solid fa-key"></i>
                        </button>
                        <button 
                          className="btn-secondary" 
                          onClick={() => handleBanToggle(u)}
                          title={u.is_banned ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                          style={{ padding: '6px 12px', marginRight: '10px', color: u.is_banned ? '#10b981' : '#f59e0b', borderColor: u.is_banned ? '#10b981' : '#f59e0b', background: 'transparent' }}
                        >
                          <i className={`fa-solid ${u.is_banned ? 'fa-unlock' : 'fa-lock'}`}></i>
                        </button>
                        <button 
                          className="btn-secondary" 
                          onClick={() => handleDelete(u)}
                          title="Xóa vĩnh viễn"
                          style={{ padding: '6px 12px', color: '#ef4444', borderColor: '#ef4444', background: 'transparent' }}
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {editingPasswordUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--color-bg-body)', padding: '30px', borderRadius: '12px', width: '400px', border: '1px solid var(--color-border)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#fff', fontSize: '20px', fontWeight: '500' }}>Đổi mật khẩu</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '20px' }}>Tài khoản: <strong style={{ color: '#fff' }}>{editingPasswordUser.username}</strong></p>
            <form onSubmit={handleUpdatePassword}>
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: 'bold' }}>Mật khẩu mới</label>
                <input 
                  type="text" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="admin-input" 
                  placeholder="Nhập ít nhất 6 ký tự..."
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => { setEditingPasswordUser(null); setNewPassword(''); }}>Hủy</button>
                <button type="submit" className="btn-primary" style={{ background: '#38bdf8', color: '#000', border: 'none' }}>Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminUsers;
