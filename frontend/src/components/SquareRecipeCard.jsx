import React from 'react';
import { Link } from 'react-router-dom';

const SquareRecipeCard = ({ recipe }) => {
  return (
    <div className="square-recipe-card">
      <Link to={`/recipes/${recipe.id}`} className="img-wrapper">
        <img src={recipe.image_url || 'https://via.placeholder.com/300'} alt={recipe.title} />
      </Link>
      <div className="info">
        <h3><Link to={`/recipes/${recipe.id}`}>{recipe.title}</Link></h3>
      </div>
    </div>
  );
};

export default SquareRecipeCard;
