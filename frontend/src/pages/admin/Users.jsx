import AdminListToolbar from '../../components/AdminListToolbar';
import AdminDataPanel from '../../components/AdminDataPanel';
import useAdminResource from '../../hooks/useAdminResource';
import { apiErrorMessage } from '../../utils/apiError';
import Modal from '../../components/Modal';
import React, { useState } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/AdminLayout';
import ConfirmDialog from '../../components/ConfirmDialog';
import { validatePassword } from '../../utils/passwordPolicy';
import toast from 'react-hot-toast';
import './admin.css';
import AdminPageHeader from '../../components/AdminPageHeader';
import { AdminSortHeader } from '../../components/AdminSort';
import { userSortOptions } from '../../utils/adminSorting';
import useAdminListState from '../../hooks/useAdminListState';

const AdminUsers = () => {
  const [
    {
      search: searchTerm,
      role: roleFilter,
      status: statusFilter,
      sort: sortBy,
      page,
    },
    updateList,
  ] = useAdminListState(
    { search: '', role: '', status: '', sort: 'newest', page: 1 },
    {
      role: ['', 'user', 'admin'],
      status: ['', 'active', 'banned'],
      sort: userSortOptions.map((option) => option.value),
    },
  );
  const [revision, setRevision] = useState(0);
  const resource = useAdminResource(
    '/api/admin/users',
    {
      search: searchTerm,
      role: roleFilter,
      status: statusFilter,
      sort: sortBy,
      page,
      limit: 20,
    },
    revision,
  );
  const filteredUsers = resource.data?.items || [];
  const setSortBy = (sort) => updateList({ sort });
  const [editingPasswordUser, setEditingPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmState, setConfirmState] = useState(null); // { title, message, confirmLabel, onConfirm }

  const fetchUsers = () => setRevision((value) => value + 1);

  const handleUpdateRole = async (user, newRole) => {
    try {
      await axios.post(`/api/admin/users/edit/${user.id}`, {
        fullname: user.fullname,
        email: user.email,
        role: newRole,
      });
      toast.success('Cập nhật vai trò thành công!', {
        style: {
          background: 'var(--color-bg-body)',
          color: 'var(--color-text-main)',
        },
      });
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
          await axios.post(`/api/admin/users/ban/${user.id}`, {
            is_banned: !user.is_banned,
          });
          toast.success(
            user.is_banned ? 'Đã mở khóa tài khoản!' : 'Đã khóa tài khoản!',
            {
              style: {
                background: 'var(--color-bg-body)',
                color: 'var(--color-text-main)',
              },
            },
          );
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
          toast.success('Đã xóa tài khoản!', {
            style: {
              background: 'var(--color-bg-body)',
              color: 'var(--color-text-main)',
            },
          });
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
      await axios.post(`/api/admin/users/password/${editingPasswordUser.id}`, {
        newPassword,
      });
      toast.success('Đổi mật khẩu thành công!', {
        style: {
          background: 'var(--color-bg-body)',
          color: 'var(--color-text-main)',
        },
      });
      setEditingPasswordUser(null);
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi đổi mật khẩu');
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <AdminLayout title="Quản lý Người dùng">
      <div className="admin-shell">
        <AdminPageHeader
          title="Thành viên"
          subtitle="Quản lý tài khoản, phân quyền và trạng thái hoạt động"
        />
        <AdminListToolbar
          searchLabel="Tìm kiếm người dùng"
          placeholder="Tên đăng nhập, họ tên hoặc email…"
          search={searchTerm}
          onSearch={(search) => updateList({ search }, { replace: true })}
          sort={sortBy}
          onSort={setSortBy}
          sortOptions={userSortOptions}
          onReset={() =>
            updateList({
              search: '',
              role: '',
              status: '',
              sort: 'newest',
              page: 1,
            })
          }
          filters={[
            {
              key: 'role',
              label: 'Vai trò',
              ariaLabel: 'Lọc vai trò',
              value: roleFilter,
              onChange: (role) => updateList({ role }),
              options: [
                ['', 'Tất cả vai trò'],
                ['user', 'Thành viên'],
                ['admin', 'Quản trị viên'],
              ],
            },
            {
              key: 'status',
              label: 'Trạng thái',
              ariaLabel: 'Lọc trạng thái',
              value: statusFilter,
              onChange: (status) => updateList({ status }),
              options: [
                ['', 'Tất cả trạng thái'],
                ['active', 'Hoạt động'],
                ['banned', 'Bị khóa'],
              ],
            },
          ]}
        />

        {/* Bảng dữ liệu */}
        <AdminDataPanel
          resource={resource}
          onRetry={fetchUsers}
          onPage={(page) => updateList({ page })}
          showEmptyMessage={false}
        >
          <table className="admin-card-table">
            <caption className="admin-sr-only">
              Người dùng. Chọn tiêu đề cột để thay đổi chiều sắp xếp.
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
                  Người dùng
                </AdminSortHeader>
                <AdminSortHeader
                  value={sortBy}
                  onChange={setSortBy}
                  ascending="leastRecipes"
                  descending="mostRecipes"
                >
                  Số công thức
                </AdminSortHeader>
                <AdminSortHeader
                  value={sortBy}
                  onChange={setSortBy}
                  ascending="leastComments"
                  descending="mostComments"
                >
                  Số bình luận
                </AdminSortHeader>
                <th>Vai trò</th>
                <th style={{ textAlign: 'center' }}>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="admin-empty-cell">
                    Không có dữ liệu phù hợp.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td className="admin-cell-sub">#{u.id}</td>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                      >
                        <img
                          src={u.avatar_url || '/default-avatar.svg'}
                          alt={`Avatar của ${u.username}`}
                          className="admin-avatar"
                          width={36}
                          height={36}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div className="admin-cell-title">{u.username}</div>
                          <div className="admin-cell-sub">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="num">{u._count?.recipes || 0}</td>
                    <td className="num">{u._count?.comments || 0}</td>
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
                      <span
                        className={`admin-badge ${u.is_banned ? 'admin-badge-banned' : 'admin-badge-ok'}`}
                      >
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
                        title={
                          u.is_banned ? 'Mở khóa tài khoản' : 'Khóa tài khoản'
                        }
                        aria-label={`${u.is_banned ? 'Mở khóa' : 'Khóa'} tài khoản của ${u.username}`}
                      >
                        <i
                          className={`fa-solid ${u.is_banned ? 'fa-unlock' : 'fa-lock'}`}
                          aria-hidden="true"
                        ></i>
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
        </AdminDataPanel>
      </div>

      {editingPasswordUser && (
        <Modal
          title="Đổi mật khẩu"
          busy={passwordBusy}
          onClose={() => {
            setEditingPasswordUser(null);
            setNewPassword('');
          }}
        >
          <p>
            Tài khoản: <strong>{editingPasswordUser.username}</strong>
          </p>
          <form onSubmit={handleUpdatePassword}>
            <label htmlFor="admin-new-password">Mật khẩu mới</label>
            <input
              id="admin-new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="admin-input"
              minLength={8}
              maxLength={200}
              placeholder="Ít nhất 8 ký tự, gồm chữ, số và ký tự đặc biệt"
              required
              disabled={passwordBusy}
            />
            <div className="app-modal-actions">
              <button
                type="button"
                className="btn-secondary"
                disabled={passwordBusy}
                onClick={() => {
                  setEditingPasswordUser(null);
                  setNewPassword('');
                }}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={passwordBusy}
              >
                {passwordBusy ? 'Đang lưu…' : 'Lưu thay đổi'}
              </button>
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
            try {
              await confirmState.onConfirm();
            } finally {
              setConfirmBusy(false);
            }
          }}
          onClose={() => setConfirmState(null)}
        />
      )}
    </AdminLayout>
  );
};

export default AdminUsers;
