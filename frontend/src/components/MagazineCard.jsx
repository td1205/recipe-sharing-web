import React from 'react';
import { Link } from 'react-router-dom';

// Shared fallback so every recipe card keeps an image when the record has none.
export const DEFAULT_RECIPE_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c';

// Editorial card used by the homepage sliders and the recipe detail page.
const MagazineCard = ({ recipe, compact = false }) => (
  <Link to={`/recipes/${recipe.id}`} className={`mag-card ${compact ? 'mag-card-compact' : ''}`}>
    <div className="mag-card-img-wrapper">
      <img
        src={recipe.image_url || DEFAULT_RECIPE_IMAGE}
        alt={recipe.title}
        className="mag-card-img"
        loading="lazy"
      />
    </div>
    <div className="mag-card-meta">
      <span className="mag-card-category">{recipe.category_name || recipe.categories?.name || 'MÓN NGON'}</span>
      <span aria-hidden="true">•</span>
      <span>{recipe.author_name || recipe.users?.fullname || recipe.users?.username || 'Đầu bếp ẩn danh'}</span>
    </div>
    <h3 className="mag-card-title">{recipe.title}</h3>
  </Link>
);

export default MagazineCard;