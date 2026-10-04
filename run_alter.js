require('dotenv').config();
const db = require('./config/db');

async function runAlter() {
  try {
    await db.query(`ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255) DEFAULT NULL`);
    await db.query(`ALTER TABLE users ADD COLUMN bio TEXT DEFAULT NULL`);
    console.log('Added avatar_url and bio columns successfully');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Columns already exist');
    } else {
      console.error('Error altering table:', err);
    }
  } finally {
    process.exit(0);
  }
}
runAlter();
