import React from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import './NotFound.css';

// Trang 404: hiển thị cho mọi đường dẫn không tồn tại (thay vì trang trắng)
const NotFound = ({ message = 'Trang bạn tìm không tồn tại hoặc đã được chuyển đi nơi khác.' }) => (
  <MainLayout hideSidebar className="home-typography">
    <section className="not-found">
      <p className="not-found-code">404</p>
      <h1 className="not-found-title">Không tìm thấy trang</h1>
      <p className="not-found-message">{message}</p>
      <div className="not-found-actions">
        <Link to="/" className="not-found-btn not-found-btn-primary">Về trang chủ</Link>
        <Link to="/recipes" className="not-found-btn">Xem tất cả công thức</Link>
      </div>
    </section>
  </MainLayout>
);

export default NotFound;
