const multer = require('multer');
const { GoogleGenAI } = require('@google/genai');

// Cấu hình Multer để lưu file trong RAM (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // Giới hạn 5MB
}).single('image');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function handleScanImage(req, res) {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: 'Lỗi tải ảnh lên!' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Vui lòng cung cấp hình ảnh!' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    
    // Nếu không có API Key, sử dụng Mock Data để test
    if (!apiKey) {
      await sleep(1500);
      return res.json({ success: true, keyword: 'Gà rán' });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = "Bạn là một chuyên gia ẩm thực. Hãy nhìn hình ảnh này và trả về ĐÚNG MỘT TỪ KHÓA ngắn gọn là tên món ăn (ví dụ: Phở bò, Gà rán, Cơm tấm) bằng tiếng Việt. Không giải thích, không thêm dấu chấm câu.";
      
      const fallbackModels = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
      let response = null;
      let lastError = null;
      let attempts = 0;
      const MAX_ATTEMPTS = 5;

      while (attempts < MAX_ATTEMPTS && !response) {
        for (let i = 0; i < fallbackModels.length; i++) {
          const modelName = fallbackModels[i];
          attempts++;
          try {
            response = await ai.models.generateContent({
              model: modelName,
              contents: [
                prompt,
                {
                  inlineData: {
                    data: req.file.buffer.toString('base64'),
                    mimeType: req.file.mimetype
                  }
                }
              ]
            });
            if (response) break;
          } catch (err) {
            console.warn(`Lỗi khi gọi model ${modelName}:`, err.message || err);
            lastError = err;
            if (err.status === 503 || err.status === 429) {
              await sleep(3000);
              // Thử sang model tiếp theo trong danh sách
              continue; 
            }
            if (err.status === 404) {
              // Model bị gỡ bỏ, thử model tiếp theo
              continue;
            }
            throw err;
          }
        }
      }

      if (!response) {
        throw lastError || new Error('Hệ thống AI quá tải sau nhiều lần thử.');
      }

      const keyword = response.text.trim().replace(/\.$/, '');
      
      return res.json({ success: true, keyword });
    } catch (error) {
      console.error('Lỗi Gemini API:', error);
      return res.status(500).json({ success: false, error: 'Hệ thống AI đang quá tải, vui lòng thử lại sau.' });
    }
  });
}

module.exports = {
  handleScanImage
};
