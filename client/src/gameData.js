export const WORLD_PX = 2048;
export const PX_PER_UNIT = 32;
export const MIN_ZOOM = 14;
export const MAX_ZOOM = 32;

export const FALLBACK_LAYOUT = {
  beds: [
    { cx: 480, cy: 750 },
    { cx: 720, cy: 920 },
    { cx: 480, cy: 1100 },
    { cx: 720, cy: 1270 },
  ],
  bedSize: { w: 340, h: 220 },
  zones: {
    well: { x: 880, y: 120, w: 280, h: 280 },
    warehouse: { x: 850, y: 1650, w: 350, h: 250 },
    truck: { x: 1600, y: 1600, w: 300, h: 200 },
    shop: { x: 1480, y: 420, w: 260, h: 240 },
    pen: { x: 1120, y: 840, w: 560, h: 500 },
  },
  scales: { animal: 1.0, crop: 1.0, product: 1.0 },
};

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
    desc: '30 сек · +35🪙',
    cost: 20,
    reward: 35,
    growTime: 30,
    palette: ['#5ab64c', '#77c54d', '#f2c94c'],
  },
};

export const ANIMALS = {
  chicken: { name: 'Курица', icon: '🐔', cost: 50, product: 'egg', prodName: 'Яйцо', interval: 12, price: 15, color: '#fff4d6' },
  pig: { name: 'Свинья', icon: '🐷', cost: 150, product: 'truffle', prodName: 'Трюфель', interval: 20, price: 40, color: '#ffbfd7' },
  sheep: { name: 'Овца', icon: '🐑', cost: 300, product: 'wool', prodName: 'Шерсть', interval: 25, price: 70, color: '#f1f5f9' },
  cow: { name: 'Корова', icon: '🐮', cost: 500, product: 'milk', prodName: 'Молоко', interval: 30, price: 100, color: '#ffffff' },
};

export const PRODUCT_ICONS = {
  egg: '🥚',
  truffle: '🍄',
  wool: '🧶',
  milk: '🥛',
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

export function rectToWorld(rect) {
  const width = rect.w / PX_PER_UNIT;
  const depth = rect.h / PX_PER_UNIT;
  const [x, z] = pointToWorld(rect.x + rect.w / 2, rect.y + rect.h / 2);
  return { x, z, width, depth };
}
