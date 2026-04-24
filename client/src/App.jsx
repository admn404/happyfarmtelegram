import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import './App.css';
import FarmScene from './FarmScene';
import MainMenu from './MainMenu';
import {
  ANIMALS,
  BUILDINGS,
  CROPS,
  MAX_ZOOM,
  MIN_ZOOM,
  PLACEABLES,
  WORLD_PX,
  clamp,
} from './gameData';

const tg = window.Telegram.WebApp;
const INITIAL_GAME_STATE = {
  products: [],
  animals: [],
  warehouse: [],
  truckTime: 0,
  truckReward: 0,
  placements: {
    plots: [],
    buildings: [],
  },
  nextFieldId: 100,
};

function createEntityId() {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createSnapshot(state) {
  return {
    products: state.products.map((item) => ({ ...item })),
    animals: state.animals.map((item) => ({ ...item })),
    warehouse: [...state.warehouse],
    truckTime: state.truckTime,
    truckReward: state.truckReward || 0,
    nextFieldId: state.nextFieldId || 100,
    placements: {
      plots: (state.placements?.plots || []).map((plot) => ({ ...plot })),
      buildings: (state.placements?.buildings || []).map((building) => ({ ...building })),
    },
  };
}

function normalizeGameState(gameState, fields) {
  const nextFromFields = fields.length ? Math.max(...fields.map((field) => field.id)) + 1 : 100;
  return createSnapshot({
    ...INITIAL_GAME_STATE,
    ...gameState,
    placements: {
      plots: gameState?.placements?.plots || [],
      buildings: gameState?.placements?.buildings || [],
    },
    nextFieldId: Math.max(gameState?.nextFieldId || 100, nextFromFields),
  });
}

function getAnimalHomeBuilding(type) {
  return ANIMALS[type]?.homeBuilding;
}

function getWarehouseCapacity(buildings) {
  return buildings.filter((building) => building.type === 'warehouse').length * BUILDINGS.warehouse.capacity;
}

export default function App() {
  const gs = useRef(createSnapshot(INITIAL_GAME_STATE));
  const balanceRef = useRef(0);
  const toastTimerRef = useRef(null);

  const [screen, setScreen] = useState('menu');
  const [balance, setBalance] = useState(0);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seedFor, setSeedFor] = useState(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [shopTab, setShopTab] = useState('build');
  const [zoom, setZoom] = useState(22);
  const [now, setNow] = useState(() => Date.now());
  const [viewState, setViewState] = useState(() => createSnapshot(INITIAL_GAME_STATE));
  const [placementMode, setPlacementMode] = useState(null);
  const [toast, setToast] = useState('');

  const auth = () => tg.initData || 'DEV_MODE_123';

  const applyBalance = (value) => {
    balanceRef.current = value;
    setBalance(value);
  };

  const refreshViewState = () => setViewState(createSnapshot(gs.current));

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(''), 2400);
  };

  const syncState = useCallback(async (coinsValue = balanceRef.current) => {
    const userName = tg.initDataUnsafe?.user?.first_name || 'Player';
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth() },
      body: JSON.stringify({ gameState: gs.current, coins: coinsValue, name: userName }),
    });
  }, []);

  useEffect(() => {
    tg.expand();

    const fetchState = async () => {
      try {
        const response = await fetch('/api/status', { headers: { Authorization: auth() } });
        const data = await response.json();
        if (data.success) {
          applyBalance(data.data.coins);
          setFields(data.data.fields);
          const normalized = normalizeGameState(data.data.gameState, data.data.fields);
          gs.current = normalized;
          refreshViewState();
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchState();
    return () => window.clearTimeout(toastTimerRef.current);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!loading) syncState().catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [loading, syncState]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (loading) return undefined;

    let handle;
    let lastTime = Date.now();

    const loop = () => {
      const currentNow = Date.now();
      const dt = Math.min((currentNow - lastTime) / 1000, 0.1);
      lastTime = currentNow;
      const state = gs.current;
      let dirty = false;

      if (state.truckTime > 0) {
        state.truckTime -= dt;
        if (state.truckTime <= 0) {
          const nextBalance = balanceRef.current + (state.truckReward || 0);
          state.truckTime = 0;
          state.truckReward = 0;
          applyBalance(nextBalance);
          tg.HapticFeedback?.notificationOccurred('success');
          dirty = true;
          syncState(nextBalance).catch(() => {});
        }
      }

      state.animals.forEach((animal, index) => {
        const home = state.placements.buildings.find((building) => building.id === animal.homeId)
          || state.placements.buildings.find((building) => building.type === getAnimalHomeBuilding(animal.type));
        const centerX = home?.x ?? WORLD_PX / 2;
        const centerY = home?.y ?? WORLD_PX / 2;
        const roamRadius = home ? 110 : 160;

        if (animal.state === 'idle') {
          animal.idleTimer = (animal.idleTimer || 0) - dt;
          if (animal.idleTimer <= 0) {
            const angle = (index + currentNow / 4000) * 1.7;
            const distance = 40 + ((index % 4) + 1) * 14;
            animal.target = {
              x: clamp(centerX + Math.cos(angle) * Math.min(distance, roamRadius), 60, WORLD_PX - 60),
              y: clamp(centerY + Math.sin(angle) * Math.min(distance, roamRadius), 60, WORLD_PX - 60),
            };
            animal.state = 'walk';
          }
        }

        if (animal.state === 'walk' && animal.target) {
          const dx = animal.target.x - animal.x;
          const dy = animal.target.y - animal.y;
          const distance = Math.hypot(dx, dy);
          animal.flip = dx < 0;

          if (distance < 8) {
            animal.state = 'idle';
            animal.idleTimer = 1.4 + (index % 3) * 0.45;
          } else {
            const speed = 55 * dt;
            animal.x += (dx / distance) * speed;
            animal.y += (dy / distance) * speed;
            dirty = true;
          }
        }

        animal.x = clamp(animal.x, centerX - roamRadius, centerX + roamRadius);
        animal.y = clamp(animal.y, centerY - roamRadius, centerY + roamRadius);

        animal.productTimer = (animal.productTimer || ANIMALS[animal.type].interval) - dt;
        if (animal.productTimer <= 0) {
          const overlappingProduct = state.products.some(
            (product) => product.sourceId === animal.id && Math.hypot(product.x - animal.x, product.y - animal.y) < 24,
          );
          if (!overlappingProduct) {
            state.products.push({
              id: createEntityId(),
              type: ANIMALS[animal.type].product,
              x: animal.x,
              y: animal.y,
              time: currentNow,
              sourceId: animal.id,
            });
            dirty = true;
          }
          animal.productTimer = ANIMALS[animal.type].interval;
        }
      });

      if (dirty) refreshViewState();
      handle = requestAnimationFrame(loop);
    };

    handle = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(handle);
  }, [loading, syncState]);

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
      applyBalance(data.data.coins);
      setFields(data.data.fields);
      tg.HapticFeedback?.impactOccurred('medium');
      syncState(data.data.coins).catch(() => {});
    }
  };

  const doHarvest = async (fieldId) => {
    const data = await api('/api/harvest', { fieldId });
    if (data.success) {
      applyBalance(data.data.coins);
      setFields(data.data.fields);
      tg.HapticFeedback?.notificationOccurred('success');
      syncState(data.data.coins).catch(() => {});
    }
  };

  const startPlacement = (itemId) => {
    setPlacementMode(PLACEABLES[itemId]);
    setShopOpen(false);
    showToast(`Выбран объект: ${PLACEABLES[itemId].name}. Ткни по земле, чтобы поставить.`);
  };

  const placeObject = (point) => {
    if (!placementMode) return;
    if (balanceRef.current < placementMode.cost) {
      showToast('Не хватает монет.');
      setPlacementMode(null);
      return;
    }

    const x = clamp(point.x * 32 + WORLD_PX / 2, 90, WORLD_PX - 90);
    const y = clamp(point.z * 32 + WORLD_PX / 2, 90, WORLD_PX - 90);
    const nextBalance = balanceRef.current - placementMode.cost;

    if (placementMode.type === 'plot') {
      gs.current.placements.plots.push({
        id: createEntityId(),
        fieldId: gs.current.nextFieldId,
        cx: x,
        cy: y,
        w: placementMode.width,
        h: placementMode.depth,
      });
      gs.current.nextFieldId += 1;
    } else {
      gs.current.placements.buildings.push({
        id: createEntityId(),
        type: placementMode.id,
        x,
        y,
      });
    }

    applyBalance(nextBalance);
    refreshViewState();
    setPlacementMode(null);
    tg.HapticFeedback?.impactOccurred('medium');
    syncState(nextBalance).catch(() => {});
  };

  const cancelPlacement = () => {
    setPlacementMode(null);
  };

  const buyAnimal = (type) => {
    const animalDef = ANIMALS[type];
    const homeType = getAnimalHomeBuilding(type);
    const buildings = gs.current.placements.buildings.filter((building) => building.type === homeType);
    if (!buildings.length) {
      showToast(`Сначала построй: ${BUILDINGS[homeType].name}.`);
      return;
    }

    const homeCounts = Object.fromEntries(buildings.map((building) => [building.id, 0]));
    gs.current.animals.forEach((animal) => {
      if (animal.type === type && homeCounts[animal.homeId] !== undefined) homeCounts[animal.homeId] += 1;
    });

    const freeHome = buildings.find((building) => homeCounts[building.id] < BUILDINGS[homeType].capacity);
    if (!freeHome) {
      showToast(`Нужен еще ${BUILDINGS[homeType].name.toLowerCase()}.`);
      return;
    }
    if (balanceRef.current < animalDef.cost) {
      showToast('Не хватает монет.');
      return;
    }

    const angle = (gs.current.animals.length + 1) * 1.37;
    const nextBalance = balanceRef.current - animalDef.cost;
    gs.current.animals.push({
      id: createEntityId(),
      type,
      homeId: freeHome.id,
      x: clamp(freeHome.x + Math.cos(angle) * 48, 60, WORLD_PX - 60),
      y: clamp(freeHome.y + Math.sin(angle) * 48, 60, WORLD_PX - 60),
      state: 'idle',
      idleTimer: 1.3,
      productTimer: animalDef.interval,
    });

    applyBalance(nextBalance);
    refreshViewState();
    setShopOpen(false);
    tg.HapticFeedback?.impactOccurred('medium');
    syncState(nextBalance).catch(() => {});
  };

  const collectProduct = (id) => {
    const capacity = getWarehouseCapacity(gs.current.placements.buildings);
    if (capacity <= 0) {
      showToast('Построй склад, чтобы собирать продукцию.');
      return;
    }
    if (gs.current.warehouse.length >= capacity) {
      showToast('Склад заполнен.');
      return;
    }
    const index = gs.current.products.findIndex((product) => product.id === id);
    if (index < 0) return;
    gs.current.warehouse.push(gs.current.products[index].type);
    gs.current.products.splice(index, 1);
    refreshViewState();
    tg.HapticFeedback?.impactOccurred('light');
    syncState().catch(() => {});
  };

  const sellWarehouse = () => {
    if (!gs.current.warehouse.length || gs.current.truckTime > 0) return;
    const reward = gs.current.warehouse.reduce((sum, item) => {
      const animalKey = Object.keys(ANIMALS).find((key) => ANIMALS[key].product === item);
      return sum + (animalKey ? ANIMALS[animalKey].price : 15);
    }, 0);
    gs.current.warehouse = [];
    gs.current.truckTime = 5;
    gs.current.truckReward = reward;
    refreshViewState();
    tg.HapticFeedback?.impactOccurred('medium');
    syncState().catch(() => {});
  };

  if (loading) return <div className="loading-screen">Собираем новый участок...</div>;
  if (screen === 'menu') return <MainMenu onPlay={() => setScreen('game')} />;

  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  const plots = viewState.placements.plots.map((plot) => ({
    ...plot,
    field: fieldsById.get(plot.fieldId) || { id: plot.fieldId, unlocked: true, crop: null },
  }));

  const enrichedPlots = plots.map((plot) => {
    if (!plot.field.crop) return plot;
    const def = CROPS[plot.field.crop.type];
    if (!def) return plot;
    return {
      ...plot,
      field: {
        ...plot.field,
        isReady: (now - new Date(plot.field.crop.plantedAt).getTime()) / 1000 >= def.growTime,
      },
    };
  });

  const warehouseCapacity = getWarehouseCapacity(viewState.placements.buildings);

  return (
    <>
      <FarmScene
        now={now}
        plots={enrichedPlots}
        buildings={viewState.placements.buildings}
        animals={viewState.animals}
        products={viewState.products}
        warehouseStored={viewState.warehouse.length}
        zoom={zoom}
        placementMode={placementMode}
        onGroundPlace={placeObject}
        onPlotPlant={(fieldId) => setSeedFor(fieldId)}
        onPlotHarvest={doHarvest}
        onCollectProduct={collectProduct}
      />

      <div className="hud">
        <div>
          <div className="hud-title">Happy Farm Telegram</div>
          <div className="hud-subtitle">Пустой участок, река, деревья и ручная застройка</div>
        </div>
        <div className="hud-pills">
          <div className="hud-pill"><span>🪙</span><span>{balance}</span></div>
          <div className="hud-pill"><span>🧺</span><span>{viewState.warehouse.length}/{warehouseCapacity || 0}</span></div>
          <div className="hud-pill"><span>🐾</span><span>{viewState.animals.length}</span></div>
        </div>
      </div>

      <div className="toolbar">
        <button className="store-btn" onClick={() => setShopOpen(true)}>Магазин</button>
        <button className="store-btn store-btn--secondary" onClick={sellWarehouse} disabled={!viewState.warehouse.length || viewState.truckTime > 0}>
          {viewState.truckTime > 0 ? `Доставка ${Math.ceil(viewState.truckTime)}с` : 'Продать'}
        </button>
        {placementMode && (
          <button className="store-btn store-btn--danger" onClick={cancelPlacement}>
            Отмена установки
          </button>
        )}
      </div>

      <div className="zoom-controls">
        <button className="zoom-btn" onClick={() => setZoom((value) => clamp(value + 2, MIN_ZOOM, MAX_ZOOM))}>+</button>
        <button className="zoom-btn" onClick={() => setZoom((value) => clamp(value - 2, MIN_ZOOM, MAX_ZOOM))}>−</button>
      </div>

      {placementMode && (
        <div className="placement-banner">
          <strong>{placementMode.name}</strong>
          <span>Выбери место на карте. Списания пока не было.</span>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

      <AnimatePresence>
        {seedFor !== null && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onPointerDown={(event) => {
            if (event.target === event.currentTarget) setSeedFor(null);
          }}>
            <motion.div className="modal-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}>
              <div className="modal-head">
                <div>
                  <h2>Что посадим?</h2>
                  <p>Новая грядка работает сразу после установки.</p>
                </div>
                <button className="sheet-close" onClick={() => setSeedFor(null)}>✕</button>
              </div>
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
            </motion.div>
          </motion.div>
        )}

        {shopOpen && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onPointerDown={(event) => {
            if (event.target === event.currentTarget) setShopOpen(false);
          }}>
            <motion.div className="modal-sheet modal-sheet--shop" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}>
              <div className="modal-head">
                <div>
                  <h2>Магазин</h2>
                  <p>Покупка теперь не открывает пустую страницу: все в одном окне.</p>
                </div>
                <button className="sheet-close" onClick={() => setShopOpen(false)}>✕</button>
              </div>

              <div className="tab-row">
                <button className={`tab-btn ${shopTab === 'build' ? 'tab-btn--active' : ''}`} onClick={() => setShopTab('build')}>Строить</button>
                <button className={`tab-btn ${shopTab === 'animals' ? 'tab-btn--active' : ''}`} onClick={() => setShopTab('animals')}>Животные</button>
              </div>

              {shopTab === 'build' ? (
                <div className="seed-grid">
                  {Object.values(PLACEABLES).map((item) => (
                    <button key={item.id} className="seed-option" disabled={balance < item.cost} onClick={() => startPlacement(item.id)}>
                      <div className="seed-info">
                        <span className="seed-icon">{item.id === 'plot' ? '🪴' : item.id === 'coop' ? '🐔' : item.id === 'pigsty' ? '🐷' : '🏚️'}</span>
                        <div>
                          <span className="seed-name">{item.name}</span>
                          <span className="seed-desc">{item.desc}</span>
                        </div>
                      </div>
                      <span className="seed-cost">-{item.cost}🪙</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="seed-grid">
                  {Object.values(ANIMALS).map((animal) => {
                    const homeCount = viewState.placements.buildings.filter((building) => building.type === animal.homeBuilding).length;
                    const disabled = balance < animal.cost || homeCount === 0;
                    return (
                      <button key={animal.id} className="seed-option" disabled={disabled} onClick={() => buyAnimal(animal.id)}>
                        <div className="seed-info">
                          <span className="seed-icon">{animal.icon}</span>
                          <div>
                            <span className="seed-name">{animal.name}</span>
                            <span className="seed-desc">
                              {homeCount ? `Дает ${animal.prodName} (+${animal.price}🪙)` : `Нужен ${BUILDINGS[animal.homeBuilding].name.toLowerCase()}`}
                            </span>
                          </div>
                        </div>
                        <span className="seed-cost">-{animal.cost}🪙</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
