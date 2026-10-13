import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import MainLayout from '../components/MainLayout';
import './Home.css';
import './auth.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await login(username, password);
      if (res.success) {
        navigate('/');
      } else {
        setError(res.error || 'Lỗi đăng nhập');
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
            Chào mừng bạn trở lại
          </p>

          <h1 className="auth-title">Đăng nhập</h1>
          <p className="auth-deck">
            Đăng nhập để lưu công thức yêu thích, đánh giá và bình luận về những món ăn bạn đã nấu.
          </p>

          {error && (
            <div className="auth-alert auth-alert-error" role="alert">{error}</div>
          )}

          <form onSubmit={handleSubmit} noValidate={false}>
            <div className="auth-field">
              <label htmlFor="login-username">Tên tài khoản</label>
              <input
                id="login-username"
                type="text"
                name="username"
                autoComplete="username"
                placeholder="Nhập tên tài khoản của bạn"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="login-password">Mật khẩu</label>
              <div className="auth-password">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu của bạn"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            </div>

            <label className="auth-check" htmlFor="login-remember">
              <input
                id="login-remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Ghi nhớ đăng nhập trên thiết bị này
            </label>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="auth-links">
            <Link to="/forgot-password">Quên mật khẩu?</Link>
            <br />
            Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
          </div>

          <p className="auth-footnote">
            <Link to="/">Quay lại trang chủ</Link>
          </p>
        </div>
      </section>
    </MainLayout>
  );
};

export default Login;