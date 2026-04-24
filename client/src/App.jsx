import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import './App.css';
import FarmScene from './FarmScene';
import MainMenu from './MainMenu';
import { ANIMALS, CROPS, FALLBACK_LAYOUT, MAX_ZOOM, MIN_ZOOM, PX_PER_UNIT, WORLD_PX, clamp } from './gameData';

const tg = window.Telegram.WebApp;
const INITIAL_GAME_STATE = {
  water: 100,
  animals: [],
  grass: [],
  products: [],
  warehouse: [],
  truckTime: 0,
  truckReward: 0,
};

function createEntityId() {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Math.random().toString(36).slice(2)}`;
}

function snapshotGameState(state) {
  return {
    water: state.water,
    truckTime: state.truckTime,
    truckReward: state.truckReward || 0,
    animals: state.animals.map((animal) => ({ ...animal })),
    grass: state.grass.map((item) => ({ ...item })),
    products: state.products.map((item) => ({ ...item })),
    warehouse: [...state.warehouse],
  };
}

export default function App() {
  const gs = useRef(snapshotGameState(INITIAL_GAME_STATE));

  const [screen, setScreen] = useState('menu');
  const [balance, setBalance] = useState(0);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seedFor, setSeedFor] = useState(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [mapLayout, setMapLayout] = useState(FALLBACK_LAYOUT);
  const [zoom, setZoom] = useState(22);
  const [now, setNow] = useState(() => Date.now());
  const [viewState, setViewState] = useState(() => snapshotGameState(INITIAL_GAME_STATE));

  const auth = () => tg.initData || 'DEV_MODE_123';
  const refreshViewState = () => setViewState(snapshotGameState(gs.current));

  useEffect(() => {
    tg.expand();

    const fetchState = async () => {
      try {
        const [layoutResponse, stateResponse] = await Promise.all([
          fetch('/api/layout', { headers: { Authorization: auth() } }),
          fetch('/api/status', { headers: { Authorization: auth() } }),
        ]);
        const layoutData = await layoutResponse.json();
        const stateData = await stateResponse.json();

        if (layoutData.success && layoutData.layout) setMapLayout(layoutData.layout);
        if (stateData.success) {
          setBalance(stateData.data.coins);
          setFields(stateData.data.fields);
          if (stateData.data.gameState) {
            gs.current = { ...gs.current, ...stateData.data.gameState };
            refreshViewState();
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchState();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (loading) return;
      const userName = tg.initDataUnsafe?.user?.first_name || 'Player';
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: auth() },
        body: JSON.stringify({ gameState: gs.current, coins: balance, name: userName }),
      }).catch(() => {});
    }, 5000);

    return () => clearInterval(timer);
  }, [balance, loading]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (loading) return undefined;

    let handle;
    let lastTime = Date.now();

    const loop = () => {
      const loopNow = Date.now();
      const dt = Math.min((loopNow - lastTime) / 1000, 0.1);
      lastTime = loopNow;
      const state = gs.current;
      let dirty = false;

      if (state.truckTime > 0) {
        state.truckTime -= dt;
        if (state.truckTime <= 0) {
          tg.HapticFeedback?.notificationOccurred('success');
          setBalance((value) => value + (state.truckReward || 0));
          state.truckReward = 0;
          state.truckTime = 0;
          dirty = true;
        }
      }

      state.animals.forEach((animal) => {
        animal.hunger -= 2 * dt;
        if (animal.hunger <= 0) {
          animal.dead = true;
          dirty = true;
          return;
        }

        if (animal.state === 'idle') {
          animal.idleTimer = (animal.idleTimer || 0) - dt;
          if (animal.idleTimer <= 0) {
            if (animal.hunger < 70 && state.grass.length > 0) {
              let closest = null;
              let closestDistance = Infinity;
              state.grass.forEach((grass) => {
                const distance = Math.hypot(grass.x - animal.x, grass.y - animal.y);
                if (distance < closestDistance) {
                  closestDistance = distance;
                  closest = grass;
                }
              });
              if (closest) {
                animal.target = { x: closest.x, y: closest.y };
                animal.state = 'walk';
              }
            } else {
              const pen = mapLayout?.zones?.pen;
              animal.target = pen
                ? {
                    x: pen.x + Math.random() * pen.w,
                    y: pen.y + Math.random() * pen.h,
                  }
                : {
                    x: 120 + Math.random() * (WORLD_PX - 240),
                    y: 120 + Math.random() * (WORLD_PX - 240),
                  };
              animal.state = 'walk';
            }
          }
        }

        if (animal.state === 'walk' && animal.target) {
          const dx = animal.target.x - animal.x;
          const dy = animal.target.y - animal.y;
          const distance = Math.hypot(dx, dy);
          animal.flip = dx < 0;

          if (distance < 10) {
            if (animal.hunger < 70) {
              const grassIndex = state.grass.findIndex((grass) => Math.hypot(grass.x - animal.x, grass.y - animal.y) < 30);
              if (grassIndex >= 0) {
                state.grass.splice(grassIndex, 1);
                animal.state = 'eat';
                animal.eatTimer = 1;
                dirty = true;
              } else {
                animal.state = 'idle';
                animal.idleTimer = 0.5;
              }
            } else {
              animal.state = 'idle';
              animal.idleTimer = 1 + Math.random() * 2;
            }
          } else {
            const speed = 150 * dt;
            animal.x += (dx / distance) * speed;
            animal.y += (dy / distance) * speed;
            dirty = true;
          }
        }

        const pen = mapLayout?.zones?.pen;
        if (pen) {
          animal.x = clamp(animal.x, pen.x, pen.x + pen.w);
          animal.y = clamp(animal.y, pen.y, pen.y + pen.h);
        } else {
          animal.x = clamp(animal.x, 50, WORLD_PX - 50);
          animal.y = clamp(animal.y, 50, WORLD_PX - 50);
        }

        if (animal.state === 'eat') {
          animal.eatTimer -= dt;
          if (animal.eatTimer <= 0) {
            animal.hunger = Math.min(100, animal.hunger + 40);
            animal.state = 'idle';
            animal.idleTimer = 1;
            dirty = true;
          }
        }

        animal.eggTimer = (animal.eggTimer || 0) - dt;
        if (animal.eggTimer <= 0 && animal.hunger > 30) {
          const def = ANIMALS[animal.type] || ANIMALS.chicken;
          animal.eggTimer = def.interval + Math.random() * 5;
          state.products.push({ id: createEntityId(), type: def.product, x: animal.x, y: animal.y, time: loopNow });
          dirty = true;
        }
      });

      if (state.animals.some((animal) => animal.dead)) {
        state.animals = state.animals.filter((animal) => !animal.dead);
        dirty = true;
      }

      const productsBefore = state.products.length;
      state.products = state.products.filter((product) => loopNow - product.time < 15000);
      if (productsBefore !== state.products.length) dirty = true;

      if (dirty) refreshViewState();
      handle = requestAnimationFrame(loop);
    };

    handle = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(handle);
  }, [loading, mapLayout]);

  const api = async (url, body) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth() },
      body: JSON.stringify(body),
    });
    return response.json();
  };

  const doPlant = async (fieldId, cropId) => {
    setSeedFor(null);
    const data = await api('/api/plant', { fieldId, type: cropId });
    if (data.success) {
      setBalance(data.data.coins);
      setFields(data.data.fields);
      tg.HapticFeedback?.impactOccurred('medium');
    }
  };

  const doHarvest = async (fieldId) => {
    const data = await api('/api/harvest', { fieldId });
    if (data.success) {
      setBalance(data.data.coins);
      setFields(data.data.fields);
      tg.HapticFeedback?.notificationOccurred('success');
    }
  };

  const doBuyField = async (fieldId) => {
    const data = await api('/api/buyField', { fieldId });
    if (data.success) {
      setBalance(data.data.coins);
      setFields(data.data.fields);
      tg.HapticFeedback?.notificationOccurred('success');
    }
  };

  const plantGrass = (point) => {
    if (gs.current.water < 10) {
      tg.HapticFeedback?.notificationOccurred('error');
      return;
    }

    const x = clamp((point.x + WORLD_PX / (2 * PX_PER_UNIT)) * PX_PER_UNIT, 50, WORLD_PX - 50);
    const y = clamp((point.z + WORLD_PX / (2 * PX_PER_UNIT)) * PX_PER_UNIT, 50, WORLD_PX - 50);

    gs.current.water -= 10;
    gs.current.grass.push({ id: createEntityId(), x, y });
    refreshViewState();
    tg.HapticFeedback?.impactOccurred('light');
  };

  const buyAnimal = (type) => {
    const def = ANIMALS[type];
    if (balance < def.cost) return;

    const pen = mapLayout?.zones?.pen;
    const angle = gs.current.animals.length * 1.9;
    const radius = 26 + (gs.current.animals.length % 4) * 10;

    setBalance((value) => value - def.cost);
    gs.current.animals.push({
      id: createEntityId(),
      type,
      x: (pen ? pen.x + pen.w / 2 : WORLD_PX / 2) + Math.cos(angle) * radius,
      y: (pen ? pen.y + pen.h / 2 : WORLD_PX / 2) + Math.sin(angle) * radius,
      state: 'idle',
      hunger: 100,
      eggTimer: def.interval,
      idleTimer: 1,
    });
    refreshViewState();
    tg.HapticFeedback?.impactOccurred('medium');
  };

  const refillWell = () => {
    if (balance < 15 || gs.current.water >= 100) return;
    setBalance((value) => value - 15);
    gs.current.water = 100;
    refreshViewState();
    tg.HapticFeedback?.impactOccurred('heavy');
  };

  const collectProduct = (id) => {
    if (gs.current.warehouse.length >= 20) return;
    const index = gs.current.products.findIndex((product) => product.id === id);
    if (index < 0) return;
    gs.current.warehouse.push(gs.current.products[index].type);
    gs.current.products.splice(index, 1);
    refreshViewState();
    tg.HapticFeedback?.impactOccurred('light');
  };

  const sellWarehouse = () => {
    if (gs.current.warehouse.length === 0 || gs.current.truckTime > 0) return;
    const reward = gs.current.warehouse.reduce((sum, item) => {
      const key = Object.keys(ANIMALS).find((animalKey) => ANIMALS[animalKey].product === item);
      return sum + (key ? ANIMALS[key].price : 15);
    }, 0);
    gs.current.truckReward = reward;
    gs.current.warehouse = [];
    gs.current.truckTime = 5;
    refreshViewState();
    tg.HapticFeedback?.impactOccurred('medium');
  };

  if (loading) return <div className="loading-screen">Запускаем 3D-ферму...</div>;
  if (screen === 'menu') return <MainMenu onPlay={() => setScreen('game')} />;

  const enrichedFields = fields.map((field) => {
    if (!field.unlocked || !field.crop) return field;
    const def = CROPS[field.crop.type];
    if (!def) return field;
    return {
      ...field,
      isReady: (now - new Date(field.crop.plantedAt).getTime()) / 1000 >= def.growTime,
    };
  });

  return (
    <>
      <FarmScene
        layout={mapLayout}
        enrichedFields={enrichedFields}
        state={viewState}
        zoom={zoom}
        now={now}
        onGroundPlant={plantGrass}
        onPlantField={(fieldId) => setSeedFor(fieldId)}
        onHarvestField={doHarvest}
        onBuyField={doBuyField}
        onCollectProduct={collectProduct}
        onRefillWell={refillWell}
        onSellWarehouse={sellWarehouse}
        onOpenShop={() => setShopOpen(true)}
      />

      <div className="hud">
        <div>
          <div className="hud-title">Hybrid Farm 2026</div>
          <div className="hud-subtitle">Изометрическая сцена, объемные объекты, живые существа</div>
        </div>
        <div className="hud-pills">
          <div className="hud-pill">
            <span>🪙</span>
            <span>{balance}</span>
          </div>
          <div className="hud-pill">
            <span>💧</span>
            <span>{Math.round(viewState.water)}%</span>
          </div>
          <div className="hud-pill">
            <span>📦</span>
            <span>{viewState.warehouse.length}/20</span>
          </div>
        </div>
      </div>

      <div className="store-bar">
        <button className="store-btn" onClick={() => setShopOpen(true)}>
          Магазин
        </button>
        <button className="store-btn store-btn--secondary" onClick={sellWarehouse} disabled={viewState.warehouse.length === 0 || viewState.truckTime > 0}>
          Грузовик
        </button>
      </div>

      <div className="zoom-controls">
        <button className="zoom-btn" onClick={() => setZoom((value) => clamp(value + 2, MIN_ZOOM, MAX_ZOOM))}>
          +
        </button>
        <button className="zoom-btn" onClick={() => setZoom((value) => clamp(value - 2, MIN_ZOOM, MAX_ZOOM))}>
          −
        </button>
      </div>

      <AnimatePresence>
        {seedFor !== null && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onPointerDown={(event) => {
            if (event.target === event.currentTarget) setSeedFor(null);
          }}>
            <motion.div className="modal-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}>
              <div className="modal-handle" />
              <h2>Что посадим?</h2>
              <div className="seed-grid">
                {Object.values(CROPS).map((crop) => (
                  <button key={crop.id} className="seed-option" disabled={balance < crop.cost} onClick={() => doPlant(seedFor, crop.id)}>
                    <div className="seed-info">
                      <span className="seed-icon">{crop.id === 'wheat' ? '🌾' : '🌽'}</span>
                      <div>
                        <span className="seed-name">{crop.name}</span>
                        <span className="seed-desc">{crop.desc}</span>
                      </div>
                    </div>
                    <span className="seed-cost">-{crop.cost}🪙</span>
                  </button>
                ))}
              </div>
              <button className="btn-cancel" onClick={() => setSeedFor(null)}>
                Отмена
              </button>
            </motion.div>
          </motion.div>
        )}

        {shopOpen && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onPointerDown={(event) => {
            if (event.target === event.currentTarget) setShopOpen(false);
          }}>
            <motion.div className="modal-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}>
              <div className="modal-handle" />
              <h2>Покупка животных</h2>
              <div className="seed-grid">
                {Object.entries(ANIMALS).map(([key, animal]) => (
                  <button key={key} className="seed-option" disabled={balance < animal.cost} onClick={() => {
                    buyAnimal(key);
                    setShopOpen(false);
                  }}>
                    <div className="seed-info">
                      <span className="seed-icon">{animal.icon}</span>
                      <div>
                        <span className="seed-name">{animal.name}</span>
                        <span className="seed-desc">Дает {animal.prodName} (+{animal.price}🪙)</span>
                      </div>
                    </div>
                    <span className="seed-cost">-{animal.cost}🪙</span>
                  </button>
                ))}
              </div>
              <button className="btn-cancel" onClick={() => setShopOpen(false)}>
                Закрыть
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
