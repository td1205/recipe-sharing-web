import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { PASSWORD_PATTERN, PASSWORD_REQUIREMENT } from '../constants/auth';
import './Home.css';
import './auth.css';

const ChangePassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Catch the mismatch before spending a round trip.
    if (confirmPassword && confirmPassword !== password) {
      setError('Mật khẩu xác nhận không khớp.');
      setSuccess('');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await axios.post('/api/change-password', {
        password,
        confirm_password: confirmPassword
      });
      if (res.data.success) {
        setSuccess('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
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
            Bước cuối cùng
          </p>

          <h1 className="auth-title">Đặt mật khẩu mới</h1>
          <p className="auth-deck">
            Chọn một mật khẩu mà bạn chưa từng dùng. Sau khi đổi xong, bạn sẽ đăng nhập lại
            bằng mật khẩu mới.
          </p>

          {error && (
            <div className="auth-alert auth-alert-error" role="alert">{error}</div>
          )}
          {success && (
            <div className="auth-alert auth-alert-success" role="status">{success}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="change-password">Mật khẩu mới</label>
              <div className="auth-password">
                <input
                  id="change-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="new-password"
                  placeholder="Nhập mật khẩu mới..."
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onCopy={e => e.preventDefault()}
                  onPaste={e => e.preventDefault()}
                  onCut={e => e.preventDefault()}
                  pattern={PASSWORD_PATTERN}
                  title={PASSWORD_REQUIREMENT}
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
              <label htmlFor="change-confirm-password">Xác nhận mật khẩu</label>
              <div className="auth-password">
                <input
                  id="change-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  name="confirm_password"
                  autoComplete="new-password"
                  placeholder="Nhập lại mật khẩu mới..."
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  onCopy={e => e.preventDefault()}
                  onPaste={e => e.preventDefault()}
                  onCut={e => e.preventDefault()}
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
              <span className="auth-hint">
                Mật khẩu nhập lại phải trùng với mật khẩu mới.
              </span>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
            </button>
          </form>

          <div className="auth-links">
            <a href="/otp">Quay lại nhập mã OTP</a>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default ChangePassword;