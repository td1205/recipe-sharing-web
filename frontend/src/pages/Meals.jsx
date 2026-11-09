import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import SkeletonLoader from '../components/SkeletonLoader';
import ErrorState from '../components/ErrorState';
import MagazineCard, { RecipeImage } from '../components/MagazineCard';
import './Home.css';
import './Meals.css';

const MEALS = [
  { meal: 'Sáng', id: 'breakfast', title: 'Bữa sáng tiện lợi', description: 'Khởi đầu ngày mới bằng món ăn bạn yêu thích.' },
  { meal: 'Trưa', id: 'lunch', title: 'Bữa trưa thịnh soạn', description: 'Thêm lựa chọn cho bữa trưa ở nhà hoặc mang theo.' },
  { meal: 'Tối', id: 'dinner', title: 'Bữa tối ấm áp', description: 'Chọn món cho bữa cơm cuối ngày cùng gia đình.' },
];
const mealLink = meal => '/recipes?meal_time=' + encodeURIComponent(meal);
export default function Meals() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all(MEALS.map(async section => {
      const { data } = await axios.get('/api/recipes', {
        params: { meal_time: section.meal, page: 1, limit: 4, sort: 'newest' }, signal: controller.signal,
      });
      if (!data.success || !Array.isArray(data.recipes) || !Number.isSafeInteger(data.total) || data.total < 0) throw new Error('Invalid meal response');
      return { ...section, items: data.recipes, total: data.total };
    })).then(items => { if (!controller.signal.aborted) setSections(items); })
      .catch(() => { if (!controller.signal.aborted) setError('Không tải được món theo bữa. Vui lòng thử lại.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  const featuredSection = sections.find(section => section.items.length > 0);
  const featured = featuredSection?.items[0];
  const time = featured ? (Number(featured.prep_time) || 0) + (Number(featured.cook_time) || 0) : 0;
  return (
    <MainLayout className="home-typography">
      <div className="meals-page">
        {loading ? <SkeletonLoader /> : error ? <ErrorState message={error} onRetry={() => { setLoading(true); setError(''); setRevision(value => value + 1); }} /> : <>
          <section className="meals-hero" aria-labelledby="meals-title">
            <div className="meals-intro">
              <h1 id="meals-title">Hôm nay ăn gì?</h1>
              <p className="meals-deck">Từ bữa sáng đến bữa tối, tìm một món hợp khẩu vị cho từng thời điểm trong ngày.</p>
              <nav className="meals-navigation" aria-label="Chọn bữa ăn">
                {MEALS.map(section => <a key={section.id} href={'#' + section.id}>{'Bữa ' + section.meal.toLowerCase()}<i className="fa-solid fa-arrow-down" aria-hidden="true" /></a>)}
              </nav>
              <p className="meals-intro-note">Các món mới đăng trong từng bữa. Chọn “Xem tất cả” để tìm thêm và lọc theo sở thích.</p>
              <Link className="meals-all-link" to="/recipes">Khám phá tất cả công thức <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
            </div>
            {featured ? <article className="meals-featured">
              <Link className="meals-featured-image" to={'/recipes/' + featured.id} tabIndex={-1} aria-hidden="true"><RecipeImage src={featured.image_url} alt="" /></Link>
              <div className="meals-featured-body">
                <p className="meals-featured-label">{'Mới đăng · Bữa ' + featuredSection.meal.toLowerCase()}</p>
                <h2><Link to={'/recipes/' + featured.id}>{featured.title}</Link></h2>
                <p className="meals-featured-description">{featured.description || 'Xem nguyên liệu và các bước chế biến của món ăn này.'}</p>
                <div className="meals-featured-meta"><span>{time > 0 ? time + ' phút' : 'Chưa có thời gian nấu'}</span><span>{Number(featured.total_ratings) > 0 ? Number(featured.avg_rating).toFixed(1) + '/5 · ' + featured.total_ratings + ' đánh giá' : 'Chưa có đánh giá'}</span></div>
              </div>
            </article> : <div className="meals-empty-feature" role="status"><h2>Thực đơn đang chờ bạn</h2><p>Chưa có công thức được phân loại theo bữa. Bạn vẫn có thể khám phá toàn bộ món ăn.</p><Link to="/recipes" className="btn-primary">Xem công thức</Link></div>}
          </section>
          {sections.map(section => <section key={section.id} id={section.id} className="meals-section" aria-labelledby={section.id + '-title'}>
            <div className="meals-section-heading"><div><h2 id={section.id + '-title'}>{section.title}</h2><p>{section.description}</p></div>
              <Link to={mealLink(section.meal)} className="meals-all-link" aria-label={'Xem tất cả công thức bữa ' + section.meal.toLowerCase()}>Xem tất cả <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
            </div>
            {section.items.length ? <><p className="meals-count">{section.total.toLocaleString('vi-VN')} công thức · hiển thị {section.items.length} món mới nhất</p><div className="meals-recipe-grid">{section.items.map(recipe => <MagazineCard key={recipe.id} recipe={recipe} />)}</div></> : <p className="meals-empty" role="status">Chưa có công thức cho bữa này. Bạn có thể chọn một bữa khác hoặc xem tất cả công thức.</p>}
          </section>)}
        </>}
      </div>
    </MainLayout>
  );
}
