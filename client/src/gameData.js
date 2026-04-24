export const WORLD_PX = 2048;
export const PX_PER_UNIT = 32;
export const MIN_ZOOM = 8;
export const MAX_ZOOM = 28;

export const LAND_TILE_WIDTH_PX = 360;
export const LAND_TILE_DEPTH_PX = 360;
export const LAND_BLOCK_HEIGHT_PX = 42;
export const LAND_EXPANSION_COST = 5000;
export const BASE_TILE_CENTER_X = WORLD_PX / 2;
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

export function getLandTileCenter(column, row = 0) {
  return {
    x: BASE_TILE_CENTER_X + column * LAND_TILE_WIDTH_PX,
    y: BASE_TILE_CENTER_Y + row * LAND_TILE_DEPTH_PX,
  };
}

export function getLandTileRect(column, row = 0) {
  const center = getLandTileCenter(column, row);
  return {
    x: center.x - LAND_TILE_WIDTH_PX / 2,
    y: center.y - LAND_TILE_DEPTH_PX / 2,
    w: LAND_TILE_WIDTH_PX,
    h: LAND_TILE_DEPTH_PX,
    cx: center.x,
    cy: center.y,
  };
}

export function getLandBounds(landTiles) {
  if (!landTiles || !landTiles.length) return { minCol: 0, maxCol: 0, minRow: 0, maxRow: 0 };
  const cols = landTiles.map((t) => t.column);
  const rows = landTiles.map((t) => t.row || 0);
  return {
    minCol: Math.min(...cols),
    maxCol: Math.max(...cols),
    minRow: Math.min(...rows),
    maxRow: Math.max(...rows),
  };
}

export function getExpansionOptions(landTiles) {
  const options = [];
  const occupied = new Set(landTiles.map((t) => `${t.column},${t.row || 0}`));

  landTiles.forEach((tile) => {
    const col = tile.column;
    const row = tile.row || 0;
    const neighbors = [
      { side: 'top', column: col, row: row - 1 },
      { side: 'bottom', column: col, row: row + 1 },
      { side: 'left', column: col - 1, row: row },
      { side: 'right', column: col + 1, row: row },
    ];

    neighbors.forEach((n) => {
      const key = `${n.column},${n.row}`;
      if (!occupied.has(key)) {
        if (!options.find((o) => o.column === n.column && o.row === n.row)) {
          options.push(n);
        }
      }
    });
  });

  return options;
}

export function isPointInsideTile(x, y, column, row = 0, margin = 0) {
  const rect = getLandTileRect(column, row);
  return (
    x >= rect.x + margin &&
    x <= rect.x + rect.w - margin &&
    y >= rect.y + margin &&
    y <= rect.y + rect.h - margin
  );
}

export function isPointInsideOwnedLand(x, y, landTiles, margin = 0) {
  return (landTiles || []).some((tile) => isPointInsideTile(x, y, tile.column, tile.row || 0, margin));
}

export function snapToPlotGrid(x, y) {
  const w = PLACEABLES.plot.width;
  const h = PLACEABLES.plot.depth;
  const ox = BASE_TILE_CENTER_X - LAND_TILE_WIDTH_PX / 2;
  const oy = BASE_TILE_CENTER_Y - LAND_TILE_DEPTH_PX / 2;

  const col = Math.round((x - ox - w / 2) / w);
  const row = Math.round((y - oy - h / 2) / h);

  return {
    cx: ox + col * w + w / 2,
    cy: oy + row * h + h / 2,
  };
}

export function getNearestLandIndices(x, y) {
  return {
    column: Math.round((x - BASE_TILE_CENTER_X) / LAND_TILE_WIDTH_PX),
    row: Math.round((y - BASE_TILE_CENTER_Y) / LAND_TILE_DEPTH_PX),
  };
}
