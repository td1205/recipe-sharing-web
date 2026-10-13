import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import LoginRequiredModal from '../components/LoginRequiredModal';
import { AuthContext } from '../context/AuthContext';
import SkeletonLoader from '../components/SkeletonLoader';
import toast from 'react-hot-toast';
import './Home.css';
import './recipeForm.css';

// Short label for a step, used in the drag-and-drop screen-reader announcements.
const truncateStep = (text = '', max = 40) => {
  const clean = text.trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
};

const RecipeEdit = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [recipe, setRecipe] = useState({});
  const [categories, setCategories] = useState([]);
  const [courseTypes, setCourseTypes] = useState([]);
  const [mealTimes, setMealTimes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [steps, setSteps] = useState([]);
  const [mediaList, setMediaList] = useState([]);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [dragStepId, setDragStepId] = useState(null);
  const [dragOverStepId, setDragOverStepId] = useState(null);
  const [stepAnnouncement, setStepAnnouncement] = useState('');
  // Media rows that already have a file hide their picker until "Thay" is pressed.
  const [replacingMediaId, setReplacingMediaId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Editing is owner-only, so ask anonymous visitors to sign in first.
  const requireLogin = (action) => {
    if (user) {
      action();
      return;
    }
    setIsLoginModalOpen(true);
  };

  useEffect(() => {
    const fetchEditPageData = async () => {
      try {
        const res = await axios.get(`/api/recipes/edit/${id}`);
        if (res.data.success) {
          setRecipe(res.data.recipe);
          setCategories(res.data.categories || []);
          setCourseTypes(res.data.courseTypes || []);
          setMealTimes(res.data.mealTimes || []);

          setIngredients(res.data.ingredients && res.data.ingredients.length > 0
            ? res.data.ingredients.map(ing => ({ ...ing, id: crypto.randomUUID() }))
            : [{ id: crypto.randomUUID(), name: '', amount: '', unit: '' }]);

          setSteps(res.data.steps && res.data.steps.length > 0
            ? res.data.steps.map(s => ({ id: crypto.randomUUID(), text: s.instruction }))
            : [{ id: crypto.randomUUID(), text: '' }]);

          if (res.data.media && res.data.media.length > 0) {
            setMediaList(res.data.media.map(m => ({ id: crypto.randomUUID(), media_url: m.media_url, media_type: m.media_type })));
          } else if (res.data.recipe.image_url) {
            setMediaList([{ id: crypto.randomUUID(), media_url: res.data.recipe.image_url, media_type: 'image' }]);
          } else {
            setMediaList([{ id: crypto.randomUUID(), media_url: '', media_type: 'image' }]);
          }
        } else {
          setError(res.data.message);
        }
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          setIsLoginModalOpen(true);
        } else {
          setError('Lỗi khi tải dữ liệu trang sửa.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchEditPageData();
  }, [id]);

  const addIngredient = () => {
    setIngredients([...ingredients, { id: crypto.randomUUID(), name: '', amount: '', unit: '' }]);
  };

  const handleIngredientChange = (rowId, field, value) => {
    setIngredients(ingredients.map(ing =>
      ing.id === rowId ? { ...ing, [field]: value } : ing
    ));
  };

  const removeIngredient = (rowId) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter(ing => ing.id !== rowId));
    }
  };

  const addStep = () => {
    setSteps([...steps, { id: crypto.randomUUID(), text: '' }]);
  };

  const removeStep = (rowId) => {
    if (steps.length > 1) {
      setSteps(steps.filter(step => step.id !== rowId));
    }
  };

  const handleStepChange = (rowId, value) => {
    setSteps(steps.map(step =>
      step.id === rowId ? { ...step, text: value } : step
    ));
  };

  // Move a step to an absolute index, then announce the new position for screen readers.
  const applyStepOrder = (fromId, toId) => {
    setSteps(prev => {
      const fromIdx = prev.findIndex(s => s.id === fromId);
      const toIdx = prev.findIndex(s => s.id === toId);
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return prev;

      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      setStepAnnouncement(`Đã chuyển "${truncateStep(moved.text)}" lên vị trí ${toIdx + 1}.`);
      return next;
    });
  };

  const handleStepDragStart = (e, rowId) => {
    setDragStepId(rowId);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox refuses to start a drag unless some payload is set.
    e.dataTransfer.setData('text/plain', rowId);
  };

  const handleStepDragOver = (e, rowId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (rowId !== dragStepId) setDragOverStepId(rowId);
  };

  const handleStepDrop = (e, rowId) => {
    e.preventDefault();
    const fromId = e.dataTransfer.getData('text/plain') || dragStepId;
    if (fromId && fromId !== rowId) applyStepOrder(fromId, rowId);
    clearStepDrag();
  };

  const clearStepDrag = () => {
    setDragStepId(null);
    setDragOverStepId(null);
  };

  // Keyboard equivalent of dragging: focus the handle and press the arrow keys.
  const handleStepKeyDown = (e, rowId) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();

    const idx = steps.findIndex(s => s.id === rowId);
    const target = idx + (e.key === 'ArrowUp' ? -1 : 1);
    if (idx < 0 || target < 0 || target >= steps.length) return;

    applyStepOrder(rowId, steps[target].id);
    // Keep focus on the handle that just moved so repeated presses keep working.
    requestAnimationFrame(() => {
      document.querySelector(`[data-step-handle="${rowId}"]`)?.focus();
    });
  };

  const addMedia = () => {
    setMediaList([...mediaList, { id: crypto.randomUUID(), media_url: '', media_type: 'image' }]);
  };

  const removeMedia = (rowId) => {
    if (mediaList.length > 1) {
      setMediaList(mediaList.filter(m => m.id !== rowId));
      setReplacingMediaId(cur => (cur === rowId ? null : cur));
    }
  };

  const handleMediaUpload = async (e, rowId) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show the picked file name right away, independent of the upload result.
    setMediaList(mediaList.map(m =>
      m.id === rowId ? { ...m, fileName: file.name } : m
    ));
    e.target.value = '';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ml_default');

    const mediaType = file.type.startsWith('video/') ? 'video' : 'image';

    setUploading(true);
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/lzqavovj/${mediaType}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Lỗi upload');

      setMediaList(mediaList.map(m =>
        m.id === rowId ? { ...m, media_url: data.secure_url, media_type: mediaType } : m
      ));
      setReplacingMediaId(null);

      // Update first image to recipe.image_url as fallback
      if (mediaList.findIndex(m => m.id === rowId) === 0 && mediaType === 'image') {
        setRecipe(prev => ({ ...prev, image_url: data.secure_url }));
      }
    } catch (error) {
      toast.error('Lỗi tải ảnh lên Cloudinary: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      title: recipe.title,
      category_id: recipe.category_id,
      description: recipe.description,
      image_url: recipe.image_url,
      prep_time: recipe.prep_time,
      cook_time: recipe.cook_time,
      servings: recipe.servings,
      meal_time_id: recipe.meal_time_id,
      course_type_id: recipe.course_type_id,
      ing_name: ingredients.map(i => i.name),
      ing_amount: ingredients.map(i => i.amount),
      ing_unit: ingredients.map(i => i.unit),
      step_instruction: steps.map(s => s.text),
      media_urls: [],
      media_types: []
    };

    mediaList.forEach(m => {
      if (m.media_url && m.media_url.trim() !== '') {
        data.media_urls.push(m.media_url);
        data.media_types.push(m.media_type);
      }
    });

    try {
      const res = await axios.post(`/api/recipes/edit/${id}`, data);
      if (res.data.success) {
        toast.success('Cập nhật thành công!');
        navigate(`/recipes/${id}`);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setIsLoginModalOpen(true);
      } else {
        toast.error('Lỗi khi cập nhật công thức');
      }
    }
  };

  const handleRecipeChange = (e) => {
    setRecipe({
      ...recipe,
      [e.target.name]: e.target.value
    });
  };

  if (loading) {
    return <MainLayout hideSidebar className="home-typography"><SkeletonLoader /></MainLayout>;
  }

  if (error) {
    return (
      <MainLayout hideSidebar className="home-typography">
        <div className="auth-shell">
          <div className="auth-alert auth-alert-error" role="alert">{error}</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout hideSidebar className="home-typography">
      <div className="recipe-form-page">
        <p className="recipe-form-eyebrow">
          <span className="recipe-form-eyebrow-dot" aria-hidden="true"></span>
          Quản lý nội dung
        </p>

        <h1 className="recipe-form-title">
          Chỉnh sửa công thức
        </h1>

        <form className="recipe-form" onSubmit={handleSubmit}>

          {/* THÔNG TIN CƠ BẢN */}
          <section className="recipe-form-section">
            <h2 className="recipe-form-section-title">Thông tin cơ bản</h2>

            <div className="recipe-form-stack">
              <div className="recipe-form-group">
                <label className="recipe-form-label" htmlFor="edit-title">
                  Tên món ăn <span className="recipe-form-required">*</span>
                </label>
                <input
                  id="edit-title"
                  className="recipe-form-control"
                  type="text"
                  name="title"
                  value={recipe.title || ''}
                  onChange={handleRecipeChange}
                  required
                />
              </div>

              <div className="recipe-form-grid">
                <div className="recipe-form-group">
                  <label className="recipe-form-label" htmlFor="edit-category">
                    Danh mục <span className="recipe-form-required">*</span>
                  </label>
                  <select
                    id="edit-category"
                    className="recipe-form-control"
                    name="category_id"
                    value={recipe.category_id || ''}
                    onChange={handleRecipeChange}
                    required
                  >
                    <option value="" disabled>Chọn danh mục</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>

                <div className="recipe-form-group">
                  <label className="recipe-form-label" htmlFor="edit-meal-time">Bữa ăn</label>
                  <select
                    id="edit-meal-time"
                    className="recipe-form-control"
                    name="meal_time_id"
                    value={recipe.meal_time_id || ''}
                    onChange={handleRecipeChange}
                  >
                    <option value="">(Không chọn)</option>
                    {mealTimes.map(mt => <option key={mt.id} value={mt.id}>{mt.name}</option>)}
                  </select>
                </div>

                <div className="recipe-form-group">
                  <label className="recipe-form-label" htmlFor="edit-course-type">Loại món</label>
                  <select
                    id="edit-course-type"
                    className="recipe-form-control"
                    name="course_type_id"
                    value={recipe.course_type_id || ''}
                    onChange={handleRecipeChange}
                  >
                    <option value="">(Không chọn)</option>
                    {courseTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="recipe-form-group">
                <label className="recipe-form-label" htmlFor="edit-description">
                  Mô tả ngắn <span className="recipe-form-required">*</span>
                </label>
                <textarea
                  id="edit-description"
                  className="recipe-form-control"
                  name="description"
                  rows="4"
                  value={recipe.description || ''}
                  onChange={handleRecipeChange}
                  required
                ></textarea>
              </div>

              <div className="recipe-form-grid">
                <div className="recipe-form-group">
                  <label className="recipe-form-label" htmlFor="edit-prep-time">Chuẩn bị (phút)</label>
                  <input
                    id="edit-prep-time"
                    className="recipe-form-control"
                    type="number"
                    name="prep_time"
                    min="0"
                    value={recipe.prep_time || 0}
                    onChange={handleRecipeChange}
                  />
                </div>
                <div className="recipe-form-group">
                  <label className="recipe-form-label" htmlFor="edit-cook-time">Chế biến (phút)</label>
                  <input
                    id="edit-cook-time"
                    className="recipe-form-control"
                    type="number"
                    name="cook_time"
                    min="0"
                    value={recipe.cook_time || 0}
                    onChange={handleRecipeChange}
                  />
                </div>
                <div className="recipe-form-group">
                  <label className="recipe-form-label" htmlFor="edit-servings">Khẩu phần (người)</label>
                  <input
                    id="edit-servings"
                    className="recipe-form-control"
                    type="number"
                    name="servings"
                    min="1"
                    value={recipe.servings || 1}
                    onChange={handleRecipeChange}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* THƯ VIỆN HÌNH ẢNH / VIDEO */}
          <section className="recipe-form-section">
            <h2 className="recipe-form-section-title">Hình ảnh &amp; Video</h2>
            <p className="recipe-form-note">
              Thêm nhiều ảnh/video để món ăn thêm hấp dẫn. Ảnh đầu tiên sẽ làm ảnh đại diện.
            </p>

            <div className="recipe-form-stack">
              {mediaList.map((m, idx) => (
                <div key={m.id} className="recipe-form-media-row">
                  <div className="recipe-form-media-body">
                    <span className="recipe-form-media-label">
                      Media {idx + 1} {idx === 0 ? '(Đại diện)' : ''}
                    </span>

                    {m.media_url && m.media_type === 'image' && (
                      <img className="recipe-form-preview" src={m.media_url} alt="Xem trước" />
                    )}
                    {m.media_url && m.media_type === 'video' && (
                      <video className="recipe-form-preview-video" src={m.media_url} controls></video>
                    )}

                    {/* Empty slot, or the row is being replaced: show the picker. */}
                    {(!m.media_url || replacingMediaId === m.id) && (
                      <div className={`recipe-form-file${m.fileName ? ' has-file' : ''}`}>
                        {/* Real input stays focusable; the label is only the visual skin. */}
                        <input
                          className="recipe-form-file-input"
                          type="file"
                          accept="image/*,video/*"
                          aria-label={`Chọn tệp cho media ${idx + 1}`}
                          onChange={(e) => handleMediaUpload(e, m.id)}
                        />
                        <span className="recipe-form-file-label">
                          <i className="fa-solid fa-upload" aria-hidden="true"></i>
                          Chọn tệp
                        </span>
                        <span className="recipe-form-file-name">
                          {m.fileName || 'Chưa chọn tệp nào'}
                        </span>
                      </div>
                    )}

                    {m.media_url && replacingMediaId !== m.id && (
                      <button
                        type="button"
                        className="recipe-form-btn recipe-form-btn-ghost recipe-form-btn-sm"
                        onClick={() => setReplacingMediaId(m.id)}
                      >
                        <i className="fa-solid fa-rotate" aria-hidden="true"></i>
                        Thay {m.media_type === 'video' ? 'video' : 'ảnh'}
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    className="recipe-form-btn recipe-form-btn-danger recipe-form-btn-icon"
                    onClick={() => removeMedia(m.id)}
                    disabled={mediaList.length === 1}
                    title="Xóa"
                    aria-label={`Xóa media ${idx + 1}`}
                  >
                    <i className="fa-solid fa-trash" aria-hidden="true"></i>
                  </button>
                </div>
              ))}

              {uploading && <div className="recipe-form-uploading">Đang tải file lên...</div>}

              <button
                type="button"
                className="recipe-form-btn recipe-form-btn-ghost"
                onClick={addMedia}
                style={{ alignSelf: 'flex-start' }}
              >
                <i className="fa-solid fa-plus" aria-hidden="true"></i>
                Thêm Media
              </button>
            </div>
          </section>

          {/* NGUYÊN LIỆU */}
          <section className="recipe-form-section">
            <h2 className="recipe-form-section-title">
              Nguyên liệu <span className="recipe-form-required">*</span>
            </h2>

            <div className="recipe-form-stack">
              {ingredients.map((ing, idx) => (
                <div key={ing.id} className="recipe-form-row">
                  <span className="recipe-form-index" aria-hidden="true">{idx + 1}</span>
                  <input
                    className="recipe-form-control"
                    style={{ flex: 2 }}
                    type="text"
                    placeholder="Tên nguyên liệu (VD: Thịt bò)"
                    aria-label={`Tên nguyên liệu ${idx + 1}`}
                    value={ing.name}
                    onChange={(e) => handleIngredientChange(ing.id, 'name', e.target.value)}
                    required
                  />
                  <input
                    className="recipe-form-control"
                    style={{ flex: 1 }}
                    type="text"
                    placeholder="Số lượng"
                    aria-label={`Số lượng nguyên liệu ${idx + 1}`}
                    value={ing.amount}
                    onChange={(e) => handleIngredientChange(ing.id, 'amount', e.target.value)}
                    required
                  />
                  <input
                    className="recipe-form-control"
                    style={{ flex: 1 }}
                    type="text"
                    placeholder="Đơn vị"
                    aria-label={`Đơn vị nguyên liệu ${idx + 1}`}
                    value={ing.unit}
                    onChange={(e) => handleIngredientChange(ing.id, 'unit', e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="recipe-form-btn recipe-form-btn-danger recipe-form-btn-icon"
                    onClick={() => removeIngredient(ing.id)}
                    disabled={ingredients.length === 1}
                    title="Xóa"
                    aria-label={`Xóa nguyên liệu ${idx + 1}`}
                  >
                    <i className="fa-solid fa-trash" aria-hidden="true"></i>
                  </button>
                </div>
              ))}

              <button
                type="button"
                className="recipe-form-btn recipe-form-btn-ghost"
                onClick={addIngredient}
                style={{ alignSelf: 'flex-start' }}
              >
                <i className="fa-solid fa-plus" aria-hidden="true"></i>
                Thêm nguyên liệu
              </button>
            </div>
          </section>

          {/* CÁC BƯỚC THỰC HIỆN */}
          <section className="recipe-form-section">
            <h2 className="recipe-form-section-title">
              Các bước thực hiện <span className="recipe-form-required">*</span>
            </h2>

            <p className="recipe-form-note">
              Kéo biểu tượng <i className="fa-solid fa-grip-vertical" aria-hidden="true"></i> để đổi thứ tự các bước, hoặc dùng phím <kbd>↑</kbd> <kbd>↓</kbd> khi thao tác bằng bàn phím.
            </p>
            <p className="sr-only" role="status" aria-live="polite">{stepAnnouncement}</p>

            <div className="recipe-form-stack">
              {steps.map((step, idx) => (
                <div
                  key={step.id}
                  className="recipe-form-row"
                  draggable
                  onDragStart={(e) => handleStepDragStart(e, step.id)}
                  onDragOver={(e) => handleStepDragOver(e, step.id)}
                  onDrop={(e) => handleStepDrop(e, step.id)}
                  onDragEnd={clearStepDrag}
                  data-dragging={dragStepId === step.id ? 'true' : undefined}
                  data-drag-over={dragOverStepId === step.id ? 'true' : undefined}
                >
                  <button
                    type="button"
                    className="recipe-form-drag-handle"
                    data-step-handle={step.id}
                    onKeyDown={(e) => handleStepKeyDown(e, step.id)}
                    title="Kéo để đổi thứ tự (hoặc dùng phím mũi tên)"
                    aria-label={`Đổi thứ tự bước ${idx + 1} của ${steps.length}`}
                  >
                    <i className="fa-solid fa-grip-vertical" aria-hidden="true"></i>
                  </button>

                  <span className="recipe-form-index" aria-hidden="true">{idx + 1}</span>
                  <textarea
                    className="recipe-form-control"
                    rows="3"
                    placeholder="Hướng dẫn chi tiết bước này..."
                    aria-label={`Nội dung bước ${idx + 1}`}
                    value={step.text}
                    onChange={(e) => handleStepChange(step.id, e.target.value)}
                    required
                  ></textarea>
                  <button
                    type="button"
                    className="recipe-form-btn recipe-form-btn-danger recipe-form-btn-icon"
                    onClick={() => removeStep(step.id)}
                    disabled={steps.length === 1}
                    title="Xóa"
                    aria-label={`Xóa bước ${idx + 1}`}
                  >
                    <i className="fa-solid fa-trash" aria-hidden="true"></i>
                  </button>
                </div>
              ))}

              <button
                type="button"
                className="recipe-form-btn recipe-form-btn-ghost"
                onClick={addStep}
                style={{ alignSelf: 'flex-start' }}
              >
                <i className="fa-solid fa-plus" aria-hidden="true"></i>
                Thêm bước thực hiện
              </button>
            </div>
          </section>

          <div className="recipe-form-actions">
            <button
              type="button"
              className="recipe-form-btn recipe-form-btn-ghost recipe-form-btn-lg"
              onClick={() => navigate(`/recipes/${id}`)}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="recipe-form-btn recipe-form-btn-primary recipe-form-btn-lg"
              disabled={uploading}
            >
              {uploading ? 'Đang tải...' : 'Lưu thay đổi'}
            </button>
          </div>

        </form>

        <LoginRequiredModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      </div>
    </MainLayout>
  );
};

export default RecipeEdit;