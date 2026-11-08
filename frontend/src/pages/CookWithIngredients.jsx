import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import MagazineCard from '../components/MagazineCard';
import SkeletonLoader from '../components/SkeletonLoader';
import { getPantry, savePantry } from '../utils/pantry';
import './Home.css';
import './CookWithIngredients.css';

// FR-21: "Nấu gì với nguyên liệu có sẵn?" – gọi GET /api/recommendations/by-ingredients
const MAX_ITEMS = 15;
const SUGGESTIONS = ['trứng', 'cà chua', 'hành tây', 'thịt heo', 'thịt gà', 'đậu hũ', 'tôm', 'nấm', 'rau muống', 'khoai tây'];

const parseItems = (text) =>
  [...new Set(text.split(/[,;\n]/).map((s) => s.trim().toLowerCase()).filter(Boolean))].slice(0, MAX_ITEMS);

const CookWithIngredients = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const items = parseItems(searchParams.get('items') || '');

  const [draft, setDraft] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const itemsKey = items.join(',');
  const page = Math.max(1, Math.floor(Number(searchParams.get('page')) || 1));

  useEffect(() => {
    // Vào trang không kèm ?items= -> khôi phục "Hộp nguyên liệu" đã lưu lần trước
    if (!searchParams.get('items')) {
      const pantry = getPantry();
      if (pantry.length > 0) {
        setSearchParams({ items: pantry.join(',') }, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!itemsKey) {
      setRecipes([]);
      setError('');
      setTotal(0);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    axios
      .get('/api/recommendations/by-ingredients', { params: { items: itemsKey, limit: 24, offset: (page - 1) * 24 } })
      .then((res) => {
        if (!cancelled) {
          setRecipes(res.data.recipes || []);
          setTotal(res.data.total || 0);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRecipes([]);
          setError(err.response?.data?.message || 'Không tải được gợi ý, vui lòng thử lại.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [itemsKey, page]);

  const setItems = (next) => {
    const params = new URLSearchParams(searchParams);
    params.delete('page');
    if (next.length > 0) params.set('items', next.join(','));
    else params.delete('items');
    setSearchParams(params);
    savePantry(next); // lưu "Hộp nguyên liệu" để trang chi tiết tích sẵn
  };

  const addFromDraft = (e) => {
    e.preventDefault();
    const added = parseItems(draft);
    if (added.length === 0) return;
    setItems([...new Set([...items, ...added])].slice(0, MAX_ITEMS));
    setDraft('');
  };

  const toggleSuggestion = (name) =>
    setItems(items.includes(name) ? items.filter((i) => i !== name) : [...items, name].slice(0, MAX_ITEMS));

  return (
    <MainLayout hideSidebar className="home-typography">
      <div className="cwi-page">
        <header className="cwi-header">
          <h1 className="cwi-title">Nấu gì với nguyên liệu có sẵn?</h1>
          <p className="cwi-lead">
            Nhập những gì đang có trong bếp, hệ thống sẽ tìm các món dùng được nhiều nguyên liệu nhất và cho biết còn thiếu gì.
            Gia vị cơ bản (muối, đường, nước mắm, dầu ăn…) được bỏ qua.
          </p>
        </header>

        <form className="cwi-form" onSubmit={addFromDraft}>
          <label htmlFor="cwi-input" className="cwi-label">Nguyên liệu (cách nhau bằng dấu phẩy)</label>
          <div className="cwi-input-row">
            <input
              id="cwi-input"
              className="cwi-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="vd: trứng, cà chua, hành lá"
              autoComplete="off"
            />
            <button type="submit" className="cwi-btn" disabled={!draft.trim() || items.length >= MAX_ITEMS}>
              Thêm
            </button>
          </div>

          {items.length > 0 && (
            <div className="cwi-chips" aria-label="Nguyên liệu đã chọn">
              {items.map((item) => (
                <span key={item} className="cwi-chip">
                  {item}
                  <button type="button" onClick={() => setItems(items.filter((i) => i !== item))} aria-label={`Bỏ ${item}`}>
                    <i className="fa-solid fa-xmark" aria-hidden="true"></i>
                  </button>
                </span>
              ))}
              <button type="button" className="cwi-clear" onClick={() => setItems([])}>Xoá hết</button>
            </div>
          )}

          <div className="cwi-suggest">
            <span className="cwi-suggest-label">Gợi ý nhanh:</span>
            {SUGGESTIONS.map((name) => (
              <button
                key={name}
                type="button"
                className={`cwi-suggest-btn${items.includes(name) ? ' is-active' : ''}`}
                aria-pressed={items.includes(name)}
                onClick={() => toggleSuggestion(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </form>

        <section className="cwi-results" aria-live="polite">
          {loading && <SkeletonLoader />}
          {!loading && error && <p className="cwi-message cwi-message-error">{error}</p>}
          {!loading && !error && items.length === 0 && (
            <p className="cwi-message">Chọn hoặc nhập ít nhất một nguyên liệu để bắt đầu.</p>
          )}
          {!loading && !error && items.length > 0 && recipes.length === 0 && (
            <p className="cwi-message">
              {total > 0 ? 'Trang hiện tại không có kết quả.' : 'Không có món nào chứa đủ tất cả nguyên liệu trên. Hãy thử bỏ bớt hoặc thay nguyên liệu khác.'}
              {total > 0 && <button type="button" onClick={() => setSearchParams({ items: itemsKey })}>Về trang đầu</button>}
            </p>
          )}
          {!loading && recipes.length > 0 && (
            <>
              <h2 className="magazine-section-title cwi-results-title">
                {total.toLocaleString('vi-VN')} món chứa đủ nguyên liệu bạn nhập
              </h2>
              <div className="home-search-grid">
                {recipes.map((recipe) => (
                  <div key={recipe.id}>
                    <MagazineCard recipe={recipe} linkState={{ pantry: items }} />
                    <p>Đã khớp: {(recipe.matched_ingredients || []).join(', ') || 'Gia vị đã nhập'}</p>
                    <p>Còn thiếu nguyên liệu chính: {(recipe.missing_ingredients || []).join(', ') || 'Không có; kiểm tra thêm gia vị và định lượng trong công thức'}</p>
                  </div>
                ))}
              </div>
              <div className="cwi-pagination">
                <button type="button" disabled={page <= 1} onClick={() => setSearchParams({ items: itemsKey, page: String(page - 1) })}>Trang trước</button>
                <span>Trang {page} — hiển thị {recipes.length}/{total} món</span>
                <button type="button" disabled={page * 24 >= total} onClick={() => setSearchParams({ items: itemsKey, page: String(page + 1) })}>Trang sau</button>
              </div>
            </>
          )}
        </section>
      </div>
    </MainLayout>
  );
};

export default CookWithIngredients;
