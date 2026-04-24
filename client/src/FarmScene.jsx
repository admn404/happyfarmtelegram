import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrthographicCamera, RoundedBox, Text } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ANIMALS, CROPS, PRODUCT_ICONS, WORLD_PX, PX_PER_UNIT, clamp, pointToWorld, rectToWorld } from './gameData';

const GROUND_SIZE = WORLD_PX / PX_PER_UNIT;

function CameraRig({ zoom }) {
  const cameraRef = useRef(null);
  const target = useRef(new THREE.Vector3(0, 0, 0));
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const { gl, invalidate } = useThree();

  useEffect(() => {
    const el = gl.domElement;

    const handlePointerDown = (event) => {
      dragging.current = true;
      last.current = { x: event.clientX, y: event.clientY };
    };

    const handlePointerMove = (event) => {
      if (!dragging.current) return;
      const dx = event.clientX - last.current.x;
      const dy = event.clientY - last.current.y;
      last.current = { x: event.clientX, y: event.clientY };

      const dragScale = 0.02 * (28 / zoom);
      target.current.x = clamp(target.current.x - dx * dragScale, -18, 18);
      target.current.z = clamp(target.current.z - dy * dragScale, -18, 18);
      invalidate();
    };

    const handlePointerUp = () => {
      dragging.current = false;
    };

    el.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      el.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [gl, invalidate, zoom]);

  useFrame(() => {
    if (!cameraRef.current) return;
    cameraRef.current.zoom = THREE.MathUtils.lerp(cameraRef.current.zoom, zoom, 0.12);
    cameraRef.current.position.x = THREE.MathUtils.lerp(cameraRef.current.position.x, target.current.x + 24, 0.08);
    cameraRef.current.position.y = THREE.MathUtils.lerp(cameraRef.current.position.y, 20, 0.08);
    cameraRef.current.position.z = THREE.MathUtils.lerp(cameraRef.current.position.z, target.current.z + 24, 0.08);
    cameraRef.current.lookAt(target.current.x, 0, target.current.z);
    cameraRef.current.updateProjectionMatrix();
  });

  return <OrthographicCamera ref={cameraRef} makeDefault zoom={zoom} position={[24, 20, 24]} near={0.1} far={200} />;
}

function Terrain() {
  const patches = useMemo(
    () => [
      { position: [-12, 0.01, -8], rotation: 0.5, color: '#3c6b2d', size: [13, 8] },
      { position: [9, 0.01, 10], rotation: -0.35, color: '#4d7b31', size: [11, 9] },
      { position: [13, 0.01, -13], rotation: 0.2, color: '#5e8742', size: [8, 6] },
      { position: [-15, 0.01, 12], rotation: -0.7, color: '#456e33', size: [10, 7] },
    ],
    [],
  );

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshStandardMaterial color="#6fbe53" />
      </mesh>
      {patches.map((patch, index) => (
        <mesh key={index} position={patch.position} rotation={[-Math.PI / 2, 0, patch.rotation]} receiveShadow>
          <planeGeometry args={patch.size} />
          <meshStandardMaterial color={patch.color} transparent opacity={0.35} />
        </mesh>
      ))}
    </group>
  );
}

function DecorativeTrees() {
  const trees = useMemo(
    () => [
      [-24, 0, -20],
      [-20, 0, -16],
      [22, 0, -18],
      [25, 0, -13],
      [-24, 0, 16],
      [23, 0, 18],
    ],
    [],
  );

  return (
    <group>
      {trees.map((position, index) => (
        <group key={index} position={position}>
          <mesh castShadow position={[0, 1.25, 0]}>
            <cylinderGeometry args={[0.25, 0.35, 2.5, 8]} />
            <meshStandardMaterial color="#7a4a1f" />
          </mesh>
          <mesh castShadow position={[0, 3.5, 0]}>
            <coneGeometry args={[1.8, 3.8, 10]} />
            <meshStandardMaterial color="#2f7a3d" />
          </mesh>
          <mesh castShadow position={[0.2, 4.6, 0.1]}>
            <sphereGeometry args={[1.2, 14, 14]} />
            <meshStandardMaterial color="#3e9b47" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function PlotCrop({ crop, isReady, now, scale = 1 }) {
  const def = CROPS[crop.type] || CROPS.wheat;
  const progress = Math.min(1, (now - new Date(crop.plantedAt).getTime()) / 1000 / def.growTime);
  const phase = isReady ? 1 : 0.35 + progress * 0.65;
  const stalkCount = crop.type === 'corn' ? 8 : 11;

  return (
    <group scale={scale}>
      {Array.from({ length: stalkCount }).map((_, index) => {
        const angle = (index / stalkCount) * Math.PI * 2;
        const radius = 0.65 + (index % 3) * 0.18;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius * 0.7;
        const height = (crop.type === 'corn' ? 1.5 : 1.1) * phase;
        const sway = Math.sin(index) * 0.05;

        return (
          <group key={index} position={[x, 0.16, z]} rotation={[0, sway, 0]}>
            <mesh castShadow position={[0, height / 2, 0]}>
              <cylinderGeometry args={[0.05, 0.07, height, 6]} />
              <meshStandardMaterial color={def.palette[0]} />
            </mesh>
            <mesh castShadow position={[0.08, Math.max(height - 0.18, 0.16), 0]}>
              <sphereGeometry args={[crop.type === 'corn' ? 0.12 : 0.09, 8, 8]} />
              <meshStandardMaterial color={def.palette[2]} emissive={isReady ? '#f1c949' : '#000000'} emissiveIntensity={isReady ? 0.35 : 0} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Plot({ plot, field, now, onPlant, onHarvest, onBuy, cropScale = 1 }) {
  const width = plot.w / PX_PER_UNIT;
  const depth = plot.h / PX_PER_UNIT;
  const [x, z] = pointToWorld(plot.cx, plot.cy);
  const crop = field?.crop;
  const cropDef = crop ? CROPS[crop.type] : null;
  const cropProgress = crop && cropDef
    ? Math.min(1, (now - new Date(crop.plantedAt).getTime()) / 1000 / cropDef.growTime)
    : 0;
  const isReady = Boolean(crop && cropProgress >= 1);

  const handleClick = (event) => {
    event.stopPropagation();
    if (!field?.unlocked) {
      onBuy(field?.id);
      return;
    }
    if (isReady) {
      onHarvest(field.id);
      return;
    }
    if (!crop) onPlant(field.id);
  };

  return (
    <group position={[x, 0.25, z]} onClick={handleClick}>
      <RoundedBox args={[width, 0.36, depth]} radius={0.12} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color={field?.unlocked ? '#89562b' : '#5b5b5b'} />
      </RoundedBox>
      <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width * 0.92, depth * 0.82]} />
        <meshStandardMaterial color={field?.unlocked ? '#6d4321' : '#6b7280'} />
      </mesh>
      {field?.unlocked && crop && <PlotCrop crop={crop} isReady={isReady} now={now} scale={cropScale} />}
      <Html position={[0, Math.max(width, depth) * 0.07 + 0.7, 0]} center distanceFactor={13} transform occlude>
        {!field?.unlocked ? (
          <div className="scene-badge scene-badge--locked">Открыть за {field?.price ?? '?'}🪙</div>
        ) : crop ? (
          isReady ? (
            <div className="scene-badge scene-badge--ready">Собрать</div>
          ) : (
            <div className="scene-badge">{Math.max(1, Math.ceil(cropDef.growTime - cropProgress * cropDef.growTime))}с</div>
          )
        ) : (
          <div className="scene-badge scene-badge--ghost">Посадить</div>
        )}
      </Html>
    </group>
  );
}

function WellZone({ zone, water, onRefill }) {
  const world = rectToWorld(zone);
  return (
    <group position={[world.x, 0, world.z]} onClick={(event) => { event.stopPropagation(); onRefill(); }}>
      <mesh castShadow position={[0, 1.1, 0]}>
        <cylinderGeometry args={[1.5, 1.9, 2.1, 24]} />
        <meshStandardMaterial color="#d4c4ab" />
      </mesh>
      <mesh position={[0, 1.75, 0]}>
        <cylinderGeometry args={[1.05, 1.05, 0.2, 24]} />
        <meshStandardMaterial color="#54b8ff" emissive="#54b8ff" emissiveIntensity={0.25} />
      </mesh>
      <mesh castShadow position={[0, 2.95, 0]}>
        <boxGeometry args={[0.2, 1.7, 0.2]} />
        <meshStandardMaterial color="#8a5a2b" />
      </mesh>
      <mesh castShadow position={[0.9, 2.95, 0]}>
        <boxGeometry args={[0.2, 1.7, 0.2]} />
        <meshStandardMaterial color="#8a5a2b" />
      </mesh>
      <mesh castShadow position={[0.45, 3.65, 0]}>
        <boxGeometry args={[1.4, 0.2, 0.2]} />
        <meshStandardMaterial color="#744621" />
      </mesh>
      <Html position={[0, 4.5, 0]} center distanceFactor={12} transform>
        <div className="scene-badge scene-badge--water">Вода {Math.round(water)}%</div>
      </Html>
    </group>
  );
}

function BarnZone({ zone, count }) {
  const world = rectToWorld(zone);
  return (
    <group position={[world.x, 0, world.z]}>
      <RoundedBox args={[4.2, 2.6, 3.6]} radius={0.14} castShadow receiveShadow>
        <meshStandardMaterial color="#d0893e" />
      </RoundedBox>
      <mesh castShadow position={[0, 2.15, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[2.9, 1.8, 4]} />
        <meshStandardMaterial color="#7b2f1f" />
      </mesh>
      <mesh position={[0, 0.95, 1.86]}>
        <planeGeometry args={[1.2, 1.6]} />
        <meshStandardMaterial color="#6c2f20" />
      </mesh>
      <Html position={[0, 3.9, 0]} center distanceFactor={13} transform>
        <div className="scene-badge">Склад {count}/20</div>
      </Html>
    </group>
  );
}

function TruckZone({ zone, canSell, truckTime, onSell }) {
  const world = rectToWorld(zone);
  return (
    <group position={[world.x, 0, world.z]} onClick={(event) => { event.stopPropagation(); onSell(); }}>
      <mesh castShadow position={[0, 0.85, 0]}>
        <boxGeometry args={[3.2, 1.2, 1.5]} />
        <meshStandardMaterial color="#f2f4f8" />
      </mesh>
      <mesh castShadow position={[-1.25, 0.9, 0]}>
        <boxGeometry args={[1.05, 1.5, 1.45]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
      {[-1.05, 0.95].map((x) => (
        <mesh key={x} castShadow position={[x, 0.2, 0.78]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.34, 0.34, 0.25, 20]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      ))}
      {[-1.05, 0.95].map((x) => (
        <mesh key={`${x}-2`} castShadow position={[x, 0.2, -0.78]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.34, 0.34, 0.25, 20]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      ))}
      <Html position={[0, 2.2, 0]} center distanceFactor={12} transform>
        {truckTime > 0 ? (
          <div className="scene-badge scene-badge--truck">В пути {Math.ceil(truckTime)}с</div>
        ) : canSell ? (
          <div className="scene-badge scene-badge--ready">Отправить груз</div>
        ) : null}
      </Html>
    </group>
  );
}

function ShopZone({ zone, onOpen }) {
  const world = rectToWorld(zone);
  return (
    <group position={[world.x, 0, world.z]} onClick={(event) => { event.stopPropagation(); onOpen(); }}>
      <mesh castShadow position={[0, 1.2, 0]}>
        <boxGeometry args={[3, 2.3, 2.2]} />
        <meshStandardMaterial color="#f4b35d" />
      </mesh>
      <mesh castShadow position={[0, 2.65, 0]}>
        <coneGeometry args={[2.2, 1.35, 4]} />
        <meshStandardMaterial color="#ff6b6b" />
      </mesh>
      <Html position={[0, 4, 0]} center distanceFactor={12} transform>
        <div className="scene-badge scene-badge--shop">Магазин</div>
      </Html>
    </group>
  );
}

function PenZone({ zone }) {
  const world = rectToWorld(zone);
  const posts = [];
  const halfW = world.width / 2;
  const halfD = world.depth / 2;

  for (let i = -halfW; i <= halfW; i += 1.4) {
    posts.push([i, -halfD], [i, halfD]);
  }
  for (let i = -halfD; i <= halfD; i += 1.4) {
    posts.push([-halfW, i], [halfW, i]);
  }

  return (
    <group position={[world.x, 0, world.z]}>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[world.width, world.depth]} />
        <meshStandardMaterial color="#7cc05f" />
      </mesh>
      {posts.map((post, index) => (
        <mesh key={index} castShadow position={[post[0], 0.42, post[1]]}>
          <boxGeometry args={[0.15, 0.84, 0.15]} />
          <meshStandardMaterial color="#d6b27a" />
        </mesh>
      ))}
      <Html position={[0, 1.3, 0]} center distanceFactor={12} transform>
        <div className="scene-badge">Загон</div>
      </Html>
    </group>
  );
}

function ProductNode({ product, onCollect, scale = 1 }) {
  const [x, z] = pointToWorld(product.x, product.y);

  return (
    <group position={[x, 0.52, z]} scale={scale} onClick={(event) => { event.stopPropagation(); onCollect(product.id); }}>
      <mesh castShadow>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="#ffe39e" emissive="#f4b740" emissiveIntensity={0.4} />
      </mesh>
      <Html position={[0, 0.05, 0]} center distanceFactor={8} transform sprite>
        <div className="scene-icon">{PRODUCT_ICONS[product.type] || '📦'}</div>
      </Html>
    </group>
  );
}

function GrassNode({ item, scale = 1 }) {
  const [x, z] = pointToWorld(item.x, item.y);

  return (
    <group position={[x, 0.08, z]} scale={scale}>
      {[-0.14, 0, 0.14].map((offset, index) => (
        <mesh key={index} castShadow position={[offset, 0.3 + index * 0.02, (index - 1) * 0.05]} rotation={[0, 0, offset * 2]}>
          <coneGeometry args={[0.11, 0.7, 6]} />
          <meshStandardMaterial color={index === 1 ? '#4caf50' : '#68ca57'} />
        </mesh>
      ))}
    </group>
  );
}

function AnimalNode({ animal, scale = 1 }) {
  const group = useRef(null);
  const [x, z] = pointToWorld(animal.x, animal.y);
  const bodyColor = ANIMALS[animal.type]?.color || '#ffffff';

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime() * 3;
    group.current.position.y = 0.4 + Math.sin(t + animal.id) * 0.06;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, animal.flip ? Math.PI * 0.75 : -Math.PI * 0.25, 0.12);
  });

  return (
    <group ref={group} position={[x, 0.4, z]} scale={0.8 * scale}>
      <mesh castShadow position={[0, 0.6, 0]}>
        <sphereGeometry args={[0.72, 18, 18]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
      <mesh castShadow position={[0.52, 0.82, 0.1]}>
        <sphereGeometry args={[0.34, 16, 16]} />
        <meshStandardMaterial color={animal.type === 'cow' ? '#f6f6f6' : bodyColor} />
      </mesh>
      {animal.type === 'cow' && (
        <>
          <mesh castShadow position={[-0.22, 0.72, 0.52]}>
            <sphereGeometry args={[0.16, 12, 12]} />
            <meshStandardMaterial color="#2b2b2b" />
          </mesh>
          <mesh castShadow position={[0.08, 0.52, -0.4]}>
            <sphereGeometry args={[0.18, 12, 12]} />
            <meshStandardMaterial color="#2b2b2b" />
          </mesh>
        </>
      )}
      {animal.type === 'pig' && (
        <mesh castShadow position={[0.84, 0.72, 0.12]}>
          <sphereGeometry args={[0.12, 10, 10]} />
          <meshStandardMaterial color="#f49ab6" />
        </mesh>
      )}
      {animal.type === 'chicken' && (
        <mesh castShadow position={[0.85, 0.8, 0.02]}>
          <coneGeometry args={[0.08, 0.24, 6]} rotation={[0, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
      )}
      <Html position={[0, 1.7, 0]} center distanceFactor={12} transform>
        <div className="scene-health">
          <div className="scene-health__fill" style={{ width: `${Math.max(0, animal.hunger)}%`, background: animal.hunger < 30 ? '#ff6b6b' : '#4ade80' }} />
        </div>
      </Html>
    </group>
  );
}

function SceneRoot(props) {
  const { layout, enrichedFields, now, state, onGroundPlant, onPlantField, onHarvestField, onBuyField, onCollectProduct, onRefillWell, onSellWarehouse, onOpenShop } = props;

  const beds = (layout?.beds || []).map((bed) => ({ ...bed, w: layout?.bedSize?.w || 340, h: layout?.bedSize?.h || 220 }));
  const cropScale = layout?.scales?.crop || 1;
  const productScale = layout?.scales?.product || 1;
  const animalScale = layout?.scales?.animal || 1;
  const canSell = state.warehouse.length > 0 && state.truckTime <= 0;

  return (
    <>
      <ambientLight intensity={1.4} color="#f7f2d7" />
      <directionalLight
        castShadow
        position={[18, 24, 12]}
        intensity={2.2}
        color="#fff6d6"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
      />
      <fog attach="fog" args={['#b9ddff', 28, 75]} />
      <color attach="background" args={['#9ad8ff']} />
      <CameraRig zoom={props.zoom} />
      <Terrain />
      <DecorativeTrees />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} onClick={(event) => onGroundPlant(event.point)}>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {beds.map((plot, index) => (
        <Plot
          key={index}
          plot={plot}
          field={enrichedFields[index]}
          now={now}
          onPlant={onPlantField}
          onHarvest={onHarvestField}
          onBuy={onBuyField}
          cropScale={cropScale}
        />
      ))}

      {layout?.zones?.well && <WellZone zone={layout.zones.well} water={state.water} onRefill={onRefillWell} />}
      {layout?.zones?.warehouse && <BarnZone zone={layout.zones.warehouse} count={state.warehouse.length} />}
      {layout?.zones?.truck && <TruckZone zone={layout.zones.truck} canSell={canSell} truckTime={state.truckTime} onSell={onSellWarehouse} />}
      {layout?.zones?.shop && <ShopZone zone={layout.zones.shop} onOpen={onOpenShop} />}
      {layout?.zones?.pen && <PenZone zone={layout.zones.pen} />}

      {state.grass.map((item) => <GrassNode key={item.id} item={item} scale={cropScale} />)}
      {state.products.map((product) => <ProductNode key={product.id} product={product} onCollect={onCollectProduct} scale={productScale} />)}
      {state.animals.map((animal) => <AnimalNode key={animal.id} animal={animal} scale={animalScale} />)}

      <Text position={[-23, 0.35, -23]} rotation={[-Math.PI / 2, 0, 0]} fontSize={1.1} color="#ebfff0">
        Farm 2026
      </Text>
    </>
  );
}

export default function FarmScene(props) {
  return (
    <div className="scene-shell">
      <Canvas shadows dpr={[1, 1.5]}>
        <SceneRoot {...props} />
      </Canvas>
      <div className="scene-tip">Тяни сцену для обзора, колесом или кнопками меняй масштаб.</div>
    </div>
  );
}
