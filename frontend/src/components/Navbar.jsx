import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
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

  const handleLogout = async (e) => {
    if (e) e.preventDefault();
    await logout();
    navigate('/login');
  };

  const handleMockupClick = (e) => {
    if (e) e.preventDefault();
    toast.success('Tính năng đang phát triển', { style: { background: '#1b2838', color: '#c6d4df', border: '1px solid #101822' }});
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
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <img 
                    src={user.avatar_url || 'https://avatars.akamai.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'} 
                    alt="avatar" 
                    className="steam-user-avatar" 
                  />
                  {user.username} ▾
                  {showUserMenu && (
                    <div className="steam-dropdown profile-drop">
                      {user.role === 'admin' && <Link to="/admin/dashboard" className="steam-drop-link">Quản trị chi tiết</Link>}
                      <Link to="/profile" className="steam-drop-link">Xem hồ sơ của tôi</Link>
                      <a href="#" className="steam-drop-link" onClick={handleMockupClick}>Chi tiết tài khoản: <span style={{color: '#66c0f4'}}>{user.username}</span></a>
                      <a href="#" className="steam-drop-link" onClick={handleMockupClick}>Tùy chỉnh cửa hàng</a>
                      <a href="#" className="steam-drop-link" onClick={handleMockupClick}>Xem ví của tôi</a>
                      <div className="steam-drop-divider"></div>
                      <a href="#" className="steam-drop-link" onClick={handleMockupClick}>Đổi tài khoản...</a>
                      <a href="#" className="steam-drop-link" onClick={handleLogout}>Đăng xuất khỏi tài khoản...</a>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="steam-login-actions">
                <Link to="/login" className="steam-login-text">đăng nhập</Link>
                <span> | </span>
                <Link to="/register" className="steam-login-text">đăng ký</Link>
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
                <Link to="/" className="sbm-main-link" onClick={() => setActiveMega(null)}>
                  <span className="sbm-title">Trang chủ</span>
                </Link>
                <Link to="/new-recipes" className="sbm-main-link" onClick={() => setActiveMega(null)}>
                  <span className="sbm-title">Công thức mới</span>
                  <span className="sbm-desc">Khám phá công thức mới</span>
                </Link>
                <a href="#" className="sbm-main-link" onClick={handleMockupClick}>
                  <span className="sbm-title">Xếp hạng công thức</span>
                </a>
              </div>
              <div className="sbm-col-mid">
                <a href="#" className="sbm-card-popular" onClick={handleMockupClick}>
                  <span>CÔNG THỨC PHỔ BIẾN NHẤT</span>
                </a>
              </div>
              <div className="sbm-col-right">
                <div className="sbm-side-group">
                  <div className="sbm-side-title">CÓ THỂ BẠN QUAN TÂM</div>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Tin tức mới nhất</a>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Review món ăn</a>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Mẹo vặt nhà bếp</a>
                </div>
              </div>
              <div className="sbm-col-right">
                <div className="sbm-side-group">
                  <div className="sbm-side-title">TÀI KHOẢN CỦA TÔI</div>
                  <Link to="/profile" className="sbm-side-item" onClick={() => setActiveMega(null)}>Tùy chỉnh của tôi</Link>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Danh sách yêu thích của tôi</a>
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
                <a href="#" className="sbm-rec-card" onClick={handleMockupClick}>
                  <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&q=80" alt="Món ăn 1" />
                  <div className="sbm-rec-info">
                    <span className="sbm-rec-title">Salad Cà Chua Trộn Dầu Giấm</span>
                    <span className="sbm-rec-type">Khai vị</span>
                  </div>
                </a>
                <a href="#" className="sbm-rec-card" onClick={handleMockupClick}>
                  <img src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=100&q=80" alt="Món ăn 2" />
                  <div className="sbm-rec-info">
                    <span className="sbm-rec-title">Pizza Hải Sản Phô Mai</span>
                    <span className="sbm-rec-type">Món chính</span>
                  </div>
                </a>
                <a href="#" className="sbm-rec-card" onClick={handleMockupClick}>
                  <img src="https://images.unsplash.com/photo-1551024601-bec78aea704b?w=100&q=80" alt="Món ăn 3" />
                  <div className="sbm-rec-info">
                    <span className="sbm-rec-title">Bánh Kem Dâu Tây Gato</span>
                    <span className="sbm-rec-type">Tráng miệng</span>
                  </div>
                </a>
              </div>
              <div className="sbm-col-mid">
                <div className="sbm-queue-banner">
                  <div className="sbm-queue-icon"><i className="fa-solid fa-calendar-days"></i></div>
                  <div className="sbm-queue-content">
                    <h4>Lịch cá nhân của bạn</h4>
                    <p>Khám phá danh sách cá nhân hóa, gồm các món ăn được chọn lọc riêng cho khẩu vị của bạn ngày hôm nay.</p>
                    <a href="#" className="btn-primary" style={{ display: 'inline-block', marginTop: '10px', textTransform: 'none', background: 'linear-gradient(to right, #0088ff, #0055ff)', color: '#fff', border: 'none' }} onClick={handleMockupClick}>Khám phá lịch của tôi ➔</a>
                  </div>
                </div>
              </div>
              <div className="sbm-col-right" style={{ flex: 1.2 }}>
                <div className="sbm-side-group">
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Hàng khám phá của bạn</a>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Khuyến nghị từ cộng đồng</a>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Món ngon bạn bè hay nấu</a>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Khuyên dùng tương tác</a>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Bộ sưu tập theo mùa</a>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Thẩm định viên Recipe</a>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Theo thời gian thực</a>
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
                  <a href="#" className="sbm-cat-card" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=200)' }} onClick={handleMockupClick}>
                    <span>MÓN ĂN SÁNG</span>
                  </a>
                  <a href="#" className="sbm-cat-card" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=200)' }} onClick={handleMockupClick}>
                    <span>TRÁNG MIỆNG</span>
                  </a>
                  <a href="#" className="sbm-cat-card" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1544148103-0773bf10d330?q=80&w=200)' }} onClick={handleMockupClick}>
                    <span>ĐỒ UỐNG</span>
                  </a>
                  <a href="#" className="sbm-cat-card" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=200)' }} onClick={handleMockupClick}>
                    <span>ĂN CHAY</span>
                  </a>
                  <a href="#" className="sbm-cat-card" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=200)' }} onClick={handleMockupClick}>
                    <span>ĐẶC SẢN VÙNG MIỀN</span>
                  </a>
                  <a href="#" className="sbm-cat-card" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1533622597524-a714040f6780?q=80&w=200)' }} onClick={handleMockupClick}>
                    <span>MÓN NHẬU</span>
                  </a>
                </div>
              </div>

              <div className="sbm-cat-tags">
                <div className="sbm-tags-list">
                  <a href="#" className="sbm-tag" onClick={handleMockupClick}>Hải sản</a>
                  <a href="#" className="sbm-tag" onClick={handleMockupClick}>Cay nồng</a>
                  <a href="#" className="sbm-tag" onClick={handleMockupClick}>Ít calo</a>
                  <a href="#" className="sbm-tag" onClick={handleMockupClick}>Nướng</a>
                  <a href="#" className="sbm-tag" onClick={handleMockupClick}>Hấp</a>
                  <a href="#" className="sbm-tag" onClick={handleMockupClick}>Thịt bò</a>
                  <a href="#" className="sbm-tag" onClick={handleMockupClick}>Salad</a>
                  <a href="#" className="sbm-tag" onClick={handleMockupClick}>Eat clean</a>
                  <a href="#" className="sbm-tag" onClick={handleMockupClick}>Lẩu</a>
                </div>
                <a href="#" className="sbm-view-all-tags" onClick={handleMockupClick}>Xem tất cả nhãn ❯</a>
              </div>

              <div className="sbm-cat-bottom">
                <div className="sbm-bottom-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div className="sbm-side-title">TẤT CẢ THỂ LOẠI & CHỦ ĐỀ</div>
                  <a href="#" className="sbm-view-all-tags" onClick={handleMockupClick}>Mở rộng ⏷</a>
                </div>
                <div className="sbm-cat-cols">
                  <div className="sbm-cat-col">
                    <div className="sbm-col-header">THỰC ĐƠN</div>
                    {navData.courseTypes && navData.courseTypes.map(c => (
                       <Link key={c.id} to={`/?course_type=${c.id}`} className="sbm-side-item" onClick={() => setActiveMega(null)}>{c.name}</Link>
                    ))}
                    {!navData.courseTypes?.length && (
                      <>
                        <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Khai vị</a>
                        <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Món chính</a>
                        <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Tráng miệng</a>
                      </>
                    )}
                  </div>
                  <div className="sbm-cat-col">
                    <div className="sbm-col-header">THỜI GIAN</div>
                    {navData.mealTimes && navData.mealTimes.map(m => (
                       <Link key={m.id} to={`/?meal_time=${m.id}`} className="sbm-side-item" onClick={() => setActiveMega(null)}>{m.name}</Link>
                    ))}
                    {!navData.mealTimes?.length && (
                      <>
                        <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Bữa sáng</a>
                        <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Bữa trưa</a>
                        <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Bữa tối</a>
                      </>
                    )}
                  </div>
                  <div className="sbm-cat-col">
                    <div className="sbm-col-header">ĐẶC TÍNH</div>
                    <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Ăn chay</a>
                    <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Eat clean</a>
                    <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Low carb</a>
                    <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Keto</a>
                    <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Không gluten</a>
                  </div>
                  <div className="sbm-cat-col">
                    <div className="sbm-col-header">PHONG CÁCH</div>
                    <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Việt Nam</a>
                    <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Hàn Quốc</a>
                    <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Nhật Bản</a>
                    <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Âu Mỹ</a>
                    <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Thái Lan</a>
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
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Mẹo vặt & Xử lý nguyên liệu</a>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Bảo quản thực phẩm</a>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Kỹ năng dùng dao & chảo</a>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Chữa cháy món ăn hỏng</a>
                </div>
              </div>
              <div className="sbm-col-right" style={{ flex: 1 }}>
                <div className="sbm-side-group">
                  <div className="sbm-side-title">KIẾN THỨC ẨM THỰC</div>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Dinh dưỡng cơ bản</a>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Thế giới gia vị</a>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Thay thế nguyên liệu</a>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Phân biệt các loại bột/đường</a>
                </div>
              </div>
              <div className="sbm-col-right" style={{ flex: 1 }}>
                <div className="sbm-side-group">
                  <div className="sbm-side-title">TIN TỨC & CẨM NANG</div>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Review dụng cụ bếp</a>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Xu hướng ẩm thực 2026</a>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Góc tâm sự người làm bếp</a>
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
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Công thức đã lưu</a>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Đang nấu dở</a>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Món ăn yêu thích</a>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Thực đơn tự tạo</a>
                </div>
              </div>
              <div className="sbm-col-right" style={{ flex: 1 }}>
                <div className="sbm-side-group">
                  <div className="sbm-side-title">KHÁM PHÁ THEO MÙA</div>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Món ngon giải nhiệt mùa hè</a>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Mâm cỗ ngày Tết cổ truyền</a>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Đồ uống ấm áp mùa đông</a>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Tiệc BBQ ngoài trời</a>
                </div>
              </div>
              <div className="sbm-col-right" style={{ flex: 1 }}>
                <div className="sbm-side-group">
                  <div className="sbm-side-title">CỘNG ĐỒNG</div>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Bộ sưu tập nổi bật nhất</a>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Bếp trưởng của tuần</a>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Góc khoe thành phẩm</a>
                  <a href="#" className="sbm-side-item" onClick={handleMockupClick}>Cuộc thi nấu ăn</a>
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
