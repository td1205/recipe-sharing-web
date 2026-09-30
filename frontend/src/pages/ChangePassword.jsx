import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ChangePassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
      const res = await axios.post('/api/change-password', {
        password,
        confirm_password: confirmPassword
      });
      if (res.data.success) {
        setSuccess('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
        setTimeout(() => navigate('/login'), 2000);
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

  const togglePassword = (e) => {
    const wrapper = e.target.closest('.password-wrapper');
    const input = wrapper.querySelector('input');
    if (input.type === 'password') {
      input.type = 'text';
    } else {
      input.type = 'password';
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Đổi mật khẩu</h1>
        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Mật khẩu mới</label>
            <div className="password-wrapper">
              <input
                type="password"
                name="password"
                placeholder="Nhập mật khẩu mới..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                onCopy={e => e.preventDefault()}
                onPaste={e => e.preventDefault()}
                onCut={e => e.preventDefault()}
                pattern='(?=.*\d)(?=.*[a-zA-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}'
                title="Mật khẩu phải dài ít nhất 8 ký tự, bao gồm ít nhất 1 chữ cái, 1 chữ số và 1 ký tự đặc biệt"
                autoComplete="new-password"
                required
              />
              <i className="fa-solid fa-eye toggle-password-icon" onClick={togglePassword} style={{cursor:'pointer'}}></i>
            </div>
            <span className="input-hint">
              Mật khẩu phải từ 8 ký tự trở lên, gồm chữ cái, chữ số và ký tự đặc biệt
            </span>
          </div>
          <div className="form-group">
            <label>Xác nhận mật khẩu mới</label>
            <div className="password-wrapper">
              <input
                type="password"
                name="confirm_password"
                placeholder="Nhập lại mật khẩu mới..."
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onCopy={e => e.preventDefault()}
                onPaste={e => e.preventDefault()}
                onCut={e => e.preventDefault()}
                autoComplete="new-password"
                required
              />
              <i className="fa-solid fa-eye toggle-password-icon" onClick={togglePassword} style={{cursor:'pointer'}}></i>
            </div>
            <span className="input-hint">
              Mật khẩu nhập lại phải trùng với mật khẩu mới
            </span>
          </div>
          <button type="submit" className="btn-auth" disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
