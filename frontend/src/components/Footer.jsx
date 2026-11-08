import React from 'react';
import { Link } from 'react-router-dom';

const REPO_URL = 'https://github.com/td1205/recipe-sharing-web';

// Mọi liên kết đều trỏ tới trang có thật (trước đây là link mẫu "#")
const FOOTER_COLUMNS = [
  {
    title: 'KHÁM PHÁ',
    links: [
      ['Tất cả công thức', '/recipes'],
      ['Món phổ biến', '/popular'],
      ['Công thức mới', '/new-recipes'],
      ['Nấu gì với nguyên liệu có sẵn', '/cook-with-ingredients'],
    ],
  },
  {
    title: 'CỘNG ĐỒNG',
    links: [
      ['Chia sẻ công thức', '/recipes/create'],
      ['Tài khoản của tôi', '/profile'],
      ['Quy định nội dung', '/about#quy-dinh'],
    ],
  },
  {
    title: 'RECIPE SHARING',
    links: [
      ['Giới thiệu', '/about'],
      ['Nhóm thực hiện', '/about#nhom'],
      ['Quyền riêng tư', '/about#quyen-rieng-tu'],
      ['Nguồn dữ liệu', '/about#du-lieu'],
    ],
  },
];

const Footer = () => (
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
          © 2026 Recipe Sharing – Đồ án liên ngành, Trường Công nghệ Thông tin Phenikaa, Đại học Phenikaa.
        </div>
        <div className="steam-footer-socials">
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" aria-label="Mã nguồn trên GitHub" title="Mã nguồn trên GitHub">
            <i className="fa-brands fa-github" aria-hidden="true"></i>
          </a>
        </div>
      </div>

      <div className="steam-footer-right">
        {FOOTER_COLUMNS.map((column) => (
          <div className="steam-footer-column" key={column.title}>
            <h4>{column.title}</h4>
            {column.links.map(([label, to]) => (
              <Link key={to} to={to}>{label}</Link>
            ))}
          </div>
        ))}
        <div className="steam-footer-column">
          <h4>HỖ TRỢ</h4>
          <a href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer">Báo lỗi / góp ý</a>
          <Link to="/about#lien-he">Liên hệ</Link>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
