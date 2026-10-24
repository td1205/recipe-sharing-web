import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

import { AuthContext } from '../context/AuthContext';
import LoginRequiredModal from './LoginRequiredModal';
import ImageSearchModal from './ImageSearchModal';


// ============================================================================
// MENU CHÍNH - mỗi link trỏ tới bộ lọc có dữ liệu thật ở trang /recipes:
//   ?category=<tên danh mục>  ?meal_time=Sáng|Trưa|Tối  ?tag=<tag món>
//   ?duration=under_30|30_60|over_60  ?search=<từ khóa>
// Muốn thêm mục: thêm [nhãn, đường dẫn] vào cột tương ứng.
// ============================================================================
const recipesBy = (key, value) => `/recipes?${key}=${encodeURIComponent(value)}`;

const NAV_MENUS = [
  {
    key: 'what-to-cook',
    label: 'Hôm nay nấu gì',
    to: '/recipes',
    style: { minWidth: '460px', gap: '48px' },
    columns: [
      {
        title: 'GỢI Ý HÔM NAY',
        links: [
          ['Phổ biến nhất (Top 50)', '/popular'],
          ['Nhanh gọn dưới 30 phút', recipesBy('duration', 'under_30')],
          ['Thanh đạm & Ăn chay', recipesBy('tag', 'món chay')],
          ['Món canh ấm bụng', recipesBy('category', 'Món Canh')],
        ],
      },
      {
        title: 'CHỌN THEO BỮA ĂN',
        links: [
          ['Bữa sáng tiện lợi', recipesBy('meal_time', 'Sáng')],
          ['Bữa trưa công sở', recipesBy('meal_time', 'Trưa')],
          ['Bữa tối gia đình', recipesBy('meal_time', 'Tối')],
          ['Tráng miệng & Bánh ngọt', recipesBy('category', 'Bánh & Tráng miệng')],
        ],
      },
    ],
  },
  {
    key: 'recipes',
    label: 'Công thức',
    to: '/recipes',
    columns: [
      {
        title: 'THEO CÁCH CHẾ BIẾN',
        links: ['Món Chiên', 'Món Xào', 'Món Kho', 'Món Hấp', 'Món Nướng', 'Món Luộc'].map((name) => [
          name,
          recipesBy('category', name),
        ]),
      },
      {
        title: 'MÓN NƯỚC & MÓN CHÍNH',
        links: ['Món Canh', 'Món Lẩu', 'Cơm, Bún, Phở & Mì', 'Gỏi & Salad'].map((name) => [
          name,
          recipesBy('category', name),
        ]),
      },
      {
        title: 'ĐỒ NGỌT & ĐỒ UỐNG',
        links: ['Bánh & Tráng miệng', 'Đồ uống', 'Sốt & Nước chấm'].map((name) => [name, recipesBy('category', name)]),
      },
      {
        title: 'THEO THỜI GIAN NẤU',
        links: [
          ['Dưới 30 phút', recipesBy('duration', 'under_30')],
          ['30 – 60 phút', recipesBy('duration', '30_60')],
          ['Trên 60 phút', recipesBy('duration', 'over_60')],
        ],
      },
    ],
  },
  {
    key: 'ingredients',
    label: 'Nguyên liệu',
    to: '/recipes',
    columns: [
      {
        title: 'THỊT',
        links: [
          ['Thịt gà', recipesBy('tag', 'thịt gà')],
          ['Thịt bò', recipesBy('tag', 'thịt bò')],
          ['Thịt heo', recipesBy('tag', 'thịt heo')],
          ['Thịt vịt', recipesBy('tag', 'thịt vịt')],
        ],
      },
      {
        title: 'HẢI SẢN',
        links: [
          ['Hải sản', recipesBy('tag', 'hải sản')],
          ['Cá', recipesBy('tag', 'cá')],
          ['Tôm', recipesBy('search', 'tôm')],
          ['Mực', recipesBy('search', 'mực')],
        ],
      },
      {
        title: 'ĐẠM THỰC VẬT & TRỨNG',
        links: [
          ['Đậu hũ', recipesBy('tag', 'đậu hũ')],
          ['Nấm', recipesBy('tag', 'nấm')],
          ['Trứng', recipesBy('tag', 'trứng')],
          ['Món chay', recipesBy('tag', 'món chay')],
        ],
      },
      {
        title: 'RAU CỦ',
        links: [
          ['Cà chua', recipesBy('search', 'cà chua')],
          ['Khoai', recipesBy('search', 'khoai')],
          ['Măng', recipesBy('search', 'măng')],
        ],
      },
    ],
  },
  {
    key: 'occasions',
    label: 'Dịp đặc biệt',
    to: '/recipes',
    style: { left: '200px' },
    columns: [
      {
        title: 'DỊP LỄ & TIỆC',
        links: [
          ['Món ngày Tết', recipesBy('search', 'tết')],
          ['Món đãi tiệc', recipesBy('search', 'tiệc')],
          ['Lẩu cuối tuần', recipesBy('category', 'Món Lẩu')],
          ['Đồ nướng BBQ', recipesBy('category', 'Món Nướng')],
        ],
      },
    ],
  },
  { key: 'articles', label: 'Bài viết', to: '/articles' },
];

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
            {/* "Hộp công thức" = các món đã lưu (yêu thích), hiển thị ở trang hồ sơ */}
            <Link to={user ? '/profile' : '/login'} className="nyt-action-link nyt-recipe-box-link">
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
                    {user.role === 'admin' && <Link to="/admin/dashboard" className="nyt-dropdown-item">Quản trị viên</Link>}
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
            
            {/* Menu chính: dựng từ NAV_MENUS (đầu file), mọi link đều trỏ tới dữ liệu thật */}
            {NAV_MENUS.map((menu) => (
              <li
                key={menu.key}
                className="nyt-nav-item"
                onMouseEnter={() => menu.columns && setActiveMega(menu.key)}
                onMouseLeave={() => setActiveMega(null)}
              >
                <Link to={menu.to} onClick={() => setActiveMega(null)}>{menu.label}</Link>
                {menu.columns && activeMega === menu.key && (
                  <div className="nyt-mega-menu" style={menu.style}>
                    {menu.columns.map((column) => (
                      <div className="nyt-mega-col" key={column.title}>
                        <h4>{column.title}</h4>
                        {column.links.map(([label, to]) => (
                          <Link key={label} to={to} onClick={() => setActiveMega(null)}>{label}</Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}

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
