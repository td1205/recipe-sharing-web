import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import './Home.css';
import './auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await axios.post('/api/forgot-password', { email });
      if (res.data.success) {
        setSuccess('Mã OTP đã được gửi đến email của bạn.');
        setTimeout(() => navigate('/otp'), 1500);
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
            Khôi phục tài khoản
          </p>

          <h1 className="auth-title">Quên mật khẩu</h1>
          <p className="auth-deck">
            Nhập địa chỉ email bạn đã dùng để đăng ký. Chúng tôi sẽ gửi một mã OTP
            để bạn đặt lại mật khẩu.
          </p>

          {error && (
            <div className="auth-alert auth-alert-error" role="alert">{error}</div>
          )}
          {success && (
            <div className="auth-alert auth-alert-success" role="status">{success}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="forgot-email">Email xác thực</label>
              <input
                id="forgot-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="ban@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Đang gửi mã...' : 'Gửi mã OTP'}
            </button>
          </form>

          <div className="auth-links">
            <Link to="/login">Quay lại đăng nhập</Link>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default ForgotPassword;