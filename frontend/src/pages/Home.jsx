import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams, Link } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import SkeletonLoader from '../components/SkeletonLoader';
import SquareRecipeCard from '../components/SquareRecipeCard';

const Home = () => {
  const [searchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const mealTime = searchParams.get('meal_time') || '';

  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Discover mode state
  const [isSearchMode, setIsSearchMode] = useState(true);
  const [latestRecipes, setLatestRecipes] = useState([]);
  const [popularRecipes, setPopularRecipes] = useState([]);
  const [todayRecipes, setTodayRecipes] = useState([]);
  const [recommendedRecipes, setRecommendedRecipes] = useState([]);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const query = new URLSearchParams();
        if (search) query.append('search', search);
        if (category) query.append('category', category);
        if (mealTime) query.append('meal_time', mealTime);
        
        const res = await axios.get(`/api/?${query.toString()}`);
        if (res.data.success) {
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
        }
      } catch (error) {
        console.error('Lỗi khi tải trang chủ:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, [search, category, mealTime]);

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!loading && !isSearchMode && popularRecipes.length > 0) {
      const interval = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % Math.min(popularRecipes.length, 5));
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [loading, isSearchMode, popularRecipes]);

  if (loading) {
    return <MainLayout categories={categories} hideSidebar><SkeletonLoader /></MainLayout>;
  }
  const topRecipe = latestRecipes.length > 0 ? latestRecipes[0] : null;
  const carouselRecipes = popularRecipes.slice(0, 5);
  const activeRecipe = carouselRecipes[currentSlide] || null;
  const eventRecipes = recommendedRecipes.slice(0, 5);
  const basedOnYou = todayRecipes.slice(0, 5);
  const becauseYouCooked = popularRecipes.slice(5, 9);
  const recentCookedName = topRecipe ? topRecipe.title : 'Salad';

  return (
    <MainLayout categories={categories} hideSidebar>
      {isSearchMode ? (
        <div className="search-results-container">
          <h2 style={{ marginBottom: '20px', fontSize: '24px', fontWeight: 'bold' }}>Kết quả tìm kiếm: "{search || 'Tất cả'}"</h2>
          <div className="tasty-recipe-grid">
            {recipes && recipes.length > 0 ? (
              recipes.map((recipe) => <SquareRecipeCard key={recipe.id} recipe={recipe} />)
            ) : (
              <p className="no-recipes">Không tìm thấy công thức nào phù hợp.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="steam-home-container">
          
          {/* 1. Takeover Banner */}
          {topRecipe && (
            <Link 
              to={`/recipes/${topRecipe.id}`} 
              className="steam-takeover-banner" 
              style={{ 
                backgroundImage: `url(${topRecipe.image_url || 'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=1200'})`, 
                textDecoration: 'none' 
              }}
            >
              <div className="steam-takeover-overlay">
                <div className="steam-takeover-content">
                  <h1 className="steam-takeover-title">{topRecipe.title}</h1>
                  <span className="steam-takeover-badge">MỚI NHẤT</span>
                </div>
              </div>
            </Link>
          )}

          <div className="steam-home-content-width">
            {/* 2. Tiêu biểu & nên xem (Carousel) */}
            <div className="steam-home-section">
              <div className="steam-section-title-row">
                <h2 className="steam-section-title">Tiêu biểu & nên xem</h2>
              </div>
              <div className="steam-carousel-wrapper">
                <button 
                  className="steam-carousel-arrow left" 
                  onClick={() => setCurrentSlide(prev => (prev === 0 ? carouselRecipes.length - 1 : prev - 1))}
                >
                  <i className="fa-solid fa-chevron-left"></i>
                </button>
                
                <div className="steam-carousel-viewport" style={{ position: 'relative' }}>
                  {(() => {
                    if (!carouselRecipes || carouselRecipes.length === 0) return null;
                    const prevIdx = currentSlide === 0 ? carouselRecipes.length - 1 : currentSlide - 1;
                    const nextIdx = (currentSlide + 1) % carouselRecipes.length;
                    const prevRecipe = carouselRecipes[prevIdx];
                    const nextRecipe = carouselRecipes[nextIdx];

                    return (
                      <>
                        {prevRecipe && carouselRecipes.length > 1 && (
                          <div className="steam-carousel-adjacent left" onClick={() => setCurrentSlide(prevIdx)}>
                            <img src={prevRecipe.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'} alt={prevRecipe.title} />
                          </div>
                        )}

                        {activeRecipe && (
                          <div className="steam-carousel-slide">
                            <div className="steam-carousel-main-img">
                              <Link to={`/recipes/${activeRecipe.id}`}>
                                <img src={activeRecipe.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'} alt={activeRecipe.title} />
                              </Link>
                            </div>
                            <div className="steam-carousel-info">
                              <h2>{activeRecipe.title}</h2>
                              <div className="steam-carousel-rating">
                                <i className="fa-solid fa-star"></i>
                                <i className="fa-solid fa-star"></i>
                                <i className="fa-solid fa-star"></i>
                                <i className="fa-solid fa-star"></i>
                                <i className="fa-solid fa-star-half-stroke"></i>
                                <span> Rất Tích Cực</span>
                              </div>
                              <div className="steam-carousel-thumbnails">
                                <img src={activeRecipe.image_url || 'https://via.placeholder.com/150'} alt="thumb1" />
                                <img src={activeRecipe.image_url || 'https://via.placeholder.com/150'} alt="thumb2" />
                                <img src={activeRecipe.image_url || 'https://via.placeholder.com/150'} alt="thumb3" />
                                <img src={activeRecipe.image_url || 'https://via.placeholder.com/150'} alt="thumb4" />
                              </div>
                              <div className="steam-carousel-tags">
                                <span className="steam-tag-pill">Bữa tối</span>
                                <span className="steam-tag-pill">Món chính</span>
                                <span className="steam-tag-pill">Nhiều protein</span>
                                <span className="steam-tag-pill">Hấp dẫn</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {nextRecipe && carouselRecipes.length > 1 && (
                          <div className="steam-carousel-adjacent right" onClick={() => setCurrentSlide(nextIdx)}>
                            <img src={nextRecipe.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'} alt={nextRecipe.title} />
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                <button 
                  className="steam-carousel-arrow right"
                  onClick={() => setCurrentSlide(prev => (prev + 1) % carouselRecipes.length)}
                >
                  <i className="fa-solid fa-chevron-right"></i>
                </button>
              </div>
              
              <div className="steam-carousel-dots">
                {carouselRecipes.map((_, idx) => (
                  <span 
                    key={idx} 
                    className={`steam-dot ${idx === currentSlide ? 'active' : ''}`}
                    onClick={() => setCurrentSlide(idx)}
                  ></span>
                ))}
              </div>
            </div>

            {/* 3. Sự kiện & Món ngon nổi bật */}
            <div className="steam-home-section">
              <h2 className="steam-section-title">Sự kiện & Món ngon nổi bật</h2>
              <div className="steam-events-grid">
                <div className="steam-event-main">
                  <div className="steam-event-card large" style={{ backgroundImage: `url(${eventRecipes[0]?.image_url || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1'})` }}>
                    <div className="steam-event-label">CUỘC THI ẨM THỰC</div>
                  </div>
                </div>
                <div className="steam-event-col">
                  <div className="steam-event-card medium" style={{ backgroundImage: `url(${eventRecipes[1]?.image_url || 'https://images.unsplash.com/photo-1490818387583-1b5f22209849'})` }}>
                    <div className="steam-event-label">MÓN NGON MÙA HÈ</div>
                  </div>
                  <div className="steam-event-card medium" style={{ backgroundImage: `url(${eventRecipes[2]?.image_url || 'https://images.unsplash.com/photo-1484723091791-00d759ce4342'})` }}>
                    <div className="steam-event-label">THỰC ĐƠN GIẢM CÂN</div>
                  </div>
                </div>
                <div className="steam-event-col">
                  <div className="steam-event-card medium" style={{ backgroundImage: `url(${eventRecipes[3]?.image_url || 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd'})` }}>
                    <div className="steam-event-label">EAT CLEAN</div>
                  </div>
                  <div className="steam-event-card medium" style={{ backgroundImage: `url(${eventRecipes[4]?.image_url || 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601'})` }}>
                    <div className="steam-event-label">MÓN CHAY DỄ LÀM</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Khuyến nghị dựa trên món bạn nấu */}
            <div className="steam-home-section">
              <h2 className="steam-section-title">Khuyến nghị dựa trên món bạn nấu</h2>
              <div className="steam-rec-row">
                {basedOnYou.slice(0, 5).map(recipe => (
                  <div className="steam-rec-card-small" key={recipe.id}>
                    <Link to={`/recipes/${recipe.id}`}>
                      <img src={recipe.image_url || 'https://via.placeholder.com/300'} alt={recipe.title} />
                      <div className="steam-rec-small-title">{recipe.title}</div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Vì bạn đã nấu abc */}
            <div className="steam-home-section">
              <h2 className="steam-section-title">Vì bạn đã nấu {recentCookedName}</h2>
              <div className="steam-rec-row-4">
                {becauseYouCooked.slice(0, 4).map(recipe => (
                  <div className="steam-rec-card-medium" key={recipe.id}>
                    <Link to={`/recipes/${recipe.id}`}>
                      <img src={recipe.image_url || 'https://via.placeholder.com/400'} alt={recipe.title} />
                      <div className="steam-rec-medium-info">
                        <div className="steam-rec-medium-title">{recipe.title}</div>
                        <div className="steam-rec-medium-tags">
                          <span>Giống {recentCookedName}</span>
                          <span>Thịnh hành</span>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default Home;
