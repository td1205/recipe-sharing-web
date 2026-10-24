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
  const [myRecipes, setMyRecipes] = useState([]);
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
          setMyRecipes(res.data.myRecipes || []);
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
      <div className="steam-profile-container">
        {/* Header Background */}
        <div className="steam-profile-bg">
          <div className="steam-profile-bg-gradient"></div>
        </div>
        
        {/* Profile Content */}
        <div className="steam-profile-content">
          <div className="steam-profile-header">
            <div className="steam-profile-avatar-wrapper">
              <img 
                src={profileUser.avatar_url || '/default-avatar.svg'} 
                alt="Avatar" 
                className="steam-profile-avatar-large"
              />
            </div>
            
            <div className="steam-profile-info">
              <h1 className="steam-profile-name">{profileUser.username}</h1>
              <div className="steam-profile-realname">
                {profileUser.fullname && <span>{profileUser.fullname}</span>}
                {profileUser.fullname && profileUser.role && <span className="steam-profile-separator">|</span>}
                <span className="capitalize">{profileUser.role}</span>
              </div>
              <div className="steam-profile-bio">
                {profileUser.bio ? profileUser.bio : 'Chưa có thông tin tóm tắt nào được cung cấp.'}
              </div>
            </div>

            <div className="steam-profile-actions">
              <Link to="/profile/edit" className="steam-btn-gray mt-15" style={{ display: 'block', textAlign: 'center' }}>
                Sửa hồ sơ
              </Link>
            </div>
          </div>

          <div className="steam-profile-body">
            <div className="steam-profile-left">
              {/* Left Column content like Badges, Recent Activity */}
              <div className="steam-profile-box">
                <div className="steam-profile-box-title">Thống kê hoạt động</div>
                <div className="steam-profile-box-content">
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '8px' }}>
                    <strong>{myRecipes.length}</strong> công thức đã chia sẻ
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
                    <strong>{favouriteRecipes.length}</strong> công thức yêu thích
                  </div>
                </div>
              </div>
            </div>

            <div className="steam-profile-right">
              {/* Right Column - My Recipes */}
              <div className="steam-profile-box" style={{ marginBottom: '20px' }}>
                <div className="steam-profile-box-title">Công thức của tôi ({myRecipes.length})</div>
                <div className="steam-profile-box-content">
                  {myRecipes.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Chưa có công thức nào được chia sẻ.</p>
                  ) : (
                    <div className="steam-profile-fav-list">
                      {myRecipes.map((recipe) => (
                        <Link to={`/recipes/${recipe.id}`} key={recipe.id} className="steam-profile-fav-item">
                          {recipe.image_url ? (
                            <img src={recipe.image_url} alt={recipe.title} />
                          ) : recipe.video_url && recipe.video_url.includes('cloudinary') ? (
                            <img src={recipe.video_url.replace(/\.[^/.]+$/, ".jpg")} alt={recipe.title} />
                          ) : (
                            <div className="steam-profile-fav-placeholder"></div>
                          )}
                          <div className="steam-profile-fav-title">{recipe.title}</div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column content like Friends, Favorite Recipes */}
              <div className="steam-profile-box">
                <div className="steam-profile-box-title">Món ăn yêu thích ({favouriteRecipes.length})</div>
                <div className="steam-profile-box-content">
                  {favouriteRecipes.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Chưa có công thức yêu thích nào.</p>
                  ) : (
                    <div className="steam-profile-fav-list">
                      {favouriteRecipes.map((recipe) => (
                        <Link to={`/recipes/${recipe.id}`} key={recipe.id} className="steam-profile-fav-item">
                          {recipe.image_url ? (
                            <img src={recipe.image_url} alt={recipe.title} />
                          ) : recipe.video_url && recipe.video_url.includes('cloudinary') ? (
                            <img src={recipe.video_url.replace(/\.[^/.]+$/, ".jpg")} alt={recipe.title} />
                          ) : (
                            <div className="steam-profile-fav-placeholder"></div>
                          )}
                          <div className="steam-profile-fav-title">{recipe.title}</div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;
