import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const tg = window.Telegram.WebApp;

export default function MainMenu({ onPlay }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaders, setShowLeaders] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchLeaders = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/leaderboard');
      const d = await r.json();
      if (d.success) setLeaderboard(d.leaderboard);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleShowLeaders = () => {
    setShowLeaders(true);
    fetchLeaders();
  };

  return (
    <div className="main-menu-screen">
      <div className="menu-background-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <motion.div 
        className="main-menu-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.h1 
          className="menu-title"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          🚜 Гибридная Ферма
        </motion.h1>
        
        <AnimatePresence mode="wait">
          {!showLeaders ? (
            <motion.div 
              key="buttons"
              className="menu-buttons"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <button className="menu-btn btn-play" onClick={onPlay}>Начать игру</button>
              <button className="menu-btn btn-leaders" onClick={handleShowLeaders}>🏆 Таблица рекордов</button>
              <button className="menu-btn btn-exit" onClick={() => tg.close()}>Выход</button>
            </motion.div>
          ) : (
            <motion.div 
              key="leaders"
              className="leaderboard-panel"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="leaderboard-header">
                <h2 style={{ color: '#FFD700', margin: 0 }}>Топ 50 Фермеров</h2>
                <button className="btn-back-mini" onClick={() => setShowLeaders(false)}>✕</button>
              </div>
              <div className="leaders-list">
                {loading ? (
                  <div className="menu-status">
                    <div className="spinner"></div>
                    <p>Загрузка...</p>
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="menu-status">
                    <p style={{ color: 'rgba(255,255,255,0.5)' }}>Пока нет рекордов</p>
                  </div>
                ) : (
                  leaderboard.map((l, i) => (
                    <div key={l.id} className="leader-item">
                      <span className="leader-rank">#{i+1}</span>
                      <span className="leader-name">{l.name || `Игрок ${l.id.slice(0, 5)}`}</span>
                      <span className="leader-score">{l.total_earned.toLocaleString()} 🪙</span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
