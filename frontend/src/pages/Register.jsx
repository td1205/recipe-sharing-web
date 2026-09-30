import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    fullname: '',
    email: '',
    password: '',
    confirm_password: '',
  });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const res = await axios.post('/api/register', formData);
      if (res.data.success) {
        setSuccess('Đăng ký thành công! Vui lòng đăng nhập.');
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

  const togglePassword = (id) => {
    const input = document.getElementById(id);
    if (input.type === 'password') {
      input.type = 'text';
    } else {
      input.type = 'password';
    }
  };

  return (
    <div className="steam-login-layout">
      <Navbar />
      <div className="steam-register-page">
        <div className="steam-register-wrapper">
          <h1 className="steam-register-header">Tạo tài khoản của bạn</h1>
          
          <div className="steam-register-container">
            {error && <div className="error-msg" style={{marginBottom: '20px'}}>{error}</div>}
            {success && <div className="success-msg" style={{marginBottom: '20px'}}>{success}</div>}
            
            <form onSubmit={handleSubmit} className="steam-register-form">
              <div className="form-group">
                <label>TÊN ĐĂNG NHẬP</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>HỌ VÀ TÊN</label>
                <input
                  type="text"
                  name="fullname"
                  value={formData.fullname}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>ĐỊA CHỈ EMAIL</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>MẬT KHẨU</label>
                <div className="password-wrapper">
                  <input
                    type="password"
                    name="password"
                    id="register-password"
                    pattern='(?=.*\d)(?=.*[a-zA-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}'
                    title="Mật khẩu phải dài ít nhất 8 ký tự, bao gồm ít nhất 1 chữ cái, 1 chữ số và 1 ký tự đặc biệt"
                    value={formData.password}
                    onChange={handleChange}
                    onCopy={(e) => e.preventDefault()}
                    onPaste={(e) => e.preventDefault()}
                    onCut={(e) => e.preventDefault()}
                    autoComplete="new-password"
                    required
                  />
                  <i className="fa-solid fa-eye toggle-password-icon" onClick={() => togglePassword('register-password')} style={{cursor: 'pointer'}}></i>
                </div>
                <span className="input-hint" style={{fontSize: '11px', color: '#8f98a0', marginTop: '5px', display: 'block'}}>
                  Mật khẩu phải từ 8 ký tự trở lên, gồm chữ cái, chữ số và ký tự đặc biệt
                </span>
              </div>
              <div className="form-group">
                <label>XÁC NHẬN MẬT KHẨU</label>
                <div className="password-wrapper">
                  <input
                    type="password"
                    name="confirm_password"
                    id="register-confirm-password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    onCopy={(e) => e.preventDefault()}
                    onPaste={(e) => e.preventDefault()}
                    onCut={(e) => e.preventDefault()}
                    autoComplete="new-password"
                    required
                  />
                  <i className="fa-solid fa-eye toggle-password-icon" onClick={() => togglePassword('register-confirm-password')} style={{cursor: 'pointer'}}></i>
                </div>
              </div>

              <div className="steam-register-actions" style={{marginTop: '30px'}}>
                <button type="submit" className="steam-register-btn" disabled={loading}>
                  {loading ? 'Đang xử lý...' : 'Tiếp tục'}
                </button>
              </div>
            </form>
            
            <div className="steam-register-links" style={{marginTop: '30px', fontSize: '13px', color: '#b8b6b4'}}>
              Đã có tài khoản? <Link to="/login" style={{color: '#fff', textDecoration: 'underline'}}>Đăng nhập</Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Register;
