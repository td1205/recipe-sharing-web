import toast from 'react-hot-toast';
import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import SkeletonLoader from '../components/SkeletonLoader';
import RecipeSlider from '../components/RecipeSlider';
import LoginRequiredModal from '../components/LoginRequiredModal';
import { AuthContext } from '../context/AuthContext';
import './Home.css';

// How many suggestions to show in the slider.
const SUGGESTION_LIMIT = 16;

const getThumbnailUrl = (url, type) => {
  if (type !== 'video' || !url) return url;
  return url.replace(/\.[^/.]+$/, ".jpg");
};

const RecipeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [isFav, setIsFav] = useState(false);
  const [recipe, setRecipe] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [steps, setSteps] = useState([]);
  const [tags, setTags] = useState([]);
  const [media, setMedia] = useState([]);
  const [comments, setComments] = useState([]);
  const [rating, setRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [relatedRecipes, setRelatedRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [currentServings, setCurrentServings] = useState(1);
  const [checkedIngs, setCheckedIngs] = useState({});

  // States cho comment và rating
  const [commentLimit, setCommentLimit] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [hoverStar, setHoverStar] = useState(0);
  const [selectedStar, setSelectedStar] = useState(0);

  const fetchDetail = async () => {
    try {
      let recentIds = [];
      try {
        const recents = JSON.parse(localStorage.getItem('recentlyViewedRecipes') || '[]');
        recentIds = recents.map((item) => item.id).filter(Boolean).slice(0, 20);
      } catch (storageError) {
        console.error('Lỗi đọc lịch sử xem:', storageError);
      }
      const res = await axios.get(`/api/recipes/${id}`, {
        params: recentIds.length > 0 ? { recent: recentIds.join(',') } : undefined,
      });
      if (res.data.success) {
        setRecipe(res.data.recipe);
        setIngredients(res.data.ingredients || []);
        setSteps(res.data.steps || []);
        setTags(res.data.tags || []);
        const fetchedMedia = res.data.media && res.data.media.length > 0 ? res.data.media : [{ media_url: res.data.recipe.image_url, media_type: 'image' }];
        setMedia(fetchedMedia);
        setComments(res.data.comments || []);
        
        const rObj = res.data.rating || {};
        setRating(rObj.averageRating || 0);
        setRatingCount(rObj.totalRatings || res.data.recipe.total_ratings || 0);
        setViewCount(res.data.recipe.view_count || 0);
        
        if (res.data.userRating) {
          setSelectedStar(res.data.userRating.star_count);
        } else {
          setSelectedStar(0);
        }

        setRelatedRecipes(res.data.relatedRecipes || []);
        setIsFav(res.data.isFav || false);
        setCurrentServings(res.data.recipe.servings || 1);

        // Save to recently viewed
        try {
          const recents = JSON.parse(localStorage.getItem('recentlyViewedRecipes') || '[]');
          const newRecent = {
            id: res.data.recipe.id,
            title: res.data.recipe.title,
            image_url: res.data.recipe.image_url
          };
          const filteredRecents = recents.filter(r => r.id !== newRecent.id);
          filteredRecents.unshift(newRecent);
          localStorage.setItem('recentlyViewedRecipes', JSON.stringify(filteredRecents.slice(0, 10)));
        } catch (e) {
          console.error("Lỗi lưu lịch sử xem", e);
        }
      }
    } catch (err) {
      setError('Không thể tải công thức hoặc công thức không tồn tại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (!recipe || String(recipe.id) !== String(id)) return undefined;

    let requestPending = false;
    let viewRecorded = false;
    let viewTimer;

    const cleanup = () => {
      window.clearTimeout(viewTimer);
      window.removeEventListener('scroll', handleScroll);
    };

    const recordView = async () => {
      if (requestPending || viewRecorded) return;
      requestPending = true;

      try {
        const res = await axios.post(`/api/recipes/${id}/view`);
        if (res.data.success) {
          viewRecorded = true;
          setViewCount(res.data.viewCount || 0);
          cleanup();
        }
      } catch (err) {
        console.error('Không thể ghi nhận lượt xem:', err);
      } finally {
        requestPending = false;
      }
    };

    function handleScroll() {
      const pageHeight = document.documentElement.scrollHeight;
      const viewedDepth = pageHeight > 0
        ? (window.scrollY + window.innerHeight) / pageHeight
        : 0;

      if (viewedDepth >= 0.3) {
        recordView();
      }
    }

    viewTimer = window.setTimeout(recordView, 10000);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return cleanup;
  }, [id, recipe]);

  const handleRequireLogin = (actionFn) => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    if (actionFn) actionFn();
  };

  const handleToggleFavorite = async () => {
    try {
      const res = await axios.post(`/api/recipes/${id}/favorite`);
      if (res.data.success) {
        // The button label and icon already flip between "Lưu" / "Đã lưu",
        // so a corner toast would only repeat what is already on screen.
        setIsFav(res.data.isFav);
      }
    } catch (e) {
      // No inline feedback for a failed request, so keep the toast here.
      toast.error('Lỗi khi cập nhật yêu thích');
    }
  };

  const handleSubmitComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    handleRequireLogin(async () => {
      setIsSubmittingComment(true);
      try {
        const res = await axios.post(`/api/recipes/${id}/comments`, { content: newComment });
        if (res.data.success) {
          toast.success('Đã gửi bình luận');
          setNewComment('');
          setComments([{
            id: res.data.commentId || Date.now(),
            content: newComment,
            created_at: new Date(),
            user: { username: user.username }
          }, ...comments]);
        }
      } catch (err) {
        toast.error('Lỗi khi gửi bình luận');
      } finally {
        setIsSubmittingComment(false);
      }
    });
  };

  const handleSubmitRating = (starValue) => {
    handleRequireLogin(async () => {
      try {
        const res = await axios.post(`/api/recipes/${id}/rate`, { star_count: starValue });
        if (res.data.success) {
          setSelectedStar(starValue);
          toast.success('Cảm ơn bạn đã đánh giá!');
          if (res.data.newRating !== undefined) setRating(res.data.newRating);
          if (res.data.newCount !== undefined) setRatingCount(res.data.newCount);
        }
      } catch (err) {
        toast.error('Lỗi khi gửi đánh giá');
      }
    });
  };

  const toggleIng = (idx) => setCheckedIngs(prev => ({...prev, [idx]: !prev[idx]}));
  const handlePrint = () => window.print();

  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  // "Đã sao chép" confirmation on the share button.
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const copyResetTimer = useRef(null);

  useEffect(() => () => clearTimeout(copyResetTimer.current), []);

  const handleCopyLink = async () => {
    const url = window.location.href;

    // Flip to "Đã sao chép" straight away so the click feels instant,
    // without waiting on the clipboard promise to settle.
    setIsLinkCopied(true);
    clearTimeout(copyResetTimer.current);
    copyResetTimer.current = setTimeout(() => setIsLinkCopied(false), 2000);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for insecure contexts where the async clipboard is blocked.
        const scratch = document.createElement('textarea');
        scratch.value = url;
        scratch.setAttribute('readonly', '');
        scratch.style.position = 'fixed';
        scratch.style.opacity = '0';
        document.body.appendChild(scratch);
        scratch.select();
        document.execCommand('copy');
        document.body.removeChild(scratch);
      }
      // No toast here: the button itself flips to the check mark as feedback.
    } catch (err) {
      console.error('Không thể sao chép liên kết:', err);
      setIsLinkCopied(false);
      toast.error('Không thể sao chép liên kết');
    }
  };

  const suggestedRecipes = relatedRecipes
    .filter((item) => item && item.id !== Number(id))
    .slice(0, SUGGESTION_LIMIT);

  if (loading) return <MainLayout hideSidebar className="home-typography"><SkeletonLoader /></MainLayout>;
  if (error) return <MainLayout hideSidebar className="home-typography"><div style={{ textAlign: 'center', padding: '50px' }}>{error}</div></MainLayout>;
  if (!recipe) return <MainLayout hideSidebar className="home-typography"><div style={{ textAlign: 'center', padding: '50px' }}>Không tìm thấy</div></MainLayout>;

  const ratio = currentServings / (recipe.servings || 1);
  const totalRecipeTime = (Number(recipe.prep_time) || 0) + (Number(recipe.cook_time) || 0);
  
  // Safeguard activeMediaIndex if media is empty
  const safeMediaIndex = (media && media.length > activeMediaIndex) ? activeMediaIndex : 0;
  const mainMedia = media[safeMediaIndex] || {};

  return (
    <MainLayout hideSidebar className="home-typography">
      <div className="nyt-recipe-page-wrapper">
        <div className="nyt-recipe-page">
          <div className="nyt-recipe-grid">
            
            {/* LEFT COLUMN */}
            <div className="nyt-col-left">
              <h1 className="nyt-title">{recipe.title}</h1>
              
              <div className="nyt-byline">
                <p>Công thức bởi <strong><Link to={`/profile/${recipe.user_id}`} style={{color: 'inherit', textDecoration: 'none'}}>{recipe.author_name || 'Đầu bếp ẩn danh'}</Link></strong></p>
                {recipe.original_author && <p>Phỏng theo <strong>{recipe.original_author}</strong></p>}
                <p className="nyt-date">Đăng ngày {new Date(recipe.created_at).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>

              <div className="nyt-stats-row">
                <div className="nyt-stat">
                  <span className="nyt-stat-label">Tổng thời gian</span>
                  <span className="nyt-stat-val">
                    {totalRecipeTime > 0 ? `${totalRecipeTime} phút` : 'Chưa có thời gian nấu'}
                  </span>
                </div>
                <div className="nyt-stat">
                  <span className="nyt-stat-label">Đánh giá</span>
                  <span className="nyt-stat-val">
                    <span className="nyt-stars">
                      {Array.from({length: 5}).map((_, i) => (
                        <i key={i} className={`fa-solid fa-star ${i < Math.round(rating) ? 'active' : ''}`}></i>
                      ))}
                    </span>
                    <span className="nyt-rating-count">({ratingCount})</span>
                  </span>
                </div>
                <div className="nyt-stat">
                  <span className="nyt-stat-label">Lượt xem</span>
                  <span className="nyt-stat-val">{viewCount.toLocaleString('vi-VN')} đã xem</span>
                </div>
              </div>

              <div className="nyt-toolbar-divider"></div>

              <div className="nyt-toolbar">
                <button className={`nyt-btn ${isFav ? 'nyt-btn-saved' : 'nyt-btn-save'}`} onClick={() => handleRequireLogin(handleToggleFavorite)}>
                  <i className={isFav ? "fa-solid fa-bookmark" : "fa-regular fa-bookmark"}></i> {isFav ? 'Đã lưu' : 'Lưu'}
                </button>
                <button
                  className={`nyt-btn-circle${isLinkCopied ? ' nyt-btn-circle-copied' : ''}`}
                  title={isLinkCopied ? 'Đã sao chép liên kết' : 'Sao chép liên kết'}
                  aria-label={isLinkCopied ? 'Đã sao chép liên kết' : 'Sao chép liên kết'}
                  onClick={handleCopyLink}
                ><i className={isLinkCopied ? 'fa-solid fa-check' : 'fa-solid fa-share'} aria-hidden="true"></i></button>
                <button className="nyt-btn-circle" title="In công thức" aria-label="In công thức" onClick={handlePrint}><i className="fa-solid fa-print"></i></button>
                
                {user && user.id === recipe.user_id && (
                  <button className="nyt-btn-circle" onClick={() => navigate(`/recipes/edit/${id}`)} title="Sửa công thức"><i className="fa-solid fa-pen"></i></button>
                )}
              </div>

              <div className="nyt-section">
                <h3 className="nyt-section-title">Nguyên liệu</h3>
                <div className="nyt-yield-row">
                  <p className="nyt-yield"><strong>Khẩu phần:</strong> {currentServings} người</p>
                  <div className="nyt-servings-ctrl">
                    <button onClick={() => setCurrentServings(Math.max(1, currentServings - 1))}><i className="fa-solid fa-minus"></i></button>
                    <button onClick={() => setCurrentServings(currentServings + 1)}><i className="fa-solid fa-plus"></i></button>
                  </div>
                </div>
                
                <ul className="nyt-ing-list">
                  {ingredients.length > 0 ? ingredients.map((ing, idx) => {
                    let displayAmount = ing.amount;
                    const parsedAmount = parseFloat(ing.amount);
                    if (!isNaN(parsedAmount)) {
                      displayAmount = (parsedAmount * ratio).toFixed(1).replace(/\.0$/, '');
                    }
                    const isChecked = Boolean(checkedIngs[idx]);
                    return (
                      <li key={idx} className={isChecked ? 'nyt-ing-checked' : ''}>
                        {/* Label wraps the whole row so clicking anywhere toggles the box natively. */}
                        <label className="nyt-ing-row">
                          <input
                            type="checkbox"
                            className="nyt-ing-check"
                            checked={isChecked}
                            onChange={() => toggleIng(idx)}
                          />
                          <span className="nyt-ing-amount">{displayAmount} {ing.unit}</span>
                          <span className="nyt-ing-name">{ing.name}</span>
                        </label>
                      </li>
                    );
                  }) : <li>Chưa có nguyên liệu</li>}
                </ul>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="nyt-col-right">
              <div className="nyt-hero-media-container">
                <div className="nyt-hero">
                  {mainMedia.media_type === 'video' ? (
                    <video key={mainMedia.media_url} src={mainMedia.media_url} autoPlay loop muted playsInline className="nyt-hero-img" style={{ pointerEvents: 'none' }} />
                  ) : (
                    <img key={mainMedia.media_url} src={mainMedia.media_url || 'https://via.placeholder.com/800x1000'} alt={recipe.title} className="nyt-hero-img" />
                  )}
                  <p className="nyt-hero-caption">Ảnh minh họa cho {recipe.title}. Nguồn: Cộng đồng Recipe Sharing.</p>
                </div>
                
                {media && media.length > 1 && (
                  <div className="nyt-media-thumbnails">
                    {media.map((m, idx) => (
                      <div 
                        key={idx} 
                        className={`nyt-thumb ${idx === safeMediaIndex ? 'active' : ''}`}
                        onClick={() => setActiveMediaIndex(idx)}
                      >
                        <img src={getThumbnailUrl(m.media_url, m.media_type)} alt={`Ảnh minh họa ${idx + 1}`} />
                        {m.media_type === 'video' && (
                          <div className="thumb-video-icon"><i className="fa-solid fa-play"></i></div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="nyt-desc">
                <p>{recipe.description || 'Hương vị tuyệt hảo được chắt lọc từ những nguyên liệu tươi ngon nhất, mang đến cho bạn trải nghiệm ẩm thực đỉnh cao ngay tại nhà.'}</p>
              </div>

              <div className="nyt-section" style={{ marginTop: '40px' }}>
                <h3 className="nyt-section-title">Thực hiện</h3>
                <div className="nyt-step-list">
                  {steps.length > 0 ? steps.map((step, idx) => (
                    <div key={idx} className="nyt-step-item">
                      <h4>Bước {step.step_number}</h4>
                      <p>{step.instruction}</p>
                    </div>
                  )) : <p>Chưa có hướng dẫn</p>}
                </div>
              </div>
            </div>

          </div>

          {/* TAGS */}
          {tags.length > 0 && (
            <div className="nyt-tags-section">
              <h3 className="nyt-section-title" style={{ fontSize: '1rem' }}>Từ khóa</h3>
              <div className="nyt-tags-list">
                {tags.map((tag, idx) => (
                  <Link to={`/?search=${encodeURIComponent(tag.name)}`} key={idx} className="nyt-tag-pill">{tag.name}</Link>
                ))}
              </div>
            </div>
          )}

          {/* RATINGS AND COMMENTS */}
          <div className="nyt-comments-section">
            <div className="nyt-comments-grid">
              <div className="nyt-comments-left" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                  <span style={{ fontSize: '46px', color: '#111', lineHeight: '1' }}><i className="fa-solid fa-star"></i></span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#111', fontFamily: 'var(--font-sans)' }}>{Number(rating).toFixed(1).replace(/\.0$/, '')} trên 5</span>
                    <span style={{ fontSize: '14px', color: '#666', fontFamily: 'var(--font-sans)' }}>{ratingCount} lượt đánh giá</span>
                  </div>
                </div>
                
                <hr style={{ border: 'none', borderTop: '1px solid #eaeaea', margin: '10px 0', width: '100%' }} />
                
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#111', marginBottom: '10px', fontFamily: 'var(--font-sans)' }}>Đánh giá của bạn</h4>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '32px', color: '#d3d3d3', cursor: 'pointer' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <i 
                        key={star} 
                        className={`fa-solid fa-star ${star <= (hoverStar || selectedStar) ? 'active' : ''}`}
                        style={{ color: star <= (hoverStar || selectedStar) ? '#111' : '#d3d3d3', transition: 'color 0.2s' }}
                        onMouseEnter={() => setHoverStar(star)}
                        onMouseLeave={() => setHoverStar(0)}
                        onClick={() => handleSubmitRating(star)}
                      ></i>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="nyt-comments-right">
                <h3 className="nyt-section-title">Bình luận</h3>
                
                {/* Form comment */}
                <form className="nyt-comment-form" onSubmit={handleSubmitComment} style={{ marginBottom: '20px' }}>
                  <textarea 
                    placeholder="Để lại bình luận của bạn..." 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows="3"
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontFamily: 'var(--font-sans)', fontSize: '14px', resize: 'vertical' }}
                  ></textarea>
                  <div style={{ textAlign: 'right', marginTop: '10px' }}>
                    <button type="submit" className="nyt-btn-save" disabled={isSubmittingComment} style={{ padding: '8px 16px', border: 'none', background: 'var(--color-primary)', color: 'white', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 'bold' }}>
                      {isSubmittingComment ? 'Đang gửi...' : 'Gửi bình luận'}
                    </button>
                  </div>
                </form>

                <div className="nyt-comments-list">
                  {comments.length > 0 ? comments.slice(0, commentLimit).map((cmt, idx) => (
                    <div key={idx} className="nyt-comment-item">
                      <div className="nyt-comment-meta">
                        <span className="nyt-comment-author">{cmt.user?.username || 'Người dùng'}</span>
                        <span className="nyt-comment-date">{new Date(cmt.created_at).toLocaleDateString('vi-VN')}</span>
                      </div>
                      <p className="nyt-comment-text">{cmt.content}</p>
                    </div>
                  )) : (
                    <p style={{fontFamily: 'var(--font-sans)', color: '#666'}}>Chưa có bình luận nào. Hãy là người đầu tiên!</p>
                  )}
                  {comments.length > commentLimit && (
                    <button className="nyt-btn-outline" style={{marginTop: '20px'}} onClick={() => setCommentLimit(prev => prev + 5)}>Xem thêm bình luận</button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SUGGESTED RECIPES — mirrors the homepage "Gợi ý tuần này" panel */}
          {suggestedRecipes.length > 0 && (
            <div className="magazine-section home-featured-section">
              <div className="magazine-section-header home-featured-section-header">
                <h2 className="magazine-section-title">Gợi ý cho bạn</h2>
              </div>

              <RecipeSlider recipes={suggestedRecipes} label="Gợi ý cho bạn" />
            </div>
          )}

        </div>
      </div>

      <LoginRequiredModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />

    </MainLayout>
  );
};

export default RecipeDetail;
