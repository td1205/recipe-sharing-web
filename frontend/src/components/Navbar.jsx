import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const Navbar = ({ user }) => {
  const [navData, setNavData] = useState({ courseTypes: [], categories: [], mealTimes: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const [activeMega, setActiveMega] = useState(null);
  const [showCategories, setShowCategories] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const fetchNavData = async () => {
      try {
        const response = await axios.get('/api/nav-data');
        setNavData(response.data);
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu menu:', error);
      }
    };
    fetchNavData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsScanning(true);
      toast.loading('Đang quét hình ảnh...', { id: 'scan-toast' });
      try {
        const formData = new FormData();
        formData.append('image', file);
        const response = await axios.post('/api/ai/scan', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Quét thành công!', { id: 'scan-toast' });
        navigate(`/?search=${encodeURIComponent(response.data.foodName)}`);
      } catch (error) {
        toast.error('Không thể nhận diện hình ảnh.', { id: 'scan-toast' });
      } finally {
        setIsScanning(false);
        fileInputRef.current.value = '';
      }
    }
  };

  const navRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setActiveMega(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="steam-header" ref={navRef}>
      {/* Top Global Bar */}
      <div className="steam-global-header">
        <div className="steam-global-container">
          <div className="steam-global-left">
            <Link to="/" className="steam-logo">
              <i className="fa-brands fa-steam"></i> RECIPE
            </Link>
            <div className="steam-global-menu">
              <NavLink to="/recipes/create" className={({ isActive }) => "steam-global-nav-item" + (isActive ? " active" : "")}>
                ĐĂNG CÔNG THỨC
              </NavLink>
            </div>
          </div>
          
          <div className="steam-global-right">
            {user ? (
              <>
                <button className="steam-btn-icon" style={{ background: '#0078D7' }}><i className="fa-solid fa-bullhorn"></i></button>
                <button className="steam-btn-icon" style={{ background: '#5c7e10' }}><i className="fa-solid fa-bell"></i></button>
                <div 
                  className="steam-user-menu"
                  onMouseEnter={() => setShowUserMenu(true)}
                  onMouseLeave={() => setShowUserMenu(false)}
                >
                  {user.username} ▾
                  {showUserMenu && (
                    <div className="steam-dropdown profile-drop">
                      {user.role === 'admin' && <Link to="/admin/dashboard">Quản trị chi tiết</Link>}
                      <Link to="/profile">Hồ sơ cá nhân</Link>
                      <a href="#" onClick={handleLogout}>Đăng xuất</a>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="steam-login-actions">
                <Link to="/login" className="steam-login-text">login</Link>
                <span> | </span>
                <Link to="/register" className="steam-login-text">register</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Store Nav */}
      <div className="steam-store-header-bg">
        <div className="steam-store-header-container">
          <nav className="steam-store-nav">
            <div 
              className={`steam-nav-item ${activeMega === 'browse' ? 'active' : ''}`} 
              onClick={() => setActiveMega(activeMega === 'browse' ? null : 'browse')}
            >
              <span style={{ whiteSpace: 'nowrap' }}>Duyệt tìm ▾</span>
            </div>
            
            <div 
              className={`steam-nav-item ${activeMega === 'recommend' ? 'active' : ''}`} 
              onClick={() => setActiveMega(activeMega === 'recommend' ? null : 'recommend')}
            >
              <span style={{ whiteSpace: 'nowrap' }}>Khuyến nghị ▾</span>
            </div>
            
            <div 
              className={`steam-nav-item ${activeMega === 'categories' ? 'active' : ''}`} 
              onClick={() => setActiveMega(activeMega === 'categories' ? null : 'categories')}
            >
              <span style={{ whiteSpace: 'nowrap' }}>Danh mục ▾</span>
            </div>
            
            <div 
              className={`steam-nav-item ${activeMega === 'articles' ? 'active' : ''}`} 
              onClick={() => setActiveMega(activeMega === 'articles' ? null : 'articles')}
            >
              <span style={{ whiteSpace: 'nowrap' }}>Thủ thuật ▾</span>
            </div>
            
            <div 
              className={`steam-nav-item ${activeMega === 'collections' ? 'active' : ''}`} 
              onClick={() => setActiveMega(activeMega === 'collections' ? null : 'collections')}
            >
              <span style={{ whiteSpace: 'nowrap' }}>Bộ sưu tập ▾</span>
            </div>
          </nav>

          <div className="steam-store-right">
            <form className="steam-search" onSubmit={handleSearchSubmit}>
              <input 
                type="text" 
                placeholder="Tìm trong cửa hàng" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <label htmlFor="navbar-ai-upload" className="steam-ai-btn" title="Tìm bằng hình ảnh (AI)">
                {isScanning ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-camera"></i>}
              </label>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleImageUpload}
                style={{ display: 'none' }} 
                id="navbar-ai-upload"
              />
              <button type="submit" className="steam-search-btn">
                 <i className="fa-solid fa-magnifying-glass"></i>
              </button>
            </form>
            
            <Link to="/" className="steam-wishlist-btn">
              ★ Yêu thích
            </Link>
          </div>
        </div>
        
        {activeMega === 'browse' && (
          <div className="steam-browse-mega" onClick={(e) => e.stopPropagation()}>
            <div className="steam-browse-mega-content">
              <div className="sbm-col-left">
                <Link to="/" className="sbm-main-link">
                  <span className="sbm-title">Trang chủ</span>
                </Link>
                <Link to="/" className="sbm-main-link">
                  <span className="sbm-title">Công thức mới</span>
                  <span className="sbm-desc">Khám phá công thức mới</span>
                </Link>
                <Link to="/" className="sbm-main-link">
                  <span className="sbm-title">Xếp hạng công thức</span>
                </Link>
              </div>
              <div className="sbm-col-mid">
                <Link to="/" className="sbm-card-popular">
                  <span>CÔNG THỨC PHỔ BIẾN NHẤT</span>
                </Link>
              </div>
              <div className="sbm-col-right">
                <div className="sbm-side-group">
                  <div className="sbm-side-title">CÓ THỂ BẠN QUAN TÂM</div>
                  <Link to="/" className="sbm-side-item">Tin tức mới nhất</Link>
                  <Link to="/" className="sbm-side-item">Review món ăn</Link>
                  <Link to="/" className="sbm-side-item">Mẹo vặt nhà bếp</Link>
                </div>
              </div>
              <div className="sbm-col-right">
                <div className="sbm-side-group">
                  <div className="sbm-side-title">TÀI KHOẢN CỦA TÔI</div>
                  <Link to="/profile" className="sbm-side-item">Tùy chỉnh của tôi</Link>
                  <Link to="/" className="sbm-side-item">Danh sách yêu thích của tôi</Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeMega === 'recommend' && (
          <div className="steam-browse-mega" onClick={(e) => e.stopPropagation()}>
            <div className="steam-browse-mega-content">
              <div className="sbm-col-left sbm-recommend-list">
                <div className="sbm-side-title" style={{ marginBottom: '10px', paddingLeft: '5px' }}>ĐỀ XUẤT CHO BẠN</div>
                <Link to="/" className="sbm-rec-card">
                  <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&q=80" alt="Món ăn 1" />
                  <div className="sbm-rec-info">
                    <span className="sbm-rec-title">Salad Cà Chua Trộn Dầu Giấm</span>
                    <span className="sbm-rec-type">Khai vị</span>
                  </div>
                </Link>
                <Link to="/" className="sbm-rec-card">
                  <img src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=100&q=80" alt="Món ăn 2" />
                  <div className="sbm-rec-info">
                    <span className="sbm-rec-title">Pizza Hải Sản Phô Mai</span>
                    <span className="sbm-rec-type">Món chính</span>
                  </div>
                </Link>
                <Link to="/" className="sbm-rec-card">
                  <img src="https://images.unsplash.com/photo-1551024601-bec78aea704b?w=100&q=80" alt="Món ăn 3" />
                  <div className="sbm-rec-info">
                    <span className="sbm-rec-title">Bánh Kem Dâu Tây Gato</span>
                    <span className="sbm-rec-type">Tráng miệng</span>
                  </div>
                </Link>
              </div>
              <div className="sbm-col-mid">
                <div className="sbm-queue-banner">
                  <div className="sbm-queue-icon"><i className="fa-solid fa-calendar-days"></i></div>
                  <div className="sbm-queue-content">
                    <h4>Lịch cá nhân của bạn</h4>
                    <p>Khám phá danh sách cá nhân hóa, gồm các món ăn được chọn lọc riêng cho khẩu vị của bạn ngày hôm nay.</p>
                    <Link to="/" className="btn-primary" style={{ display: 'inline-block', marginTop: '10px', textTransform: 'none', background: 'linear-gradient(to right, #0088ff, #0055ff)', color: '#fff', border: 'none' }}>Khám phá lịch của tôi ➔</Link>
                  </div>
                </div>
              </div>
              <div className="sbm-col-right" style={{ flex: 1.2 }}>
                <div className="sbm-side-group">
                  <Link to="/" className="sbm-side-item">Hàng khám phá của bạn</Link>
                  <Link to="/" className="sbm-side-item">Khuyến nghị từ cộng đồng</Link>
                  <Link to="/" className="sbm-side-item">Món ngon bạn bè hay nấu</Link>
                  <Link to="/" className="sbm-side-item">Khuyên dùng tương tác</Link>
                  <Link to="/" className="sbm-side-item">Bộ sưu tập theo mùa</Link>
                  <Link to="/" className="sbm-side-item">Thẩm định viên Recipe</Link>
                  <Link to="/" className="sbm-side-item">Theo thời gian thực</Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeMega === 'categories' && (
          <div className="steam-browse-mega" onClick={(e) => e.stopPropagation()}>
            <div className="steam-browse-mega-content" style={{ flexDirection: 'column', gap: '0px', padding: '20px 0' }}>
              
              <div className="sbm-cat-top">
                <div className="sbm-side-title" style={{ marginBottom: '10px' }}>DANH MỤC HÀNG ĐẦU CỦA BẠN</div>
                <div className="sbm-cat-cards-grid">
                  <Link to="/" className="sbm-cat-card" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=200)' }}>
                    <span>MÓN ĂN SÁNG</span>
                  </Link>
                  <Link to="/" className="sbm-cat-card" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=200)' }}>
                    <span>TRÁNG MIỆNG</span>
                  </Link>
                  <Link to="/" className="sbm-cat-card" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1544148103-0773bf10d330?q=80&w=200)' }}>
                    <span>ĐỒ UỐNG</span>
                  </Link>
                  <Link to="/" className="sbm-cat-card" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=200)' }}>
                    <span>ĂN CHAY</span>
                  </Link>
                  <Link to="/" className="sbm-cat-card" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=200)' }}>
                    <span>ĐẶC SẢN VÙNG MIỀN</span>
                  </Link>
                  <Link to="/" className="sbm-cat-card" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1533622597524-a714040f6780?q=80&w=200)' }}>
                    <span>MÓN NHẬU</span>
                  </Link>
                </div>
              </div>

              <div className="sbm-cat-tags">
                <div className="sbm-tags-list">
                  <Link to="/" className="sbm-tag">Hải sản</Link>
                  <Link to="/" className="sbm-tag">Cay nồng</Link>
                  <Link to="/" className="sbm-tag">Ít calo</Link>
                  <Link to="/" className="sbm-tag">Nướng</Link>
                  <Link to="/" className="sbm-tag">Hấp</Link>
                  <Link to="/" className="sbm-tag">Thịt bò</Link>
                  <Link to="/" className="sbm-tag">Salad</Link>
                  <Link to="/" className="sbm-tag">Eat clean</Link>
                  <Link to="/" className="sbm-tag">Lẩu</Link>
                </div>
                <Link to="/" className="sbm-view-all-tags">Xem tất cả nhãn ❯</Link>
              </div>

              <div className="sbm-cat-bottom">
                <div className="sbm-bottom-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div className="sbm-side-title">TẤT CẢ THỂ LOẠI & CHỦ ĐỀ</div>
                  <Link to="/" className="sbm-view-all-tags">Mở rộng ⏷</Link>
                </div>
                <div className="sbm-cat-cols">
                  <div className="sbm-cat-col">
                    <div className="sbm-col-header">THỰC ĐƠN</div>
                    {navData.courseTypes && navData.courseTypes.map(c => (
                       <Link key={c.id} to={`/?course_type=${c.id}`} className="sbm-side-item">{c.name}</Link>
                    ))}
                    {!navData.courseTypes?.length && (
                      <>
                        <Link to="/" className="sbm-side-item">Khai vị</Link>
                        <Link to="/" className="sbm-side-item">Món chính</Link>
                        <Link to="/" className="sbm-side-item">Tráng miệng</Link>
                      </>
                    )}
                  </div>
                  <div className="sbm-cat-col">
                    <div className="sbm-col-header">THỜI GIAN</div>
                    {navData.mealTimes && navData.mealTimes.map(m => (
                       <Link key={m.id} to={`/?meal_time=${m.id}`} className="sbm-side-item">{m.name}</Link>
                    ))}
                    {!navData.mealTimes?.length && (
                      <>
                        <Link to="/" className="sbm-side-item">Bữa sáng</Link>
                        <Link to="/" className="sbm-side-item">Bữa trưa</Link>
                        <Link to="/" className="sbm-side-item">Bữa tối</Link>
                      </>
                    )}
                  </div>
                  <div className="sbm-cat-col">
                    <div className="sbm-col-header">ĐẶC TÍNH</div>
                    <Link to="/" className="sbm-side-item">Ăn chay</Link>
                    <Link to="/" className="sbm-side-item">Eat clean</Link>
                    <Link to="/" className="sbm-side-item">Low carb</Link>
                    <Link to="/" className="sbm-side-item">Keto</Link>
                    <Link to="/" className="sbm-side-item">Không gluten</Link>
                  </div>
                  <div className="sbm-cat-col">
                    <div className="sbm-col-header">PHONG CÁCH</div>
                    <Link to="/" className="sbm-side-item">Việt Nam</Link>
                    <Link to="/" className="sbm-side-item">Hàn Quốc</Link>
                    <Link to="/" className="sbm-side-item">Nhật Bản</Link>
                    <Link to="/" className="sbm-side-item">Âu Mỹ</Link>
                    <Link to="/" className="sbm-side-item">Thái Lan</Link>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        )}

        {activeMega === 'articles' && (
          <div className="steam-browse-mega" onClick={(e) => e.stopPropagation()}>
            <div className="steam-browse-mega-content">
              <div className="sbm-col-right" style={{ flex: 1 }}>
                <div className="sbm-side-group">
                  <div className="sbm-side-title">THỦ THUẬT NHÀ BẾP</div>
                  <Link to="/" className="sbm-side-item">Mẹo vặt & Xử lý nguyên liệu</Link>
                  <Link to="/" className="sbm-side-item">Bảo quản thực phẩm</Link>
                  <Link to="/" className="sbm-side-item">Kỹ năng dùng dao & chảo</Link>
                  <Link to="/" className="sbm-side-item">Chữa cháy món ăn hỏng</Link>
                </div>
              </div>
              <div className="sbm-col-right" style={{ flex: 1 }}>
                <div className="sbm-side-group">
                  <div className="sbm-side-title">KIẾN THỨC ẨM THỰC</div>
                  <Link to="/" className="sbm-side-item">Dinh dưỡng cơ bản</Link>
                  <Link to="/" className="sbm-side-item">Thế giới gia vị</Link>
                  <Link to="/" className="sbm-side-item">Thay thế nguyên liệu</Link>
                  <Link to="/" className="sbm-side-item">Phân biệt các loại bột/đường</Link>
                </div>
              </div>
              <div className="sbm-col-right" style={{ flex: 1 }}>
                <div className="sbm-side-group">
                  <div className="sbm-side-title">TIN TỨC & CẨM NANG</div>
                  <Link to="/" className="sbm-side-item">Review dụng cụ bếp</Link>
                  <Link to="/" className="sbm-side-item">Xu hướng ẩm thực 2026</Link>
                  <Link to="/" className="sbm-side-item">Góc tâm sự người làm bếp</Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeMega === 'collections' && (
          <div className="steam-browse-mega" onClick={(e) => e.stopPropagation()}>
            <div className="steam-browse-mega-content">
              <div className="sbm-col-right" style={{ flex: 1 }}>
                <div className="sbm-side-group">
                  <div className="sbm-side-title">BỘ SƯU TẬP CỦA BẠN</div>
                  <Link to="/" className="sbm-side-item">Công thức đã lưu</Link>
                  <Link to="/" className="sbm-side-item">Đang nấu dở</Link>
                  <Link to="/" className="sbm-side-item">Món ăn yêu thích</Link>
                  <Link to="/" className="sbm-side-item">Thực đơn tự tạo</Link>
                </div>
              </div>
              <div className="sbm-col-right" style={{ flex: 1 }}>
                <div className="sbm-side-group">
                  <div className="sbm-side-title">KHÁM PHÁ THEO MÙA</div>
                  <Link to="/" className="sbm-side-item">Món ngon giải nhiệt mùa hè</Link>
                  <Link to="/" className="sbm-side-item">Mâm cỗ ngày Tết cổ truyền</Link>
                  <Link to="/" className="sbm-side-item">Đồ uống ấm áp mùa đông</Link>
                  <Link to="/" className="sbm-side-item">Tiệc BBQ ngoài trời</Link>
                </div>
              </div>
              <div className="sbm-col-right" style={{ flex: 1 }}>
                <div className="sbm-side-group">
                  <div className="sbm-side-title">CỘNG ĐỒNG</div>
                  <Link to="/" className="sbm-side-item">Bộ sưu tập nổi bật nhất</Link>
                  <Link to="/" className="sbm-side-item">Bếp trưởng của tuần</Link>
                  <Link to="/" className="sbm-side-item">Góc khoe thành phẩm</Link>
                  <Link to="/" className="sbm-side-item">Cuộc thi nấu ăn</Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
