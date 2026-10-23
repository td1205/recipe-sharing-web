require('dotenv').config();
const db = require('./config/db');

async function seedTagsAndMedia() {
  try {
    console.log('Creating tables...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS tags (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(50) NOT NULL UNIQUE,
          type VARCHAR(50) DEFAULT 'community', 
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS recipe_tags (
          recipe_id INT NOT NULL,
          tag_id INT NOT NULL,
          PRIMARY KEY (recipe_id, tag_id),
          FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS recipe_media (
          id INT AUTO_INCREMENT PRIMARY KEY,
          recipe_id INT NOT NULL,
          media_url VARCHAR(255) NOT NULL,
          media_type ENUM('image', 'video') DEFAULT 'image',
          display_order INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
      )
    `);

    console.log('Inserting mock tags...');
    // Thêm các tag giả lập cho Navbar
    const mockTags = [
      { name: 'Chay', type: 'dietary' },
      { name: 'Eat Clean', type: 'dietary' },
      { name: 'Keto', type: 'dietary' },
      { name: 'Việt Nam', type: 'cuisine' },
      { name: 'Hàn Quốc', type: 'cuisine' },
      { name: 'Món Âu', type: 'cuisine' },
      { name: 'Hải Sản', type: 'ingredient' },
      { name: 'Thịt Đỏ', type: 'ingredient' },
      { name: 'Gia Cầm', type: 'ingredient' },
      { name: 'Siêu Cay', type: 'community' },
      { name: 'Dễ Làm', type: 'community' },
      { name: 'Giá Rẻ', type: 'community' },
    ];

    for (const tag of mockTags) {
      await db.query('INSERT IGNORE INTO tags (name, type) VALUES (?, ?)', [tag.name, tag.type]);
    }

    console.log('Inserting mock media and recipe_tags for existing recipes...');
    // Lấy tất cả recipe hiện có
    const [recipes] = await db.query('SELECT id, image_url FROM recipes');
    
    // Lấy tất cả tag ID
    const [tags] = await db.query('SELECT id FROM tags');

    for (const recipe of recipes) {
      // 1. Thêm media giả lập
      // Bản thân ảnh bìa
      await db.query('INSERT IGNORE INTO recipe_media (recipe_id, media_url, media_type, display_order) VALUES (?, ?, ?, ?)', [recipe.id, recipe.image_url || 'https://via.placeholder.com/808x455', 'image', 1]);
      // Thêm 3 ảnh phụ
      await db.query('INSERT IGNORE INTO recipe_media (recipe_id, media_url, media_type, display_order) VALUES (?, ?, ?, ?)', [recipe.id, 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?q=80&w=808', 'image', 2]);
      await db.query('INSERT IGNORE INTO recipe_media (recipe_id, media_url, media_type, display_order) VALUES (?, ?, ?, ?)', [recipe.id, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=808', 'image', 3]);
      await db.query('INSERT IGNORE INTO recipe_media (recipe_id, media_url, media_type, display_order) VALUES (?, ?, ?, ?)', [recipe.id, 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=808', 'image', 4]);
      
      // 2. Map random 2-4 tags cho mỗi công thức
      const numTags = Math.floor(Math.random() * 3) + 2;
      const shuffledTags = tags.sort(() => 0.5 - Math.random());
      for (let i = 0; i < numTags; i++) {
         await db.query('INSERT IGNORE INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)', [recipe.id, shuffledTags[i].id]);
      }
    }

    console.log('Database seeded with tags and media successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedTagsAndMedia();
