import React from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const Footer = () => {
  const handleMockupClick = (e) => {
    e.preventDefault();
    toast.success('Tính năng đang phát triển', { style: { background: 'var(--color-bg-body)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)' }});
  };

  return (
    <footer className="steam-footer">
      <div className="steam-footer-container">
        
        <div className="steam-footer-left">
          <div className="steam-footer-brand">
            <Link to="/" className="steam-logo steam-logo-footer">
              <i className="fa-solid fa-book-open" aria-hidden="true"></i>
              <span>Recipe Sharing</span>
            </Link>
          </div>
          <div className="steam-footer-copy">
            © 2026 Recipe Sharing. Bảo lưu mọi quyền. Tất cả các thương hiệu là tài sản của chủ sở hữu tương ứng tại Việt Nam và các quốc gia khác. Giá đã bao gồm VAT (nếu có).
          </div>
          <div className="steam-footer-socials">
            <a href="#" onClick={handleMockupClick}><i className="fa-brands fa-youtube"></i></a>
            <a href="#" onClick={handleMockupClick}><i className="fa-brands fa-x-twitter"></i></a>
            <a href="#" onClick={handleMockupClick}><i className="fa-brands fa-facebook"></i></a>
            <a href="#" onClick={handleMockupClick}><i className="fa-solid fa-link"></i></a>
          </div>
        </div>

        <div className="steam-footer-right">
          <div className="steam-footer-column">
            <h4>RECIPE SHARING</h4>
            <a href="#" onClick={handleMockupClick}>Thông tin về Recipe Sharing</a>
            <a href="#" onClick={handleMockupClick}>Thỏa thuận người dùng</a>
            <a href="#" onClick={handleMockupClick}>Chia sẻ công thức</a>
            <a href="#" onClick={handleMockupClick}>Quy định nội dung</a>
            <a href="#" onClick={handleMockupClick}>Thẻ quà tặng</a>
          </div>
          <div className="steam-footer-column">
            <h4>CỘNG ĐỒNG</h4>
            <a href="#" onClick={handleMockupClick}>Thông tin về Cộng đồng</a>
            <a href="#" onClick={handleMockupClick}>Tuyển dụng</a>
            <a href="#" onClick={handleMockupClick}>Quy tắc ứng xử</a>
            <a href="#" onClick={handleMockupClick}>Đóng góp ý kiến</a>
          </div>
          <div className="steam-footer-column">
            <h4>PHÁP LÝ</h4>
            <a href="#" onClick={handleMockupClick}>Quyền riêng tư</a>
            <a href="#" onClick={handleMockupClick}>Hỗ trợ tiếp cận</a>
            <a href="#" onClick={handleMockupClick}>Thông báo & Chính sách</a>
            <a href="#" onClick={handleMockupClick}>Cookie</a>
            <a href="#" onClick={handleMockupClick}>Bản quyền</a>
          </div>
          <div className="steam-footer-column">
            <h4>KHÁC</h4>
            <a href="#" onClick={handleMockupClick}>Tải ứng dụng</a>
            <a href="#" onClick={handleMockupClick}>Nhận hỗ trợ</a>
            <a href="#" onClick={handleMockupClick}>Tài khoản của tôi</a>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
