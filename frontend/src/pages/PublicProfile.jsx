import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import SkeletonLoader from '../components/SkeletonLoader';
import Pagination from '../components/Pagination';
import { DEFAULT_RECIPE_IMAGE } from '../components/MagazineCard';
import { AuthContext } from '../context/AuthContext';
import NotFound from './NotFound';
import './NotFound.css';

const DEFAULT_AVATAR = '/default-avatar.svg';

// Hồ sơ công khai của tác giả: /profile/:id (bấm vào tên tác giả ở trang món ăn)
const PublicProfile = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const { user } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    axios
      .get(`/api/users/${id}/profile`, { params: { page } })
      .then((res) => {
        setData(res.data);
        setNotFound(false);
      })
      .catch((err) => {
        if (err.response?.status === 404 || err.response?.status === 400) setNotFound(true);
        else setError('Không thể tải hồ sơ lúc này. Vui lòng thử lại.');
      })
      .finally(() => setLoading(false));
  }, [id, page]);

  // Xem hồ sơ của chính mình -> chuyển sang trang hồ sơ cá nhân (có nút sửa)
  if (user && String(user.id) === String(id)) return <Navigate to="/profile" replace />;
  if (notFound) return <NotFound message="Người dùng này không tồn tại hoặc đã bị khóa." />;
  if (loading && !data) {
    return (
      <MainLayout hideSidebar>
        <SkeletonLoader />
      </MainLayout>
    );
  }
  if (error) {
    return (
      <MainLayout hideSidebar>
        <div className="home-status-state">
          <p>{error}</p>
        </div>
      </MainLayout>
    );
  }
  if (!data) return null;

  const { user: author, stats, recipes, totalPages } = data;
  const joined = author.created_at ? new Date(author.created_at).toLocaleDateString('vi-VN') : null;

  const handlePageChange = (nextPage) => {
    const next = new URLSearchParams(searchParams);
    if (nextPage > 1) next.set('page', String(nextPage));
    else next.delete('page');
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <MainLayout hideSidebar>
      <div className="steam-profile-container">
        <div className="steam-profile-bg">
          <div className="steam-profile-bg-gradient"></div>
        </div>

        <div className="steam-profile-content">
          <div className="steam-profile-header">
            <div className="steam-profile-avatar-wrapper">
              <img src={author.avatar_url || DEFAULT_AVATAR} alt={`Ảnh đại diện của ${author.username}`} className="steam-profile-avatar-large" />
            </div>
            <div className="steam-profile-info">
              <h1 className="steam-profile-name">{author.fullname || author.username}</h1>
              <div className="steam-profile-realname">
                <span>@{author.username}</span>
              </div>
              <div className="steam-profile-bio">{author.bio || 'Chưa có thông tin giới thiệu.'}</div>
            </div>
          </div>

          <div className="steam-profile-body">
            <div className="steam-profile-left">
              <div className="steam-profile-box">
                <div className="steam-profile-box-title">Thống kê</div>
                <div className="steam-profile-box-content public-profile-stats">
                  <div>
                    <strong>{stats.recipeCount.toLocaleString('vi-VN')}</strong> công thức đã chia sẻ
                  </div>
                  <div>
                    <strong>{stats.favoritesReceived.toLocaleString('vi-VN')}</strong> lượt yêu thích nhận được
                  </div>
                  {joined && <div>Tham gia từ {joined}</div>}
                </div>
              </div>
            </div>

            <div className="steam-profile-right">
              <div className="steam-profile-box">
                <div className="steam-profile-box-title">Công thức ({stats.recipeCount.toLocaleString('vi-VN')})</div>
                <div className="steam-profile-box-content">
                  {recipes.length === 0 ? (
                    <p className="public-profile-empty">Người dùng này chưa chia sẻ công thức nào.</p>
                  ) : (
                    <div className="steam-profile-fav-list">
                      {recipes.map((recipe) => (
                        <Link to={`/recipes/${recipe.id}`} key={recipe.id} className="steam-profile-fav-item">
                          <img src={recipe.image_url || DEFAULT_RECIPE_IMAGE} alt={recipe.title} loading="lazy" />
                          <div className="steam-profile-fav-title">{recipe.title}</div>
                        </Link>
                      ))}
                    </div>
                  )}
                  <div className="public-profile-pager">
                    <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default PublicProfile;
