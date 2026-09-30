import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="steam-login-layout">
      <Navbar />
      <div className="steam-login-page">
        <div className="steam-login-wrapper">
          <h1 className="steam-login-header">Đăng nhập</h1>
          
          <div className="steam-login-container">
            {error && <div className="error-msg" style={{marginBottom: '20px'}}>{error}</div>}
            
            <form onSubmit={handleSubmit} className="steam-login-form">
              <div className="form-group">
                <label>ĐĂNG NHẬP BẰNG TÊN TÀI KHOẢN</label>
                <input
                  type="text"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>MẬT KHẨU</label>
                <input
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              
              <div className="steam-remember-me">
                <input type="checkbox" id="remember" />
                <label htmlFor="remember">Ghi nhớ tôi</label>
              </div>

              <button type="submit" className="steam-login-btn" disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Đăng nhập'}
              </button>
              
              <div className="steam-login-links">
                <Link to="/forgot-password">Quên mật khẩu?</Link>
                <br/>
                Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
                <br/>
                <Link to="/">Quay lại trang chủ</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Login;
