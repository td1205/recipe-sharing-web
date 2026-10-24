// Đọc và nhân định lượng nguyên liệu theo số khẩu phần.
// Hỗ trợ: "2", "1.5", "1,5", "1/2", "1 1/2", "½", "1½", "1-2", "1 - 2".
// (parseFloat("1/2") trả về 1 -> trước đây "1/2 chén" bị hiển thị thành "1 chén")

const UNICODE_FRACTIONS = { '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅛': 0.125 };
const NICE_FRACTIONS = [
  [1 / 4, '1/4'],
  [1 / 3, '1/3'],
  [1 / 2, '1/2'],
  [2 / 3, '2/3'],
  [3 / 4, '3/4'],
];

function parseSingle(text) {
  let value = String(text).trim().replace(',', '.');
  let unicodePart = 0;
  value = value.replace(/[½⅓⅔¼¾⅛]/g, (symbol) => {
    unicodePart += UNICODE_FRACTIONS[symbol];
    return '';
  }).trim();

  if (value === '') return unicodePart > 0 ? unicodePart : null;
  const mixed = value.match(/^(\d+)\s+(\d+)\/(\d+)$/); // "1 1/2"
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]) + unicodePart;
  const fraction = value.match(/^(\d+)\/(\d+)$/); // "1/2"
  if (fraction) return Number(fraction[2]) ? Number(fraction[1]) / Number(fraction[2]) + unicodePart : null;
  if (/^\d+(\.\d+)?$/.test(value)) return Number(value) + unicodePart; // "2", "1.5"
  return null;
}

// -> { min, max } hoặc null nếu không phải số
export function parseAmount(text) {
  if (text == null) return null;
  const raw = String(text).trim();
  if (!raw) return null;
  const range = raw.split(/\s*[-–~]\s*/);
  if (range.length === 2) {
    const min = parseSingle(range[0]);
    const max = parseSingle(range[1]);
    return min != null && max != null ? { min, max } : null;
  }
  const value = parseSingle(raw);
  return value != null ? { min: value, max: value } : null;
}

export function formatNumber(value) {
  const whole = Math.floor(value + 1e-9);
  const rest = value - whole;
  if (rest < 0.02) return String(whole);
  const nice = NICE_FRACTIONS.find(([fraction]) => Math.abs(rest - fraction) < 0.02);
  if (nice) return whole > 0 ? `${whole} ${nice[1]}` : nice[1];
  return value.toFixed(1).replace(/\.0$/, '');
}

// Giữ nguyên chuỗi gốc khi không đổi khẩu phần; ngược lại nhân theo tỉ lệ
export function scaleAmount(text, ratio) {
  if (!text) return text;
  if (Math.abs(ratio - 1) < 1e-9) return text;
  const parsed = parseAmount(text);
  if (!parsed) return text;
  const min = formatNumber(parsed.min * ratio);
  const max = formatNumber(parsed.max * ratio);
  return min === max ? min : `${min}–${max}`;
}
