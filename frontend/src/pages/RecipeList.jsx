import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import MainLayout from '../components/MainLayout';
import SkeletonLoader from '../components/SkeletonLoader';
import { DEFAULT_RECIPE_IMAGE } from '../components/MagazineCard';
import LoginRequiredModal from '../components/LoginRequiredModal';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Home.css';
import './recipeList.css';

const ITEMS_PER_PAGE = 16;
const PAGE_KEY = 'savedPopularRecipeIds';
const SECTION_CATEGORIES = new Set(['công thức', 'tất cả', 'tất cả công thức']);

const normalizeText = (value) => String(value || '').trim().toLocaleLowerCase('vi-VN');
const getTotalTime = (recipe) => (Number(recipe.prep_time) || 0) + (Number(recipe.cook_time) || 0);

const RecipeList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawCategory = searchParams.get('category') || '';
  const category = SECTION_CATEGORIES.has(normalizeText(rawCategory)) ? '' : rawCategory;
  const mealTime = searchParams.get('meal_time') || '';
  const duration = searchParams.get('duration') || '';
  const legacyMaxCookTime = searchParams.get('max_cook_time') || '';
  const minRating = searchParams.get('min_rating') || '';
  const keyword = searchParams.get('search') || '';
  const sortBy = searchParams.get('sort') || 'newest';
  const requestedPage = Math.max(1, Number(searchParams.get('page')) || 1);

  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [mealTimes, setMealTimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedIds, setSavedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(PAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { user } = React.useContext(AuthContext);

  useEffect(() => {
    let active = true;

    const fetchRecipes = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get('/api/recipes');
        if (!active) return;

        setRecipes(response.data.recipes || []);
        setCategories(response.data.categories || []);
        setMealTimes(response.data.mealTimes || []);
      } catch (requestError) {
        console.error('Lỗi khi tải tất cả công thức:', requestError);
        if (active) setError('Không tải được danh sách công thức. Vui lòng thử lại.');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchRecipes();
    return () => { active = false; };
  }, []);

  const updateParam = useCallback((name, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(name, value);
    else next.delete(name);

    if (name === 'duration') next.delete('max_cook_time');
    next.delete('page');
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const clearFilters = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    ['category', 'meal_time', 'duration', 'max_cook_time', 'min_rating', 'search', 'page'].forEach(key => next.delete(key));
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const toggleSave = useCallback((event, recipeId) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    setSavedIds(previous => {
      const isSaved = previous.includes(recipeId);
      const next = isSaved
        ? previous.filter(id => id !== recipeId)
        : [...previous, recipeId];

      localStorage.setItem(PAGE_KEY, JSON.stringify(next));
      toast.success(isSaved ? 'Đã bỏ lưu công thức' : 'Đã lưu công thức', {
        style: {
          background: 'var(--color-bg-card)',
          color: 'var(--color-text-main)',
          border: '1px solid var(--color-border)',
        },
      });
      return next;
    });
  }, [user]);

  const categoryOptions = useMemo(() => {
    if (categories.length > 0) return categories;
    return Array.from(new Set(recipes.map(recipe => recipe.category_name).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'vi'))
      .map(name => ({ name }));
  }, [categories, recipes]);

  const mealTimeOptions = useMemo(() => {
    if (mealTimes.length > 0) return mealTimes;
    return Array.from(new Set(recipes.map(recipe => recipe.meal_time_name).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'vi'))
      .map(name => ({ name }));
  }, [mealTimes, recipes]);

  const selectedCategoryName = useMemo(() => {
    if (!category) return '';
    return categoryOptions.find(option =>
      String(option.id) === category || normalizeText(option.name) === normalizeText(category)
    )?.name || category;
  }, [category, categoryOptions]);

  const selectedMealTimeName = useMemo(() => {
    if (!mealTime) return '';
    return mealTimeOptions.find(option =>
      String(option.id) === mealTime || normalizeText(option.name) === normalizeText(mealTime)
    )?.name || mealTime;
  }, [mealTime, mealTimeOptions]);

  const filteredRecipes = useMemo(() => {
    const normalizedKeyword = normalizeText(keyword);
    const minimumRating = Number(minRating) || 0;
    const legacyMaximum = Number(legacyMaxCookTime) || 0;

    const result = recipes.filter(recipe => {
      if (category) {
        const matchesCategory = String(recipe.category_id) === category
          || normalizeText(recipe.category_name) === normalizeText(selectedCategoryName);
        if (!matchesCategory) return false;
      }

      if (mealTime) {
        const matchesMealTime = String(recipe.meal_time_id) === mealTime
          || normalizeText(recipe.meal_time_name) === normalizeText(selectedMealTimeName);
        if (!matchesMealTime) return false;
      }

      const totalTime = getTotalTime(recipe);
      if ((duration || legacyMaximum) && totalTime <= 0) return false;
      if (duration === 'under_30' && totalTime > 30) return false;
      if (duration === '30_60' && (totalTime <= 30 || totalTime > 60)) return false;
      if (duration === 'over_60' && totalTime <= 60) return false;
      if (!duration && legacyMaximum && totalTime > legacyMaximum) return false;
      if (minimumRating && Number(recipe.avg_rating || 0) < minimumRating) return false;

      if (normalizedKeyword) {
        const searchable = normalizeText(`${recipe.title || ''} ${recipe.description || ''}`);
        if (!searchable.includes(normalizedKeyword)) return false;
      }

      return true;
    });

    return result.sort((first, second) => {
      if (sortBy === 'popular') {
        return Number(second.view_count || 0) - Number(first.view_count || 0);
      }
      if (sortBy === 'rating_desc') {
        return Number(second.avg_rating || 0) - Number(first.avg_rating || 0)
          || Number(second.total_ratings || 0) - Number(first.total_ratings || 0);
      }
      if (sortBy === 'time_asc') {
        const firstTime = getTotalTime(first) || Number.POSITIVE_INFINITY;
        const secondTime = getTotalTime(second) || Number.POSITIVE_INFINITY;
        return firstTime - secondTime;
      }
      if (sortBy === 'title_asc') {
        return String(first.title || '').localeCompare(String(second.title || ''), 'vi');
      }
      return new Date(second.created_at || 0) - new Date(first.created_at || 0);
    });
  }, [category, duration, keyword, legacyMaxCookTime, mealTime, minRating, recipes, selectedCategoryName, selectedMealTimeName, sortBy]);

  const activeFilters = useMemo(() => {
    const filters = [];
    if (category) filters.push({ key: 'category', label: selectedCategoryName });
    if (mealTime) filters.push({ key: 'meal_time', label: `Bữa ${selectedMealTimeName.toLowerCase()}` });
    if (duration === 'under_30') filters.push({ key: 'duration', label: 'Dưới 30 phút' });
    if (duration === '30_60') filters.push({ key: 'duration', label: '30–60 phút' });
    if (duration === 'over_60') filters.push({ key: 'duration', label: 'Trên 60 phút' });
    if (!duration && legacyMaxCookTime) filters.push({ key: 'max_cook_time', label: `Dưới ${legacyMaxCookTime} phút` });
    if (minRating) filters.push({ key: 'min_rating', label: `Từ ${minRating} sao` });
    if (keyword) filters.push({ key: 'search', label: `“${keyword}”` });
    return filters;
  }, [category, duration, keyword, legacyMaxCookTime, mealTime, minRating, selectedCategoryName, selectedMealTimeName]);

  const totalPages = Math.max(1, Math.ceil(filteredRecipes.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(requestedPage, totalPages);
  const paginatedRecipes = filteredRecipes.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE,
  );

  const handlePageChange = (page) => {
    const next = new URLSearchParams(searchParams);
    if (page > 1) next.set('page', String(page));
    else next.delete('page');
    setSearchParams(next);
    document.querySelector('.nyt-list-tools')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const formatRating = (recipe) => {
    const average = Number(recipe.avg_rating) || 0;
    const count = Number(recipe.total_ratings) || 0;
    return count > 0 ? `${average.toFixed(1)} (${count})` : 'Chưa đánh giá';
  };

  if (loading) {
    return <MainLayout hideSidebar className="home-typography"><SkeletonLoader /></MainLayout>;
  }

  return (
    <MainLayout hideSidebar className="home-typography">
      <div className="nyt-popular-page nyt-list-page">
        <header className="nyt-list-header">
          <p className="nyt-list-eyebrow">
            <span className="nyt-list-eyebrow-dot" aria-hidden="true"></span>
            Thư viện công thức
          </p>
          <h1 className="nyt-list-title">
            {keyword ? `Kết quả cho “${keyword}”` : selectedCategoryName || 'Tất cả công thức'}
          </h1>
          <p className="nyt-list-result-count" aria-live="polite">
            {filteredRecipes.length.toLocaleString('vi-VN')} món ăn
          </p>
        </header>

        <section className="nyt-list-tools" aria-label="Lọc và sắp xếp công thức">
          <button
            type="button"
            className="nyt-mobile-filter-trigger"
            onClick={() => setIsFilterPanelOpen(true)}
            aria-expanded={isFilterPanelOpen}
          >
            <i className="fa-solid fa-sliders" aria-hidden="true"></i>
            Bộ lọc{activeFilters.length > 0 ? ` (${activeFilters.length})` : ''}
          </button>

          {isFilterPanelOpen && (
            <button
              type="button"
              className="nyt-filter-overlay"
              aria-label="Đóng bộ lọc"
              onClick={() => setIsFilterPanelOpen(false)}
            ></button>
          )}

          <div className={`nyt-filter-panel ${isFilterPanelOpen ? 'is-open' : ''}`}>
            <div className="nyt-filter-panel-heading">
              <strong>Bộ lọc</strong>
              <button type="button" onClick={() => setIsFilterPanelOpen(false)} aria-label="Đóng bộ lọc">
                <i className="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            </div>

            <label className="nyt-filter-field">
              <span>Danh mục</span>
              <select value={selectedCategoryName} onChange={event => updateParam('category', event.target.value)}>
                <option value="">Tất cả danh mục</option>
                {categoryOptions.map(option => (
                  <option key={option.id || option.name} value={option.name}>{option.name}</option>
                ))}
              </select>
            </label>

            <label className="nyt-filter-field">
              <span>Bữa ăn</span>
              <select value={selectedMealTimeName} onChange={event => updateParam('meal_time', event.target.value)}>
                <option value="">Tất cả bữa ăn</option>
                {mealTimeOptions.map(option => (
                  <option key={option.id || option.name} value={option.name}>{option.name}</option>
                ))}
              </select>
            </label>

            <label className="nyt-filter-field">
              <span>Thời gian</span>
              <select value={duration} onChange={event => updateParam('duration', event.target.value)}>
                <option value="">Mọi thời lượng</option>
                <option value="under_30">Dưới 30 phút</option>
                <option value="30_60">30–60 phút</option>
                <option value="over_60">Trên 60 phút</option>
              </select>
            </label>

            <label className="nyt-filter-field">
              <span>Đánh giá</span>
              <select value={minRating} onChange={event => updateParam('min_rating', event.target.value)}>
                <option value="">Tất cả đánh giá</option>
                <option value="4">Từ 4 sao</option>
                <option value="3">Từ 3 sao</option>
              </select>
            </label>

            <button type="button" className="nyt-filter-apply" onClick={() => setIsFilterPanelOpen(false)}>
              Xem {filteredRecipes.length.toLocaleString('vi-VN')} món
            </button>
          </div>

          <label className="nyt-sort-field">
            <span>Sắp xếp</span>
            <select value={sortBy} onChange={event => updateParam('sort', event.target.value)}>
              <option value="newest">Mới nhất</option>
              <option value="popular">Phổ biến nhất</option>
              <option value="rating_desc">Đánh giá cao nhất</option>
              <option value="time_asc">Nấu nhanh nhất</option>
              <option value="title_asc">Tên món A–Z</option>
            </select>
          </label>
        </section>

        {activeFilters.length > 0 && (
          <div className="nyt-active-filters" aria-label="Bộ lọc đang áp dụng">
            <span className="nyt-active-filters-label">Đang lọc:</span>
            {activeFilters.map(filter => (
              <button key={filter.key} type="button" onClick={() => updateParam(filter.key, '')}>
                {filter.label}
                <i className="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            ))}
            <button type="button" className="nyt-clear-filters" onClick={clearFilters}>Xóa tất cả</button>
          </div>
        )}

        {error ? (
          <div className="auth-shell">
            <div className="auth-alert auth-alert-error" role="alert">{error}</div>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="nyt-list-empty">
            <i className="fa-solid fa-utensils" aria-hidden="true"></i>
            <h2>Không tìm thấy món ăn phù hợp</h2>
            <p>Hãy thay đổi hoặc xóa bớt bộ lọc để xem thêm công thức.</p>
            <button type="button" className="nyt-list-empty-link" onClick={clearFilters}>Xóa bộ lọc</button>
          </div>
        ) : (
          <>
            <div className="nyt-popular-grid-4">
              {paginatedRecipes.map(recipe => {
                const isSaved = savedIds.includes(recipe.id);

                return (
                  <article key={recipe.id} className="nyt-popular-card">
                    <div className="nyt-popular-card-img-wrap">
                      <Link to={`/recipes/${recipe.id}`} className="nyt-card-image-link">
                        <img src={recipe.image_url || DEFAULT_RECIPE_IMAGE} alt={recipe.title} loading="lazy" />
                      </Link>

                      <button
                        type="button"
                        className={`nyt-card-bookmark-btn ${isSaved ? 'active' : ''}`}
                        title={isSaved ? 'Bỏ lưu công thức' : 'Lưu công thức'}
                        aria-label={isSaved ? 'Bỏ lưu công thức' : 'Lưu công thức'}
                        onClick={event => toggleSave(event, recipe.id)}
                      >
                        <i className={isSaved ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'} aria-hidden="true"></i>
                      </button>
                    </div>

                    <div className="nyt-card-info">
                      <Link to={`/recipes/${recipe.id}`} className="nyt-card-title-link">
                        <h2 className="nyt-card-title">{recipe.title}</h2>
                      </Link>
                      <div className="nyt-card-author">Bởi {recipe.author_name || 'Ẩn danh'}</div>
                      <div className="nyt-card-time">
                        <i className="fa-regular fa-clock" aria-hidden="true"></i>
                        {getTotalTime(recipe) > 0 ? `${getTotalTime(recipe)} phút` : 'Chưa có thời gian'}
                      </div>
                      <div className="nyt-card-rating">
                        <i className="fa-solid fa-star active" aria-hidden="true"></i>
                        <span>{formatRating(recipe)}</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {totalPages > 1 && (
              <nav className="nyt-pagination-section" aria-label="Phân trang">
                <div className="nyt-pagination-count">
                  {(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredRecipes.length)} trong số {filteredRecipes.length} món
                </div>
                <div className="nyt-pagination-controls">
                  <button
                    type="button"
                    className="nyt-page-btn"
                    disabled={safeCurrentPage === 1}
                    onClick={() => handlePageChange(safeCurrentPage - 1)}
                    aria-label="Trang trước"
                  >
                    <i className="fa-solid fa-chevron-left" aria-hidden="true"></i>
                  </button>

                  {Array.from({ length: totalPages }, (_, index) => index + 1).map(page => (
                    <button
                      key={page}
                      type="button"
                      className={`nyt-page-btn ${safeCurrentPage === page ? 'active' : ''}`}
                      onClick={() => handlePageChange(page)}
                      aria-current={safeCurrentPage === page ? 'page' : undefined}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    type="button"
                    className="nyt-page-btn"
                    disabled={safeCurrentPage === totalPages}
                    onClick={() => handlePageChange(safeCurrentPage + 1)}
                    aria-label="Trang sau"
                  >
                    <i className="fa-solid fa-chevron-right" aria-hidden="true"></i>
                  </button>
                </div>
              </nav>
            )}
          </>
        )}

        <LoginRequiredModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      </div>
    </MainLayout>
  );
};

export default RecipeList;
