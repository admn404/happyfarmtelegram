import React, { useState } from 'react';

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
      <div className="main-menu-content">
        <h1 className="menu-title">🚜 Гибридная Ферма</h1>
        
        {!showLeaders ? (
          <div className="menu-buttons">
            <button className="menu-btn btn-play" onClick={onPlay}>Начать игру</button>
            <button className="menu-btn btn-leaders" onClick={handleShowLeaders}>🏆 Таблица рекордов</button>
            <button className="menu-btn btn-exit" onClick={() => tg.close()}>Выход</button>
          </div>
        ) : (
          <div className="leaderboard-panel">
            <h2 style={{ color: '#FFD700', marginBottom: '15px' }}>Топ 50 Фермеров</h2>
            <div className="leaders-list">
              {loading ? (
                <p style={{ color: 'white' }}>Загрузка...</p>
              ) : leaderboard.length === 0 ? (
                <p style={{ color: 'gray' }}>Пока нет рекордов</p>
              ) : (
                leaderboard.map((l, i) => (
                  <div key={l.id} className="leader-item">
                    <span className="leader-rank">#{i+1}</span>
                    <span className="leader-name">{l.name || `Игрок ${l.id.slice(0, 5)}`}</span>
                    <span className="leader-score">{l.total_earned} 🪙</span>
                  </div>
                ))
              )}
            </div>
            <button className="menu-btn btn-back" onClick={() => setShowLeaders(false)}>Назад</button>
          </div>
        )}
      </div>
    </div>
  );
}
