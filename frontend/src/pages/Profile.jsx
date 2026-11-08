import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import SkeletonLoader from '../components/SkeletonLoader';
import MagazineCard from '../components/MagazineCard';
import './profile.css';

const DEFAULT_AVATAR = '/default-avatar.svg';

const Profile = () => {
  const [profileUser, setProfileUser] = useState(null);
  const [favouriteRecipes, setFavouriteRecipes] = useState([]);
  const [myRecipes, setMyRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const fetchProfile = async () => {
      try {
        const res = await axios.get('/api/profile');
        if (!active) return;
        if (res.data.success) {
          setProfileUser(res.data.user);
          setFavouriteRecipes(res.data.favouriteRecipes || []);
          setMyRecipes(res.data.myRecipes || []);
        }
      } catch (err) {
        if (!active) return;
        setError(err.response?.status === 401
          ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
          : 'Không thể tải thông tin hồ sơ. Vui lòng thử lại sau.');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchProfile();
    return () => { active = false; };
  }, []);

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
  if (!profileUser) return null;

  return (
    <MainLayout hideSidebar className="home-typography">
      <div className="profile-shell">
        {/* Hero hồ sơ */}
        <div className="profile-hero">
          <img
            src={profileUser.avatar_url || DEFAULT_AVATAR}
            alt={`Ảnh đại diện của ${profileUser.username}`}
            width={112}
            height={112}
            className="profile-avatar"
            onError={(e) => {
              if (!e.currentTarget.src.endsWith(DEFAULT_AVATAR)) e.currentTarget.src = DEFAULT_AVATAR;
            }}
          />
          <div className="profile-info">
            <h1 className="profile-name">{profileUser.username}</h1>
            <div className="profile-role">
              {profileUser.fullname ? `${profileUser.fullname} · ` : ''}
              {profileUser.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
            </div>
            <p className={`profile-bio ${profileUser.bio ? '' : 'profile-bio-empty'}`}>
              {profileUser.bio || 'Chưa có tóm tắt nào được cung cấp.'}
            </p>
            <div className="profile-stats">
              <span><strong>{myRecipes.length}</strong> công thức đã chia sẻ</span>
              <span><strong>{favouriteRecipes.length}</strong> món trong Hộp công thức</span>
            </div>
          </div>
          <div className="profile-actions">
            <Link to="/profile/recipe-box" className="profile-btn-secondary profile-btn-box">
              Hộp công thức ({favouriteRecipes.length})
            </Link>
            <Link to="/profile/edit" className="profile-btn-edit">Sửa hồ sơ</Link>
          </div>
        </div>

        {/* Công thức của tôi */}
        <section className="profile-section">
          <h2 className="profile-section-title">Công thức của tôi ({myRecipes.length})</h2>
          {myRecipes.length === 0 ? (
            <div className="profile-empty">
              <div className="profile-empty-title">Chưa có công thức nào được chia sẻ</div>
              <p>Đăng món đầu tiên của bạn để cả cộng đồng cùng nấu thử.</p>
              <Link to="/recipes/create" className="profile-empty-cta">Đăng công thức</Link>
            </div>
          ) : (
            <div className="profile-grid">
              {myRecipes.map((recipe) => (
                <MagazineCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}
        </section>
      </div>
    </MainLayout>
  );
};

export default Profile;
