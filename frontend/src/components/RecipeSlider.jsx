import React, { useState, useEffect, useRef } from 'react';
import MagazineCard from './MagazineCard';

// Horizontal scroller with chevron controls that appear only when the
// track actually overflows. Shared by the homepage and recipe detail page.
const RecipeSlider = ({ recipes, label }) => {
  const trackRef = useRef(null);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);
  const recipeIds = recipes.map((recipe) => recipe.id).join(',');

  const updateControls = () => {
    const track = trackRef.current;
    if (!track) return;

    const maxScrollLeft = track.scrollWidth - track.clientWidth;
    setCanScrollBack(track.scrollLeft > 4);
    setCanScrollForward(maxScrollLeft > 4 && track.scrollLeft < maxScrollLeft - 4);
  };

  useEffect(() => {
    const track = trackRef.current;
    if (track) track.scrollLeft = 0;
    updateControls();
    window.addEventListener('resize', updateControls);
    return () => window.removeEventListener('resize', updateControls);
  }, [recipeIds]);

  const scroll = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.82, behavior: 'smooth' });
  };

  if (recipes.length === 0) {
    return <p className="home-empty-state">Chưa có công thức phù hợp trong nhóm này.</p>;
  }

  return (
    <div className="home-recipe-slider">
      <div className="home-recipe-slider-track" ref={trackRef} onScroll={updateControls}>
        {recipes.map((recipe) => (
          <MagazineCard key={`${label}-${recipe.id}`} recipe={recipe} compact />
        ))}
      </div>
      {canScrollBack && (
        <button
          type="button"
          className="home-slider-button home-slider-button-prev"
          onClick={() => scroll(-1)}
          aria-label={`Xem các công thức trước trong ${label}`}
        >
          <i className="fa-solid fa-chevron-left" aria-hidden="true"></i>
        </button>
      )}
      {canScrollForward && (
        <button
          type="button"
          className="home-slider-button home-slider-button-next"
          onClick={() => scroll(1)}
          aria-label={`Xem thêm công thức trong ${label}`}
        >
          <i className="fa-solid fa-chevron-right" aria-hidden="true"></i>
        </button>
      )}
    </div>
  );
};

export default RecipeSlider;