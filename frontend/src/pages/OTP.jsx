import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { OTP_LENGTH } from '../constants/auth';
import './Home.css';
import './auth.css';

const OTP = () => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('/api/otp', { otp });
      if (res.data.success) {
        navigate('/change-password');
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
            Bước xác minh
          </p>

          <h1 className="auth-title">Nhập mã OTP</h1>
          <p className="auth-deck">
            Chúng tôi đã gửi một mã gồm {OTP_LENGTH} chữ số tới địa chỉ email của bạn.
            Kiểm tra cả hộp thư spam nếu chưa thấy.
          </p>

          {error && (
            <div className="auth-alert auth-alert-error" role="alert">{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="otp-code">Mã OTP</label>
              <input
                id="otp-code"
                type="text"
                name="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={OTP_LENGTH}
                placeholder={'0'.repeat(OTP_LENGTH)}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                required
              />
              <span className="auth-hint">
                Đúng {OTP_LENGTH} chữ số, chỉ gồm số.
              </span>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Đang kiểm tra...' : 'Xác nhận OTP'}
            </button>
          </form>

          <div className="auth-links">
            <a href="/forgot-password">Gửi lại mã mới</a>
            <br />
            <a href="/login">Quay lại đăng nhập</a>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default OTP;