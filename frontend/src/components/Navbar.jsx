import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

import { AuthContext } from '../context/AuthContext';
import LoginRequiredModal from './LoginRequiredModal';
import ImageSearchModal from './ImageSearchModal';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const [navData, setNavData] = useState({ courseTypes: [], categories: [], mealTimes: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const navigate = useNavigate();

  const [activeMega, setActiveMega] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Gated actions ask for a sign-in instead of silently bouncing to /login.
  const requireLogin = (action) => {
    if (user) {
      action();
      return;
    }
    setIsLoginModalOpen(true);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    toast.success('Tính năng đang phát triển', { style: { background: 'var(--color-bg-body)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)' }});
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/recipes?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    setIsVisualSearchOpen(false);
    setIsScanning(true);
    toast.loading('Đang quét hình ảnh...', { id: 'scan-toast' });
    try {
      const formData = new FormData();
      formData.append('image', file);
      // The router exposes POST /scan-image under /api/ai (see routes/aiRoutes.js).
      const response = await axios.post('/api/ai/scan-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // The controller responds with { success, keyword }.
      const keyword = response.data.keyword;
      if (!keyword) throw new Error('Thiếu từ khoá trong phản hồi');

      toast.success(`Đã nhận diện: ${keyword}`, { id: 'scan-toast' });
      navigate(`/recipes?search=${encodeURIComponent(keyword)}`);
    } catch (error) {
      toast.error('Không thể nhận diện hình ảnh.', { id: 'scan-toast' });
    } finally {
      setIsScanning(false);
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
    <>
    <header className="nyt-header" ref={navRef}>
      {/* TOP ROW */}
      <div className="nyt-top-row">
        <div className="nyt-container">
          <Link to="/" className="nyt-logo">
            <i className="fa-solid fa-book-open" aria-hidden="true"></i>
            <span>Recipe Sharing</span>
          </Link>

          <form className="nyt-search-form" onSubmit={handleSearchSubmit}>
            <i className="fa-solid fa-magnifying-glass"></i>
            <input 
              type="text" 
              placeholder="Bạn muốn nấu gì hôm nay?" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="button"
              className="nyt-scan-btn"
              title="Tìm kiếm bằng hình ảnh"
              aria-label="Tìm kiếm bằng hình ảnh"
              onClick={() => setIsVisualSearchOpen(true)}
            >
              <i className="fa-solid fa-camera" aria-hidden="true"></i>
            </button>
          </form>

          <div className="nyt-actions">
            <button
              type="button"
              className="btn-primary nyt-app-cta"
              onClick={() => requireLogin(() => navigate('/recipes/create'))}
            >
              Đăng công thức
            </button>
            <Link to="/" className="nyt-action-link nyt-recipe-box-link" onClick={handleMockupClick}>
               <i className="fa-regular fa-bookmark"></i>
               <span className="nyt-action-label">Hộp công thức</span>
            </Link>
            {user ? (
              <div className="nyt-user-menu" ref={userMenuRef}>
                <div className="nyt-user-icon" onClick={() => setShowUserMenu(!showUserMenu)} style={{ cursor: 'pointer' }}>
                  <i className="fa-solid fa-user"></i>
                </div>
                {showUserMenu && (
                  <div className="nyt-dropdown">
                    <div className="nyt-dropdown-header">
                      <strong>{user.username}</strong>
                      <span>{user.email}</span>
                    </div>
                    {user.role === 'admin' && <Link to="/admin" className="nyt-dropdown-item">Quản trị viên</Link>}
                    <Link to="/profile" className="nyt-dropdown-item">Hồ sơ</Link>
                    <button onClick={handleLogout} className="nyt-dropdown-item">Đăng xuất</button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="nyt-action-link nyt-account-link">
                 <i className="fa-solid fa-user"></i>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM ROW */}
      <div className="nyt-bottom-row">
        <div className="nyt-container">
          <ul className="nyt-nav-list">
            
            {/* 1. What to Cook */}
            <li 
              className="nyt-nav-item"
              onMouseEnter={() => setActiveMega('what-to-cook')}
              onMouseLeave={() => setActiveMega(null)}
            >
              <Link to="/recipes?category=Tất cả">Hôm nay nấu gì</Link>
              {activeMega === 'what-to-cook' && (
                <div className="nyt-mega-menu" style={{ minWidth: '460px', gap: '48px' }}>
                   <div className="nyt-mega-col">
                     <h4>GỢI Ý HÔM NAY</h4>
                     <Link to="/popular" onClick={() => setActiveMega(null)}>Phổ biến nhất (Top 50)</Link>
                     <Link to="/recipes?max_cook_time=30" onClick={() => setActiveMega(null)}>Nhanh gọn dưới 30 phút</Link>
                     <Link to="/recipes?search=chay" onClick={() => setActiveMega(null)}>Thanh đạm & Ăn chay</Link>
                     <Link to="/recipes?category=Món Canh" onClick={() => setActiveMega(null)}>Món canh & Hầm ấm bụng</Link>
                   </div>
                   <div className="nyt-mega-col">
                     <h4>CHỌN THEO BỮA ĂN</h4>
                     <Link to="/recipes?meal_time=1" onClick={() => setActiveMega(null)}>Bữa sáng tiện lợi</Link>
                     <Link to="/recipes?meal_time=2" onClick={() => setActiveMega(null)}>Bữa trưa công sở</Link>
                     <Link to="/recipes?meal_time=4" onClick={() => setActiveMega(null)}>Bữa tối gia đình</Link>
                     <Link to="/recipes?category=12" onClick={() => setActiveMega(null)}>Món tráng miệng & Bánh ngọt</Link>
                   </div>
                </div>
              )}
            </li>

            {/* 2. Recipes */}
            <li 
              className="nyt-nav-item"
              onMouseEnter={() => setActiveMega('recipes')}
              onMouseLeave={() => setActiveMega(null)}
            >
              <Link to="/recipes?category=Công thức">Công thức</Link>
              {activeMega === 'recipes' && (
                <div className="nyt-mega-menu">
                   <div className="nyt-mega-col">
                     <h4>MÓN NGON MỖI NGÀY</h4>
                     <Link to="/">Dễ làm</Link>
                     <Link to="/">Tốt cho sức khỏe</Link>
                     <Link to="/">Bữa tối gia đình</Link>
                     <Link to="/">Mỳ & Nui</Link>
                     <Link to="/">Nhanh gọn</Link>
                   </div>
                   <div className="nyt-mega-col">
                     <h4>THEO BỮA</h4>
                     <Link to="/">Bữa tối</Link>
                     <Link to="/">Bữa sáng</Link>
                     <Link to="/">Bữa trưa</Link>
                     <Link to="/">Tráng miệng</Link>
                     <Link to="/">Khai vị</Link>
                     <Link to="/">Món ăn kèm</Link>
                     <Link to="/">Đồ uống</Link>
                   </div>
                   <div className="nyt-mega-col">
                     <h4>THEO CHẾ ĐỘ</h4>
                     <Link to="/">Ăn chay</Link>
                     <Link to="/">Thuần chay</Link>
                     <Link to="/">Không Gluten</Link>
                     <Link to="/">Không bơ sữa</Link>
                   </div>
                   <div className="nyt-mega-col">
                     <h4>THEO CÁCH CHẾ BIẾN</h4>
                     <Link to="/">Nồi chiên không dầu</Link>
                     <Link to="/">Nồi áp suất</Link>
                     <Link to="/">Nấu chậm</Link>
                     <Link to="/">Nướng BBQ</Link>
                     <Link to="/">Nướng khay</Link>
                     <Link to="/">Làm bánh lò</Link>
                   </div>
                </div>
              )}
            </li>

            {/* 3. Ingredients */}
            <li 
              className="nyt-nav-item"
              onMouseEnter={() => setActiveMega('ingredients')}
              onMouseLeave={() => setActiveMega(null)}
            >
              <Link to="/recipes?category=Nguyên liệu">Nguyên liệu</Link>
              {activeMega === 'ingredients' && (
                <div className="nyt-mega-menu">
                   <div className="nyt-mega-col">
                     <h4>THỊT & HẢI SẢN</h4>
                     <Link to="/">Thịt gà</Link>
                     <Link to="/">Thịt bò</Link>
                     <Link to="/">Thịt heo</Link>
                     <Link to="/">Cá hồi</Link>
                     <Link to="/">Tôm</Link>
                   </div>
                   <div className="nyt-mega-col">
                     <h4>RAU CỦ QUẢ</h4>
                     <Link to="/">Bí ngòi</Link>
                     <Link to="/">Khoai lang</Link>
                     <Link to="/">Cà tím</Link>
                     <Link to="/">Bắp cải</Link>
                     <Link to="/">Măng tây</Link>
                     <Link to="/">Cà chua</Link>
                   </div>
                   <div className="nyt-mega-col">
                     <h4>ĐẠM THỰC VẬT</h4>
                     <Link to="/">Đậu hũ</Link>
                     <Link to="/">Đậu lăng</Link>
                     <Link to="/">Đậu gà</Link>
                     <Link to="/">Các loại đậu</Link>
                   </div>
                   <div className="nyt-mega-col">
                     <h4>CƠM, NGŨ CỐC, MỲ</h4>
                     <Link to="/">Mỳ Ý</Link>
                     <Link to="/">Bún, Phở, Mỳ</Link>
                     <Link to="/">Cơm & Gạo</Link>
                     <Link to="/">Diêm mạch (Quinoa)</Link>
                     <Link to="/">Bánh mì</Link>
                     <Link to="/">Hạt Couscous</Link>
                   </div>
                </div>
              )}
            </li>

            {/* 4. Occasions */}
            <li 
              className="nyt-nav-item"
              onMouseEnter={() => setActiveMega('occasions')}
              onMouseLeave={() => setActiveMega(null)}
            >
              <Link to="/recipes?category=Dịp đặc biệt">Dịp đặc biệt</Link>
              {activeMega === 'occasions' && (
                <div className="nyt-mega-menu" style={{ left: '200px' }}>
                   <div className="nyt-mega-col">
                     <h4>DỊP LỄ SẮP TỚI</h4>
                     <Link to="/">Tết Trung Thu</Link>
                     <Link to="/">Halloween</Link>
                     <Link to="/">Giáng Sinh</Link>
                     <Link to="/">Tết Nguyên Đán</Link>
                   </div>
                   <div className="nyt-mega-col">
                     <h4>THEO SỰ KIỆN</h4>
                     <Link to="/">Sinh nhật</Link>
                     <Link to="/">Ăn nhẹ (Brunch)</Link>
                     <Link to="/">Bữa tối lãng mạn</Link>
                     <Link to="/">Tiệc tùng</Link>
                     <Link to="/">Dã ngoại</Link>
                   </div>
                </div>
              )}
            </li>

            {/* 5. Articles */}
            <li 
              className="nyt-nav-item"
              onMouseEnter={() => setActiveMega('articles')}
              onMouseLeave={() => setActiveMega(null)}
            >
              <Link to="/articles">Bài viết</Link>
              {activeMega === 'articles' && (
                <div className="nyt-mega-menu" style={{ left: '300px' }}>
                   <div className="nyt-mega-col">
                     <h4>HƯỚNG DẪN CƠ BẢN</h4>
                     <Link to="/">Cách luộc ức gà mềm</Link>
                     <Link to="/">Cách làm men bánh mì</Link>
                     <Link to="/">Bí quyết xào trứng</Link>
                   </div>
                   <div className="nyt-mega-col">
                     <h4>CHO NGƯỜI MỚI</h4>
                     <Link to="/">Học nấu ăn</Link>
                     <Link to="/">Kỹ năng dùng dao</Link>
                     <Link to="/">An toàn & bảo quản thực phẩm</Link>
                   </div>
                   <div className="nyt-mega-col">
                     <h4>BẠN ĐỌC YÊU THÍCH</h4>
                     <Link to="/">Top 100 món ăn tối</Link>
                     <Link to="/">Món canh khỏe mạnh</Link>
                     <Link to="/">Làm bánh mùa thu</Link>
                   </div>
                </div>
              )}
            </li>

            {/* 6. Videos */}
            <li 
              className="nyt-nav-item"
              onMouseEnter={() => setActiveMega('videos')}
              onMouseLeave={() => setActiveMega(null)}
            >
              <Link to="/recipes?category=Video" onClick={handleMockupClick}>Video</Link>
              {activeMega === 'videos' && (
                <div className="nyt-mega-menu" style={{ left: '400px' }}>
                   <div className="nyt-mega-col">
                     <h4>CHUỖI CÔNG THỨC</h4>
                     <Link to="/">Nấu ăn 101</Link>
                     <Link to="/">Góc rau củ</Link>
                     <Link to="/">Giờ nướng bánh</Link>
                   </div>
                   <div className="nyt-mega-col">
                     <h4>GÓC NGƯỜI NỔI TIẾNG</h4>
                     <Link to="/">Chuyện trò cùng Pizza</Link>
                     <Link to="/">Món tủ của tôi</Link>
                   </div>
                </div>
              )}
            </li>

            {/* 7. About */}
            <li className="nyt-nav-item">
              <Link to="/about" onClick={handleMockupClick}>Về chúng tôi</Link>
            </li>
          </ul>
        </div>
      </div>
    </header>

      <LoginRequiredModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <ImageSearchModal
        isOpen={isVisualSearchOpen}
        onClose={() => setIsVisualSearchOpen(false)}
        onPick={handleImageUpload}
      />
    </>
  );
};

export default Navbar;
