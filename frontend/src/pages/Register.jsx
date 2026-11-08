import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import MainLayout from '../components/MainLayout';
import { PASSWORD_PATTERN, PASSWORD_REQUIREMENT } from '../constants/auth';
import './Home.css';
import './auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    fullname: '',
    email: '',
    password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Catch obvious mismatches before the round trip.
  const validateConfirm = () => {
    if (formData.confirm_password && formData.confirm_password !== formData.password) {
      return 'Mật khẩu xác nhận không khớp.';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const confirmError = validateConfirm();
    if (confirmError) {
      setError(confirmError);
      setSuccess('');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await axios.post('/api/register', formData);
      if (res.data.success) {
        setSuccess('Đăng ký thành công! Vui lòng đăng nhập.');
        setTimeout(() => navigate('/login'), 2000);
      } else if (res.data.error) {
        setError(res.data.error);
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Lỗi hệ thống, vui lòng thử lại!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout hideSidebar className="home-typography">
      <section className="auth-shell">
        <div className="auth-panel">
          <p className="auth-eyebrow">
            <span className="auth-eyebrow-dot" aria-hidden="true"></span>
            Tham gia cộng đồng
          </p>

          <h1 className="auth-title">Tạo tài khoản</h1>
          <p className="auth-deck">
            Miễn phí và chỉ mất một phút. Bạn sẽ ngay lập tức lưu được công thức yêu thích
            và chia sẻ món ngon của riêng mình.
          </p>

          {error && (
            <div className="auth-alert auth-alert-error" role="alert">{error}</div>
          )}
          {success && (
            <div className="auth-alert auth-alert-success" role="status">{success}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="register-username">Tên đăng nhập</label>
              <input
                id="register-username"
                type="text"
                name="username"
                autoComplete="username"
                placeholder="Ví dụ: minhquan2000"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="register-fullname">Họ và tên</label>
              <input
                id="register-fullname"
                type="text"
                name="fullname"
                autoComplete="name"
                placeholder="Tên hiển thị trên bài viết"
                value={formData.fullname}
                onChange={handleChange}
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="register-email">Địa chỉ email</label>
              <input
                id="register-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="ban@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="register-password">Mật khẩu</label>
              <div className="auth-password">
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="new-password"
                  placeholder="Tạo mật khẩu của bạn"
                  pattern={PASSWORD_PATTERN}
                  title={PASSWORD_REQUIREMENT}
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <i className={showPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'} aria-hidden="true"></i>
                </button>
              </div>
              <span className="auth-hint">{PASSWORD_REQUIREMENT}</span>
            </div>

            <div className="auth-field">
              <label htmlFor="register-confirm-password">Xác nhận mật khẩu</label>
              <div className="auth-password">
                <input
                  id="register-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  name="confirm_password"
                  autoComplete="new-password"
                  placeholder="Nhập lại mật khẩu"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowConfirm((prev) => !prev)}
                  aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  title={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <i className={showConfirm ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'} aria-hidden="true"></i>
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Tạo tài khoản'}
            </button>
          </form>

          <div className="auth-links">
            Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
          </div>

          <p className="auth-footnote">
            <Link to="/">Quay lại trang chủ</Link>
          </p>
        </div>
      </section>
    </MainLayout>
  );
};

export default Register;