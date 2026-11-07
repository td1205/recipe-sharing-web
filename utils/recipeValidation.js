// Đọc và kiểm tra dữ liệu công thức gửi lên khi đăng/sửa.
// Trả về { errors, data }: errors là danh sách lỗi tiếng Việt (rỗng nếu hợp lệ),
// data là dữ liệu đã chuẩn hoá để đưa xuống repository.

const LIMITS = {
  titleMin: 3,
  titleMax: 255,
  descriptionMax: 5000,
  timeMax: 1440, // phút, tối đa 1 ngày
  servingsMax: 100,
  ingredientsMax: 60,
  ingredientNameMax: 255,
  amountMax: 50,
  unitMax: 50,
  stepsMax: 50,
  stepMax: 3000,
  mediaMax: 10,
  urlMax: 255,
  tagsMax: 10,
  tagMax: 50,
};

const toArray = (value) => {
  if (value === undefined || value === null || value === '') return [];
  return Array.isArray(value) ? value : [value];
};
const str = (value) => typeof value === 'string' ? value.trim() : typeof value === 'number' && Number.isFinite(value) ? String(value) : '';

function parseIntField(value, { name, min, max, required, errors }) {
  if (value != null && !['string', 'number'].includes(typeof value)) {
    errors.push(`${name} phải là số nguyên.`);
    return null;
  }
  const raw = str(value);
  if (raw === '') {
    if (required) errors.push(`${name} là bắt buộc.`);
    return null;
  }
  if (!/^\d+$/.test(raw)) {
    errors.push(`${name} phải là số nguyên không âm.`);
    return null;
  }
  const n = Number(raw);
  if (n < min || n > max) {
    errors.push(`${name} phải trong khoảng ${min}–${max}.`);
    return null;
  }
  return n;
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

// Tag: chữ thường, bỏ dấu # đầu, gộp khoảng trắng, bỏ trùng
function normalizeTags(value) {
  const list = toArray(value).flatMap((item) => typeof item === 'string' ? item.split(',') : []);
  const seen = new Set();
  const tags = [];
  for (const item of list) {
    const tag = item.replace(/^#+/, '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  }
  return tags;
}

function validateRecipeInput(body = {}) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};
  for (const field of ['title', 'description', 'image_url', 'video_url']) {
    if (body[field] != null && typeof body[field] !== 'string') errors.push(`${field} phải là chuỗi.`);
  }
  for (const field of ['ing_name', 'ing_amount', 'ing_unit', 'step_instruction', 'media_urls', 'media_types', 'tags']) {
    if (toArray(body[field]).some(value => typeof value !== 'string' && !(field === 'ing_amount' && typeof value === 'number'))) {
      errors.push(`${field} chứa dữ liệu sai kiểu.`);
    }
  }

  const title = str(body.title);
  if (!title) errors.push('Tên món là bắt buộc.');
  else if (title.length < LIMITS.titleMin || title.length > LIMITS.titleMax)
    errors.push(`Tên món phải dài ${LIMITS.titleMin}–${LIMITS.titleMax} ký tự.`);

  const description = str(body.description);
  if (!description) errors.push('Mô tả ngắn là bắt buộc.');
  else if (description.length > LIMITS.descriptionMax)
    errors.push(`Mô tả tối đa ${LIMITS.descriptionMax} ký tự.`);

  const categoryId = parseIntField(body.category_id, { name: 'Danh mục', min: 1, max: 2147483647, required: true, errors });
  const mealTimeId = parseIntField(body.meal_time_id, { name: 'Bữa ăn', min: 1, max: 2147483647, errors });
  const courseTypeId = parseIntField(body.course_type_id, { name: 'Loại món', min: 1, max: 2147483647, errors });
  const prepTime = parseIntField(body.prep_time, { name: 'Thời gian chuẩn bị', min: 0, max: LIMITS.timeMax, errors }) ?? 0;
  const cookTime = parseIntField(body.cook_time, { name: 'Thời gian chế biến', min: 0, max: LIMITS.timeMax, errors }) ?? 0;
  const servings = parseIntField(body.servings, { name: 'Khẩu phần', min: 1, max: LIMITS.servingsMax, errors }) ?? 1;

  // Nguyên liệu: bỏ các dòng để trống tên
  const names = toArray(body.ing_name);
  const amounts = toArray(body.ing_amount);
  const units = toArray(body.ing_unit);
  const ingredients = [];
  names.forEach((rawName, i) => {
    const name = str(rawName);
    if (!name) return;
    const amount = str(amounts[i]);
    const unit = str(units[i]);
    if (name.length > LIMITS.ingredientNameMax) errors.push(`Tên nguyên liệu "${name.slice(0, 30)}…" quá dài.`);
    if (amount.length > LIMITS.amountMax) errors.push(`Định lượng của "${name}" tối đa ${LIMITS.amountMax} ký tự.`);
    if (unit.length > LIMITS.unitMax) errors.push(`Đơn vị của "${name}" tối đa ${LIMITS.unitMax} ký tự.`);
    ingredients.push({ name, amount: amount || null, unit: unit || null });
  });
  if (ingredients.length === 0) errors.push('Cần ít nhất 1 nguyên liệu.');
  if (ingredients.length > LIMITS.ingredientsMax) errors.push(`Tối đa ${LIMITS.ingredientsMax} nguyên liệu.`);

  // Các bước: đánh số lại liên tục sau khi bỏ bước trống
  const steps = toArray(body.step_instruction)
    .map(str)
    .filter(Boolean)
    .map((instruction, i) => ({ step_number: i + 1, instruction }));
  if (steps.length === 0) errors.push('Cần ít nhất 1 bước thực hiện.');
  if (steps.length > LIMITS.stepsMax) errors.push(`Tối đa ${LIMITS.stepsMax} bước.`);
  if (steps.some((s) => s.instruction.length > LIMITS.stepMax)) errors.push(`Mỗi bước tối đa ${LIMITS.stepMax} ký tự.`);

  // Ảnh/video
  const mediaUrls = toArray(body.media_urls);
  const mediaTypes = toArray(body.media_types);
  const media = [];
  mediaUrls.forEach((rawUrl, i) => {
    const url = str(rawUrl);
    if (!url) return;
    const type = str(mediaTypes[i]) || 'image';
    if (!isHttpUrl(url) || url.length > LIMITS.urlMax) errors.push('Đường dẫn ảnh/video không hợp lệ.');
    else if (type !== 'image' && type !== 'video') errors.push('Loại media chỉ được là ảnh hoặc video.');
    else media.push({ media_url: url, media_type: type });
  });
  const videoUrl = str(body.video_url);
  if (videoUrl) {
    if (isHttpUrl(videoUrl) && videoUrl.length <= LIMITS.urlMax) media.push({ media_url: videoUrl, media_type: 'video' });
    else errors.push('Đường dẫn video không hợp lệ.');
  }
  if (media.length > LIMITS.mediaMax) errors.push(`Tối đa ${LIMITS.mediaMax} ảnh/video.`);

  // Ảnh đại diện = ảnh đầu tiên trong danh sách media (để không bị lệch khi xoá/đổi ảnh);
  // chỉ dùng image_url gửi lên khi món không có ảnh nào trong media.
  let imageUrl = media.find((m) => m.media_type === 'image')?.media_url || '';
  if (!imageUrl) {
    imageUrl = str(body.image_url);
    if (imageUrl && (!isHttpUrl(imageUrl) || imageUrl.length > LIMITS.urlMax)) {
      errors.push('Ảnh đại diện không hợp lệ.');
      imageUrl = '';
    }
  }
  imageUrl = imageUrl || null;

  // Tag: chỉ kiểm tra khi client có gửi trường tags (undefined = giữ nguyên tag cũ khi sửa)
  let tags;
  if (body.tags !== undefined) {
    tags = normalizeTags(body.tags);
    if (tags.length > LIMITS.tagsMax) errors.push(`Tối đa ${LIMITS.tagsMax} tag.`);
    if (tags.some((t) => t.length > LIMITS.tagMax)) errors.push(`Mỗi tag tối đa ${LIMITS.tagMax} ký tự.`);
  }

  return {
    errors: [...new Set(errors)],
    data: {
      recipe: {
        title,
        description,
        category_id: categoryId,
        prep_time: prepTime,
        cook_time: cookTime,
        servings,
        image_url: imageUrl,
        meal_time_id: mealTimeId,
        course_type_id: courseTypeId,
      },
      ingredients,
      steps,
      media,
      tags,
    },
  };
}

module.exports = { validateRecipeInput, normalizeTags, LIMITS };
