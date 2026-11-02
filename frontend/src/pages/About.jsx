import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import './Home.css';
import './About.css';

// Trang giới thiệu – đích của các liên kết ở chân trang và mục "Về chúng tôi" trên menu.
const About = () => {
  const { hash } = useLocation();

  // Cuộn tới đúng mục khi mở từ liên kết có #anchor (vd /about#quy-dinh)
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);

  return (
    <MainLayout hideSidebar className="home-typography">
      <article className="about-page">
        <h1 className="about-title">Về Recipe Sharing</h1>

        <section id="gioi-thieu" className="about-section">
          <h2>Giới thiệu</h2>
          <p>
            Recipe Sharing là website chia sẻ công thức nấu ăn: người dùng đăng công thức kèm ảnh/video, lưu món yêu thích,
            chấm sao, bình luận và gắn tag. Hệ thống gợi ý món theo sở thích của từng người, theo món đang xem và theo
            nguyên liệu có sẵn trong bếp.
          </p>
          <p>
            Đây là sản phẩm của học phần <strong>Đồ án liên ngành</strong>, Trường Công nghệ Thông tin Phenikaa – Đại học Phenikaa,
            dưới sự hướng dẫn của TS. Nguyễn Lệ Thu.
          </p>
        </section>

        <section id="nhom" className="about-section">
          <h2>Nhóm thực hiện</h2>
          <ul>
            <li>Đinh Xuân Tài – 23010616 (trưởng nhóm)</li>
            <li>Nguyễn Tuấn Anh – 23010575</li>
          </ul>
        </section>

        <section id="tinh-nang" className="about-section">
          <h2>Bắt đầu từ đâu?</h2>
          <ul>
            <li><Link to="/recipes">Xem tất cả công thức</Link> và lọc theo danh mục, bữa ăn, thời gian nấu, tag.</li>
            <li><Link to="/cook-with-ingredients">Nấu gì với nguyên liệu có sẵn?</Link> – nhập nguyên liệu, nhận gợi ý món.</li>
            <li><Link to="/popular">Món phổ biến</Link> và <Link to="/new-recipes">công thức mới</Link>.</li>
            <li><Link to="/recipes/create">Chia sẻ công thức của bạn</Link> (cần đăng nhập).</li>
          </ul>
        </section>

        <section id="quy-dinh" className="about-section">
          <h2>Quy định nội dung</h2>
          <ul>
            <li>Chỉ đăng công thức, ảnh và video do bạn tự thực hiện hoặc có quyền sử dụng; ghi nguồn khi phỏng theo người khác.</li>
            <li>Không đăng nội dung quảng cáo, spam, phản cảm hoặc vi phạm pháp luật.</li>
            <li>Bình luận lịch sự, góp ý mang tính xây dựng.</li>
            <li>Quản trị viên có thể ẩn bình luận, xoá công thức hoặc khoá tài khoản vi phạm.</li>
          </ul>
        </section>

        <section id="quyen-rieng-tu" className="about-section">
          <h2>Quyền riêng tư</h2>
          <ul>
            <li>Mật khẩu được mã hoá một chiều (bcrypt); quản trị viên không xem được mật khẩu của bạn.</li>
            <li>Email chỉ dùng để gửi mã OTP khi bạn quên mật khẩu và không hiển thị công khai.</li>
            <li>
              Lịch sử xem, đánh giá và món yêu thích được dùng để gợi ý món phù hợp hơn. Danh sách "Xem gần đây" chỉ lưu
              trong trình duyệt của bạn.
            </li>
            <li>Website dùng cookie phiên đăng nhập; không dùng cookie quảng cáo.</li>
          </ul>
        </section>

        <section id="du-lieu" className="about-section">
          <h2>Nguồn dữ liệu</h2>
          <p>
            Một phần công thức mẫu (tài khoản "Bếp Việt (ViFoodRec)") lấy từ bộ dữ liệu ViFoodRec (PACLIC 2024), dùng cho mục
            đích học tập và thử nghiệm hệ gợi ý.
          </p>
        </section>

        <section id="lien-he" className="about-section">
          <h2>Liên hệ & góp ý</h2>
          <p>
            Mã nguồn và báo lỗi:{' '}
            <a href="https://github.com/td1205/recipe-sharing-web" target="_blank" rel="noopener noreferrer">
              github.com/td1205/recipe-sharing-web
            </a>
          </p>
        </section>
      </article>
    </MainLayout>
  );
};

export default About;
