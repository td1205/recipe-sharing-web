import React from 'react';
import { Link } from 'react-router-dom';

// Shared fallback so every recipe card keeps an image when the record has none.
export const DEFAULT_RECIPE_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c';

// Dùng cho onError của <img>: ảnh hỏng (vd link cũ không còn) -> đổi sang ảnh mặc định
export const handleImageError = (event) => {
  if (event.currentTarget.src !== DEFAULT_RECIPE_IMAGE) event.currentTarget.src = DEFAULT_RECIPE_IMAGE;
};

// Ảnh công thức có fallback "chữ cái đầu tên món trên nền giấy" (phong cách editorial).
// Dùng khi: chưa có image_url, hoặc link ảnh lỗi (host chết, 404, timeout...).
// Host chết kiểu "treo kết nối" (không trả lỗi) cũng được xử lý: quá timeoutMs
// mà chưa tải xong thì coi như hỏng, hiện placeholder luôn thay vì ô trống.
// LƯU Ý: KHÔNG dùng loading="lazy" — ảnh lazy ngoài viewport không tải, timer
// sẽ hiểu nhầm là ảnh hỏng và hiện placeholder oan cho ảnh sống.
// className truyền vào áp cho cả <img> lẫn div placeholder để giữ đúng kích thước khung ảnh.
export function RecipeImage({ src, alt, className = '', timeoutMs = 8000, ...rest }) {
  const [failed, setFailed] = React.useState(!src);
  const [loaded, setLoaded] = React.useState(false);
  React.useEffect(() => {
    setFailed(!src);
    setLoaded(false);
  }, [src]);

  React.useEffect(() => {
    if (!src || failed || loaded) return undefined;
    const timer = window.setTimeout(() => {
      setFailed(true);
    }, timeoutMs);
    return () => window.clearTimeout(timer);
  }, [src, failed, loaded, timeoutMs]);

  if (failed) {
    const letter = (alt || '?').trim().charAt(0).toUpperCase();
    return (
      <div
        className={`${className} recipe-img-fallback`.trim()}
        role="img"
        aria-label={alt}
      >
        <span className="recipe-img-fallback-letter" aria-hidden="true">{letter}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}

// Editorial card used by the homepage sliders and the recipe detail page.
const MagazineCard = ({ recipe, compact = false }) => (
  <Link to={`/recipes/${recipe.id}`} className={`mag-card ${compact ? 'mag-card-compact' : ''}`}>
    <div className="mag-card-img-wrapper">
      <RecipeImage src={recipe.image_url} alt={recipe.title} className="mag-card-img" />
    </div>
    <div className="mag-card-meta">
      <span className="mag-card-category">{recipe.category_name || recipe.categories?.name || 'MÓN NGON'}</span>
      <span aria-hidden="true">•</span>
      <span>{recipe.author_name || recipe.users?.fullname || recipe.users?.username || 'Đầu bếp ẩn danh'}</span>
    </div>
    <h3 className="mag-card-title">{recipe.title}</h3>
    {/* Lý do gợi ý do hệ gợi ý trả về (services/recommender) */}
    {recipe.recommendation_reason && (
      <p className="mag-card-reason">{recipe.recommendation_reason}</p>
    )}
  </Link>
);

export default MagazineCard;