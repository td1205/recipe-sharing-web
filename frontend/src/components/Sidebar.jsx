import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const Sidebar = ({ categories = [] }) => {
  const [searchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  const selectedCategory = searchParams.get('category');

  return (
    <aside className="sidebar">
      <h3>Danh mục</h3>
      <ul>
        <li>
          <Link
            to={`/${search ? '?search=' + encodeURIComponent(search) : ''}`}
            className={!selectedCategory ? 'active' : ''}
          >
            Tất cả
          </Link>
        </li>
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              to={`/?category=${category.id}${search ? '&search=' + encodeURIComponent(search) : ''}`}
              className={selectedCategory === String(category.id) ? 'active' : ''}
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default Sidebar;
