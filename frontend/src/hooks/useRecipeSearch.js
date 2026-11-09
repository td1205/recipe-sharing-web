import { useEffect, useId, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

let titleRequest;
const normalize = value => String(value || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').trim().toLowerCase();
function fetchTitles() {
  if (!titleRequest) {
    titleRequest = axios.get('/api/recipes/titles').then(({ data }) => {
      if (!Array.isArray(data.titles)) throw new Error('Invalid title list');
      return data.titles.filter(item => Number.isSafeInteger(item.id) && typeof item.title === 'string');
    }).catch(error => { titleRequest = null; throw error; });
  }
  return titleRequest;
}
export default function useRecipeSearch() {
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const alive = useRef(true);
  const listId = useId();
  const [searchQuery, setQuery] = useState('');
  const [titles, setTitles] = useState(null);
  const [titlesLoading, setTitlesLoading] = useState(false);
  const [titlesError, setTitlesError] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const query = normalize(searchQuery);
  const suggestions = query ? (titles || []).filter(item => normalize(item.title).includes(query)).slice(0, 8) : [];
  useEffect(() => {
    alive.current = true;
    const outside = event => { if (!searchRef.current?.contains(event.target)) setShowSuggest(false); };
    document.addEventListener('pointerdown', outside);
    return () => { alive.current = false; document.removeEventListener('pointerdown', outside); };
  }, []);
  const setSearchQuery = value => { setQuery(value); setActiveIdx(-1); setShowSuggest(true); };
  const closeSuggest = () => { setShowSuggest(false); setActiveIdx(-1); };
  const loadTitles = () => {
    if (titles || titlesLoading) return;
    setTitlesLoading(true); setTitlesError(false);
    fetchTitles().then(items => { if (alive.current) setTitles(items); })
      .catch(() => { if (alive.current) setTitlesError(true); })
      .finally(() => { if (alive.current) setTitlesLoading(false); });
  };
  const goSuggestion = recipe => { closeSuggest(); setQuery(''); navigate(`/recipes/${recipe.id}`); };
  const handleSearchSubmit = event => {
    event.preventDefault();
    if (!searchQuery.trim()) return;
    closeSuggest(); navigate(`/recipes?search=${encodeURIComponent(searchQuery.trim())}`); setQuery('');
  };
  const handleSuggestKeyDown = event => {
    if (event.isComposing || event.nativeEvent?.isComposing) return;
    if (event.key === 'Escape') { event.preventDefault(); closeSuggest(); return; }
    if (!showSuggest || !suggestions.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIdx(index => (index + 1) % suggestions.length); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIdx(index => index <= 0 ? suggestions.length - 1 : index - 1); }
    else if (event.key === 'Enter' && activeIdx >= 0 && suggestions[activeIdx]) { event.preventDefault(); goSuggestion(suggestions[activeIdx]); }
  };
  return { searchRef, listId, searchQuery, setSearchQuery, titlesLoading, titlesError, showSuggest, setShowSuggest,
    activeIdx, suggestions, closeSuggest, goSuggestion, handleSearchSubmit, handleSuggestKeyDown, loadTitles };
}
