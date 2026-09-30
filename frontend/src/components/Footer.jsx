import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="steam-footer">
      <div className="steam-footer-container">
        
        <div className="steam-footer-left">
          <div className="steam-footer-brand">
            <Link to="/" className="steam-logo steam-logo-footer">
              <i className="fa-brands fa-steam"></i> RECIPE
            </Link>
          </div>
          <div className="steam-footer-copy">
            © 2026 Recipe Sharing Website. Bảo lưu mọi quyền. Tất cả các thương hiệu là tài sản của chủ sở hữu tương ứng tại Việt Nam và các quốc gia khác. Giá đã bao gồm VAT (nếu có).
          </div>
          <div className="steam-footer-socials">
            <a href="#"><i className="fa-brands fa-youtube"></i></a>
            <a href="#"><i className="fa-brands fa-x-twitter"></i></a>
            <a href="#"><i className="fa-brands fa-facebook"></i></a>
            <a href="#"><i className="fa-solid fa-link"></i></a>
          </div>
        </div>

        <div className="steam-footer-right">
          <div className="steam-footer-column">
            <h4>RECIPE SHARING</h4>
            <Link to="/">Thông tin về Recipe Sharing</Link>
            <Link to="/">Thỏa thuận người dùng</Link>
            <Link to="/">Chia sẻ công thức</Link>
            <Link to="/">Quy định nội dung</Link>
            <Link to="/">Thẻ quà tặng</Link>
          </div>
          <div className="steam-footer-column">
            <h4>CỘNG ĐỒNG</h4>
            <Link to="/">Thông tin về Cộng đồng</Link>
            <Link to="/">Tuyển dụng</Link>
            <Link to="/">Quy tắc ứng xử</Link>
            <Link to="/">Đóng góp ý kiến</Link>
          </div>
          <div className="steam-footer-column">
            <h4>PHÁP LÝ</h4>
            <Link to="/">Quyền riêng tư</Link>
            <Link to="/">Hỗ trợ tiếp cận</Link>
            <Link to="/">Thông báo & Chính sách</Link>
            <Link to="/">Cookie</Link>
            <Link to="/">Bản quyền</Link>
          </div>
          <div className="steam-footer-column">
            <h4>KHÁC</h4>
            <Link to="/">Tải ứng dụng</Link>
            <Link to="/">Nhận hỗ trợ</Link>
            <Link to="/">Tài khoản của tôi</Link>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
