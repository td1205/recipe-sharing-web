import { apiErrorMessage } from '../../utils/apiError';
import Modal from '../../components/Modal';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/AdminLayout';
import SkeletonLoader from '../../components/SkeletonLoader';
import ConfirmDialog from '../../components/ConfirmDialog';
import { validatePassword } from '../../utils/passwordPolicy';
import toast from 'react-hot-toast';
import './admin.css';
import AdminPageHeader from '../../components/AdminPageHeader';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [editingPasswordUser, setEditingPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmState, setConfirmState] = useState(null); // { title, message, confirmLabel, onConfirm }

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

  const handleBanToggle = (user) => {
    setConfirmState({
      title: user.is_banned ? 'Mở khóa tài khoản' : 'Khóa tài khoản',
      message: `${user.is_banned ? 'Mở khóa' : 'Khóa'} tài khoản của ${user.username}?`,
      confirmLabel: user.is_banned ? 'Mở khóa' : 'Khóa',
      onConfirm: async () => {
        try {
          await axios.post(`/api/admin/users/ban/${user.id}`, { is_banned: !user.is_banned });
          toast.success(user.is_banned ? 'Đã mở khóa tài khoản!' : 'Đã khóa tài khoản!', { style: { background: 'var(--color-bg-body)', color: 'var(--color-text-main)' } });
          fetchUsers();
        } catch (err) {
          toast.error(apiErrorMessage(err, 'Lỗi khi cập nhật trạng thái'));
        }
        setConfirmState(null);
      },
    });
  };

  const handleDelete = (user) => {
    setConfirmState({
      title: 'Xoá vĩnh viễn tài khoản',
      message: `Xoá vĩnh viễn tài khoản ${user.username}? Tài khoản còn công thức sẽ KHÔNG xóa được — hãy xóa/chuyển công thức trước.`,
      confirmLabel: 'Xoá vĩnh viễn',
      danger: true,
      onConfirm: async () => {
        try {
          await axios.post(`/api/admin/users/delete/${user.id}`);
          toast.success('Đã xóa tài khoản!', { style: { background: 'var(--color-bg-body)', color: 'var(--color-text-main)' } });
          fetchUsers();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Lỗi khi xóa người dùng');
        }
        setConfirmState(null);
      },
    });
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwordBusy) return;
    const policyError = validatePassword(newPassword);
    if (policyError) {
      toast.error(policyError);
      return;
    }
    setPasswordBusy(true);
    try {
      await axios.post(`/api/admin/users/password/${editingPasswordUser.id}`, { newPassword });
      toast.success('Đổi mật khẩu thành công!', { style: { background: 'var(--color-bg-body)', color: 'var(--color-text-main)' } });
      setEditingPasswordUser(null);
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi đổi mật khẩu');
    } finally { setPasswordBusy(false); }
  };

  if (loading) return <AdminLayout title="Quản lý Người dùng"><SkeletonLoader /></AdminLayout>;
  if (error) return <AdminLayout title="Quản lý Người dùng"><div className="error-msg">{error}</div></AdminLayout>;

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    const matchSearch = u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole = !roleFilter || (u.role || 'user') === roleFilter;
    const matchStatus = !statusFilter || (statusFilter === 'banned' ? Boolean(u.is_banned) : !u.is_banned);
    return matchSearch && matchRole && matchStatus;
  }).sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === 'name') return String(a.username || '').localeCompare(String(b.username || ''), 'vi');
    if (sortBy === 'mostRecipes') return (b._count?.recipes || 0) - (a._count?.recipes || 0);
    if (sortBy === 'mostComments') return (b._count?.comments || 0) - (a._count?.comments || 0);
    return new Date(b.created_at) - new Date(a.created_at); // newest
  });

  return (
    <AdminLayout title="Quản lý Người dùng">
      <div className="admin-shell">

        <AdminPageHeader
          title="Thành viên"
          subtitle="Quản lý tài khoản, phân quyền và trạng thái hoạt động"
          actions={(
            <div className="admin-toolbar-filters">
            <input
              type="search"
              placeholder="Tìm kiếm username, email..."
              className="admin-search"
              aria-label="Tìm kiếm người dùng"
              maxLength={200}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select className="admin-select" aria-label="Lọc vai trò" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">Tất cả vai trò</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <select className="admin-select" aria-label="Lọc trạng thái" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Tất cả trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="banned">Bị khóa</option>
            </select>
            <select className="admin-select" aria-label="Sắp xếp người dùng" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Mới nhất trước</option>
              <option value="oldest">Cũ nhất trước</option>
              <option value="name">Tên A–Z</option>
              <option value="mostRecipes">Nhiều công thức nhất</option>
              <option value="mostComments">Nhiều bình luận nhất</option>
            </select>
            </div>
          )}
        />

        <p className="admin-page-sub" style={{ marginBottom: '12px' }}>
          Hiển thị {filteredUsers.length.toLocaleString('vi-VN')} / {users.length.toLocaleString('vi-VN')} người dùng
        </p>

        {/* Bảng dữ liệu */}
        <div className="admin-table-box">
            <table className="admin-card-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Người dùng</th>
                  <th style={{ textAlign: 'center' }}>Hoạt động</th>
                  <th>Vai trò</th>
                  <th style={{ textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan="6" className="admin-empty-cell">Không tìm thấy người dùng nào.</td></tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td className="admin-cell-sub">#{u.id}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img src={u.avatar_url || '/default-avatar.svg'} alt={`Avatar của ${u.username}`} className="admin-avatar" width={36} height={36} />
                          <div style={{ minWidth: 0 }}>
                            <div className="admin-cell-title">{u.username}</div>
                            <div className="admin-cell-sub">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
                          <span title="Số công thức" className="admin-cell-sub"><i className="fa-solid fa-utensils" aria-hidden="true"></i> {u._count?.recipes || 0}</span>
                          <span title="Số bình luận" className="admin-cell-sub"><i className="fa-solid fa-comments" aria-hidden="true"></i> {u._count?.comments || 0}</span>
                        </div>
                      </td>
                      <td>
                        <select
                          value={u.role || 'user'}
                          onChange={(e) => handleUpdateRole(u, e.target.value)}
                          className="admin-select"
                          style={{ padding: '5px 8px' }}
                          aria-label={`Đổi vai trò của ${u.username}`}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`admin-badge ${u.is_banned ? 'admin-badge-banned' : 'admin-badge-ok'}`}>
                          {u.is_banned ? 'Bị khóa' : 'Hoạt động'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="admin-btn-icon"
                          onClick={() => setEditingPasswordUser(u)}
                          title="Đổi mật khẩu"
                          aria-label={`Đổi mật khẩu của ${u.username}`}
                        >
                          <i className="fa-solid fa-key" aria-hidden="true"></i>
                        </button>
                        <button
                          type="button"
                          className={`admin-btn-icon ${u.is_banned ? 'admin-btn-icon-success' : ''}`}
                          style={{ marginLeft: '8px' }}
                          onClick={() => handleBanToggle(u)}
                          title={u.is_banned ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                          aria-label={`${u.is_banned ? 'Mở khóa' : 'Khóa'} tài khoản của ${u.username}`}
                        >
                          <i className={`fa-solid ${u.is_banned ? 'fa-unlock' : 'fa-lock'}`} aria-hidden="true"></i>
                        </button>
                        <button
                          type="button"
                          className="admin-btn-icon admin-btn-icon-danger"
                          style={{ marginLeft: '8px' }}
                          onClick={() => handleDelete(u)}
                          title="Xóa vĩnh viễn"
                          aria-label={`Xóa vĩnh viễn tài khoản của ${u.username}`}
                        >
                          <i className="fa-solid fa-trash" aria-hidden="true"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      {editingPasswordUser && (
        <Modal title="Đổi mật khẩu" busy={passwordBusy} onClose={() => { setEditingPasswordUser(null); setNewPassword(''); }}>
          <p>Tài khoản: <strong>{editingPasswordUser.username}</strong></p>
          <form onSubmit={handleUpdatePassword}>
            <label htmlFor="admin-new-password">Mật khẩu mới</label>
            <input id="admin-new-password" type="password" autoComplete="new-password" value={newPassword}
              onChange={event => setNewPassword(event.target.value)} className="admin-input" minLength={8} maxLength={200}
              placeholder="Ít nhất 8 ký tự, gồm chữ, số và ký tự đặc biệt" required disabled={passwordBusy} />
            <div className="app-modal-actions">
              <button type="button" className="btn-secondary" disabled={passwordBusy} onClick={() => { setEditingPasswordUser(null); setNewPassword(''); }}>Hủy</button>
              <button type="submit" className="btn-primary" disabled={passwordBusy}>{passwordBusy ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
            </div>
          </form>
        </Modal>
      )}
      {confirmState && (
        <ConfirmDialog
          isOpen
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          danger={confirmState.danger}
          busy={confirmBusy}
          onConfirm={async () => {
            if (confirmBusy) return;
            setConfirmBusy(true);
            try { await confirmState.onConfirm(); } finally { setConfirmBusy(false); }
          }}
          onClose={() => setConfirmState(null)}
        />
      )}
    </AdminLayout>
  );
};

export default AdminUsers;
