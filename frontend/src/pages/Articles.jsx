import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import MainLayout from '../components/MainLayout';
import SkeletonLoader from '../components/SkeletonLoader';

const Articles = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await axios.get('/api/articles');
        if (res.data.success) {
          setArticles(res.data.articles);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, []);

  if (loading) return <MainLayout><SkeletonLoader /></MainLayout>;

  return (
    <MainLayout>
      <div className="articles-page" style={{ padding: '20px 0' }}>
        <h1 style={{ fontFamily: "'Lora', serif", fontSize: '32px', marginBottom: '10px' }}>Mẹo & Thủ thuật Nấu ăn</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '30px' }}>Cẩm nang ẩm thực, mẹo vặt nhà bếp và những bài viết truyền cảm hứng.</p>
        
        <div className="article-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '30px' }}>
          {articles.length > 0 ? (
            articles.map(article => (
              <div key={article.id} className="article-card" style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', transition: 'box-shadow 0.3s ease' }}>
                <Link to={`/articles/${article.id}`}>
                  <div 
                    style={{ 
                      width: '100%', 
                      height: '200px', 
                      backgroundImage: `url(${article.image_url || 'https://via.placeholder.com/400x200'})`, 
                      backgroundSize: 'cover', 
                      backgroundPosition: 'center',
                      backgroundColor: '#f8f9fa'
                    }} 
                  />
                </Link>
                <div style={{ padding: '20px' }}>
                  <small style={{ color: 'var(--color-primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Kinh nghiệm</small>
                  <Link to={`/articles/${article.id}`} style={{ textDecoration: 'none', color: 'var(--color-text-main)' }}>
                    <h3 style={{ fontFamily: "'Lora', serif", marginTop: '10px', marginBottom: '10px', fontSize: '20px', lineHeight: '1.4' }}>
                      {article.title}
                    </h3>
                  </Link>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '15px' }}>
                    <span>✍️ {article.users?.fullname || article.users?.username || 'Admin'}</span>
                    <span>👁️ {article.views} lượt xem</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p>Chưa có bài viết nào.</p>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Articles;
