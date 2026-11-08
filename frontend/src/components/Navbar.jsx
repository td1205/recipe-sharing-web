import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';


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
    to: '/meals',
    style: { minWidth: '460px', gap: '48px' },
    columns: [
      {
        title: 'GỢI Ý HÔM NAY',
        links: [
          ['Phổ biến nhất (Top 50)', '/popular'],
          ['Nấu với nguyên liệu có sẵn', '/cook-with-ingredients'],
          ['Thanh đạm & Ăn chay', recipesBy('tag', 'món chay')],
          ['Tráng miệng & Bánh ngọt', recipesBy('category', 'Bánh & Tráng miệng')],
        ],
      },
      {
        title: 'CHỌN THEO BỮA ĂN',
        links: [
          ['Bữa sáng tiện lợi', recipesBy('meal_time', 'Sáng')],
          ['Bữa trưa công sở', recipesBy('meal_time', 'Trưa')],
          ['Bữa tối gia đình', recipesBy('meal_time', 'Tối')],
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
        links: ['Món Chiên', 'Món Xào', 'Món Kho', 'Món Hấp', 'Món Nướng'].map((name) => [
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
    to: '/cook-with-ingredients',
    columns: [
      {
        title: 'NẤU THEO NGUYÊN LIỆU CÓ SẴN',
        links: [
          ['Chọn nguyên liệu trong tủ lạnh', '/cook-with-ingredients'],
        ],
      },
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

];

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const navigate = useNavigate();

  const [activeMega, setActiveMega] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const userMenuRef = useRef(null);
  const searchRef = useRef(null);

  // Typeahead gợi ý tìm kiếm: tải tiêu đề 1 lần, lọc thời gian thực theo từng ký tự
  const [allTitles, setAllTitles] = useState(null); // null = chưa tải
  const [titlesLoading, setTitlesLoading] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  // Bỏ dấu + lowercase: gõ "banh" vẫn khớp "Bánh"
  const normVi = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim()
    .toLowerCase();

  const loadTitles = () => {
    if (allTitles || titlesLoading) return;
    setTitlesLoading(true);
    axios.get('/api/recipes/titles')
      .then((res) => setAllTitles(res.data.titles || []))
      .catch(() => setAllTitles([]))
      .finally(() => setTitlesLoading(false));
  };

  const suggestions = (() => {
    const q = normVi(searchQuery);
    if (!allTitles || q.length < 1) return [];
    return allTitles.filter((t) => normVi(t.title).includes(q)).slice(0, 8);
  })();

  const closeSuggest = () => {
    setShowSuggest(false);
    setActiveIdx(-1);
  };

  const goSuggestion = (recipe) => {
    closeSuggest();
    setSearchQuery('');
    navigate(`/recipes/${recipe.id}`);
  };

  const handleSuggestKeyDown = (e) => {
    if (!showSuggest || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Escape') {
      closeSuggest();
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      goSuggestion(suggestions[activeIdx]);
    }
  };


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
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggest(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async (e) => {
    if (e) e.preventDefault();
    await logout();
    navigate('/login');
  };


  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      closeSuggest();
      navigate(`/recipes?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const handleImageUpload = (keyword) => {
    if (!keyword) return;
    navigate(`/recipes?search=${encodeURIComponent(keyword)}`);
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

          <form
            className="nyt-search-form"
            role="search"
            ref={searchRef}
            onSubmit={handleSearchSubmit}
          >
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <input
              type="search"
              placeholder="Bạn muốn nấu gì hôm nay?"
              aria-label="Tìm công thức"
              aria-expanded={showSuggest}
              aria-controls="search-suggest-list"
              aria-autocomplete="list"
              role="combobox"
              maxLength={200}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSuggestKeyDown}
              onFocus={() => { loadTitles(); setShowSuggest(true); }}
            />
            {showSuggest && (
              <div className="nyt-suggest" id="search-suggest-list" role="listbox">
                {titlesLoading && (
                  <div className="nyt-suggest-empty">Đang tải gợi ý…</div>
                )}
                {!titlesLoading && searchQuery.trim().length >= 1 && suggestions.length === 0 && (
                  <div className="nyt-suggest-empty">Không có món phù hợp</div>
                )}
                {suggestions.map((s, i) => (
                  <button
                    type="button"
                    key={s.id}
                    role="option"
                    aria-selected={i === activeIdx}
                    className={`nyt-suggest-item ${i === activeIdx ? 'active' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => goSuggestion(s)}
                  >
                    <span className="nyt-suggest-title">{s.title}</span>
                  </button>
                ))}
              </div>
            )}
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
            <Link to={user ? '/profile/recipe-box' : '/login'} className="nyt-action-link nyt-recipe-box-link">
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
              <Link to="/about">Về chúng tôi</Link>
            </li>
          </ul>
        </div>
      </div>
    </header>

      <LoginRequiredModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <ImageSearchModal
        isOpen={isVisualSearchOpen}
        onClose={() => setIsVisualSearchOpen(false)}
        onResult={handleImageUpload}
      />
    </>
  );
};

export default Navbar;
