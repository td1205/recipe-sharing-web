// ============================================================================
// GÁN BỮA ĂN (sáng / trưa / tối) CHO MÓN THEO QUY TẮC
// ============================================================================
// Dữ liệu gốc không có thông tin bữa ăn, nên suy ra từ tên món và danh mục:
//   1. Tên món có từ khóa món sáng (cháo, phở, xôi, bánh mì...)  -> Sáng
//   2. Danh mục Lẩu, Nướng, Kho, Canh (món ăn tối gia đình)      -> Tối
//   3. Danh mục Cơm/Bún/Phở/Mì, Xào, Chiên, Hấp, Luộc, Gỏi        -> Trưa
//   4. Còn lại (bánh, đồ uống, nước chấm, món khác)               -> không gán
// Hạn chế: schema hiện tại chỉ cho mỗi món 1 bữa (xem phần thiết kế lại DB).
// ============================================================================

const MEAL_TIMES = [
  { name: 'Sáng', description: 'Bữa sáng nhanh gọn, đủ năng lượng' },
  { name: 'Trưa', description: 'Bữa trưa văn phòng, cơm, bún, mì' },
  { name: 'Tối', description: 'Bữa tối quây quần gia đình' },
];

const BREAKFAST_KEYWORDS = [
  'cháo', 'phở', 'xôi', 'bánh mì', 'bánh bao', 'bánh cuốn', 'hủ tiếu', 'hủ tíu', 'bún bò', 'bún riêu',
  'bánh canh', 'súp', 'sandwich', 'pancake', 'ốp la', 'trứng chiên', 'sữa chua', 'yến mạch',
  'ngũ cốc', 'sinh tố', 'bánh giò', 'bánh ướt', 'nui', 'mì quảng', 'miến gà', 'bánh đúc', 'hamburger',
];
const DINNER_CATEGORIES = ['Món Lẩu', 'Món Nướng', 'Món Kho', 'Món Canh'];
const LUNCH_CATEGORIES = [
  'Cơm, Bún, Phở & Mì', 'Món Xào', 'Món Chiên', 'Món Hấp', 'Món Luộc', 'Gỏi & Salad',
];

function words(text) {
  return String(text || '').normalize('NFC').toLowerCase().match(/[0-9a-zà-ỹđ]+/g) || [];
}

function containsPhrase(list, phrase) {
  const target = phrase.split(' ');
  for (let i = 0; i + target.length <= list.length; i += 1) {
    if (target.every((word, j) => list[i + j] === word)) return true;
  }
  return false;
}

// -> 'Sáng' | 'Trưa' | 'Tối' | null
function inferMealTime(title, categoryName) {
  const titleWords = words(title);
  if (BREAKFAST_KEYWORDS.some((keyword) => containsPhrase(titleWords, keyword))) return 'Sáng';
  if (DINNER_CATEGORIES.includes(categoryName)) return 'Tối';
  if (LUNCH_CATEGORIES.includes(categoryName)) return 'Trưa';
  return null;
}

module.exports = { MEAL_TIMES, inferMealTime };
