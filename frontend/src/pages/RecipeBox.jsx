import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import SkeletonLoader from '../components/SkeletonLoader';
import MagazineCard from '../components/MagazineCard';
import toast from 'react-hot-toast';
import './profile.css';

// "Hộp công thức" - trang riêng: các món người dùng đã lưu (yêu thích).
// Tách khỏi trang hồ sơ để hai luồng không dùng chung một nguồn (deep-link riêng).
const RecipeBox = () => {
  const [favouriteRecipes, setFavouriteRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    let active = true;
    const fetchBox = async () => {
      try {
        const res = await axios.get('/api/profile');
        if (!active) return;
        if (res.data.success) {
          setFavouriteRecipes(res.data.favouriteRecipes || []);
        }
      } catch (err) {
        if (!active) return;
        setError(err.response?.status === 401
          ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
          : 'Không thể tải Hộp công thức. Vui lòng thử lại sau.');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchBox();
    return () => { active = false; };
  }, []);

  // Bỏ món khỏi Hộp công thức (toggle favorite rồi lọc khỏi danh sách)
  const removeFromBox = async (recipeId, title) => {
    setRemovingId(recipeId);
    try {
      const res = await axios.post(`/api/recipes/${recipeId}/favorite`);
      if (res.data.success && !res.data.isFav) {
        setFavouriteRecipes((list) => list.filter((r) => r.id !== recipeId));
        toast.success(`Đã bỏ "${title}" khỏi Hộp công thức`);
      } else {
        toast.error('Không bỏ được món. Vui lòng thử lại.');
      }
    } catch {
      toast.error('Không bỏ được món. Vui lòng thử lại.');
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) return <MainLayout hideSidebar className="home-typography"><SkeletonLoader /></MainLayout>;
  if (error) {
    return (
      <MainLayout hideSidebar className="home-typography">
        <div className="profile-shell">
          <div className="profile-alert-error" role="alert">{error}</div>
          <Link to="/login" className="profile-btn-secondary">Đăng nhập</Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout hideSidebar className="home-typography">
      <div className="profile-shell">
        <div className="profile-box-header">
          <div>
            <h1 className="profile-edit-title">Hộp công thức</h1>
            <p className="profile-box-subtitle">
              {favouriteRecipes.length} món đã lưu — bấm dấu × trên thẻ để bỏ khỏi hộp.
            </p>
          </div>
          <Link to="/profile" className="profile-btn-secondary">Về hồ sơ</Link>
        </div>

        {favouriteRecipes.length === 0 ? (
          <div className="profile-empty">
            <div className="profile-empty-title">Hộp công thức đang trống</div>
            <p>Lưu những món bạn muốn nấu để tìm lại nhanh chóng.</p>
            <Link to="/recipes" className="profile-empty-cta">Duyệt món phổ biến</Link>
          </div>
        ) : (
          <div className="profile-grid">
            {favouriteRecipes.map((recipe) => (
              <div className="profile-fav-card" key={recipe.id}>
                <MagazineCard recipe={recipe} />
                <button
                  type="button"
                  className="profile-fav-remove"
                  onClick={() => removeFromBox(recipe.id, recipe.title)}
                  disabled={removingId === recipe.id}
                  aria-label={`Bỏ ${recipe.title} khỏi Hộp công thức`}
                  title="Bỏ khỏi Hộp công thức"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default RecipeBox;
