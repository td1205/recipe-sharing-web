const test = require('node:test');
const assert = require('node:assert/strict');
const { validateRecipeInput, normalizeTags } = require('../utils/recipeValidation');

const validBody = () => ({
  title: 'Trứng chiên cà chua',
  description: 'Món nhanh gọn cho bữa tối',
  category_id: '3',
  prep_time: '5',
  cook_time: '10',
  servings: '2',
  meal_time_id: '',
  course_type_id: '2',
  ing_name: ['Trứng', 'Cà chua', ''],
  ing_amount: ['3', '2', ''],
  ing_unit: ['quả', 'quả', ''],
  step_instruction: ['Đánh trứng', '', 'Chiên với cà chua'],
  media_urls: ['https://res.cloudinary.com/demo/image/upload/a.jpg'],
  media_types: ['image'],
});

test('dữ liệu hợp lệ -> không có lỗi, chuẩn hoá đúng', () => {
  const { errors, data } = validateRecipeInput(validBody());
  assert.deepEqual(errors, []);
  assert.equal(data.recipe.category_id, 3);
  assert.equal(data.recipe.meal_time_id, null);
  assert.equal(data.recipe.course_type_id, 2);
  assert.equal(data.ingredients.length, 2, 'bỏ dòng nguyên liệu trống');
  assert.deepEqual(
    data.steps.map((s) => s.step_number),
    [1, 2],
    'đánh số lại bước sau khi bỏ bước trống',
  );
  assert.equal(data.recipe.image_url, 'https://res.cloudinary.com/demo/image/upload/a.jpg');
  assert.equal(data.tags, undefined, 'không gửi tags -> giữ nguyên tag cũ');
});

test('thiếu trường bắt buộc -> báo lỗi tiếng Việt', () => {
  const { errors } = validateRecipeInput({});
  assert.ok(errors.includes('Tên món là bắt buộc.'));
  assert.ok(errors.includes('Mô tả ngắn là bắt buộc.'));
  assert.ok(errors.includes('Danh mục là bắt buộc.'));
  assert.ok(errors.includes('Cần ít nhất 1 nguyên liệu.'));
  assert.ok(errors.includes('Cần ít nhất 1 bước thực hiện.'));
});

test('số không hợp lệ / ngoài khoảng bị từ chối', () => {
  const body = { ...validBody(), category_id: 'abc', cook_time: '-5', servings: '0' };
  const { errors } = validateRecipeInput(body);
  assert.ok(errors.some((e) => e.startsWith('Danh mục')));
  assert.ok(errors.some((e) => e.startsWith('Thời gian chế biến')));
  assert.ok(errors.some((e) => e.startsWith('Khẩu phần')));
});

test('đường dẫn media không phải http(s) bị từ chối', () => {
  const body = { ...validBody(), media_urls: ['javascript:alert(1)'], media_types: ['image'] };
  const { errors } = validateRecipeInput(body);
  assert.ok(errors.includes('Đường dẫn ảnh/video không hợp lệ.'));
});

test('chấp nhận giá trị đơn (không phải mảng) từ form', () => {
  const body = { ...validBody(), ing_name: 'Trứng', ing_amount: '2', ing_unit: 'quả', step_instruction: 'Chiên' };
  const { errors, data } = validateRecipeInput(body);
  assert.deepEqual(errors, []);
  assert.equal(data.ingredients.length, 1);
  assert.equal(data.steps.length, 1);
});

test('tag: chữ thường, bỏ #, bỏ trùng, giới hạn số lượng', () => {
  assert.deepEqual(normalizeTags(['#Thịt Gà', 'thịt gà', ' món  chay ']), ['thịt gà', 'món chay']);
  assert.deepEqual(normalizeTags('nhanh, dễ làm'), ['nhanh', 'dễ làm']);
  const many = Array.from({ length: 11 }, (_, i) => `tag${i}`);
  const { errors } = validateRecipeInput({ ...validBody(), tags: many });
  assert.ok(errors.includes('Tối đa 10 tag.'));
});
