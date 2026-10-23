const articleModel = require('../repositories/articleRepository');

async function getAll(req, res) {
  try {
    const articles = await articleModel.getAll();
    res.json({ success: true, articles });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const article = await articleModel.getById(id);
    if (!article) return res.status(404).json({ success: false, message: 'Not found' });
    
    // Tăng lượt xem
    await articleModel.incrementViews(id);

    res.json({ success: true, article });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function create(req, res) {
  try {
    const { title, content, image_url } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }
    
    const article = await articleModel.create({
      title,
      content,
      image_url,
      author_id: req.session.user.id
    });
    res.json({ success: true, article });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const { title, content, image_url } = req.body;
    
    const article = await articleModel.update(id, { title, content, image_url });
    res.json({ success: true, article });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    await articleModel.delete(id);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};
