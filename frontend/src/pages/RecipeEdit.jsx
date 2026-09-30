import toast from 'react-hot-toast';
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { AuthContext } from '../context/AuthContext';
import SkeletonLoader from '../components/SkeletonLoader';

const RecipeEdit = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [courseTypes, setCourseTypes] = useState([]);
  const [mealTimes, setMealTimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const [recipe, setRecipe] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [steps, setSteps] = useState([]);

  useEffect(() => {
    const fetchEditPageData = async () => {
      try {
        const res = await axios.get(`/api/recipes/edit/${id}`);
        if (res.data.success) {
          setRecipe(res.data.recipe);
          setCategories(res.data.categories || []);
          setCourseTypes(res.data.courseTypes || []);
          setMealTimes(res.data.mealTimes || []);
          setIngredients(res.data.ingredients 
            ? res.data.ingredients.map(ing => ({ ...ing, id: crypto.randomUUID() })) 
            : [{ id: crypto.randomUUID(), name: '', amount: '', unit: '' }]);
          
          if (res.data.steps && res.data.steps.length > 0) {
            setSteps(res.data.steps.map(s => ({ id: crypto.randomUUID(), text: s.instruction })));
          } else {
            setSteps([{ id: crypto.randomUUID(), text: '' }]);
          }
        }
      } catch (err) {
        if (err.response?.status === 401) {
          navigate('/login');
        } else if (err.response?.status === 403) {
          navigate('/');
        } else {
          setError('Không thể tải dữ liệu trang hoặc không tìm thấy công thức');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchEditPageData();
  }, [id, navigate]);

  const addIngredient = () => {
    setIngredients([...ingredients, { id: crypto.randomUUID(), name: '', amount: '', unit: '' }]);
  };

  const removeIngredient = (id) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter(ing => ing.id !== id));
    }
  };

  const handleIngredientChange = (id, field, value) => {
    setIngredients(ingredients.map(ing => 
      ing.id === id ? { ...ing, [field]: value } : ing
    ));
  };

  const addStep = () => {
    setSteps([...steps, { id: crypto.randomUUID(), text: '' }]);
  };

  const removeStep = (id) => {
    if (steps.length > 1) {
      setSteps(steps.filter(step => step.id !== id));
    }
  };

  const handleStepChange = (id, value) => {
    setSteps(steps.map(step => 
      step.id === id ? { ...step, text: value } : step
    ));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ml_default');

    setUploading(true);
    try {
      const res = await fetch('https://api.cloudinary.com/v1_1/lzqavovj/image/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Lỗi upload');
      }
      setRecipe({ ...recipe, image_url: data.secure_url });
    } catch (error) {
      console.error('Lỗi tải ảnh:', error);
      toast.error('Không thể tải ảnh lên Cloudinary: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      title: formData.get('title'),
      category_id: formData.get('category_id'),
      description: formData.get('description'),
      image_url: formData.get('image_url'),
      prep_time: formData.get('prep_time'),
      cook_time: formData.get('cook_time'),
      servings: formData.get('servings'),
      meal_time_id: formData.get('meal_time_id'),
      course_type_id: formData.get('course_type_id'),
      ing_name: ingredients.map(i => i.name),
      ing_amount: ingredients.map(i => i.amount),
      ing_unit: ingredients.map(i => i.unit),
      step_instruction: steps.map(s => s.text)
    };

    try {
      const res = await axios.post(`/api/recipes/edit/${id}`, data);
      if (res.data.success) {
        navigate(`/recipes/${id}`);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
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

  if (loading) return <MainLayout hideSidebar><SkeletonLoader /></MainLayout>;
  if (error) return <MainLayout hideSidebar><div className="error-msg">{error}</div></MainLayout>;

  return (
    <MainLayout hideSidebar>
      <h2>Chỉnh sửa Công thức</h2>
      <form onSubmit={handleSubmit} className="recipe-form">
        <div className="form-group">
          <label>Tên món ăn</label>
          <input type="text" name="title" value={recipe.title || ''} onChange={handleRecipeChange} required />
        </div>
        <div className="form-group">
          <label>Danh mục</label>
          <select name="category_id" value={recipe.category_id || ''} onChange={handleRecipeChange} required>
            <option value="" disabled>Chọn danh mục</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
          <div className="form-group col" style={{ flex: 1 }}>
            <label>Bữa ăn (Tùy chọn)</label>
            <select name="meal_time_id" value={recipe.meal_time_id || ''} onChange={handleRecipeChange}>
              <option value="">Trống</option>
              {mealTimes.map(mt => (
                <option key={mt.id} value={mt.id}>{mt.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group col" style={{ flex: 1 }}>
            <label>Loại món (Tùy chọn)</label>
            <select name="course_type_id" value={recipe.course_type_id || ''} onChange={handleRecipeChange}>
              <option value="">Trống</option>
              {courseTypes.map(ct => (
                <option key={ct.id} value={ct.id}>{ct.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Mô tả ngắn</label>
          <textarea name="description" rows="3" value={recipe.description || ''} onChange={handleRecipeChange} required></textarea>
        </div>
        <div className="form-group">
          <label>Hình ảnh món ăn</label>
          <input type="file" accept="image/*" onChange={handleImageUpload} />
          {uploading && <span style={{color: 'var(--color-primary)', fontSize: '14px', marginTop: '5px', display: 'block'}}>Đang tải ảnh lên...</span>}
          <input type="hidden" name="image_url" value={recipe.image_url || ''} />
          {recipe.image_url && <img src={recipe.image_url} alt="Preview" style={{ width: '200px', borderRadius: '4px', marginTop: '10px', objectFit: 'cover', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />}
        </div>
        <div className="form-row">
          <div className="form-group col">
            <label>Chuẩn bị (phút)</label>
            <input type="number" name="prep_time" min="0" value={recipe.prep_time || 0} onChange={handleRecipeChange} />
          </div>
          <div className="form-group col">
            <label>Chế biến (phút)</label>
            <input type="number" name="cook_time" min="0" value={recipe.cook_time || 0} onChange={handleRecipeChange} />
          </div>
          <div className="form-group col">
            <label>Khẩu phần (người)</label>
            <input type="number" name="servings" min="1" value={recipe.servings || 1} onChange={handleRecipeChange} />
          </div>
        </div>
        <div className="form-section">
          <h3>Nguyên liệu</h3>
          <div id="ingredients-list">
            {ingredients.map((ing) => (
              <div className="ingredient-row" key={ing.id}>
                <input
                  type="text"
                  placeholder="Tên nguyên liệu (VD: Thịt bò)"
                  value={ing.name}
                  onChange={(e) => handleIngredientChange(ing.id, 'name', e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Số lượng (VD: 300)"
                  value={ing.amount}
                  onChange={(e) => handleIngredientChange(ing.id, 'amount', e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Đơn vị (VD: gram)"
                  value={ing.unit}
                  onChange={(e) => handleIngredientChange(ing.id, 'unit', e.target.value)}
                  required
                />
                <button type="button" className="btn-remove" onClick={() => removeIngredient(ing.id)}>
                  Xóa
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn-add" onClick={addIngredient}>
            + Thêm nguyên liệu
          </button>
        </div>
        <div className="form-section">
          <h3>Các bước thực hiện</h3>
          <div id="steps-list">
            {steps.map((step, idx) => (
              <div className="step-row" key={step.id}>
                <span className="step-num">Bước {idx + 1}:</span>
                <textarea
                  rows="2"
                  placeholder="Hướng dẫn chi tiết bước này..."
                  value={step.text}
                  onChange={(e) => handleStepChange(step.id, e.target.value)}
                  required
                ></textarea>
                <button type="button" className="btn-remove" onClick={() => removeStep(step.id)}>
                  Xóa
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn-add" onClick={addStep}>
            + Thêm bước
          </button>
        </div>
        <button type="submit" className="btn-submit">Cập nhật công thức</button>
      </form>
    </MainLayout>
  );
};

export default RecipeEdit;
