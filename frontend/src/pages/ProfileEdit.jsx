import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { AuthContext } from '../context/AuthContext';
import SkeletonLoader from '../components/SkeletonLoader';

const ProfileEdit = () => {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    bio: ''
  });
  const [username, setUsername] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('https://avatars.akamai.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [file, setFile] = useState(null);

  useEffect(() => {
    const fetchEditPage = async () => {
      try {
        const res = await axios.get('/api/profile/edit');
        if (res.data.success) {
          const editUser = res.data.editUser;
          setFormData({
            fullname: editUser.fullname || '',
            email: editUser.email || '',
            bio: editUser.bio || ''
          });
          setUsername(editUser.username || '');
          if (editUser.avatar_url) setAvatarPreview(editUser.avatar_url);
        }
      } catch (err) {
        if (err.response?.status === 401) navigate('/login');
        else setError('Lỗi khi tải thông tin chỉnh sửa.');
      } finally {
        setLoading(false);
      }
    };
    fetchEditPage();
  }, [navigate]);

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
    try {
      const data = new FormData();
      data.append('fullname', formData.fullname);
      data.append('email', formData.email);
      data.append('bio', formData.bio);
      if (file) {
        data.append('avatar', file);
      }
      
      const res = await axios.post('/api/profile/edit', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setSuccess('Cập nhật thông tin thành công!');
        setUser(res.data.user); // update global user state
        setTimeout(() => navigate('/profile'), 1500);
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Lỗi hệ thống');
      }
    }
  };

  if (loading) return <MainLayout hideSidebar><SkeletonLoader /></MainLayout>;

  return (
    <MainLayout hideSidebar>
      <div className="steam-profile-edit-container">
        <div className="profile-header">
          <h2>Hồ sơ của {username}</h2>
          <Link to="/profile" className="btn-secondary">Quay về Hồ sơ</Link>
        </div>
        
        <div className="profile-card profile-card-edit" style={{ display: 'flex', gap: '30px' }}>
          {error && <div className="error-msg" style={{ width: '100%' }}>{error}</div>}
          {success && <div className="success-msg" style={{ width: '100%' }}>{success}</div>}

          <div className="steam-edit-left" style={{ flex: '1' }}>
            <form onSubmit={handleSubmit}>
              <div className="form-group steam-form-group">
                <label>TÊN HỒ SƠ</label>
                <input type="text" name="fullname" value={formData.fullname} onChange={handleChange} required />
              </div>
              <div className="form-group steam-form-group">
                <label>TÊN THẬT</label>
                <input type="text" value={username} disabled className="input-disabled-edit" />
              </div>
              <div className="form-group steam-form-group">
                <label>EMAIL</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required />
              </div>
              <div className="form-group steam-form-group">
                <label>TÓM TẮT</label>
                <textarea name="bio" value={formData.bio} onChange={handleChange} rows="5" style={{ width: '100%', background: 'var(--color-bg-body)', border: '1px solid var(--color-border)', color: 'var(--color-text-main)', padding: '10px', borderRadius: '4px' }}></textarea>
              </div>
              
              <div className="steam-edit-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn-primary" style={{ border: 'none' }}>Lưu</button>
                <Link to="/profile" className="btn-secondary">Hủy</Link>
              </div>
            </form>
          </div>

          <div className="steam-edit-right" style={{ width: '250px' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>Hình đại diện</h3>
            <div className="steam-avatar-upload" style={{ background: 'var(--color-bg-body)', border: '1px solid var(--color-border)', padding: '15px', textAlign: 'center', borderRadius: '8px' }}>
              <img src={avatarPreview} alt="Avatar" style={{ width: '184px', height: '184px', border: '1px solid var(--color-border)', borderRadius: '4px', marginBottom: '15px', objectFit: 'cover' }} />
              <button type="button" className="btn-secondary" style={{ width: '100%' }} onClick={() => fileInputRef.current.click()}>
                Tải ảnh lên
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/*" />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProfileEdit;
