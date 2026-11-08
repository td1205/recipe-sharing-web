import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { AuthContext } from '../context/AuthContext';
import SkeletonLoader from '../components/SkeletonLoader';
import './profile.css';

const DEFAULT_AVATAR = '/default-avatar.svg';

const ProfileEdit = () => {
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({ fullname: '', email: '', bio: '' });
  const [username, setUsername] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(DEFAULT_AVATAR);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchEditPage = async () => {
      try {
        const res = await axios.get('/api/profile/edit');
        if (!active) return;
        if (res.data.success) {
          const editUser = res.data.editUser;
          setFormData({
            fullname: editUser.fullname || '',
            email: editUser.email || '',
            bio: editUser.bio || '',
          });
          setUsername(editUser.username || '');
          if (editUser.avatar_url) setAvatarPreview(editUser.avatar_url);
        }
      } catch (err) {
        if (!active) return;
        setError(err.response?.status === 401
          ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
          : 'Lỗi khi tải thông tin chỉnh sửa. Vui lòng thử lại sau.');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchEditPage();
    return () => { active = false; };
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setAvatarPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('fullname', formData.fullname);
      data.append('email', formData.email);
      data.append('bio', formData.bio);
      if (file) {
        data.append('avatar', file);
      }

      const res = await axios.post('/api/profile/edit', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setSuccess('Cập nhật thông tin thành công!');
        setUser(res.data.user); // cập nhật user toàn cục
        setTimeout(() => navigate('/profile'), 1500);
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Lỗi hệ thống. Vui lòng thử lại sau.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <MainLayout hideSidebar className="home-typography"><SkeletonLoader /></MainLayout>;

  return (
    <MainLayout hideSidebar className="home-typography">
      <div className="profile-edit-shell">
        <div className="profile-edit-header">
          <h1 className="profile-edit-title">Sửa hồ sơ</h1>
          <Link to="/profile" className="profile-btn-secondary">Quay về hồ sơ</Link>
        </div>

        <div className="profile-panel">
          {error && <div className="profile-alert-error profile-panel-alert" role="alert">{error}</div>}
          {success && <div className="profile-alert-success profile-panel-alert" role="status">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="profile-field">
              <label htmlFor="edit-username">Tên đăng nhập</label>
              <input
                id="edit-username"
                type="text"
                value={username}
                disabled
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            <div className="profile-field">
              <label htmlFor="edit-fullname">Tên hiển thị</label>
              <input
                id="edit-fullname"
                type="text"
                name="fullname"
                value={formData.fullname}
                onChange={handleChange}
                required
                autoComplete="name"
              />
            </div>
            <div className="profile-field">
              <label htmlFor="edit-email">Email</label>
              <input
                id="edit-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                spellCheck={false}
              />
            </div>
            <div className="profile-field">
              <label htmlFor="edit-bio">Tóm tắt bản thân</label>
              <textarea
                id="edit-bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={5}
                placeholder="Giới thiệu ngắn về bạn và phong cách nấu ăn…"
              />
            </div>

            <div className="profile-edit-actions">
              <button type="submit" className="profile-btn-primary" disabled={submitting}>
                {submitting ? 'Đang lưu…' : 'Lưu thay đổi'}
              </button>
              <Link to="/profile" className="profile-btn-secondary">Hủy</Link>
            </div>
          </form>

          <div className="profile-avatar-box">
            <h3>Hình đại diện</h3>
            <img
              src={avatarPreview}
              alt="Xem trước ảnh đại diện"
              width={184}
              height={184}
              className="profile-avatar-preview"
            />
            <button
              type="button"
              className="profile-avatar-btn"
              onClick={() => fileInputRef.current.click()}
            >
              Tải ảnh lên
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
              accept="image/jpeg,image/png,image/webp,image/gif"
              aria-label="Chọn ảnh đại diện"
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProfileEdit;
