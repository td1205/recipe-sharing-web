export default function RecipeSearchSuggestions({ search }) {
  const { showSuggest, listId, titlesLoading, titlesError, searchQuery, suggestions, activeIdx, goSuggestion } = search;
  if (!showSuggest) return null;
  return (
    <div className="nyt-suggest" id={listId} role="listbox" aria-label="Công thức gợi ý">
      {titlesLoading && <div className="nyt-suggest-empty" role="status">Đang tải gợi ý…</div>}
      {titlesError && <div className="nyt-suggest-empty" role="status">Không tải được gợi ý. Nhấn Enter để tìm kiếm.</div>}
      {!titlesLoading && !titlesError && searchQuery.trim() && suggestions.length === 0 && <div className="nyt-suggest-empty" role="status">Không có món phù hợp</div>}
      {suggestions.map((recipe, index) => (
        <button type="button" tabIndex={-1} id={`${listId}-${index}`} key={recipe.id} role="option" aria-selected={index === activeIdx}
          className={`nyt-suggest-item ${index === activeIdx ? 'active' : ''}`}
          onMouseDown={event => event.preventDefault()} onClick={() => goSuggestion(recipe)}>
          <span className="nyt-suggest-title">{recipe.title}</span>
        </button>
      ))}
    </div>
  );
}
