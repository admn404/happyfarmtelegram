function BuildingNode({ building, animalsCount, warehouseStored }) {
  const [x, z] = pointToWorld(building.x, building.y);
  const groundY = 0.06;

  if (building.type === 'warehouse') {
    return (
      <group position={[x, groundY, z]}>
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
      <group position={[x, groundY, z]}>
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

  if (building.type === 'pen') return <PenNode building={building} animalsCount={animalsCount} />;
  if (building.type === 'well') return <WellNode building={building} />;

  return (
    <group position={[x, groundY, z]}>
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

function PenNode({ building, animalsCount }) {
  const [x, z] = pointToWorld(building.x, building.y);
  const groundY = 0.04;
  const size = 360 / 32; // 11.25 units

  return (
    <group position={[x, groundY, z]}>
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

function WellNode({ building }) {
  const [x, z] = pointToWorld(building.x, building.y);
  const groundY = 0.06;

  return (
    <group position={[x, groundY, z]}>
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
