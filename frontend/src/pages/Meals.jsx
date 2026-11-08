import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import SkeletonLoader from '../components/SkeletonLoader';
import RecipeSlider from '../components/RecipeSlider';

// 3 bữa chính - mỗi bữa 1 mục slider + "Xem tất cả" lọc theo bữa ở /recipes
const MEAL_SECTIONS = [
  { meal: 'Sáng', title: 'Bữa sáng tiện lợi' },
  { meal: 'Trưa', title: 'Bữa trưa thịnh soạn' },
  { meal: 'Tối', title: 'Bữa tối ấm áp' },
];

const Meals = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const fetchRecipes = async () => {
      try {
        const res = await axios.get('/api/recipes');
        if (!active) return;
        setRecipes(res.data.recipes || []);
      } catch (err) {
        if (!active) return;
        setError('Không tải được danh sách món theo bữa. Vui lòng thử lại sau.');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchRecipes();
    return () => { active = false; };
  }, []);

  if (loading) return <MainLayout hideSidebar className="home-typography"><SkeletonLoader /></MainLayout>;
  if (error) {
    return (
      <MainLayout hideSidebar className="home-typography">
        <div className="home-modern-container home-discover-container">
          <div className="home-empty-state" role="alert">{error}</div>
        </div>
      </MainLayout>
    );
  }

  const sections = MEAL_SECTIONS.map((s) => ({
    ...s,
    items: recipes.filter((r) => r.meal_time_name === s.meal).slice(0, 12),
  })).filter((s) => s.items.length > 0);

  return (
    <MainLayout hideSidebar className="home-typography">
      <div className="home-modern-container home-discover-container">
        <h1 className="magazine-section-title">Hôm nay ăn gì?</h1>
        <p className="meals-page-subtitle">
          Chọn bữa bạn cần — mỗi bữa có danh sách món gợi ý, bấm "Xem tất cả" để xem đầy đủ kèm bộ lọc.
        </p>

        {sections.length === 0 ? (
          <div className="home-empty-state">
            Chưa có món nào được phân loại theo bữa. Vui lòng quay lại sau.
          </div>
        ) : (
          sections.map((section) => (
            <section key={section.meal} className="meals-section">
              <div className="magazine-section-header">
                <h2 className="magazine-section-title">{section.title}</h2>
                <Link
                  to={`/recipes?meal_time=${encodeURIComponent(section.meal)}`}
                  className="magazine-section-link"
                >
                  Xem tất cả <i className="fa-solid fa-chevron-right" aria-hidden="true"></i>
                </Link>
              </div>
              <RecipeSlider recipes={section.items} label={section.title} />
            </section>
          ))
        )}
      </div>
    </MainLayout>
  );
};

export default Meals;
