import React from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_RECIPE_IMAGE } from './MagazineCard';

const SquareRecipeCard = ({ recipe }) => {
  return (
    <div className="square-recipe-card">
      <Link to={`/recipes/${recipe.id}`} className="img-wrapper">
        <img src={recipe.image_url || DEFAULT_RECIPE_IMAGE} alt={recipe.title} />
      </Link>
      <div className="info">
        <h3><Link to={`/recipes/${recipe.id}`}>{recipe.title}</Link></h3>
      </div>
    </div>
  );
};

export default SquareRecipeCard;
