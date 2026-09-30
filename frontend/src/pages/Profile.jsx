import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { AuthContext } from '../context/AuthContext';
import SkeletonLoader from '../components/SkeletonLoader';

const Profile = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState(null);
  const [favouriteRecipes, setFavouriteRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user === null) {
       // navigate('/login'); // AuthContext already handles this or API will return 401
    }
    const fetchProfile = async () => {
      try {
        const res = await axios.get('/api/profile');
        if (res.data.success) {
          setProfileUser(res.data.user);
          setFavouriteRecipes(res.data.favouriteRecipes || []);
        }
      } catch (err) {
        if (err.response?.status === 401) {
          navigate('/login');
        } else {
          setError('Không thể tải thông tin hồ sơ.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [navigate, user]);

  if (loading) return <MainLayout hideSidebar><SkeletonLoader /></MainLayout>;
  if (error) return <MainLayout hideSidebar><div className="error-msg">{error}</div></MainLayout>;
  if (!profileUser) return null;

  return (
    <MainLayout hideSidebar>
      <div className="profile-header profile-header-flex">
        <h2>Hồ sơ của tôi</h2>
        <Link to="/profile/edit" className="btn-action-edit btn-edit-profile">
          Chỉnh sửa thông tin
        </Link>
      </div>
      <div className="profile-card">
        <div className="profile-avatar">
          {profileUser.fullname ? profileUser.fullname.charAt(0).toUpperCase() : 'U'}
        </div>
        <div className="profile-info-list">
          <div className="profile-info-item">
            <span className="info-label">Họ và tên</span>
            <span className="info-value">{profileUser.fullname}</span>
          </div>
          <div className="profile-info-item">
            <span className="info-label">Tài khoản</span>
            <span className="info-value">{profileUser.username}</span>
          </div>
          <div className="profile-info-item">
            <span className="info-label">Email</span>
            <span className="info-value">{profileUser.email}</span>
          </div>
          <div className="profile-info-item">
            <span className="info-label">Vai trò</span>
            <span className="info-value capitalize">{profileUser.role}</span>
          </div>
        </div>
      </div>
      <div className="favorite-section mt-40">
        <h3>Món ăn yêu thích của tôi</h3>
        {favouriteRecipes.length === 0 ? (
          <p className="no-recipes mt-15">Chưa có công thức yêu thích nào</p>
        ) : (
          <div className="recipe-grid">
            {favouriteRecipes.map((recipe) => (
              <div className="recipe-card" key={recipe.id}>
                {recipe.image_url && (
                  <img src={recipe.image_url} alt={recipe.title} className="recipe-image" />
                )}
                <div className="recipe-info">
                  <h3>
                    <Link to={`/recipes/${recipe.id}`}>{recipe.title}</Link>
                  </h3>
                  <div className="recipe-meta">
                    <span className="recipe-time">
                      {(recipe.prep_time || 0) + (recipe.cook_time || 0)} phút
                    </span>
                    <span className="recipe-domain">
                      {recipe.category_name || 'Món ăn'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Profile;
