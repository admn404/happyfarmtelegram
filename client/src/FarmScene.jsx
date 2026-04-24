import { Canvas, useFrame } from '@react-three/fiber';
import { Html, MapControls, OrthographicCamera, RoundedBox } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  ANIMALS,
  BUILDINGS,
  CROPS,
  LAND_BLOCK_HEIGHT_PX,
  LAND_TILE_DEPTH_PX,
  LAND_TILE_WIDTH_PX,
  PLACEABLES,
  PRODUCT_ICONS,
  PX_PER_UNIT,
  clamp,
  getLandBounds,
  getLandTileCenter,
  getTileExpansionOptions,
  pointToWorld,
  snapToPlotGrid,
  BASE_TILE_CENTER_X,
} from './gameData';

const TILE_WIDTH = LAND_TILE_WIDTH_PX / PX_PER_UNIT;
const TILE_DEPTH = LAND_TILE_DEPTH_PX / PX_PER_UNIT;
const TILE_HEIGHT = LAND_BLOCK_HEIGHT_PX / PX_PER_UNIT;

function CameraRig({ zoom, landTiles }) {
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const bounds = useMemo(() => getLandBounds(landTiles), [landTiles]);

  const [minX, minZ] = pointToWorld(getLandTileCenter(bounds.minCol, bounds.minRow).x, getLandTileCenter(bounds.minCol, bounds.minRow).y);
  const [maxX, maxZ] = pointToWorld(getLandTileCenter(bounds.maxCol, bounds.maxRow).x, getLandTileCenter(bounds.maxCol, bounds.maxRow).y);
  
  const targetX = (minX + maxX) / 2;
  const targetZ = (minZ + maxZ) / 2;

  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    controlsRef.current.target.set(targetX, 0, targetZ);
    cameraRef.current.position.set(targetX + 12.5, 12.5, targetZ + 12.5);
    controlsRef.current.update();
  }, [targetX, targetZ]);

  useFrame(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    const target = controlsRef.current.target;
    target.x = clamp(target.x, minX - 2.5, maxX + 2.5);
    target.z = clamp(target.z, minZ - 2.5, maxZ + 2.5);
    cameraRef.current.zoom = THREE.MathUtils.lerp(cameraRef.current.zoom, zoom, 0.12);
    cameraRef.current.updateProjectionMatrix();
    controlsRef.current.update();
  });

  return (
    <>
      <OrthographicCamera ref={cameraRef} makeDefault zoom={zoom} position={[12.5, 12.5, 12.5]} near={0.1} far={250} />
      <MapControls
        ref={controlsRef}
        enableRotate={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.12}
        screenSpacePanning={false}
        minPolarAngle={Math.PI / 3.4}
        maxPolarAngle={Math.PI / 3.4}
        minAzimuthAngle={-Math.PI / 4}
        maxAzimuthAngle={-Math.PI / 4}
        mouseButtons={{ LEFT: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN }}
        touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN }}
      />
    </>
  );
}

function LandTile({ column, row, onPlace, isSelected, onSelect, onHover }) {
  const center = getLandTileCenter(column, row);
  const [x, z] = pointToWorld(center.x, center.y);

  return (
    <group position={[x, -TILE_HEIGHT / 2, z]} onClick={(event) => {
      if (onSelect) {
        event.stopPropagation();
        onSelect({ column, row });
      }
    }}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[TILE_WIDTH, TILE_HEIGHT, TILE_DEPTH]} />
        <meshStandardMaterial color={isSelected ? "#b98c5c" : "#8e5c30"} />
      </mesh>
      <mesh
        position={[0, TILE_HEIGHT / 2 + 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onPointerMove={(event) => {
          if (onHover) onHover(event.point);
        }}
        onClick={(event) => {
          if (onSelect) {
            event.stopPropagation();
            onSelect({ column, row });
          } else {
            event.stopPropagation();
            onPlace(event.point);
          }
        }}
      >
        <planeGeometry args={[TILE_WIDTH, TILE_DEPTH]} />
        <meshStandardMaterial color={isSelected ? "#a9e38e" : "#7dc85d"} />
      </mesh>
      {isSelected && (
        <mesh position={[0, TILE_HEIGHT / 2 + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[TILE_WIDTH * 1.05, TILE_DEPTH * 1.05]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function ExpansionNode({ column, row, cost, onExpand }) {
  const center = getLandTileCenter(column, row);
  const [x, z] = pointToWorld(center.x, center.y);

  return (
    <group position={[x, 0.8, z]} onClick={(event) => { event.stopPropagation(); onExpand(column, row); }}>
      <mesh visible={false}>
        <cylinderGeometry args={[1.55, 1.55, 2.2, 24]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      <mesh castShadow>
        <cylinderGeometry args={[0.9, 1.05, 0.4, 24]} />
        <meshStandardMaterial color="#dffb9c" emissive="#bdf160" emissiveIntensity={0.25} />
      </mesh>
      <Html position={[0, 0.03, 0]} center distanceFactor={8} transform sprite>
        <div className="scene-plus">+</div>
      </Html>
      <Html position={[0, 1.3, 0]} center distanceFactor={12} transform sprite>
        <div className="scene-badge scene-badge--expand">{cost}🪙</div>
      </Html>
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
          <group key={index} position={[Math.cos(angle) * radius, 0.18, Math.sin(angle) * radius * 0.7]}>
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
      <Html position={[0, 0.78, 0]} center distanceFactor={12} transform sprite occlude>
        {crop ? (
          isReady ? <div className="scene-badge scene-badge--ready">Собрать</div> : <div className="scene-badge">{Math.max(1, Math.ceil(cropDef.growTime - cropProgress * cropDef.growTime))}с</div>
        ) : (
          <div className="scene-badge scene-badge--ghost">Посадить</div>
        )}
      </Html>
    </group>
  );
}

function PenNode({ building, animalsCount, onClick }) {
  const [x, z] = pointToWorld(building.x, building.y);
  const groundY = 0.04;
  const size = 360 / 32;

  return (
    <group position={[x, groundY, z]} onClick={onClick}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[size - 0.4, size - 0.4]} />
        <meshStandardMaterial color="#7bb16a" />
      </mesh>
      
      <group position={[0, 0.4, 0]}>
        <RoundedBox args={[size, 0.8, 0.2]} position={[0, 0, -size/2]} radius={0.05}>
          <meshStandardMaterial color="#8b572b" />
        </RoundedBox>
        <RoundedBox args={[size, 0.8, 0.2]} position={[0, 0, size/2]} radius={0.05}>
          <meshStandardMaterial color="#8b572b" />
        </RoundedBox>
        <RoundedBox args={[0.2, 0.8, size]} position={[-size/2, 0, 0]} radius={0.05}>
          <meshStandardMaterial color="#8b572b" />
        </RoundedBox>
        <RoundedBox args={[0.2, 0.8, size]} position={[size/2, 0, 0]} radius={0.05}>
          <meshStandardMaterial color="#8b572b" />
        </RoundedBox>
      </group>

      <Html position={[0, 1.2, 0]} center distanceFactor={12} transform sprite>
        <div className="scene-badge">Загон {animalsCount}/{BUILDINGS.pen.capacity}</div>
      </Html>
    </group>
  );
}

function WellNode({ building, onClick }) {
  const [x, z] = pointToWorld(building.x, building.y);
  const groundY = 0.06;

  return (
    <group position={[x, groundY, z]} onClick={onClick}>
      <RoundedBox args={[1.8, 1.2, 1.8]} radius={0.1} castShadow receiveShadow>
        <meshStandardMaterial color="#9b9b9b" />
      </RoundedBox>
      <mesh position={[0.6, 1.2, 0]}>
        <boxGeometry args={[0.1, 1.5, 0.1]} />
        <meshStandardMaterial color="#6e431f" />
      </mesh>
      <mesh position={[-0.6, 1.2, 0]}>
        <boxGeometry args={[0.1, 1.5, 0.1]} />
        <meshStandardMaterial color="#6e431f" />
      </mesh>
      <mesh position={[0, 2.2, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.6, 0.8, 4]} />
        <meshStandardMaterial color="#7b2f1f" />
      </mesh>
      
      <Html position={[0, 3.2, 0]} center distanceFactor={12} transform sprite>
        <div className="scene-badge">Колодец</div>
      </Html>
    </group>
  );
}

function BuildingNode({ building, animalsCount, warehouseStored, onClick }) {
  const [x, z] = pointToWorld(building.x, building.y);
  const groundY = 0.06;

  const handleClick = (event) => {
    if (onClick) {
      event.stopPropagation();
      onClick(building.id);
    }
  };

  if (building.type === 'warehouse') {
    return (
      <group position={[x, groundY, z]} onClick={handleClick}>
        <RoundedBox args={[4.1, 2.5, 3.4]} radius={0.14} castShadow receiveShadow>
          <meshStandardMaterial color="#d28a42" />
        </RoundedBox>
        <mesh castShadow position={[0, 2.05, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[2.9, 1.7, 4]} />
          <meshStandardMaterial color="#7b2f1f" />
        </mesh>
        <Html position={[0, 3.9, 0]} center distanceFactor={13} transform sprite>
          <div className="scene-badge">Склад {warehouseStored}/{BUILDINGS.warehouse.capacity}</div>
        </Html>
      </group>
    );
  }

  if (building.type === 'coop') {
    return (
      <group position={[x, groundY, z]} onClick={handleClick}>
        <RoundedBox args={[3.4, 1.9, 2.7]} radius={0.12} castShadow receiveShadow>
          <meshStandardMaterial color="#f4d7a4" />
        </RoundedBox>
        <mesh castShadow position={[0, 1.8, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[2.45, 1.45, 4]} />
          <meshStandardMaterial color="#d85a4a" />
        </mesh>
        <Html position={[0, 3.4, 0]} center distanceFactor={12} transform sprite>
          <div className="scene-badge">Курятник {animalsCount}/{BUILDINGS.coop.capacity}</div>
        </Html>
      </group>
    );
  }

  if (building.type === 'pen') return <PenNode building={building} animalsCount={animalsCount} onClick={handleClick} />;
  if (building.type === 'well') return <WellNode building={building} onClick={handleClick} />;

  return (
    <group position={[x, groundY, z]} onClick={handleClick}>
      <RoundedBox args={[3.8, 1.7, 2.9]} radius={0.12} castShadow receiveShadow>
        <meshStandardMaterial color="#efb1bf" />
      </RoundedBox>
      <mesh castShadow position={[0, 1.5, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[2.65, 1.25, 4]} />
        <meshStandardMaterial color="#b04f63" />
      </mesh>
      <Html position={[0, 3.2, 0]} center distanceFactor={12} transform sprite>
        <div className="scene-badge">Свинарник {animalsCount}/{BUILDINGS.pigsty.capacity}</div>
      </Html>
    </group>
  );
}

function PreviewNode({ placementMode, hoverPoint }) {
  if (!placementMode || !hoverPoint) return null;

  const rawX = hoverPoint.x * 32 + 1024;
  const rawY = hoverPoint.z * 32 + 1024;

  let finalX = rawX;
  let finalY = rawY;

  if (placementMode.type === 'plot') {
    const snapped = snapToPlotGrid(rawX, rawY);
    finalX = snapped.cx;
    finalY = snapped.cy;
  } else if (placementMode.type === 'building') {
    const col = Math.round((rawX - BASE_TILE_CENTER_X) / LAND_TILE_WIDTH_PX);
    const row = Math.round((rawY - BASE_TILE_CENTER_Y) / LAND_TILE_DEPTH_PX);
    finalX = BASE_TILE_CENTER_X + col * LAND_TILE_WIDTH_PX;
    finalY = BASE_TILE_CENTER_Y + row * LAND_TILE_DEPTH_PX;
  }

  const [wx, wz] = pointToWorld(finalX, finalY);

  return (
    <group position={[wx, 0.2, wz]}>
      <group opacity={0.5} transparent>
        {placementMode.type === 'plot' ? (
          <PlotNode 
            plot={{ id: 'preview', cx: finalX, cy: finalY, field: { id: 'preview' } }} 
            now={Date.now()} 
          />
        ) : (
          <BuildingNode
            building={{ type: placementMode.id, x: finalX, y: finalY }}
            animalsCount={0}
            warehouseStored={0}
          />
        )}
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[placementMode.width / 32, placementMode.depth / 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.2} />
      </mesh>
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

function SceneRoot({
  now, landTiles, plots, buildings, animals, products,
  warehouseStored, expansionCost, placementMode, zoom,
  onGroundPlace, onPlotPlant, onPlotHarvest, onCollectProduct,
  onExpand, selectedTile, onTileSelect, onBuildingClick,
}) {
  const [hoverPoint, setHoverPoint] = useState(null);

  const buildingAnimals = Object.fromEntries(buildings.map((building) => [building.id, 0]));
  animals.forEach((animal) => {
    if (buildingAnimals[animal.homeId] !== undefined) buildingAnimals[animal.homeId] += 1;
  });

  const handleHover = (point) => {
    setHoverPoint(point);
  };

  return (
    <group onPointerMissed={() => onTileSelect(null)}>
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
      <fog attach="fog" args={['#c0e2ff', 28, 90]} />
      <color attach="background" args={['#9ad8ff']} />
      <CameraRig zoom={zoom} landTiles={landTiles} />

      {landTiles.map((tile) => (
        <LandTile
          key={tile.id}
          column={tile.column}
          row={tile.row || 0}
          onPlace={onGroundPlace}
          isSelected={selectedTile && selectedTile.column === tile.column && selectedTile.row === tile.row}
          onSelect={onTileSelect}
          onHover={placementMode ? handleHover : null}
        />
      ))}

      {placementMode && hoverPoint && (
        <PreviewNode placementMode={placementMode} hoverPoint={hoverPoint} />
      )}

      {selectedTile && !placementMode && getTileExpansionOptions(selectedTile, landTiles).map((option) => (
        <ExpansionNode
          key={`${option.column},${option.row}`}
          column={option.column}
          row={option.row}
          cost={expansionCost}
          onExpand={onExpand}
        />
      ))}

      {plots.map((plot) => <PlotNode key={plot.id} plot={plot} now={now} onPlant={onPlotPlant} onHarvest={onPlotHarvest} />)}
      {buildings.map((building) => (
        <BuildingNode
          key={building.id}
          building={building}
          animalsCount={buildingAnimals[building.id] || 0}
          warehouseStored={warehouseStored}
          onClick={onBuildingClick}
        />
      ))}
      {animals.map((animal) => <AnimalNode key={animal.id} animal={animal} />)}
      {products.map((product) => <ProductNode key={product.id} product={product} onCollect={onCollectProduct} />)}

      {placementMode && (
        <Html position={[0, 1, -12]} center distanceFactor={12} transform sprite>
          <div className="scene-badge scene-badge--placement">Ставим: {placementMode.name}</div>
        </Html>
      )}
    </group>
  );
}

export default function FarmScene(props) {
  return (
    <div className="scene-shell">
      <Canvas shadows dpr={[1, 1.5]}>
        <SceneRoot {...props} />
      </Canvas>
      <div className="scene-tip">Тяни сцену одним пальцем. Нажми на участок для расширения.</div>
    </div>
  );
}
