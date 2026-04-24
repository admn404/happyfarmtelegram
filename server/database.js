const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'farm.db');
const db = new Database(dbPath);

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      coins INTEGER DEFAULT 100
    );

    CREATE TABLE IF NOT EXISTS fields (
      id INTEGER,
      user_id TEXT,
      unlocked INTEGER DEFAULT 0,
      price INTEGER DEFAULT 0,
      crop_type TEXT,
      planted_at TEXT,
      PRIMARY KEY (id, user_id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
  try {
    db.exec(`ALTER TABLE users ADD COLUMN game_state TEXT DEFAULT '{}'`);
  } catch (e) {
    // Column might already exist
  }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN name TEXT`);
    db.exec(`ALTER TABLE users ADD COLUMN total_earned INTEGER DEFAULT 0`);
  } catch (e) {
    // Columns might already exist
  }
}

initDB();

function getUserState(userId) {
  let user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  
  if (!user) {
    const insertUser = db.prepare('INSERT INTO users (id, coins, total_earned) VALUES (?, 100, 0)');
    insertUser.run(userId);
    
    const insertField = db.prepare('INSERT INTO fields (id, user_id, unlocked, price) VALUES (?, ?, ?, ?)');
    // Транзакция для надежности
    const initFields = db.transaction(() => {
      insertField.run(0, userId, 1, 0);
      insertField.run(1, userId, 0, 50);
      insertField.run(2, userId, 0, 100);
      insertField.run(3, userId, 0, 200);
    });
    initFields();
    
    user = { id: userId, coins: 100 };
  }
  
  const fieldsRows = db.prepare('SELECT * FROM fields WHERE user_id = ? ORDER BY id ASC').all(userId);
  
  const fields = fieldsRows.map(row => ({
    id: row.id,
    unlocked: Boolean(row.unlocked),
    price: row.price,
    crop: row.crop_type ? { type: row.crop_type, plantedAt: row.planted_at } : null
  }));
  
  return {
    coins: user.coins,
    totalEarned: user.total_earned,
    fields: fields,
    gameState: JSON.parse(user.game_state || '{}')
  };
}

function updateCoins(userId, amount) {
  if (amount > 0) {
    db.prepare('UPDATE users SET coins = coins + ?, total_earned = total_earned + ? WHERE id = ?').run(amount, amount, userId);
  } else {
    db.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').run(amount, userId);
  }
}

function unlockField(userId, fieldId) {
  db.prepare('UPDATE fields SET unlocked = 1 WHERE user_id = ? AND id = ?').run(userId, fieldId);
}

function plantCrop(userId, fieldId, type, plantedAt) {
  db.prepare('UPDATE fields SET crop_type = ?, planted_at = ? WHERE user_id = ? AND id = ?').run(type, plantedAt, userId, fieldId);
}

function harvestCrop(userId, fieldId) {
  db.prepare('UPDATE fields SET crop_type = NULL, planted_at = NULL WHERE user_id = ? AND id = ?').run(userId, fieldId);
}

function updateGameState(userId, gameState, coins, name) {
  const user = db.prepare('SELECT coins FROM users WHERE id = ?').get(userId);
  let earnedDiff = 0;
  if (user && coins > user.coins) {
    earnedDiff = coins - user.coins;
  }
  db.prepare(`
    UPDATE users 
    SET game_state = ?, coins = ?, 
        name = COALESCE(?, name),
        total_earned = total_earned + ?
    WHERE id = ?
  `).run(JSON.stringify(gameState), coins, name || null, earnedDiff, userId);
}

function getLeaderboard() {
  return db.prepare('SELECT id, name, total_earned FROM users ORDER BY total_earned DESC LIMIT 50').all();
}

module.exports = {
  db,
  getUserState,
  updateCoins,
  unlockField,
  plantCrop,
  harvestCrop,
  updateGameState,
  getLeaderboard
};
