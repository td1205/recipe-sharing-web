import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import SkeletonLoader from '../components/SkeletonLoader';

const NewRecipes = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNewRecipes = async () => {
      try {
        const res = await axios.get('/api/');
        if (res.data.success) {
          // Lấy latestRecipes từ API trang chủ làm danh sách mới ra mắt
          setRecipes(res.data.latestRecipes || []);
        }
      } catch (error) {
        console.error('Lỗi khi tải danh sách công thức mới:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchNewRecipes();
  }, []);

  if (loading) {
    return (
      <MainLayout hideSidebar>
        <SkeletonLoader />
      </MainLayout>
    );
  }

  // Chia dữ liệu cho 2 banner nổi bật và danh sách còn lại
  const featuredRecipes = recipes.slice(0, 2);
  const listRecipes = recipes.slice(0); // Lấy toàn bộ để show list hoặc có thể slice(2) nếu muốn bỏ 2 banner

  return (
    <MainLayout hideSidebar>
      <div className="steam-new-releases-page">
        <div className="steam-container">
          
          {/* Breadcrumbs */}
          <div className="steam-breadcrumbs">
            <Link to="/">Tất cả công thức</Link> &gt; <span>Mới ra mắt</span>
          </div>

          <h2 className="steam-page-title">Công thức mới</h2>

          {/* Featured Grid (Top Banners) */}
          {featuredRecipes.length > 0 && (
            <div className="steam-featured-grid">
              {featuredRecipes.map(recipe => (
                <Link to={`/recipes/${recipe.id}`} key={`feat-${recipe.id}`} className="steam-featured-card">
                  <img src={recipe.image_url || 'https://via.placeholder.com/600'} alt={recipe.title} />
                  <div className="steam-featured-overlay">
                    <span className="steam-featured-tag">Công thức nổi bật tháng này</span>
                    <div className="steam-featured-price">
                      ⭐ {recipe.rating || 'Mới'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="steam-tabs-container">
            <div className="steam-tab active">Công thức mới nổi bật</div>
            <div className="steam-tab">Tất cả công thức mới</div>
          </div>

          {/* List View */}
          <div className="steam-list-view">
            {listRecipes.map(recipe => (
              <Link to={`/recipes/${recipe.id}`} key={`list-${recipe.id}`} className="steam-list-item">
                
                {/* Image */}
                <div className="steam-list-img-container">
                  <img src={recipe.image_url || 'https://via.placeholder.com/300'} alt={recipe.title} />
                </div>
                
                {/* Middle Content */}
                <div className="steam-list-content">
                  <div className="steam-list-title">{recipe.title}</div>
                  
                  <div className="steam-list-icons">
                    <i className="fa-regular fa-clock"></i> {recipe.cooking_time || 30} phút
                    &nbsp;&nbsp;|&nbsp;&nbsp;
                    <i className="fa-solid fa-fire"></i> {recipe.difficulty || 'Trung bình'}
                  </div>
                  
                  <div className="steam-list-tags">
                    <span className="steam-tag">{recipe.category_name || 'Khác'}</span>
                    <span className="steam-tag">Món mới</span>
                  </div>
                </div>

                {/* Right Column (Review/Author) */}
                <div className="steam-list-price">
                  <div className="steam-review-status positive">
                    {recipe.rating && recipe.rating >= 4 ? 'Rất tích cực' : 'Tích cực'}
                  </div>
                  <div className="steam-author-name">Bởi: {recipe.author_name || 'Ẩn danh'}</div>
                </div>
                
              </Link>
            ))}
            
            {listRecipes.length === 0 && (
              <div style={{ padding: '20px', color: '#8f98a0', textAlign: 'center' }}>
                Không có công thức nào mới ra mắt.
              </div>
            )}
          </div>

        </div>
      </div>
    </MainLayout>
  );
};

export default NewRecipes;
