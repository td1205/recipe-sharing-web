const { GoogleGenAI } = require('@google/genai');

// Service Agent gọi Google Gemini để nhận diện món ăn từ ảnh.
// Tách riêng khỏi controller để controller chỉ lo HTTP, còn phần gọi API ngoài
// (chọn model, thử lại khi quá tải, chuẩn hoá kết quả) nằm ở đây.

// Danh sách model cố định thử lần lượt. Không dùng alias `*-latest`: alias có thể
// trỏ lại model chính nên không tạo ra một đường dự phòng thực sự.
// Có thể ghi đè bằng GEMINI_MODELS (các tên cách nhau bởi dấu phẩy).
const DEFAULT_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];

const PROMPT =
  'Bạn là một chuyên gia ẩm thực. Hãy nhìn hình ảnh này và trả về ĐÚNG MỘT TỪ KHÓA ngắn gọn ' +
  'là tên món ăn (ví dụ: Phở bò, Gà rán, Cơm tấm) bằng tiếng Việt. Không giải thích, không thêm dấu chấm câu. ' +
  'Nếu ảnh không phải món ăn, trả về đúng chữ: KHONG_PHAI_MON_AN';

const NOT_FOOD = 'KHONG_PHAI_MON_AN';
const RETRY_DELAY_MS = 500;
// Bốn model dự phòng phải vừa trong thời gian chờ 35 giây của UI.
const MODEL_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) > 0 ? Number(process.env.GEMINI_TIMEOUT_MS) : 6000;

// Lỗi có mã để controller đổi thành HTTP status phù hợp
class GeminiError extends Error {
  constructor(code, message, { retryAfterSeconds } = {}) {
    super(message);
    this.name = 'GeminiError';
    this.code = code;
    if (Number.isSafeInteger(retryAfterSeconds) && retryAfterSeconds > 0) {
      this.retryAfterSeconds = retryAfterSeconds;
    }
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error(`${label} quá thời gian chờ`), { status: 504 })), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function getModels() {
  const fromEnv = String(process.env.GEMINI_MODELS || '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : DEFAULT_MODELS;
}

function isConfigured() {
  return Boolean(String(process.env.GEMINI_API_KEY || '').trim());
}

function parseRetryAfterSeconds(error) {
  const visited = new Set();
  const visit = (value) => {
    if (!value || typeof value !== 'object' || visited.has(value)) return null;
    visited.add(value);
    if (typeof value.retryDelay === 'string') {
      const match = value.retryDelay.match(/^(\d+(?:\.\d+)?)s$/);
      if (match) return Math.max(1, Math.ceil(Number(match[1])));
    }
    for (const nested of Object.values(value)) {
      const result = visit(nested);
      if (result) return result;
    }
    return null;
  };

  const structuredDelay = visit(error);
  if (structuredDelay) return structuredDelay;
  const message = String(error?.message || '');
  const match = message.match(/retry in\s+(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?/i);
  if (!match) return undefined;
  const seconds = (Number(match[1] || 0) * 3600) + (Number(match[2] || 0) * 60) + Number(match[3] || 0);
  return seconds > 0 ? Math.ceil(seconds) : undefined;
}

function hasModelSpecificQuota(error) {
  const detail = `${JSON.stringify(error || '')} ${String(error?.message || '')}`;
  return /quotaDimensions[^}]*"model"|per[- ]model/i.test(detail);
}

// Chuẩn hoá câu trả lời của model thành một từ khoá tìm kiếm
function cleanKeyword(text) {
  return String(text || '')
    .split('\n')[0]
    .replace(/[*"'`“”]/g, '')
    .replace(/[.。!]+$/, '')
    .trim()
    .slice(0, 60);
}

async function recognizeDish(buffer, mimeType, { client } = {}) {
  if (!client && !isConfigured()) {
    throw new GeminiError(
      'NOT_CONFIGURED',
      'Chức năng tìm món bằng ảnh chưa được cấu hình (thiếu GEMINI_API_KEY trong file .env).',
    );
  }

  const ai = client || new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY.trim() });
  const contents = [PROMPT, { inlineData: { data: buffer.toString('base64'), mimeType } }];
  let lastError = null;

  for (const model of getModels()) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({ model, contents }),
        MODEL_TIMEOUT_MS,
        `Nhận diện ảnh (${model})`,
      );
      const keyword = cleanKeyword(response.text);
      if (!keyword) {
        lastError = new Error(`Model ${model} trả về rỗng`);
        continue;
      }
      if (keyword.toUpperCase().includes(NOT_FOOD)) {
        throw new GeminiError('NOT_FOOD', 'Không nhận ra món ăn trong ảnh, hãy thử ảnh khác rõ hơn.');
      }
      return { keyword, model };
    } catch (err) {
      if (err instanceof GeminiError) throw err;
      lastError = err;
      const status = err.status || err.code;
      console.warn(`[gemini] Lỗi khi gọi model ${model}:`, err.message || err);
      if (status === 400 && /api key/i.test(err.message || '')) {
        throw new GeminiError('INVALID_KEY', 'GEMINI_API_KEY không hợp lệ, hãy kiểm tra lại key trong file .env.');
      }
      if (status === 401 || status === 403) {
        throw new GeminiError('INVALID_KEY', 'GEMINI_API_KEY không hợp lệ hoặc chưa được cấp quyền.');
      }
      if (status === 429) {
        const retryAfterSeconds = parseRetryAfterSeconds(err);
        // Quota toàn dự án/billing không thể được giải quyết bằng model khác.
        // Chỉ thử fallback nếu Gemini nói rõ quota áp dụng riêng theo model.
        if (!hasModelSpecificQuota(err)) {
          throw new GeminiError(
            'QUOTA_EXCEEDED',
            'Hạn mức nhận diện hình ảnh đã hết. Vui lòng thử lại sau.',
            { retryAfterSeconds },
          );
        }
        continue;
      }
      // 503/504 có thể là sự cố tạm thời trên riêng model đó, nên thử model kế tiếp.
      if (status === 503 || status === 504) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      if (status === 404) continue; // model không còn -> thử model tiếp theo
      throw new GeminiError('FAILED', 'Không gọi được dịch vụ nhận diện ảnh.');
    }
  }

  if ((lastError?.status || lastError?.code) === 429) {
    throw new GeminiError(
      'QUOTA_EXCEEDED',
      'Hạn mức nhận diện hình ảnh đã hết. Vui lòng thử lại sau.',
      { retryAfterSeconds: parseRetryAfterSeconds(lastError) },
    );
  }
  console.error('[gemini] Tất cả model đều lỗi:', lastError?.message || lastError);
  throw new GeminiError('OVERLOADED', 'Hệ thống AI đang quá tải, vui lòng thử lại sau.');
}

module.exports = {
  recognizeDish,
  isConfigured,
  getModels,
  cleanKeyword,
  parseRetryAfterSeconds,
  hasModelSpecificQuota,
  GeminiError,
  DEFAULT_MODELS,
};
