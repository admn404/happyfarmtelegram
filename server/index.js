const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
const upload = multer({ dest: uploadsDir });

const db = require('./database');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';

// Middleware for validating Telegram WebApp initData
function validateTelegramData(req, res, next) {
  const initData = req.headers.authorization;
  
  if (!initData) {
    return res.status(401).json({ success: false, message: 'Unauthorized: No initData provided' });
  }

  // Fallback for local development (only active when not in production)
  if (process.env.NODE_ENV !== 'production' && initData.startsWith('DEV_MODE')) {
    // В режиме разработки мы просто доверяем ID, который клиент шлет в заголовке
    req.userId = initData.replace('DEV_MODE_', '') || '123';
    return next();
  }

  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');
    
    const keys = Array.from(urlParams.keys()).sort();
    const dataCheckString = keys.map(key => `${key}=${urlParams.get(key)}`).join('\n');
    
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    
    if (calculatedHash === hash) {
      const user = JSON.parse(urlParams.get('user'));
      req.userId = user.id.toString();
      next();
    } else {
      res.status(401).json({ success: false, message: 'Unauthorized: Invalid hash' });
    }
  } catch (error) {
    res.status(401).json({ success: false, message: 'Unauthorized: Error parsing initData' });
  }
}

// Применяем middleware ко всем /api эндпоинтам
app.use('/api', validateTelegramData);

const CROP_REWARDS = {
  wheat: 20,
  corn: 100,
};

app.get('/api/status', (req, res) => {
  const state = db.getUserState(req.userId);
  res.json({ success: true, data: state });
});

app.post('/api/plant', (req, res) => {
  const { fieldId, type } = req.body;
  const userId = req.userId;
  
  if (fieldId === undefined || !type) {
    return res.status(400).json({ success: false, message: 'fieldId and type are required' });
  }
  
  const state = db.getUserState(userId);
  let field = state.fields.find(f => f.id === fieldId);
  
  if (!field) {
    db.db.prepare('INSERT INTO fields (id, user_id, unlocked, price) VALUES (?, ?, 1, 0)').run(fieldId, userId);
    field = { id: fieldId, unlocked: true };
  }
  
  if (!field.unlocked) return res.status(400).json({ success: false, message: 'Field is locked' });
  if (field.crop) return res.status(400).json({ success: false, message: 'Field is already planted' });
  
  db.plantCrop(userId, fieldId, type, new Date().toISOString());
  res.json({ success: true, data: db.getUserState(userId) });
});

app.post('/api/harvest', (req, res) => {
  const { fieldId } = req.body;
  const userId = req.userId;
  
  if (fieldId === undefined) {
    return res.status(400).json({ success: false, message: 'fieldId is required' });
  }
  
  const state = db.getUserState(userId);
  const field = state.fields.find(f => f.id === fieldId);
  
  if (!field || !field.crop) return res.status(400).json({ success: false, message: 'Nothing to harvest' });
  
  const reward = CROP_REWARDS[field.crop.type] || 10;
  
  db.harvestCrop(userId, fieldId);
  db.updateCoins(userId, reward);
  
  res.json({ success: true, data: db.getUserState(userId) });
});

app.post('/api/buyField', (req, res) => {
  const { fieldId } = req.body;
  const userId = req.userId;
  
  if (fieldId === undefined) {
    return res.status(400).json({ success: false, message: 'fieldId is required' });
  }

  const state = db.getUserState(userId);
  const field = state.fields.find(f => f.id === fieldId);
  
  if (!field) return res.status(404).json({ success: false, message: 'Field not found' });
  if (field.unlocked) return res.status(400).json({ success: false, message: 'Field is already unlocked' });
  if (state.coins < field.price) return res.status(400).json({ success: false, message: 'Not enough coins' });

  db.updateCoins(userId, -field.price);
  db.unlockField(userId, fieldId);

  res.json({ success: true, data: db.getUserState(userId) });
});

app.post('/api/sync', (req, res) => {
  const { gameState, coins, name } = req.body;
  const userId = req.userId;
  
  if (gameState === undefined || coins === undefined) {
    return res.status(400).json({ success: false, message: 'gameState and coins are required' });
  }

  db.updateGameState(userId, gameState, coins, name);

  res.json({ success: true, data: db.getUserState(userId) });
});

app.get('/api/leaderboard', (req, res) => {
  res.json({ success: true, leaderboard: db.getLeaderboard() });
});

app.post('/api/upload-bg', upload.single('bg'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const ext = path.extname(req.file.originalname) || '.png';
  const newName = req.file.filename + ext;
  fs.renameSync(req.file.path, path.join(uploadsDir, newName));
  res.json({ success: true, url: '/uploads/' + newName });
});

app.get('/api/layout', (req, res) => {
  const layoutPath = path.join(__dirname, 'layout.json');
  try {
    if (fs.existsSync(layoutPath)) {
      const data = fs.readFileSync(layoutPath, 'utf8');
      res.json({ success: true, layout: JSON.parse(data) });
    } else {
      res.status(404).json({ success: false, message: 'Layout not found' });
    }
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error reading layout' });
  }
});

app.post('/api/layout', (req, res) => {
  const { layout } = req.body;
  if (!layout) {
    return res.status(400).json({ success: false, message: 'layout object is required' });
  }
  const layoutPath = path.join(__dirname, 'layout.json');
  try {
    fs.writeFileSync(layoutPath, JSON.stringify(layout, null, 2), 'utf8');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error saving layout' });
  }
});

// Раздача статических файлов
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../client/dist')));

// Любые другие GET-запросы перенаправляем на index.html (для поддержки роутинга React, если появится)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
