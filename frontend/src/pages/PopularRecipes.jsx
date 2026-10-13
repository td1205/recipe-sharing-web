import React, { useState, useEffect, useMemo, useContext } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import SkeletonLoader from '../components/SkeletonLoader';
import LoginRequiredModal from '../components/LoginRequiredModal';
import { DEFAULT_RECIPE_IMAGE } from '../components/MagazineCard';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Home.css';

// Total cook time, matching the homepage and recipe detail helpers.
const getTotalRecipeTime = (recipe) => (
  (Number(recipe?.prep_time) || 0) + (Number(recipe?.cook_time) || 0)
);

const formatRecipeTime = (recipe) => {
  const total = getTotalRecipeTime(recipe);
  return total > 0 ? `${total} phút` : 'Chưa có thời gian';
};

// Ratings are only rendered when the recipe actually has some.
const getRatingInfo = (recipe) => {
  const count = Number(recipe?.total_ratings) || 0;
  if (count <= 0) return { count: 0, average: 0, hasRating: false };
  return { count, average: Number(recipe.avg_rating) || 0, hasRating: true };
};

const formatCount = (value) => Number(value || 0).toLocaleString('vi-VN');

const PopularRecipes = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Filter states
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'month', 'week'
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [searchKeyword, setSearchKeyword] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 16;

  // Bookmarks
  const [isCollectionSaved, setIsCollectionSaved] = useState(false);
  const [savedRecipeIds, setSavedRecipeIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('savedPopularRecipeIds') || '[]');
    } catch {
      return [];
    }
  });

  // Newsletter email
  const [newsletterEmail, setNewsletterEmail] = useState('');

  useEffect(() => {
    const fetchPopularData = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/recipes/popular?limit=50&period=${timeFilter}`);
        if (res.data.success) {
          setRecipes(res.data.recipes || []);
          setCategories(res.data.categories || []);
        } else {
          const homeRes = await axios.get('/api/');
          if (homeRes.data.success) {
            setRecipes(homeRes.data.popularRecipes || homeRes.data.latestRecipes || []);
            setCategories(homeRes.data.categories || []);
          }
        }
      } catch (error) {
        console.error('Lỗi khi tải công thức phổ biến:', error);
        try {
          const homeRes = await axios.get('/api/');
          if (homeRes.data.success) {
            setRecipes(homeRes.data.popularRecipes || homeRes.data.latestRecipes || []);
            setCategories(homeRes.data.categories || []);
          }
        } catch (e) {
          console.error(e);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPopularData();
  }, [timeFilter]);

  // Collections are derived from the loaded recipes: real category names,
  // real counts and real cover images. Nothing is invented here.
  const curatedCollections = useMemo(() => {
    const byCategory = new Map();

    recipes.forEach((recipe) => {
      const name = recipe.category_name || recipe.categories?.name;
      if (!name) return;
      if (!byCategory.has(name)) byCategory.set(name, []);
      byCategory.get(name).push(recipe);
    });

    return Array.from(byCategory.entries())
      .map(([name, list]) => ({
        title: name,
        count: list.length,
        link: `/?category=${encodeURIComponent(name)}`,
        images: list.slice(0, 4).map((recipe) => recipe.image_url || DEFAULT_RECIPE_IMAGE),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [recipes]);

  // Real headline figures instead of a hardcoded "50".
  const popularStats = useMemo(() => {
    const authorNames = new Set(
      recipes
        .map((recipe) => recipe.author_name || recipe.users?.fullname || recipe.users?.username)
        .filter(Boolean),
    );
    const timestamps = recipes
      .map((recipe) => new Date(recipe.created_at).getTime())
      .filter((time) => !Number.isNaN(time));

    return {
      recipeCount: recipes.length,
      authorCount: authorNames.size,
      lastUpdated: timestamps.length
        ? new Date(Math.max(...timestamps)).toLocaleDateString('vi-VN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : null,
    };
  }, [recipes]);

  // Saving always needs an account, so ask the visitor to sign in first.
  const requireLogin = (action) => {
    if (user) {
      action();
      return;
    }
    setIsLoginModalOpen(true);
  };

  // Handle bookmarking individual recipe. The card button already flips to a
  // filled bookmark, so no corner toast is needed.
  const toggleSaveRecipe = (e, recipeId) => {
    e.preventDefault();
    e.stopPropagation();

    requireLogin(() => {
      const updated = savedRecipeIds.includes(recipeId)
        ? savedRecipeIds.filter(id => id !== recipeId)
        : [...savedRecipeIds, recipeId];

      setSavedRecipeIds(updated);
      localStorage.setItem('savedPopularRecipeIds', JSON.stringify(updated));
    });
  };

  // Handle save collection. The header button already flips to the saved state.
  const handleToggleCollection = () => {
    requireLogin(() => setIsCollectionSaved((prev) => !prev));
  };

  // Handle share
  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Đã sao chép liên kết vào bộ nhớ tạm!', { icon: '🔗' });
    } else {
      toast.success('Đã sao chép liên kết!');
    }
  };

  // Handle search inside banner
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchKeyword.trim()) {
      navigate(`/?search=${encodeURIComponent(searchKeyword.trim())}`);
    }
  };

  // Handle newsletter signup
  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) {
      toast.error('Vui lòng nhập địa chỉ email hợp lệ!');
      return;
    }
    toast.success('Cảm ơn bạn! Đã đăng ký nhận bản tin ẩm thực thành công.', { icon: '✉️' });
    setNewsletterEmail('');
  };

  // Filter recipes based on category and time horizon
  const filteredRecipes = useMemo(() => {
    let result = [...recipes];

    if (activeCategory === 'Dưới 30 phút') {
      result = result.filter(r => getTotalRecipeTime(r) <= 30);
    } else if (activeCategory === 'Ăn chay') {
      result = result.filter(r =>
        (r.category_name || '').toLowerCase().includes('chay') ||
        (r.title || '').toLowerCase().includes('chay')
      );
    } else if (activeCategory !== 'Tất cả') {
      result = result.filter(r => r.category_name === activeCategory);
    }

    return result;
  }, [recipes, activeCategory]);

  // Featured #1 recipe for the hero right column
  const heroRecipe = filteredRecipes.length > 0 ? filteredRecipes[0] : null;
  const heroRating = getRatingInfo(heroRecipe);

  // Recipes list for grid
  const gridRecipes = filteredRecipes;

  // Pagination calculation
  const totalPages = Math.ceil(gridRecipes.length / itemsPerPage) || 1;
  const paginatedRecipes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return gridRecipes.slice(start, start + itemsPerPage);
  }, [gridRecipes, currentPage, itemsPerPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 380, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <MainLayout hideSidebar categories={categories} className="home-typography">
        <SkeletonLoader />
      </MainLayout>
    );
  }

  return (
    <MainLayout hideSidebar categories={categories} className="home-typography">
      <div className="nyt-popular-page">

        {/* ========================================================
            1. HERO 2-COLUMN EDITORIAL SECTION
           ======================================================== */}
        <section className="nyt-popular-hero">

          {/* Left Column: Title, Description, Byline & Actions */}
          <div className="nyt-popular-hero-left">
            <div className="nyt-hero-eyebrow">
              <span className="nyt-hero-eyebrow-dot"></span>
              XẾP HẠNG THEO LƯỢT XEM, LƯU &amp; ĐÁNH GIÁ
            </div>

            <h1 className="nyt-hero-title">
              {popularStats.recipeCount > 0
                ? `${popularStats.recipeCount} Công Thức Phổ Biến Nhất`
                : 'Công Thức Phổ Biến'}
            </h1>

            <p className="nyt-hero-deck">
              Bảng xếp hạng được tính từ dữ liệu thật của cộng đồng: lượt xem, số lượt lưu,
              bình luận và điểm đánh giá. Công thức chưa có lượt tương tác nào sẽ không được tính điểm.
            </p>

            {/* Byline & Share/Bookmark Bar */}
            <div className="nyt-hero-byline-bar">
              <div className="nyt-hero-byline">
                {formatCount(popularStats.recipeCount)} công thức · {formatCount(popularStats.authorCount)} tác giả
                {popularStats.lastUpdated ? ` · Cập nhật ${popularStats.lastUpdated}` : ''}
              </div>

              <div className="nyt-hero-actions">
                <button
                  type="button"
                  className={`nyt-action-circle-btn ${isCollectionSaved ? 'saved' : ''}`}
                  title={isCollectionSaved ? 'Đã lưu bộ sưu tập' : 'Lưu bộ sưu tập'}
                  onClick={handleToggleCollection}
                >
                  <i className={isCollectionSaved ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'}></i>
                </button>
                <button
                  type="button"
                  className="nyt-action-circle-btn"
                  title="Chia sẻ bộ sưu tập"
                  onClick={handleShare}
                >
                  <i className="fa-solid fa-arrow-up-from-bracket"></i>
                </button>
              </div>
            </div>

            {/* Time Horizon Filter Tabs & Quick Category Pills */}
            <div className="nyt-filter-bar">
              <div className="nyt-time-tabs" title="Bộ lọc thời gian">
                <button
                  type="button"
                  className={`nyt-time-tab ${timeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => { setTimeFilter('all'); setCurrentPage(1); }}
                >
                  Mọi thời đại
                </button>
                <button
                  type="button"
                  className={`nyt-time-tab ${timeFilter === 'month' ? 'active' : ''}`}
                  onClick={() => { setTimeFilter('month'); setCurrentPage(1); }}
                >
                  Tháng này
                </button>
                <button
                  type="button"
                  className={`nyt-time-tab ${timeFilter === 'week' ? 'active' : ''}`}
                  onClick={() => { setTimeFilter('week'); setCurrentPage(1); }}
                >
                  Tuần này
                </button>
              </div>

              <div className="nyt-category-pills">
                {['Tất cả', 'Dưới 30 phút', 'Ăn chay', ...categories.slice(0, 4).map(c => c.name)].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`nyt-pill-btn ${activeCategory === cat ? 'active' : ''}`}
                    onClick={() => { setActiveCategory(cat); setCurrentPage(1); }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Hero Featured #1 Recipe Card */}
          <div className="nyt-popular-hero-right">
            {heroRecipe ? (
              <Link to={`/recipes/${heroRecipe.id}`} className="nyt-hero-featured-card">
                <div className="nyt-hero-featured-img-wrap">
                  <img
                    src={heroRecipe.image_url || DEFAULT_RECIPE_IMAGE}
                    alt={heroRecipe.title}
                  />
                  <span className="nyt-featured-badge gold">
                    <i className="fa-solid fa-crown"></i> TOP 1 PHỔ BIẾN
                  </span>
                </div>

                <div className="nyt-hero-featured-body">
                  <h2 className="nyt-hero-featured-title">
                    {heroRecipe.title}
                  </h2>
                  <p className="nyt-hero-featured-caption">
                    {heroRecipe.description
                      ? (heroRecipe.description.length > 120
                        ? `${heroRecipe.description.slice(0, 120)}...`
                        : heroRecipe.description)
                      : 'Công thức này chưa có mô tả.'}
                  </p>

                  <div className="nyt-hero-featured-meta">
                    <span>Bởi {heroRecipe.author_name || 'Ẩn danh'}</span>
                    <span>
                      <i className="fa-regular fa-clock" aria-hidden="true"></i> {formatRecipeTime(heroRecipe)}
                    </span>
                    <span className="nyt-hero-featured-rating">
                      {heroRating.hasRating
                        ? `★ ${heroRating.average.toFixed(1)} (${formatCount(heroRating.count)})`
                        : 'Chưa có đánh giá'}
                    </span>
                  </div>

                  <div className="nyt-hero-featured-stats">
                    <span>
                      <i className="fa-regular fa-eye" aria-hidden="true"></i>{' '}
                      {formatCount(heroRecipe.view_count)} lượt xem
                    </span>
                    <span>
                      <i className="fa-regular fa-heart" aria-hidden="true"></i>{' '}
                      {formatCount(heroRecipe.favorite_count)} lượt lưu
                    </span>
                    <span>
                      <i className="fa-regular fa-comment" aria-hidden="true"></i>{' '}
                      {formatCount(heroRecipe.comment_count)} bình luận
                    </span>
                  </div>
                </div>
              </Link>
            ) : null}
          </div>

        </section>


        {/* ========================================================
            2. MAIN RECIPE GRID
           ======================================================== */}
        <section>
          <div className="nyt-popular-grid-4">
            {paginatedRecipes.map((recipe, index) => {
              // Calculate actual global rank
              const globalRank = (currentPage - 1) * itemsPerPage + index + 1;
              const isSaved = savedRecipeIds.includes(recipe.id);

              // Medal styling for top 3
              let rankBadgeClass = 'nyt-card-rank-badge';
              if (globalRank === 1) rankBadgeClass += ' top-1';
              else if (globalRank === 2) rankBadgeClass += ' top-2';
              else if (globalRank === 3) rankBadgeClass += ' top-3';

              const rating = getRatingInfo(recipe);

              return (
                <div key={recipe.id} className="nyt-popular-card">

                  {/* Image with Rank Badge & Quick Bookmark */}
                  <div className="nyt-popular-card-img-wrap">
                    <Link to={`/recipes/${recipe.id}`} style={{ display: 'block', width: '100%', height: '100%' }}>
                      <img
                        src={recipe.image_url || DEFAULT_RECIPE_IMAGE}
                        alt={recipe.title}
                        loading="lazy"
                      />
                    </Link>

                    {/* Rank Badge */}
                    <span className={rankBadgeClass}>
                      #{globalRank}
                    </span>

                    {/* Bookmark Button */}
                    <button
                      type="button"
                      className={`nyt-card-bookmark-btn ${isSaved ? 'active' : ''}`}
                      title={isSaved ? 'Bỏ lưu công thức' : 'Lưu công thức'}
                      onClick={(e) => toggleSaveRecipe(e, recipe.id)}
                    >
                      <i className={isSaved ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'}></i>
                    </button>
                  </div>

                  {/* Card Info Below Image */}
                  <div className="nyt-card-info">
                    <Link to={`/recipes/${recipe.id}`} style={{ textDecoration: 'none' }}>
                      <h3 className="nyt-card-title">{recipe.title}</h3>
                    </Link>

                    <div className="nyt-card-author">
                      Bởi {recipe.author_name || 'Ẩn danh'}
                    </div>

                    <div className="nyt-card-time">
                      <i className="fa-regular fa-clock" aria-hidden="true"></i>{' '}
                      {formatRecipeTime(recipe)}
                    </div>

                    <div className="nyt-card-rating">
                      {rating.hasRating ? (
                        <>
                          <span className="nyt-card-stars" aria-hidden="true">
                            {[1, 2, 3, 4, 5].map(star => (
                              <i
                                key={star}
                                className={`fa-solid fa-star${star <= Math.round(rating.average) ? ' active' : ''}`}
                              ></i>
                            ))}
                          </span>
                          <span className="nyt-card-rating-count">
                            {rating.average.toFixed(1)} ({formatCount(rating.count)})
                          </span>
                        </>
                      ) : (
                        <span className="nyt-card-rating-count">Chưa có đánh giá</span>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          {/* ========================================================
              3. PAGINATION SECTION
             ======================================================== */}
          <div className="nyt-pagination-section">
            <div className="nyt-pagination-count">
              {gridRecipes.length > 0
                ? `${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, gridRecipes.length)} trong số ${gridRecipes.length} công thức phổ biến`
                : 'Chưa có công thức phù hợp'}
            </div>

            {totalPages > 1 && (
              <div className="nyt-pagination-controls">
                <button
                  type="button"
                  className="nyt-page-btn"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  title="Trang trước"
                >
                  <i className="fa-solid fa-chevron-left"></i>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`nyt-page-btn ${currentPage === p ? 'active' : ''}`}
                    onClick={() => handlePageChange(p)}
                  >
                    {p}
                  </button>
                ))}

                <button
                  type="button"
                  className="nyt-page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  title="Trang tiếp theo"
                >
                  <i className="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            )}
          </div>
        </section>


        {/* ========================================================
            4. SECONDARY COOKING SEARCH BANNER & SUB-LINKS
           ======================================================== */}
        <section className="nyt-search-banner">
          <div className="nyt-search-banner-inner">
            <div className="nyt-search-banner-brand">
              <i className="fa-solid fa-book-open" aria-hidden="true"></i>
              <span>Recipe Sharing</span>
            </div>

            <form onSubmit={handleSearchSubmit} className="nyt-search-banner-form">
              <input
                type="text"
                className="nyt-search-banner-input"
                placeholder="Bạn muốn tìm công thức hoặc nguyên liệu gì hôm nay?"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
              <button type="submit" className="nyt-search-banner-submit">
                Tìm kiếm
              </button>
            </form>

            <div className="nyt-search-banner-links">
              <Link to="/">Tất cả công thức</Link>
              {categories.slice(0, 4).map((cat) => (
                <React.Fragment key={cat.id || cat.name}>
                  <span>•</span>
                  <Link to={`/?category=${encodeURIComponent(cat.name)}`}>{cat.name}</Link>
                </React.Fragment>
              ))}
              <span>•</span>
              <Link to="/new-recipes">Công thức mới</Link>
              <span>•</span>
              <Link to="/articles">Cẩm nang</Link>
            </div>
          </div>
        </section>


        {/* ========================================================
            5. CATEGORY COLLECTIONS (real names, counts and covers)
           ======================================================== */}
        {curatedCollections.length > 0 && (
          <section className="nyt-collections-section">
            <h2 className="nyt-collections-title">
              Khám Phá Theo Danh Mục
            </h2>

            <div className="nyt-collections-grid">
              {curatedCollections.map((col) => (
                <Link key={col.title} to={col.link} className="nyt-collection-card">
                  <div className="nyt-collection-collage">
                    {col.images.map((imgSrc, imgIdx) => (
                      <img key={imgIdx} src={imgSrc} alt={col.title} loading="lazy" />
                    ))}
                  </div>
                  <h3 className="nyt-collection-card-title">{col.title}</h3>
                  <div className="nyt-collection-card-count">
                    {formatCount(col.count)} công thức
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}


        {/* ========================================================
            6. NEWSLETTER SUBSCRIPTION BLOCK
           ======================================================== */}
        <section className="nyt-newsletter-block">
          <div className="nyt-newsletter-left">
            <h3>Đăng ký nhận bản tin ẩm thực</h3>
            <p>
              Gửi địa chỉ email của bạn để nhận thông báo khi có công thức mới được đăng.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="nyt-newsletter-form">
              <input
                type="email"
                className="nyt-newsletter-input"
                placeholder="Nhập địa chỉ email của bạn..."
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
              />
              <button type="submit" className="nyt-newsletter-btn">
                Đăng ký ngay
              </button>
            </form>
          </div>

          <div className="nyt-newsletter-right">
            <span className="nyt-social-label">Theo dõi chúng tôi</span>
            <div className="nyt-social-icons">
              <a href="#" className="nyt-social-icon-btn" onClick={(e) => { e.preventDefault(); toast('Kênh Facebook'); }}>
                <i className="fa-brands fa-facebook-f"></i>
              </a>
              <a href="#" className="nyt-social-icon-btn" onClick={(e) => { e.preventDefault(); toast('Kênh Instagram'); }}>
                <i className="fa-brands fa-instagram"></i>
              </a>
              <a href="#" className="nyt-social-icon-btn" onClick={(e) => { e.preventDefault(); toast('Kênh Pinterest'); }}>
                <i className="fa-brands fa-pinterest-p"></i>
              </a>
              <a href="#" className="nyt-social-icon-btn" onClick={(e) => { e.preventDefault(); toast('Kênh YouTube'); }}>
                <i className="fa-brands fa-youtube"></i>
              </a>
            </div>

            <div className="nyt-app-badges">
              <a href="#" className="nyt-app-badge-btn" onClick={(e) => { e.preventDefault(); toast('Tải ứng dụng trên App Store'); }}>
                <i className="fa-brands fa-apple" style={{ fontSize: '16px' }}></i>
                <span>App Store</span>
              </a>
              <a href="#" className="nyt-app-badge-btn" onClick={(e) => { e.preventDefault(); toast('Tải ứng dụng trên Google Play'); }}>
                <i className="fa-brands fa-google-play" style={{ fontSize: '14px' }}></i>
                <span>Google Play</span>
              </a>
            </div>
          </div>
        </section>

      </div>

      <LoginRequiredModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </MainLayout>
  );
};

export default PopularRecipes;
