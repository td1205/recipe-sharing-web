import toast from 'react-hot-toast';
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import SkeletonLoader from '../components/SkeletonLoader';
import { AuthContext } from '../context/AuthContext';

const RecipeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [isFav, setIsFav] = useState(false);
  const [recipe, setRecipe] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [steps, setSteps] = useState([]);
  const [comments, setComments] = useState([]);
  const [rating, setRating] = useState({});
  const [relatedRecipes, setRelatedRecipes] = useState([]);
  const [tags, setTags] = useState([]);
  const [media, setMedia] = useState([]);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [similarPage, setSimilarPage] = useState(0);

  const fetchDetail = async () => {
    try {
      const res = await axios.get(`/api/recipes/${id}`);
      if (res.data.success) {
        setRecipe(res.data.recipe);
        setIngredients(res.data.ingredients || []);
        setSteps(res.data.steps || []);
        setComments(res.data.comments || []);
        setRating(res.data.rating || {});
        setRelatedRecipes(res.data.relatedRecipes || []);
        setTags(res.data.tags || []);
        setMedia(res.data.media && res.data.media.length > 0 ? res.data.media : [{ media_url: res.data.recipe.image_url, media_type: 'image' }]);
        setIsFav(res.data.isFav || false);
      }
    } catch (err) {
      setError('Không thể tải công thức hoặc công thức không tồn tại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleRequireLogin = (actionFn) => {
    if (!user) {
      toast((t) => (
        <div style={{ textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#c6d4df', fontWeight: 'normal' }}>
            Đăng nhập để thực hiện thao tác này
          </h4>
          <button 
            onClick={() => { toast.dismiss(t.id); navigate('/login'); }}
            style={{ background: 'linear-gradient(to right, #47bfff 5%, #1a44c2 60%)', color: '#fff', border: 'none', padding: '5px 20px', borderRadius: '2px', cursor: 'pointer', fontSize: '13px' }}
          >
            Đăng nhập
          </button>
        </div>
      ), {
        style: { background: '#1b2838', border: '1px solid #101822', boxShadow: '0 0 10px rgba(0,0,0,0.8)' },
        duration: 4000
      });
      return;
    }
    if (actionFn) actionFn();
  };

  const handleToggleFavorite = async () => {
    try {
      const res = await axios.post(`/api/recipes/${id}/favorite`);
      if (res.data.success) {
        setIsFav(res.data.isFav);
        toast.success(res.data.isFav ? 'Đã thêm vào yêu thích' : 'Đã bỏ yêu thích', {
          style: { background: '#1b2838', color: '#c6d4df', border: '1px solid #2a323f' }
        });
      }
    } catch (e) {
      toast.error('Lỗi khi cập nhật yêu thích');
    }
  };

  const handleAddTag = () => toast.success('Tính năng thêm tag đang phát triển', { style: { background: '#1b2838', color: '#c6d4df' }});
  const handleReport = () => toast.success('Đã gửi báo cáo cho Admin', { style: { background: '#1b2838', color: '#c6d4df' }});
  
  if (loading) return (
    <MainLayout hideSidebar>
      <SkeletonLoader />
    </MainLayout>
  );
  if (error) return <MainLayout hideSidebar><div className="error-msg" style={{ minHeight: '80vh', padding: '20px', textAlign: 'center', color: '#fff' }}>{error}</div></MainLayout>;
  if (!recipe) return <MainLayout hideSidebar><div className="error-msg" style={{ minHeight: '80vh', padding: '20px', textAlign: 'center', color: '#fff' }}>Không tìm thấy công thức</div></MainLayout>;

  return (
    <MainLayout hideSidebar>
      <div className="steam-page-bg-wrapper">
        <div className="steam-page-bg-image" style={{ backgroundImage: `url(${recipe.image_url || 'https://via.placeholder.com/600'})` }}></div>
        <div className="steam-app-page">
          
          {/* Breadcrumbs & Title */}
          <div className="steam-app-header">
            <div className="steam-app-breadcrumbs">
              <Link to="/">Tất cả công thức</Link> &gt; <Link to={`/?category=${recipe.category_name}`}>{recipe.category_name}</Link> &gt; {recipe.title}
            </div>
          <div className="steam-app-title-area">
            <h2 className="steam-app-title">{recipe.title}</h2>
            <a href="#" className="steam-btn-hub" onClick={(e) => { e.preventDefault(); toast.success('Tính năng đang phát triển', { style: { background: '#1b2838', color: '#c6d4df', border: '1px solid #101822' }}); }}>Trung tâm cộng đồng</a>
          </div>
        </div>

        {/* Hero Section */}
        <div className="steam-app-hero">
          <div className="steam-hero-left">
            <div className="steam-main-viewer">
              {media[activeMediaIndex]?.media_type === 'video' ? (
                 <video src={media[activeMediaIndex]?.media_url} controls className="steam-hero-main-img" autoPlay />
              ) : (
                 <img src={media[activeMediaIndex]?.media_url || 'https://via.placeholder.com/808x455'} alt={recipe.title} className="steam-hero-main-img" />
              )}
            </div>
            {/* Thumbnails Row */}
            <div className="steam-hero-thumbnails">
              <div className="steam-thumb-track">
                {media.map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`steam-thumb-item ${idx === activeMediaIndex ? 'active' : ''}`}
                    onClick={() => setActiveMediaIndex(idx)}
                  >
                    {item.media_type === 'video' ? (
                      <video src={item.media_url} className="steam-hero-main-img" />
                    ) : (
                      <img src={item.media_url || 'https://via.placeholder.com/116x65'} />
                    )}
                  </div>
                ))}
              </div>
              <div className="steam-slider-controls">
                <div className="steam-slider-arrow left"><i className="fa-solid fa-chevron-left"></i></div>
                <div className="steam-slider-scrollbar">
                  <div className="steam-slider-thumb"></div>
                </div>
                <div className="steam-slider-arrow right"><i className="fa-solid fa-chevron-right"></i></div>
              </div>
            </div>
          </div>
          <div className="steam-hero-right">
            <img src={recipe.image_url || 'https://via.placeholder.com/600'} alt={recipe.title} className="steam-hero-small-img" />
            <p className="steam-hero-desc">{recipe.description}</p>
            
            <div className="steam-hero-reviews">
              <div className="review-row">
                <span className="review-label">Trung bình đánh giá:</span>
                <span className="review-value">
                  <span className={rating.averageRating >= 4 ? 'positive' : 'mixed'}>
                    {rating.averageRating ? (rating.averageRating >= 4 ? 'Rất tích cực' : 'Trái chiều') : 'Chưa có'}
                  </span>
                  <span className="review-count">({rating.totalRatings || 0} bài đánh giá)</span>
                </span>
              </div>
              <div className="review-row">
                <span className="review-label">Ngày tạo:</span>
                <span className="review-value-date">{new Date(recipe.created_at).toLocaleDateString('vi-VN')}</span>
              </div>
              <div className="review-row">
                <span className="review-label">Tác giả:</span>
                <span className="review-value-author">
                  <Link to={`/?author=${recipe.author_name}`}>{recipe.author_name || 'Ẩn danh'}</Link>
                </span>
              </div>
            </div>

            <div className="steam-hero-tags">
              {tags.map((tag, idx) => (
                <span key={idx} className="steam-tag">{tag.name}</span>
              ))}
              <span className="steam-tag-plus">+</span>
            </div>
          </div>
        </div>

        {/* Steam Action Bar */}
        <div className="steam-action-bar" style={{ display: 'flex', gap: '5px', marginBottom: '30px', flexWrap: 'wrap' }}>
          <button className="steam-action-btn" onClick={() => handleRequireLogin(handleToggleFavorite)}>
             <i className="fa-solid fa-heart" style={{ color: isFav ? '#d9534f' : '#67c1f5' }}></i> {isFav ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
          </button>
          <button className="steam-action-btn" onClick={() => handleRequireLogin(handleAddTag)}>
             <i className="fa-solid fa-tags"></i> Gắn thêm Tag
          </button>
          <button className="steam-action-btn" onClick={() => handleRequireLogin(() => toast.success('Tính năng đang phát triển', { style: { background: '#1b2838', color: '#c6d4df', border: '1px solid #101822' }}))}>
             <i className="fa-solid fa-share-nodes"></i> Chia sẻ
          </button>
          <button className="steam-action-btn" onClick={() => handleRequireLogin(handleReport)}>
             <i className="fa-solid fa-flag"></i> Báo cáo món ăn
          </button>
        </div>

        {/* Main Content Area */}
        <div className="steam-app-content">
          <div className="steam-col-left">
            
            {/* Ingredients replacing Buy boxes */}
            <div className="steam-buy-wrapper">
               <h2>Nguyên liệu cần thiết</h2>
               {ingredients.length > 0 ? ingredients.map((ing, idx) => (
                 <div className="steam-buy-box" key={idx}>
                   <h1>{ing.name}</h1>
                   <div className="steam-buy-action">
                     <div className="steam-price">{ing.amount} {ing.unit}</div>
                     <div className="steam-add-cart">Chuẩn bị</div>
                   </div>
                 </div>
               )) : <div className="steam-buy-box"><h1>Không có nguyên liệu</h1></div>}
            </div>
            
            {/* Recipe Instructions */}
            <div className="steam-about-game">
              <h2>CÔNG THỨC</h2>
              <div className="steam-about-content">
                {steps.length > 0 ? steps.map((step, idx) => (
                   <p key={idx}><strong className="steam-step-label">Bước {step.step_number}:</strong> <span className="steam-step-detail">{step.instruction}</span></p>
                )) : <p>Chưa có hướng dẫn</p>}
              </div>
            </div>
            
          </div>
          
          <div className="steam-col-right">
            <div className="steam-sidebar-features">
              <div className="feature-row">
                <div className="feature-icon"><i className="fa-regular fa-clock"></i></div>
                <div className="feature-text">Thời gian chuẩn bị: <span className="feature-value">{recipe.prep_time || 0} phút</span></div>
              </div>
              <div className="feature-row">
                <div className="feature-icon"><i className="fa-solid fa-fire-burner"></i></div>
                <div className="feature-text">Thời gian chế biến: <span className="feature-value">{recipe.cook_time || 0} phút</span></div>
              </div>
              <div className="feature-row">
                <div className="feature-icon"><i className="fa-solid fa-utensils"></i></div>
                <div className="feature-text">Khẩu phần ăn: <span className="feature-value">{recipe.servings || 1} người</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Similar Recipes */}
        {(() => {
          let displayRecipes = [...relatedRecipes];
          if (displayRecipes.length > 0 && displayRecipes.length < 12) {
            while(displayRecipes.length < 12) {
              displayRecipes = [...displayRecipes, ...relatedRecipes];
            }
          }
          displayRecipes = displayRecipes.slice(0, 12);
          const totalPages = Math.ceil(displayRecipes.length / 4);

          return (
            <div className="steam-similar-wrapper" style={{ position: 'relative', margin: '30px 0' }}>
              <button 
                className="steam-similar-arrow left" 
                onClick={() => setSimilarPage(p => totalPages > 0 ? (p - 1 + totalPages) % totalPages : 0)}
                disabled={totalPages <= 1}
                style={{ position: 'absolute', left: '-45px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
              >
                &#10094;
              </button>

              <div className="steam-similar-container" style={{ margin: 0, width: '100%', overflow: 'hidden' }}>
                <div className="steam-similar-header">
                  <h2>SẢN PHẨM TƯƠNG TỰ</h2>
                  <button className="steam-similar-btn-all">Xem tất cả</button>
                </div>
                <div className="steam-similar-body">
                  <div className="steam-similar-view">
                    <div className="steam-similar-track" style={{ transform: `translateX(-${similarPage * 100}%)` }}>
                      {displayRecipes.map((r, idx) => (
                        <Link to={`/recipes/${r.id}`} className="steam-similar-card" key={`${r.id}-${idx}`}>
                          <img src={r.image_url || 'https://via.placeholder.com/300'} alt={r.title} />
                          <div className="steam-similar-info">
                            <div className="steam-similar-name">{r.title}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="steam-similar-scrollbar">
                  <div className="steam-similar-scrollbar-track">
                    <div 
                      className="steam-similar-scrollbar-thumb" 
                      style={{ 
                        width: `${totalPages > 0 ? 100 / totalPages : 100}%`,
                        transform: `translateX(${similarPage * 100}%)`
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <button 
                className="steam-similar-arrow right" 
                onClick={() => setSimilarPage(p => totalPages > 0 ? (p + 1) % totalPages : 0)}
                disabled={totalPages <= 1}
                style={{ position: 'absolute', right: '-45px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
              >
                &#10095;
              </button>
            </div>
          );
        })()}

        {/* Reviews Section */}
        <div className="steam-reviews-section">
          <h2>ĐÁNH GIÁ CỦA KHÁCH HÀNG CHO {recipe.title.toUpperCase()}</h2>
          
          <div className="steam-review-summary-box">
            <div className="review-summary-left">
              <div className="summary-title">Đánh giá chung</div>
              <div className="summary-rating positive">Rất tích cực</div>
              <div className="summary-count">({comments.length} đánh giá)</div>
            </div>
            <div className="review-summary-right">
              <div className="summary-row">
                <span>Đánh giá gần đây:</span>
                <span className="positive">Rất tích cực</span>
              </div>
              <div className="summary-row">
                <span>Tổng lượt đánh giá:</span>
                <span className="positive">Rất tích cực</span>
              </div>
            </div>
          </div>
          
          <div className="steam-review-filters">
             <div className="filter-cols">
               <div className="filter-col">
                 <div className="filter-title">Loại bài đánh giá</div>
                 <label><input type="radio" checked readOnly/> Tất cả ({comments.length})</label>
                 <label><input type="radio" disabled/> Tích cực (0)</label>
                 <label><input type="radio" disabled/> Tiêu cực (0)</label>
               </div>
               <div className="filter-col">
                 <div className="filter-title">Khoảng ngày</div>
                 <select><option>Trọn đời</option></select>
               </div>
               <div className="filter-col">
                 <div className="filter-title">Hiển thị</div>
                 <select><option>Tóm tắt</option></select>
               </div>
             </div>
          </div>
          
           <div className="steam-write-review" style={{ margin: '20px 0', padding: '15px', background: 'rgba(0,0,0,0.3)', border: '1px solid #2a323f', borderRadius: '2px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#c6d4df' }}>Viết đánh giá của bạn</h3>
              <textarea 
                placeholder="Bạn nghĩ gì về công thức này?" 
                onClick={() => handleRequireLogin()}
                style={{ width: '100%', height: '80px', background: '#101822', color: '#c6d4df', border: '1px solid #1b2838', padding: '10px', resize: 'none' }}
              ></textarea>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <span style={{ fontSize: '12px', color: '#8f98a0' }}>Bạn có khuyên mọi người nấu món này không?</span>
                <div>
                   <button onClick={() => handleRequireLogin()} style={{ background: '#233c51', color: '#67c1f5', border: 'none', padding: '5px 15px', cursor: 'pointer', marginRight: '5px' }}><i className="fa-solid fa-thumbs-up"></i> Có</button>
                   <button onClick={() => handleRequireLogin()} style={{ background: '#233c51', color: '#67c1f5', border: 'none', padding: '5px 15px', cursor: 'pointer' }}><i className="fa-solid fa-thumbs-down"></i> Không</button>
                </div>
              </div>
           </div>

          <div className="steam-review-active-filter">
            Đang hiện {comments.length} đánh giá khớp với bộ lọc bên trên ( Rất tích cực )
          </div>
          
          <h3 className="steam-helpful-title">Đánh giá hữu ích nhất</h3>
          
          <div className="steam-review-list">
            {comments.map((c, idx) => (
              <div className="steam-review-item" key={idx}>
                <div className="review-left">
                  <div className="review-avatar">{c.username.charAt(0).toUpperCase()}</div>
                  <div className="review-author">
                    <div className="author-name">{c.username}</div>
                    <div className="author-products">12 sản phẩm trong tài khoản</div>
                  </div>
                </div>
                <div className="review-right">
                  <div className="review-header">
                    <div className="review-thumb">
                       <i className="fa-solid fa-thumbs-up"></i> Khuyên dùng
                    </div>
                    <div className="review-hours">2.5 giờ trên thực tế</div>
                  </div>
                  <div className="review-date">Đăng ngày {new Date(c.created_at).toLocaleDateString('vi-VN')}</div>
                  <div className="review-content">{c.content}</div>
                  <div className="review-helpful">
                     Bao nhiêu người thấy đánh giá này hữu ích?
                     <div className="helpful-btns">
                       <button>Có</button>
                       <button>Không</button>
                       <button>Hài hước</button>
                       <button>Trao giải thưởng</button>
                     </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="steam-review-browse-all">
            <button>Duyệt tất cả {comments.length} đánh giá</button>
          </div>
        </div>
        
      </div>
      </div>
    </MainLayout>
  );
};

export default RecipeDetail;
