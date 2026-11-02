const { GoogleGenAI } = require('@google/genai');

// Service Agent gọi Google Gemini để nhận diện món ăn từ ảnh.
// Tách riêng khỏi controller để controller chỉ lo HTTP, còn phần gọi API ngoài
// (chọn model, thử lại khi quá tải, chuẩn hoá kết quả) nằm ở đây.

// Danh sách model thử lần lượt. Có thể ghi đè bằng biến môi trường GEMINI_MODELS
// (nhiều model cách nhau bởi dấu phẩy), vd: GEMINI_MODELS=gemini-3.7-flash,gemini-3.6-flash
// Tên model tham khảo: https://ai.google.dev/gemini-api/docs/models
const DEFAULT_MODELS = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];

const PROMPT =
  'Bạn là một chuyên gia ẩm thực. Hãy nhìn hình ảnh này và trả về ĐÚNG MỘT TỪ KHÓA ngắn gọn ' +
  'là tên món ăn (ví dụ: Phở bò, Gà rán, Cơm tấm) bằng tiếng Việt. Không giải thích, không thêm dấu chấm câu. ' +
  'Nếu ảnh không phải món ăn, trả về đúng chữ: KHONG_PHAI_MON_AN';

const NOT_FOOD = 'KHONG_PHAI_MON_AN';
const RETRY_DELAY_MS = 2000;

// Lỗi có mã để controller đổi thành HTTP status phù hợp
class GeminiError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'GeminiError';
    this.code = code; // NOT_CONFIGURED | NOT_FOOD | OVERLOADED | INVALID_KEY | FAILED
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
      const response = await ai.models.generateContent({ model, contents });
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
      if (status === 429 || status === 503) {
        await sleep(RETRY_DELAY_MS);
        continue; // quá tải -> thử model tiếp theo
      }
      if (status === 404) continue; // model không còn -> thử model tiếp theo
      throw new GeminiError('FAILED', 'Không gọi được dịch vụ nhận diện ảnh.');
    }
  }

  console.error('[gemini] Tất cả model đều lỗi:', lastError?.message || lastError);
  throw new GeminiError('OVERLOADED', 'Hệ thống AI đang quá tải, vui lòng thử lại sau.');
}

module.exports = { recognizeDish, isConfigured, getModels, cleanKeyword, GeminiError, DEFAULT_MODELS };
