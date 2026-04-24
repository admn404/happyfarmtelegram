import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrthographicCamera, RoundedBox, Text } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ANIMALS, BUILDINGS, CROPS, PRODUCT_ICONS, WORLD_PX, PX_PER_UNIT, clamp, pointToWorld } from './gameData';

const GROUND_SIZE = WORLD_PX / PX_PER_UNIT;

function CameraRig({ zoom }) {
  const cameraRef = useRef(null);
  const target = useRef(new THREE.Vector3(0, 0, 0));
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const { gl, invalidate } = useThree();

  useEffect(() => {
    const el = gl.domElement;

    const handleDown = (event) => {
      dragging.current = true;
      last.current = { x: event.clientX, y: event.clientY };
    };

    const handleMove = (event) => {
      if (!dragging.current) return;
      const dx = event.clientX - last.current.x;
      const dy = event.clientY - last.current.y;
      last.current = { x: event.clientX, y: event.clientY };
      const dragScale = 0.02 * (28 / zoom);
      target.current.x = clamp(target.current.x - dx * dragScale, -20, 20);
      target.current.z = clamp(target.current.z - dy * dragScale, -20, 20);
      invalidate();
    };

    const handleUp = () => {
      dragging.current = false;
    };

    el.addEventListener('pointerdown', handleDown);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      el.removeEventListener('pointerdown', handleDown);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
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
      { position: [-13, 0.01, -10], rotation: 0.4, color: '#5b8f42', size: [10, 7] },
      { position: [12, 0.01, 12], rotation: -0.3, color: '#5d9544', size: [11, 8] },
      { position: [13, 0.01, -14], rotation: 0.6, color: '#79a85d', size: [6, 8] },
      { position: [-17, 0.01, 13], rotation: -0.7, color: '#6ea750', size: [9, 6] },
    ],
    [],
  );

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshStandardMaterial color="#7dc85d" />
      </mesh>
      {patches.map((patch, index) => (
        <mesh key={index} position={patch.position} rotation={[-Math.PI / 2, 0, patch.rotation]} receiveShadow>
          <planeGeometry args={patch.size} />
          <meshStandardMaterial color={patch.color} transparent opacity={0.3} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0.12, 0]} position={[-3, 0.03, 0]}>
        <planeGeometry args={[6.5, GROUND_SIZE * 1.2]} />
        <meshStandardMaterial color="#56b9ff" transparent opacity={0.92} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0.12, 0]} position={[-3.9, 0.02, 0]}>
        <planeGeometry args={[0.75, GROUND_SIZE * 1.2]} />
        <meshStandardMaterial color="#d6c17f" transparent opacity={0.85} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0.12, 0]} position={[0.45, 0.02, 0]}>
        <planeGeometry args={[0.75, GROUND_SIZE * 1.2]} />
        <meshStandardMaterial color="#d6c17f" transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

function DecorativeTrees() {
  const trees = useMemo(
    () => [
      [-24, 0, -20], [-20, 0, -16], [-22, 0, -10], [18, 0, -18], [23, 0, -13],
      [-24, 0, 16], [23, 0, 18], [20, 0, 12], [18, 0, 6], [-19, 0, 10],
    ],
    [],
  );

  return (
    <group>
      {trees.map((position, index) => (
        <group key={index} position={position}>
          <mesh castShadow position={[0, 1.15, 0]}>
            <cylinderGeometry args={[0.24, 0.34, 2.3, 8]} />
            <meshStandardMaterial color="#7a4a1f" />
          </mesh>
          <mesh castShadow position={[0, 3.25, 0]}>
            <coneGeometry args={[1.7, 3.6, 10]} />
            <meshStandardMaterial color="#2f7a3d" />
          </mesh>
          <mesh castShadow position={[0.15, 4.3, 0.1]}>
            <sphereGeometry args={[1.15, 12, 12]} />
            <meshStandardMaterial color="#3e9b47" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function PlotCrop({ crop, isReady, now }) {
  const def = CROPS[crop.type] || CROPS.wheat;
  const progress = Math.min(1, (now - new Date(crop.plantedAt).getTime()) / 1000 / def.growTime);
  const phase = isReady ? 1 : 0.3 + progress * 0.7;
  const count = crop.type === 'corn' ? 8 : 10;

  return (
    <group>
      {Array.from({ length: count }).map((_, index) => {
        const angle = (index / count) * Math.PI * 2;
        const radius = 0.55 + (index % 3) * 0.16;
        const height = (crop.type === 'corn' ? 1.45 : 1.05) * phase;

        return (
          <group key={index} position={[Math.cos(angle) * radius, 0.15, Math.sin(angle) * radius * 0.7]}>
            <mesh castShadow position={[0, height / 2, 0]}>
              <cylinderGeometry args={[0.05, 0.07, height, 6]} />
              <meshStandardMaterial color={def.palette[0]} />
            </mesh>
            <mesh castShadow position={[0.08, Math.max(height - 0.18, 0.18), 0]}>
              <sphereGeometry args={[crop.type === 'corn' ? 0.12 : 0.09, 8, 8]} />
              <meshStandardMaterial color={def.palette[2]} emissive={isReady ? '#f7d56f' : '#000000'} emissiveIntensity={isReady ? 0.3 : 0} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function PlotNode({ plot, now, onPlant, onHarvest }) {
  const width = plot.w / PX_PER_UNIT;
  const depth = plot.h / PX_PER_UNIT;
  const [x, z] = pointToWorld(plot.cx, plot.cy);
  const crop = plot.field.crop;
  const cropDef = crop ? CROPS[crop.type] : null;
  const cropProgress = crop && cropDef ? Math.min(1, (now - new Date(crop.plantedAt).getTime()) / 1000 / cropDef.growTime) : 0;
  const isReady = Boolean(crop && cropProgress >= 1);

  const handleClick = (event) => {
    event.stopPropagation();
    if (isReady) onHarvest(plot.field.id);
    else if (!crop) onPlant(plot.field.id);
  };

  return (
    <group position={[x, 0.18, z]} onClick={handleClick}>
      <RoundedBox args={[width, 0.28, depth]} radius={0.12} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color="#8b572b" />
      </RoundedBox>
      <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width * 0.9, depth * 0.8]} />
        <meshStandardMaterial color="#6e431f" />
      </mesh>
      {crop && <PlotCrop crop={crop} isReady={isReady} now={now} />}
      <Html position={[0, 0.78, 0]} center distanceFactor={12} transform occlude>
        {crop ? (
          isReady ? <div className="scene-badge scene-badge--ready">Собрать</div> : <div className="scene-badge">{Math.max(1, Math.ceil(cropDef.growTime - cropProgress * cropDef.growTime))}с</div>
        ) : (
          <div className="scene-badge scene-badge--ghost">Посадить</div>
        )}
      </Html>
    </group>
  );
}

function BuildingNode({ building, animalsCount, warehouseStored }) {
  const [x, z] = pointToWorld(building.x, building.y);

  if (building.type === 'warehouse') {
    return (
      <group position={[x, 0, z]}>
        <RoundedBox args={[4.1, 2.5, 3.4]} radius={0.14} castShadow receiveShadow>
          <meshStandardMaterial color="#d28a42" />
        </RoundedBox>
        <mesh castShadow position={[0, 2.05, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[2.9, 1.7, 4]} />
          <meshStandardMaterial color="#7b2f1f" />
        </mesh>
        <Html position={[0, 3.9, 0]} center distanceFactor={13} transform>
          <div className="scene-badge">Склад {warehouseStored}/{BUILDINGS.warehouse.capacity}</div>
        </Html>
      </group>
    );
  }

  if (building.type === 'coop') {
    return (
      <group position={[x, 0, z]}>
        <RoundedBox args={[3.4, 1.9, 2.7]} radius={0.12} castShadow receiveShadow>
          <meshStandardMaterial color="#f4d7a4" />
        </RoundedBox>
        <mesh castShadow position={[0, 1.8, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[2.45, 1.45, 4]} />
          <meshStandardMaterial color="#d85a4a" />
        </mesh>
        <Html position={[0, 3.4, 0]} center distanceFactor={12} transform>
          <div className="scene-badge">Курятник {animalsCount}/{BUILDINGS.coop.capacity}</div>
        </Html>
      </group>
    );
  }

  return (
    <group position={[x, 0, z]}>
      <RoundedBox args={[3.8, 1.7, 2.9]} radius={0.12} castShadow receiveShadow>
        <meshStandardMaterial color="#efb1bf" />
      </RoundedBox>
      <mesh castShadow position={[0, 1.5, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[2.65, 1.25, 4]} />
        <meshStandardMaterial color="#b04f63" />
      </mesh>
      <Html position={[0, 3.2, 0]} center distanceFactor={12} transform>
        <div className="scene-badge">Свинарник {animalsCount}/{BUILDINGS.pigsty.capacity}</div>
      </Html>
    </group>
  );
}

function ProductNode({ product, onCollect }) {
  const [x, z] = pointToWorld(product.x, product.y);

  return (
    <group position={[x, 0.45, z]} onClick={(event) => { event.stopPropagation(); onCollect(product.id); }}>
      <mesh castShadow>
        <sphereGeometry args={[0.22, 14, 14]} />
        <meshStandardMaterial color="#ffe39e" emissive="#f4b740" emissiveIntensity={0.35} />
      </mesh>
      <Html position={[0, 0.04, 0]} center distanceFactor={8} transform sprite>
        <div className="scene-icon">{PRODUCT_ICONS[product.type] || '📦'}</div>
      </Html>
    </group>
  );
}

function AnimalNode({ animal }) {
  const group = useRef(null);
  const [x, z] = pointToWorld(animal.x, animal.y);
  const bodyColor = ANIMALS[animal.type]?.color || '#ffffff';

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime() * 3;
    group.current.position.y = 0.34 + Math.sin(t + animal.x * 0.01) * 0.05;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, animal.flip ? Math.PI * 0.75 : -Math.PI * 0.25, 0.12);
  });

  return (
    <group ref={group} position={[x, 0.34, z]} scale={0.8}>
      <mesh castShadow position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.68, 18, 18]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
      <mesh castShadow position={[0.48, 0.75, 0.08]}>
        <sphereGeometry args={[0.3, 14, 14]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
      {animal.type === 'pig' ? (
        <mesh castShadow position={[0.8, 0.68, 0.12]}>
          <sphereGeometry args={[0.11, 10, 10]} />
          <meshStandardMaterial color="#f493af" />
        </mesh>
      ) : (
        <mesh castShadow position={[0.82, 0.76, 0.04]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.07, 0.22, 6]} />
          <meshStandardMaterial color="#f7b11d" />
        </mesh>
      )}
    </group>
  );
}

function SceneRoot({ now, plots, buildings, animals, products, warehouseStored, placementMode, zoom, onGroundPlace, onPlotPlant, onPlotHarvest, onCollectProduct }) {
  const buildingAnimals = Object.fromEntries(buildings.map((building) => [building.id, 0]));
  animals.forEach((animal) => {
    if (buildingAnimals[animal.homeId] !== undefined) buildingAnimals[animal.homeId] += 1;
  });

  return (
    <>
      <ambientLight intensity={1.35} color="#f8f2d9" />
      <directionalLight
        castShadow
        position={[18, 24, 12]}
        intensity={2.15}
        color="#fff7dd"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
      />
      <fog attach="fog" args={['#c0e2ff', 28, 75]} />
      <color attach="background" args={['#9ad8ff']} />
      <CameraRig zoom={zoom} />
      <Terrain />
      <DecorativeTrees />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} onClick={(event) => onGroundPlace(event.point)}>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {plots.map((plot) => (
        <PlotNode key={plot.id} plot={plot} now={now} onPlant={onPlotPlant} onHarvest={onPlotHarvest} />
      ))}
      {buildings.map((building) => (
        <BuildingNode
          key={building.id}
          building={building}
          animalsCount={buildingAnimals[building.id] || 0}
          warehouseStored={warehouseStored}
        />
      ))}
      {animals.map((animal) => <AnimalNode key={animal.id} animal={animal} />)}
      {products.map((product) => <ProductNode key={product.id} product={product} onCollect={onCollectProduct} />)}

      {placementMode && (
        <Text position={[0, 0.35, -22]} rotation={[-Math.PI / 2, 0, 0]} fontSize={1.1} color="#f9fff2">
          Tap ground to place {placementMode.name}
        </Text>
      )}
    </>
  );
}

export default function FarmScene(props) {
  return (
    <div className="scene-shell">
      <Canvas shadows dpr={[1, 1.5]}>
        <SceneRoot {...props} />
      </Canvas>
      <div className="scene-tip">Пустой участок уже живой: ставь грядки и здания прямо по земле.</div>
    </div>
  );
}
