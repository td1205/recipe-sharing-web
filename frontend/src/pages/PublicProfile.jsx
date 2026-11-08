import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import SkeletonLoader from '../components/SkeletonLoader';
import Pagination from '../components/Pagination';
import MagazineCard from '../components/MagazineCard';
import { AuthContext } from '../context/AuthContext';
import NotFound from './NotFound';
import './profile.css';
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
    let active = true;
    setLoading(true);
    setError('');
    axios
      .get(`/api/users/${id}/profile`, { params: { page } })
      .then((res) => {
        if (!active) return;
        setData(res.data);
        setNotFound(false);
      })
      .catch((err) => {
        if (!active) return;
        if (err.response?.status === 404 || err.response?.status === 400) setNotFound(true);
        else setError('Không thể tải hồ sơ lúc này. Vui lòng thử lại.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id, page]);

  // Xem hồ sơ của chính mình -> chuyển sang trang hồ sơ cá nhân (có nút sửa)
  if (user && String(user.id) === String(id)) return <Navigate to="/profile" replace />;
  if (notFound) return <NotFound message="Người dùng này không tồn tại hoặc đã bị khóa." />;
  if (loading && !data) {
    return (
      <MainLayout hideSidebar className="home-typography">
        <SkeletonLoader />
      </MainLayout>
    );
  }
  if (error) {
    return (
      <MainLayout hideSidebar className="home-typography">
        <div className="profile-shell">
          <div className="profile-alert-error" role="alert">{error}</div>
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
    // Tôn trọng prefers-reduced-motion
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <MainLayout hideSidebar className="home-typography">
      <div className="profile-shell">
        {/* Hero hồ sơ công khai */}
        <div className="profile-hero">
          <img
            src={author.avatar_url || DEFAULT_AVATAR}
            alt={`Ảnh đại diện của ${author.fullname || author.username}`}
            width={112}
            height={112}
            className="profile-avatar"
            onError={(e) => {
              if (!e.currentTarget.src.endsWith(DEFAULT_AVATAR)) e.currentTarget.src = DEFAULT_AVATAR;
            }}
          />
          <div className="profile-info">
            <h1 className="profile-name">{author.fullname || author.username}</h1>
            <div className="profile-role">@{author.username}</div>
            <p className={`profile-bio ${author.bio ? '' : 'profile-bio-empty'}`}>
              {author.bio || 'Chưa có thông tin giới thiệu.'}
            </p>
            <div className="profile-stats">
              <span><strong>{stats.recipeCount.toLocaleString('vi-VN')}</strong> công thức đã chia sẻ</span>
              <span><strong>{stats.favoritesReceived.toLocaleString('vi-VN')}</strong> lượt yêu thích nhận được</span>
              {joined && <span>Tham gia từ {joined}</span>}
            </div>
          </div>
        </div>

        {/* Danh sách công thức */}
        <section className="profile-section">
          <h2 className="profile-section-title">Công thức ({stats.recipeCount.toLocaleString('vi-VN')})</h2>
          {recipes.length === 0 ? (
            <div className="profile-empty">
              <div className="profile-empty-title">Chưa có công thức nào</div>
              <p>Người dùng này chưa chia sẻ công thức nào.</p>
            </div>
          ) : (
            <>
              <div className="profile-grid">
                {recipes.map((recipe) => (
                  <MagazineCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
              <div className="public-profile-pager">
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>
            </>
          )}
        </section>
      </div>
    </MainLayout>
  );
};

export default PublicProfile;
