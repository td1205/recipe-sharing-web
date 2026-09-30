import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { AuthContext } from '../context/AuthContext';
import SkeletonLoader from '../components/SkeletonLoader';

const ProfileEdit = () => {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
  });
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchEditPage = async () => {
      try {
        const res = await axios.get('/api/profile/edit');
        if (res.data.success) {
          const editUser = res.data.editUser;
          setFormData({
            fullname: editUser.fullname || '',
            email: editUser.email || '',
          });
          setUsername(editUser.username || '');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await axios.post('/api/profile/edit', formData);
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
      <div className="profile-header">
        <h2>Chỉnh sửa thông tin cá nhân</h2>
        <Link to="/profile" className="btn-auth btn-back-profile">Quay lại</Link>
      </div>
      
      <div className="profile-card profile-card-edit">
        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tên đăng nhập (Tài khoản)</label>
            <input type="text" value={username} disabled className="input-disabled-edit" />
          </div>
          <div className="form-group">
            <label>Họ và tên</label>
            <input type="text" name="fullname" value={formData.fullname} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required />
          </div>
          
          <div className="text-right-mt20">
            <button type="submit" className="btn-auth">Cập nhật thông tin</button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default ProfileEdit;
