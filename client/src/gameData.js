export const WORLD_PX = 2048;
export const PX_PER_UNIT = 32;
export const MIN_ZOOM = 8;
export const MAX_ZOOM = 28;

export const LAND_TILE_WIDTH_PX = 360;
export const LAND_TILE_DEPTH_PX = 360;
export const LAND_BLOCK_HEIGHT_PX = 42;
export const LAND_EXPANSION_COST = 5000;
export const BASE_TILE_CENTER_X = WORLD_PX / 2 + 140;
export const BASE_TILE_CENTER_Y = WORLD_PX / 2;
export const TILE_PLOT_LIMIT = 4;

export const CROPS = {
  wheat: {
    id: 'wheat',
    name: 'Пшеница',
    desc: '10 сек · +20🪙',
    cost: 10,
    reward: 20,
    growTime: 10,
    palette: ['#6ecb4d', '#8fd356', '#d5ac38'],
  },
  corn: {
    id: 'corn',
    name: 'Кукуруза',
    desc: '30 сек · +100🪙',
    cost: 20,
    reward: 100,
    growTime: 30,
    palette: ['#5ab64c', '#77c54d', '#f2c94c'],
  },
};

export const BUILDINGS = {
  coop: {
    id: 'coop',
    name: 'Курятник',
    desc: 'Нужен для покупки кур',
    cost: 180,
    width: 250,
    depth: 250,
    capacity: 4,
    animalType: 'chicken',
  },
  pigsty: {
    id: 'pigsty',
    name: 'Свинарник',
    desc: 'Нужен для покупки свиней',
    cost: 320,
    width: 250,
    depth: 250,
    capacity: 3,
    animalType: 'pig',
  },
  warehouse: {
    id: 'warehouse',
    name: 'Склад',
    desc: 'Хранение продукции',
    cost: 260,
    width: 250,
    depth: 250,
    capacity: 20,
  },
};

export const PLACEABLES = {
  plot: {
    id: 'plot',
    type: 'plot',
    name: 'Грядка',
    desc: 'Покупается и ставится вручную',
    cost: 60,
    width: 120,
    depth: 88,
  },
  ...Object.fromEntries(
    Object.values(BUILDINGS).map((building) => [
      building.id,
      {
        ...building,
        type: 'building',
      },
    ]),
  ),
};

export const ANIMALS = {
  chicken: {
    id: 'chicken',
    name: 'Курица',
    icon: '🐔',
    cost: 50,
    product: 'egg',
    prodName: 'Яйцо',
    interval: 12,
    price: 15,
    color: '#fff4d6',
    homeBuilding: 'coop',
  },
  pig: {
    id: 'pig',
    name: 'Свинья',
    icon: '🐷',
    cost: 150,
    product: 'truffle',
    prodName: 'Трюфель',
    interval: 20,
    price: 40,
    color: '#ffbfd7',
    homeBuilding: 'pigsty',
  },
};

export const PRODUCT_ICONS = {
  egg: '🥚',
  truffle: '🍄',
};

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function pxToWorldX(x) {
  return (x - WORLD_PX / 2) / PX_PER_UNIT;
}

export function pxToWorldZ(y) {
  return (y - WORLD_PX / 2) / PX_PER_UNIT;
}

export function pointToWorld(x, y) {
  return [pxToWorldX(x), pxToWorldZ(y)];
}

export function pointFromWorld(x, z) {
  return {
    x: clamp(x * PX_PER_UNIT + WORLD_PX / 2, 60, WORLD_PX - 60),
    y: clamp(z * PX_PER_UNIT + WORLD_PX / 2, 60, WORLD_PX - 60),
  };
}

export function getLandTileCenter(column) {
  return {
    x: BASE_TILE_CENTER_X + column * LAND_TILE_WIDTH_PX,
    y: BASE_TILE_CENTER_Y,
  };
}

export function getLandTileRect(column) {
  const center = getLandTileCenter(column);
  return {
    x: center.x - LAND_TILE_WIDTH_PX / 2,
    y: center.y - LAND_TILE_DEPTH_PX / 2,
    w: LAND_TILE_WIDTH_PX,
    h: LAND_TILE_DEPTH_PX,
    cx: center.x,
    cy: center.y,
  };
}

export function getLandColumns(landTiles) {
  const columns = (landTiles || []).map((tile) => tile.column);
  return columns.length ? columns.sort((a, b) => a - b) : [0];
}

export function isPointInsideTile(x, y, column, margin = 0) {
  const rect = getLandTileRect(column);
  return (
    x >= rect.x + margin &&
    x <= rect.x + rect.w - margin &&
    y >= rect.y + margin &&
    y <= rect.y + rect.h - margin
  );
}

export function isPointInsideOwnedLand(x, y, landTiles, margin = 0) {
  return getLandColumns(landTiles).some((column) => isPointInsideTile(x, y, column, margin));
}

export function getPlotSlotCenters(column) {
  const center = getLandTileCenter(column);
  const offset = LAND_TILE_WIDTH_PX * 0.23;
  return [
    { slot: 0, x: center.x - offset, y: center.y - offset },
    { slot: 1, x: center.x + offset, y: center.y - offset },
    { slot: 2, x: center.x - offset, y: center.y + offset },
    { slot: 3, x: center.x + offset, y: center.y + offset },
  ];
}

export function getNearestLandColumn(x) {
  return Math.round((x - BASE_TILE_CENTER_X) / LAND_TILE_WIDTH_PX);
}
