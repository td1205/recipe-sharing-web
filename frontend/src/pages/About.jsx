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
    let id;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        block: 'start',
      });
      el.focus({ preventScroll: true });
    }
  }, [hash]);

  return (
    <MainLayout className="home-typography about-layout">
      <article className="about-page">
        <header className="about-header">
          <p className="about-eyebrow">Về Recipe Sharing</p>
          <h1 className="about-title">Chia sẻ công thức.<br />Kết nối căn bếp.</h1>
          <p className="about-lead">Khám phá món mới, lưu lại hương vị yêu thích và chia sẻ cách nấu của bạn với cộng đồng.</p>
          <Link className="about-cta" to="/recipes">Khám phá công thức <span aria-hidden="true">→</span></Link>
        </header>

        <nav className="about-nav" aria-label="Nội dung trang giới thiệu">
          <a href="#gioi-thieu">Giới thiệu</a>
          <a href="#tinh-nang">Khám phá</a>
          <a href="#nhom">Nhóm thực hiện</a>
          <a href="#quy-dinh">Quy định</a>
          <a href="#quyen-rieng-tu">Quyền riêng tư</a>
          <a href="#du-lieu">Nguồn dữ liệu</a>
          <a href="#lien-he">Góp ý</a>
        </nav>

        <section id="gioi-thieu" className="about-section" tabIndex={-1} aria-labelledby="about-intro-heading">
          <h2 id="about-intro-heading">Một nơi lưu giữ và khám phá cách nấu</h2>
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

        <section id="nhom" className="about-section" tabIndex={-1} aria-labelledby="about-team-heading">
          <h2 id="about-team-heading">Nhóm thực hiện</h2>
          <ul>
            <li>Đinh Xuân Tài – 23010616 (trưởng nhóm)</li>
            <li>Nguyễn Tuấn Anh – 23010575</li>
          </ul>
        </section>

        <section id="tinh-nang" className="about-section" tabIndex={-1} aria-labelledby="about-explore-heading">
          <h2 id="about-explore-heading">Bắt đầu từ căn bếp của bạn</h2>
          <div className="about-features">
            <div className="about-feature">
              <h3>Khám phá món ăn</h3>
              <p>Tìm công thức theo từ khóa, danh mục, bữa ăn hoặc thời gian nấu.</p>
              <Link to="/recipes">Xem tất cả công thức <span aria-hidden="true">→</span></Link>
            </div>
            <div className="about-feature">
              <h3>Tận dụng nguyên liệu</h3>
              <p>Nhập nguyên liệu đang có để tìm những công thức phù hợp.</p>
              <Link to="/cook-with-ingredients">Hôm nay nấu gì? <span aria-hidden="true">→</span></Link>
            </div>
            <div className="about-feature">
              <h3>Chia sẻ cách nấu</h3>
              <p>Đăng công thức với nguyên liệu, từng bước thực hiện và hình ảnh. Cần đăng nhập để chia sẻ.</p>
              <Link to="/recipes/create">Chia sẻ công thức <span aria-hidden="true">→</span></Link>
            </div>
          </div>
          <p className="about-more">Tìm thêm cảm hứng từ <Link to="/popular">món phổ biến</Link> và <Link to="/new-recipes">công thức mới</Link>.</p>
        </section>

        <section id="quy-dinh" className="about-section" tabIndex={-1} aria-labelledby="about-rules-heading">
          <h2 id="about-rules-heading">Cùng xây dựng cộng đồng tích cực</h2>
          <ul>
            <li>Chỉ đăng công thức, ảnh và video do bạn tự thực hiện hoặc có quyền sử dụng; ghi nguồn khi phỏng theo người khác.</li>
            <li>Không đăng nội dung quảng cáo, spam, phản cảm hoặc vi phạm pháp luật.</li>
            <li>Bình luận lịch sự, góp ý mang tính xây dựng.</li>
            <li>Quản trị viên có thể xóa bình luận, xóa công thức hoặc khóa tài khoản vi phạm.</li>
          </ul>
        </section>

        <section id="quyen-rieng-tu" className="about-section" tabIndex={-1} aria-labelledby="about-privacy-heading">
          <h2 id="about-privacy-heading">Quyền riêng tư</h2>
          <ul>
            <li>Mật khẩu được băm bằng bcrypt, không lưu dưới dạng văn bản gốc.</li>
            <li>Email được dùng cho tài khoản và khôi phục mật khẩu bằng OTP; không hiển thị trên hồ sơ công khai.</li>
            <li>
              Lịch sử xem, đánh giá, bình luận và món yêu thích được dùng để gợi ý món phù hợp hơn. Danh sách “Xem gần đây” lưu
              trong trình duyệt của bạn.
            </li>
            <li>Website dùng cookie phiên đăng nhập; không dùng cookie quảng cáo.</li>
          </ul>
        </section>

        <section id="du-lieu" className="about-section" tabIndex={-1} aria-labelledby="about-data-heading">
          <h2 id="about-data-heading">Nguồn dữ liệu</h2>
          <p>
            Một phần công thức mẫu (tài khoản "Bếp Việt (ViFoodRec)") lấy từ bộ dữ liệu ViFoodRec (PACLIC 2024), dùng cho mục
            đích học tập và thử nghiệm hệ gợi ý.
          </p>
        </section>

        <section id="lien-he" className="about-section" tabIndex={-1} aria-labelledby="about-contact-heading">
          <h2 id="about-contact-heading">Góp ý để căn bếp ngày một tốt hơn</h2>
          <p>Bạn gặp lỗi hoặc có ý tưởng cải thiện? Gửi mô tả và các bước tái hiện trên GitHub. Không đăng mật khẩu, mã OTP hoặc thông tin cá nhân trong báo lỗi công khai.</p>
          <p><a href="https://github.com/td1205/recipe-sharing-web/issues" target="_blank" rel="noopener noreferrer">Báo lỗi hoặc đề xuất cải thiện (mở tab mới)</a></p>
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
