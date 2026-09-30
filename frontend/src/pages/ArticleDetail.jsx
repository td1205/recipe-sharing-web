import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import MainLayout from '../components/MainLayout';
import SkeletonLoader from '../components/SkeletonLoader';

const ArticleDetail = () => {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await axios.get(`/api/articles/${id}`);
        if (res.data.success) {
          setArticle(res.data.article);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [id]);

  if (loading) return <MainLayout hideSidebar><SkeletonLoader /></MainLayout>;
  if (!article) return <MainLayout hideSidebar><div style={{ padding: '50px', textAlign: 'center' }}>Bài viết không tồn tại.</div></MainLayout>;

  return (
    <MainLayout hideSidebar>
      <div className="article-detail-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        
        {/* Breadcrumb */}
        <div style={{ marginBottom: '20px', fontSize: '14px', color: 'var(--color-text-muted)' }}>
          <Link to="/" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>Trang chủ</Link>
          <span style={{ margin: '0 8px' }}>/</span>
          <Link to="/articles" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>Mẹo & Thủ thuật</Link>
          <span style={{ margin: '0 8px' }}>/</span>
          <span>{article.title}</span>
        </div>

        {/* Tiêu đề & Meta */}
        <h1 style={{ fontFamily: "'Lora', serif", fontSize: '42px', lineHeight: '1.3', marginBottom: '20px', color: 'var(--color-text-main)' }}>
          {article.title}
        </h1>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: 'var(--color-text-muted)', marginBottom: '30px', paddingBottom: '30px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {article.users?.fullname?.[0] || article.users?.username?.[0] || 'A'}
            </div>
            <div>
              <div style={{ fontWeight: 'bold', color: 'var(--color-text-main)' }}>{article.users?.fullname || article.users?.username || 'Admin Tasty'}</div>
              <div style={{ fontSize: '13px' }}>{new Date(article.created_at).toLocaleDateString('vi-VN')}</div>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '15px' }}>
            <span>👁️ {article.views} lượt xem</span>
          </div>
        </div>

        {/* Ảnh bìa */}
        {article.image_url && (
          <div style={{ marginBottom: '40px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <img src={article.image_url} alt={article.title} style={{ width: '100%', maxHeight: '500px', objectFit: 'cover', display: 'block' }} />
          </div>
        )}

        {/* Nội dung bài viết */}
        <div 
          className="article-content" 
          style={{ fontSize: '18px', lineHeight: '1.8', color: 'var(--color-text-main)' }}
          dangerouslySetInnerHTML={{ __html: article.content }} 
        />
        
      </div>
    </MainLayout>
  );
};

export default ArticleDetail;
