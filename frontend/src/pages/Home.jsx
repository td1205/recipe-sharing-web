import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useSearchParams, Link } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import SkeletonLoader from '../components/SkeletonLoader';
import MagazineCard, { DEFAULT_RECIPE_IMAGE, handleImageError } from '../components/MagazineCard';
import RecipeSlider from '../components/RecipeSlider';
import './Home.css';

const HOME_RECIPE_LIMIT = 16;

const getTotalRecipeTime = (recipe) => (
  (Number(recipe?.prep_time) || 0) + (Number(recipe?.cook_time) || 0)
);

const formatRecipeTime = (recipe) => {
  const totalTime = getTotalRecipeTime(recipe);
  return totalTime > 0 ? `${totalTime} phút` : 'Chưa có thời gian nấu';
};

const uniqueRecipes = (recipes = []) => Array.from(
  new Map(recipes.filter(Boolean).map((recipe) => [recipe.id, recipe])).values(),
);

const buildRecipeList = (primaryRecipes, fallbackRecipes, excludedIds = new Set()) => {
  const recipes = uniqueRecipes([...primaryRecipes, ...fallbackRecipes]);
  const unseenRecipes = recipes.filter((recipe) => !excludedIds.has(recipe.id));
  const repeatedRecipes = recipes.filter((recipe) => excludedIds.has(recipe.id));
  return [...unseenRecipes, ...repeatedRecipes].slice(0, HOME_RECIPE_LIMIT);
};

const HeroMedia = ({ recipe }) => {
  const [videoFailed, setVideoFailed] = useState(false);
  const showVideo = Boolean(recipe.video_url) && !videoFailed;

  if (showVideo) {
    return (
      <video
        src={recipe.video_url}
        poster={recipe.image_url || DEFAULT_RECIPE_IMAGE}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className="mag-hero-main-img"
        onError={() => setVideoFailed(true)}
      />
    );
  }

  return (
    <img
      src={recipe.image_url || DEFAULT_RECIPE_IMAGE}
      alt={recipe.title}
      className="mag-hero-main-img"
    />
  );
};

const SidebarListCard = ({ recipe, isFirst }) => (
  <Link to={`/recipes/${recipe.id}`} className={`mag-list-card ${isFirst ? 'mag-list-card-first' : ''}`}>
    <div className="mag-list-content">
      <h4 className="mag-list-title">{recipe.title}</h4>
      <div className="mag-card-meta mag-list-meta">
        <span className="mag-list-reading-time">
          {formatRecipeTime(recipe)}
        </span>
      </div>
    </div>
    <div className="mag-list-img-wrapper">
      <img src={recipe.image_url || DEFAULT_RECIPE_IMAGE} alt={recipe.title} className="mag-list-img" loading="lazy" />
    </div>
  </Link>
);


// Tab "Gợi ý tuần này" -> bộ lọc của API /api/recommendations/popular
const HOME_TAB_FILTERS = {
  'Bữa sáng': 'breakfast',
  'Bữa tối': 'dinner',
  'Ăn chay': 'vegetarian',
  'Dưới 30 phút': 'quick',
};
const Home = () => {
  const [searchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const mealTime = searchParams.get('meal_time') || '';
  const maxCookTime = searchParams.get('max_cook_time') || '';

  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const recentScrollRef = useRef(null);
  const [showRecentArrow, setShowRecentArrow] = useState(true);
  const [showRecentPrevArrow, setShowRecentPrevArrow] = useState(false);
  
  // Discover mode state
  const [isSearchMode, setIsSearchMode] = useState(true);
  const [latestRecipes, setLatestRecipes] = useState([]);
  const [popularRecipes, setPopularRecipes] = useState([]);
  const [todayRecipes, setTodayRecipes] = useState([]);
  const [recommendedRecipes, setRecommendedRecipes] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  
  // Tab state for "What to cook this week"
  const [activeTab, setActiveTab] = useState('Tất cả');
  // Món phổ biến theo từng tab, lấy từ hệ gợi ý (GET /api/recommendations/popular?filter=...)
  const [tabRecipes, setTabRecipes] = useState({});

  useEffect(() => {
    const filter = HOME_TAB_FILTERS[activeTab];
    if (!filter || tabRecipes[activeTab]) return;
    axios
      .get('/api/recommendations/popular', { params: { filter, limit: 16 } })
      .then((res) => setTabRecipes((current) => ({ ...current, [activeTab]: res.data.recipes || [] })))
      .catch(() => setTabRecipes((current) => ({ ...current, [activeTab]: [] })));
  }, [activeTab, tabRecipes]);

  useEffect(() => {
    let recents = [];
    try {
      recents = JSON.parse(localStorage.getItem('recentlyViewedRecipes') || '[]');
      setRecentlyViewed(recents);
    } catch (e) {
      console.error(e);
    }
    if (recents.length === 0) return;

    // Đối chiếu với server: bỏ món đã bị xóa, cập nhật tên/ảnh mới nhất
    axios
      .get('/api/recipe-cards', { params: { ids: recents.map((item) => item.id).join(',') } })
      .then((res) => {
        const fresh = (res.data.recipes || []).map(({ id, title, image_url: imageUrl }) => ({
          id,
          title,
          image_url: imageUrl,
        }));
        setRecentlyViewed(fresh);
        try {
          localStorage.setItem('recentlyViewedRecipes', JSON.stringify(fresh));
        } catch (e) {
          // trình duyệt chặn localStorage -> bỏ qua
        }
      })
      .catch(() => {});
  }, []);

  const updateRecentControls = useCallback(() => {
    if (recentScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = recentScrollRef.current;
      const maxScroll = scrollWidth - clientWidth;
      if (maxScroll <= 0) {
        setShowRecentArrow(false);
        setShowRecentPrevArrow(false);
        return;
      }
      setShowRecentArrow(scrollLeft < maxScroll - 5);
      setShowRecentPrevArrow(scrollLeft > 5);
    }
  }, []);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(updateRecentControls);
    window.addEventListener('resize', updateRecentControls);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', updateRecentControls);
    };
  }, [recentlyViewed, updateRecentControls]);

  const scrollRecent = (direction) => {
    if (recentScrollRef.current) {
      const { clientWidth } = recentScrollRef.current;
      recentScrollRef.current.scrollBy({ left: direction * clientWidth * 0.8, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const fetchHomeData = async () => {
      setLoading(true);
      setError('');
      try {
        const query = new URLSearchParams();
        if (search) query.append('search', search);
        if (category) query.append('category', category);
        if (mealTime) query.append('meal_time', mealTime);
        if (maxCookTime) query.append('max_cook_time', maxCookTime);
        
        const res = await axios.get(`/api/?${query.toString()}`);
        if (!res.data.success) {
          throw new Error('Không thể tải dữ liệu trang chủ.');
        }

        setCategories(res.data.categories || []);
        if (res.data.isSearch) {
          setIsSearchMode(true);
          setRecipes(res.data.recipes || []);
        } else {
          setIsSearchMode(false);
          setLatestRecipes(res.data.latestRecipes || []);
          setPopularRecipes(res.data.popularRecipes || []);
          setTodayRecipes(res.data.todayRecipes || []);
          setRecommendedRecipes(res.data.recommendedRecipes || []);
        }
      } catch (requestError) {
        console.error('Lỗi khi tải trang chủ:', requestError);
        setError('Không thể tải các công thức lúc này. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, [search, category, mealTime, maxCookTime]);

  if (loading) {
    return <MainLayout categories={categories} hideSidebar className="home-typography"><SkeletonLoader /></MainLayout>;
  }

  if (error) {
    return (
      <MainLayout categories={categories} hideSidebar className="home-typography">
        <div className="home-status-state" role="alert">
          <p>{error}</p>
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
            Thử lại
          </button>
        </div>
      </MainLayout>
    );
  }

  if (
    !isSearchMode &&
    latestRecipes.length === 0 &&
    popularRecipes.length === 0 &&
    todayRecipes.length === 0 &&
    recommendedRecipes.length === 0
  ) {
    return (
      <MainLayout categories={categories} hideSidebar className="home-typography">
        <div className="home-status-state">
          <p>Chưa có công thức nào để hiển thị.</p>
        </div>
      </MainLayout>
    );
  }

  const topRecipe = latestRecipes.length > 0 ? latestRecipes[0] : null;
  const sideRecipes = latestRecipes.slice(1, 5);

  // Tab "Tất cả" dùng danh sách phổ biến chung; các tab khác lấy món phổ biến theo bộ lọc
  const filteredPopular = activeTab === 'Tất cả' ? popularRecipes : tabRecipes[activeTab] || [];

  const heroRecipeIds = new Set([topRecipe?.id, ...sideRecipes.map((recipe) => recipe.id)].filter(Boolean));
  const popularFallbackRecipes = activeTab === 'Tất cả' ? latestRecipes.slice(1) : [];
  const popularSliderRecipes = buildRecipeList(filteredPopular, popularFallbackRecipes, heroRecipeIds);
  const popularRecipeIds = new Set([...heroRecipeIds, ...popularSliderRecipes.map((recipe) => recipe.id)]);
  const todaySliderRecipes = buildRecipeList(todayRecipes, [...latestRecipes, ...popularRecipes], popularRecipeIds);
  const todayRecipeIds = new Set([...popularRecipeIds, ...todaySliderRecipes.map((recipe) => recipe.id)]);
  const recommendedSliderRecipes = buildRecipeList(
    recommendedRecipes,
    [...popularRecipes, ...latestRecipes],
    todayRecipeIds,
  );

  let titleText = 'Tất cả công thức';
  if (search) titleText = `Kết quả tìm kiếm: "${search}"`;
  else if (category) titleText = `Danh mục: ${category}`;
  else if (mealTime) titleText = `Bữa ăn: ${mealTime}`;
  else if (maxCookTime) titleText = `Món nhanh dưới ${maxCookTime} phút`;

  return (
    <MainLayout categories={categories} hideSidebar className="home-typography">
      {isSearchMode ? (
        <div className="home-modern-container home-search-container">
          <div className="home-content-wrapper">
            <div className="magazine-section">
              <div className="magazine-section-header">
                <h2 className="magazine-section-title">{titleText}</h2>
              </div>
              <div className="home-search-grid">
                {recipes && recipes.length > 0 ? (
                  recipes.map((recipe) => <MagazineCard key={recipe.id} recipe={recipe} compact />)
                ) : (
                  <p className="home-empty-state">Không tìm thấy công thức nào phù hợp.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="home-modern-container home-discover-container">
          
          {/* 1. Hero Block */}
          {topRecipe && (
            <div className="mag-hero-grid">
              <div className="mag-hero-main">
                <Link to={`/recipes/${topRecipe.id}`} className="mag-hero-main-img-wrapper">
                  <HeroMedia key={topRecipe.id} recipe={topRecipe} />
                </Link>
                <div className="mag-hero-main-category">{topRecipe.category_name || topRecipe.categories?.name || 'MÓN NỔI BẬT HÔM NAY'}</div>
                <Link to={`/recipes/${topRecipe.id}`} className="home-title-link">
                  <h1 className="mag-hero-main-title">{topRecipe.title}</h1>
                </Link>

                <div className="mag-hero-main-author">
                  Bởi{' '}
                  {topRecipe.users?.id ? (
                    <Link to={`/profile/${topRecipe.users.id}`} className="home-author-link">
                      {topRecipe.author_name || topRecipe.users.username}
                    </Link>
                  ) : (
                    <span className="home-author-link">{topRecipe.author_name || 'Đầu bếp ẩn danh'}</span>
                  )}
                </div>

                <p className="mag-hero-main-desc">
                  {topRecipe.description || 'Hương vị tuyệt hảo được chắt lọc từ những nguyên liệu tươi ngon nhất, mang đến cho bạn trải nghiệm ẩm thực đỉnh cao ngay tại nhà.'}
                </p>

                <div className="mag-hero-main-meta">
                  {Number(topRecipe.total_ratings || 0) > 0 ? (
                    <span className="home-rating-summary">
                      <i className="fa-solid fa-star" aria-hidden="true"></i>
                      {Number(topRecipe.avg_rating || 0).toFixed(1)} · {topRecipe.total_ratings} đánh giá
                    </span>
                  ) : (
                    <span>Chưa có đánh giá</span>
                  )}
                  <span>{Number(topRecipe.view_count || 0).toLocaleString('vi-VN')} đã xem</span>
                  <span>{formatRecipeTime(topRecipe)}</span>
                </div>
              </div>
              
              <div className="mag-hero-side">
                {/* RECENTLY VIEWED */}
                {recentlyViewed.length > 0 && (
                  <div className="mag-recently-viewed">
                    <h3 className="mag-side-list-header">XEM GẦN ĐÂY <i className="fa-solid fa-chevron-right"></i></h3>
                    <div className="mag-recently-grid-wrapper">
                      <div className="mag-recently-grid" ref={recentScrollRef} onScroll={updateRecentControls}>
                        {recentlyViewed.slice(0, 10).map(r => (
                          <Link to={`/recipes/${r.id}`} key={`recent-${r.id}`} className="mag-recently-card">
                            <div className="mag-recently-img-wrap">
                              <img
                                src={r.image_url || DEFAULT_RECIPE_IMAGE}
                                alt={r.title}
                                loading="lazy"
                                onError={handleImageError}
                              />
                            </div>
                            <h4>{r.title}</h4>
                          </Link>
                        ))}
                      </div>
                      {showRecentPrevArrow && (
                        <button type="button" className="mag-recently-prev-btn" onClick={(e) => { e.preventDefault(); scrollRecent(-1); }} aria-label="Xem công thức gần đây phía trước">
                          <i className="fa-solid fa-chevron-left"></i>
                        </button>
                      )}
                      {showRecentArrow && (
                        <button type="button" className="mag-recently-next-btn" onClick={(e) => { e.preventDefault(); scrollRecent(1); }} aria-label="Xem thêm công thức gần đây">
                          <i className="fa-solid fa-chevron-right"></i>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <h3 className="mag-side-list-header">CÔNG THỨC MỚI NHẤT <i className="fa-solid fa-chevron-right"></i></h3>
                <div className="mag-side-list">
                  {sideRecipes.map((recipe, index) => (
                    <SidebarListCard key={`side-${recipe.id}`} recipe={recipe} isFirst={index === 0} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. What to cook this week */}
          {popularRecipes.length > 0 && (
            <div className="magazine-section home-featured-section">
              <div className="magazine-section-header home-featured-section-header">
                <h2 className="magazine-section-title">Gợi ý tuần này</h2>
                <Link to="/popular" className="magazine-section-link">Top phổ biến<i className="fa-solid fa-chevron-right"></i></Link>
              </div>
              <div className="mag-tabs">
                {['Tất cả', 'Bữa sáng', 'Bữa tối', 'Ăn chay', 'Dưới 30 phút'].map(tab => (
                  <button 
                    key={tab} 
                    className={`mag-tab ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <RecipeSlider recipes={popularSliderRecipes} label="Gợi ý tuần này" />
            </div>
          )}

          {/* 3. Newspaper Sections */}
          {todayRecipes.length > 0 && (
            <div className="magazine-section">
              <div className="magazine-section-header">
                <h2 className="magazine-section-title">Hôm nay ăn gì?</h2>
                <Link to="/?category=Tất cả" className="magazine-section-link">Xem tất cả <i className="fa-solid fa-chevron-right"></i></Link>
              </div>
              <RecipeSlider recipes={todaySliderRecipes} label="Hôm nay ăn gì" />
            </div>
          )}

          {/* 4. More Sections */}
          {recommendedRecipes.length > 0 && (
            <div className="magazine-section">
              <div className="magazine-section-header">
                <h2 className="magazine-section-title">Dành Riêng Cho Bạn</h2>
                <Link to="/?category=Tất cả" className="magazine-section-link">Xem tất cả <i className="fa-solid fa-chevron-right"></i></Link>
              </div>
              <RecipeSlider recipes={recommendedSliderRecipes} label="Dành riêng cho bạn" />
            </div>
          )}

        </div>
      )}
    </MainLayout>
  );
};

export default Home;
