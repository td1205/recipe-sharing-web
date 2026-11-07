// "Hộp nguyên liệu" của người dùng (pantry): lưu localStorage, dùng chung
// giữa trang Nấu với nguyên liệu có sẵn và trang chi tiết món (tích sẵn nguyên liệu đã có).
const PANTRY_KEY = 'pantryIngredients';

export function getPantry() {
  try {
    const raw = JSON.parse(localStorage.getItem(PANTRY_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((x) => typeof x === 'string' && x.trim()) : [];
  } catch {
    return [];
  }
}

export function savePantry(items) {
  try {
    localStorage.setItem(PANTRY_KEY, JSON.stringify(items));
  } catch {
    // trình duyệt chặn localStorage -> bỏ qua
  }
}

export function clearPantry() {
  try {
    localStorage.removeItem(PANTRY_KEY);
  } catch {
    // bỏ qua
  }
}

// Bỏ dấu + lowercase: gõ "banh" vẫn khớp "Bánh"
export function normVi(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim()
    .toLowerCase();
}

// Nguyên liệu khớp "Hộp nguyên liệu" khi một bên chứa chuỗi của bên kia (>=2 ký tự).
// vd: pantry "trứng" khớp nguyên liệu "Trứng gà"; pantry "thịt bò" khớp "Thịt bò Mỹ".
export function matchesPantry(ingredientName, pantryItems) {
  const ing = normVi(ingredientName);
  if (!ing) return false;
  return (pantryItems || []).some((item) => {
    const p = normVi(item);
    if (!p || p.length < 2) return false;
    return ing.includes(p) || p.includes(ing);
  });
}
