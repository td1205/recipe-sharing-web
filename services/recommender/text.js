// Tiện ích xử lý chữ tiếng Việt cho hệ gợi ý.
// Giữ nguyên dấu tiếng Việt vì dấu mang nghĩa ("cá" khác "cà", "bò" khác "bơ").

// Từ chỉ cách sơ chế / đơn vị / thương hiệu: không mang thông tin về món ăn
const INGREDIENT_STOP_WORDS = new Set([
  'băm', 'bằm', 'thái', 'cắt', 'nhỏ', 'lát', 'sợi', 'khúc', 'nhuyễn', 'tươi', 'sống',
  'chín', 'sạch', 'làm', 'bỏ', 'vỏ', 'lột', 'rửa', 'ngâm', 'gọt', 'loại', 'mỗi', 'ít',
  'vừa', 'to', 'lớn', 'nguyên', 'đập', 'dập', 'nạo', 'xắt', 'cọng', 'phần',
  'g', 'gr', 'kg', 'ml', 'lít', 'muỗng', 'thìa', 'chén', 'bát', 'trái', 'quả', 'củ',
  'cây', 'nhánh', 'tép', 'miếng', 'gói', 'hộp', 'lon', 'chai', 'bó', 'con',
  'và', 'hoặc', 'cho', 'của', 'để', 'đã', 'tùy', 'thích', 'dùng', 'kèm', 'khoảng', 'ăn',
  'aji', 'ajinomoto', 'no', 'moto', 'ngon', 'mayo', 'lisa', 'knorr', 'maggi', 'phú', 'sĩ',
]);

// Từ phổ biến trong tên món nhưng không nói lên món đó là gì
const TITLE_STOP_WORDS = new Set([
  'cách', 'làm', 'món', 'ngon', 'đơn', 'giản', 'tại', 'nhà', 'với', 'kiểu', 'siêu',
  'dễ', 'nhanh', 'thơm', 'đậm', 'đà', 'cho', 'bé', 'ngày', 'tết', 'của', 'và', 'từ',
  'mới', 'lạ', 'hấp', 'dẫn', 'cực', 'đặc', 'biệt', 'chuẩn', 'vị', 'cả', 'gia', 'đình',
]);

// Nguyên liệu "nhà nào cũng có": bỏ qua khi tìm món theo nguyên liệu có sẵn
const PANTRY_STAPLES = new Set([
  'muối', 'đường', 'tiêu', 'nước mắm', 'dầu ăn', 'hạt nêm', 'bột ngọt', 'bột nêm',
  'nước', 'nước tương', 'dầu hào', 'tỏi', 'hành tím', 'hành lá', 'ớt', 'gia vị',
  'đường trắng', 'tiêu xay', 'dầu', 'xì dầu', 'nước lọc', 'hạt tiêu', 'tiêu đen',
  'bột canh', 'nước sôi', 'đá', 'dầu mè',
]);

// Tên nguyên liệu mà 2 từ đầu chưa đủ nghĩa -> lấy 3 từ
// ("nước cốt dừa" khác "nước cốt chanh", "thịt ba rọi" khác "thịt ba chỉ")
const THREE_WORD_PREFIXES = new Set(['nước cốt', 'thịt ba', 'sữa không', 'sữa tươi', 'bột chiên', 'thịt nạc']);

function toNfcLower(text) {
  return String(text || '').normalize('NFC').toLowerCase();
}

function stripAccents(text) {
  return toNfcLower(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function vietnameseWords(text) {
  return toNfcLower(text).match(/[0-9a-zà-ỹđ]+/g) || [];
}

function hasVietnameseAccent(text) {
  return stripAccents(text) !== toNfcLower(text);
}

// "Thịt heo bằm (ướp sẵn)" -> "thịt heo";  "Tôm tươi" -> "tôm"
function ingredientKey(name) {
  const withoutNote = toNfcLower(name).replace(/\(.*?\)/g, ' ');
  const tokens = vietnameseWords(withoutNote).filter(
    (word) => !INGREDIENT_STOP_WORDS.has(word) && !/^\d/.test(word),
  );
  const twoWords = tokens.slice(0, 2).join(' ');
  return THREE_WORD_PREFIXES.has(twoWords) ? tokens.slice(0, 3).join(' ') : twoWords;
}

function titleWords(title) {
  return vietnameseWords(title).filter(
    (word) => word.length >= 2 && !TITLE_STOP_WORDS.has(word) && !/^\d/.test(word),
  );
}

function isPantryStaple(key) {
  return PANTRY_STAPLES.has(key);
}

// So khớp nguyên liệu người dùng nhập với nguyên liệu của món.
// "tôm" khớp "tôm sú"; "gà" KHÔNG khớp "trứng gà" (phải trùng từ đầu).
// Nếu người dùng gõ không dấu ("tom") thì so sánh ở dạng không dấu.
function ingredientMatches(recipeKey, queryKey) {
  if (!recipeKey || !queryKey) return false;
  if (recipeKey === queryKey || recipeKey.startsWith(`${queryKey} `)) return true;
  if (!hasVietnameseAccent(queryKey)) {
    const plainRecipe = stripAccents(recipeKey);
    const plainQuery = stripAccents(queryKey);
    return plainRecipe === plainQuery || plainRecipe.startsWith(`${plainQuery} `);
  }
  return false;
}

module.exports = {
  ingredientKey,
  titleWords,
  isPantryStaple,
  ingredientMatches,
  stripAccents,
  toNfcLower,
  PANTRY_STAPLES,
};
