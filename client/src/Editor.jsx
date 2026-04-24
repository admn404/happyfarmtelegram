import React, { useState } from 'react';
import ReactDOM from 'react-dom';

export default function Editor({ layout, setLayout, onSave, onClose, camScale, auth, cam, setBalance }) {
  // State for dragging: { type, index, startX, startY }
  const [dragTarget, setDragTarget] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const handlePointerDown = (e, type, index, mode = 'move') => {
    e.stopPropagation();
    e.target.setPointerCapture(e.pointerId);
    setDragTarget({ type, index, mode, startX: e.clientX, startY: e.clientY });
  };

  const handlePointerMove = (e) => {
    if (!dragTarget) return;
    e.stopPropagation();
    const dx = (e.clientX - dragTarget.startX) / camScale;
    const dy = (e.clientY - dragTarget.startY) / camScale;
    
    const newLayout = { ...layout };
    if (dragTarget.type === 'bed') {
      newLayout.beds = [...newLayout.beds];
      newLayout.beds[dragTarget.index] = {
        cx: newLayout.beds[dragTarget.index].cx + dx,
        cy: newLayout.beds[dragTarget.index].cy + dy
      };
    } else if (dragTarget.type === 'zone') {
       newLayout.zones = { ...newLayout.zones };
       if (dragTarget.mode === 'move') {
         newLayout.zones[dragTarget.index] = {
           ...newLayout.zones[dragTarget.index],
           x: newLayout.zones[dragTarget.index].x + dx,
           y: newLayout.zones[dragTarget.index].y + dy
         };
       } else {
         newLayout.zones[dragTarget.index] = {
           ...newLayout.zones[dragTarget.index],
           w: Math.max(40, newLayout.zones[dragTarget.index].w + dx),
           h: Math.max(40, newLayout.zones[dragTarget.index].h + dy)
         };
       }
    }
    setLayout(newLayout);
    setDragTarget({ ...dragTarget, startX: e.clientX, startY: e.clientY });
  };

  const handlePointerUp = (e) => {
    if (dragTarget) {
      e.stopPropagation();
      e.target.releasePointerCapture(e.pointerId);
      setDragTarget(null);
    }
  };

  return (
    <>
      {/* DRAG OVERLAYS INSIDE WORLD */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 9000 }} 
           onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
        
        {layout.beds.map((b, i) => (
          <div key={`bed-${i}`} 
               onPointerDown={(e) => handlePointerDown(e, 'bed', i)}
               style={{
                 position: 'absolute', left: b.cx - layout.bedSize.w/2, top: b.cy - layout.bedSize.h/2,
                 width: layout.bedSize.w, height: layout.bedSize.h,
                 background: 'rgba(59, 130, 246, 0.4)', border: '3px dashed #fff', cursor: 'grab',
                 touchAction: 'none'
               }}>
            <div style={{ color:'white', fontWeight:'bold', padding: 6, textShadow: '0 1px 3px #000' }}>Грядка {i+1}</div>
            <button 
              onPointerDown={(e) => {
                e.stopPropagation();
                const newBeds = [...layout.beds];
                newBeds.splice(i, 1);
                setLayout({...layout, beds: newBeds});
              }}
              style={{ position: 'absolute', top: -15, right: -15, background: 'red', color: 'white', borderRadius: '50%', width: 30, height: 30, border: 'none', cursor: 'pointer', zIndex: 10, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >✕</button>
          </div>
        ))}
        
        {['well', 'warehouse', 'truck', 'shop', 'pen'].map((zName) => {
          const z = layout?.zones?.[zName];
          if (!z) return null;
          return (
            <div key={zName}
                 onPointerDown={(e) => handlePointerDown(e, 'zone', zName, 'move')}
                 style={{
                   position: 'absolute', left: z.x, top: z.y,
                   width: z.w, height: z.h,
                   background: 'rgba(239, 68, 68, 0.4)', border: '3px dashed #fff', cursor: 'grab',
                   touchAction: 'none'
                 }}>
              <div style={{ color:'white', fontWeight:'bold', padding: 6, textShadow: '0 1px 3px #000', fontSize: 12 }}>{zName.toUpperCase()}</div>
              
              {/* Resize handle (Bottom-Right) */}
              <div 
                onPointerDown={(e) => handlePointerDown(e, 'zone', zName, 'resize')}
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 30, height: 30, background: '#fff', border: '3px solid #ef4444',
                  borderRadius: '4px 0 0 0', cursor: 'nwse-resize', zIndex: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <div style={{ width: 12, height: 12, borderRight: '2px solid #ef4444', borderBottom: '2px solid #ef4444' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* FIXED UI PANEL */}
      {ReactDOM.createPortal(
        <div style={{
           position: 'fixed', right: 20, top: 20, width: 300, background: 'rgba(10, 20, 10, 0.95)',
           padding: 20, borderRadius: 16, color: 'white', zIndex: 10000,
           boxShadow: '0 10px 40px rgba(0,0,0,0.8)', border: '1px solid #4ade80',
           backdropFilter: 'blur(10px)',
           fontFamily: "'Outfit', sans-serif",
           maxHeight: '90vh', overflowY: 'auto',
           touchAction: 'auto'
        }} onPointerDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}>
          <h3 style={{ marginBottom: 15, fontSize: 20, color: '#4ade80' }}>🛠 Редактор Карты</h3>

          <div style={{ marginBottom: 20 }}>
            <h4 style={{ color: '#9ca3af', marginBottom: 10, fontSize: 14, textTransform: 'uppercase' }}>Фон карты</h4>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="file" accept="image/*" onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                setUploading(true);
                const formData = new FormData();
                formData.append('bg', file);
                try {
                  const r = await fetch('/api/upload-bg', { 
                    method: 'POST', 
                    headers: { Authorization: auth },
                    body: formData 
                  });
                  const d = await r.json();
                  if (d.success) {
                    setLayout({...layout, bgUrl: d.url});
                  } else {
                    alert('Ошибка загрузки: ' + (d.message || 'неизвестная ошибка'));
                  }
                } catch (err) { 
                  console.error(err); 
                  alert('Ошибка сети при загрузке фона');
                } finally {
                  setUploading(false);
                }
              }} style={{ flex: 1, fontSize: 12, color: '#ccc' }} />
              {uploading && <span style={{ fontSize: 12, color: '#4ade80' }}>⏳...</span>}
            </div>
          </div>
          
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ color: '#9ca3af', marginBottom: 10, fontSize: 14, textTransform: 'uppercase' }}>Добавить объекты</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={() => {
                const cx = (window.innerWidth/2 - cam.x) / camScale;
                const cy = (window.innerHeight/2 - cam.y) / camScale;
                setLayout({...layout, beds: [...layout.beds, { cx, cy }]});
              }} style={{ padding: 8, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>+ Грядку</button>
              
              <button onClick={() => {
                const x = (window.innerWidth/2 - cam.x) / camScale - 100;
                const y = (window.innerHeight/2 - cam.y) / camScale - 100;
                setLayout({...layout, zones: { ...layout.zones, well: { x, y, w: 200, h: 200 } }});
              }} style={{ padding: 8, background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>+ Колодц (Вода)</button>

              <button onClick={() => {
                const x = (window.innerWidth/2 - cam.x) / camScale - 150;
                const y = (window.innerHeight/2 - cam.y) / camScale - 100;
                setLayout({...layout, zones: { ...layout.zones, warehouse: { x, y, w: 300, h: 200 } }});
              }} style={{ padding: 8, background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>+ Склад</button>

              <button onClick={() => {
                const x = (window.innerWidth/2 - cam.x) / camScale - 150;
                const y = (window.innerHeight/2 - cam.y) / camScale - 100;
                setLayout({...layout, zones: { ...layout.zones, truck: { x, y, w: 300, h: 200 } }});
              }} style={{ padding: 8, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>+ Грузовик</button>

              <button onClick={() => {
                const x = (window.innerWidth/2 - cam.x) / camScale - 100;
                const y = (window.innerHeight/2 - cam.y) / camScale - 100;
                setLayout({...layout, zones: { ...layout.zones, shop: { x, y, w: 200, h: 200 } }});
              }} style={{ padding: 8, background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>+ Магазин</button>

              <button onClick={() => {
                const x = (window.innerWidth/2 - cam.x) / camScale - 200;
                const y = (window.innerHeight/2 - cam.y) / camScale - 200;
                setLayout({...layout, zones: { ...layout.zones, pen: { x, y, w: 400, h: 400 } }});
              }} style={{ padding: 8, background: '#fbbf24', color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>+ Загон (Животные)</button>

              <button onClick={() => {
                if (window.confirm('Удалить ВСЕ объекты и грядки?')) {
                  setLayout({...layout, beds: [], zones: {} });
                }
              }} style={{ padding: 8, background: '#4b5563', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>🗑 Очистить всё</button>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h4 style={{ color: '#9ca3af', marginBottom: 10, fontSize: 14, textTransform: 'uppercase' }}>Размеры грядок</h4>
            <label style={{ display:'block', marginBottom: 5 }}>Ширина: {Math.round(layout.bedSize.w)}px</label>
            <input type="range" min="100" max="600" value={layout.bedSize.w} 
                   onChange={e => setLayout({...layout, bedSize: {...layout.bedSize, w: Number(e.target.value)}})} 
                   style={{ width: '100%', marginBottom: 10 }}/>
                   
            <label style={{ display:'block', marginBottom: 5 }}>Высота: {Math.round(layout.bedSize.h)}px</label>
            <input type="range" min="100" max="600" value={layout.bedSize.h} 
                   onChange={e => setLayout({...layout, bedSize: {...layout.bedSize, h: Number(e.target.value)}})} 
                   style={{ width: '100%', marginBottom: 10 }}/>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h4 style={{ color: '#9ca3af', marginBottom: 10, fontSize: 14, textTransform: 'uppercase' }}>Масштабирование (x)</h4>
            <label style={{ display:'block', marginBottom: 5 }}>Животные: {(layout?.scales?.animal || 1.0).toFixed(2)}</label>
            <input type="range" min="0.5" max="3" step="0.1" value={layout?.scales?.animal || 1.0} 
                   onChange={e => setLayout({...layout, scales: {...(layout.scales || {}), animal: Number(e.target.value)}})} 
                   style={{ width: '100%', marginBottom: 10 }}/>

            <label style={{ display:'block', marginBottom: 5 }}>Урожай на грядке: {(layout?.scales?.crop || 1.0).toFixed(2)}</label>
            <input type="range" min="0.5" max="3" step="0.1" value={layout?.scales?.crop || 1.0} 
                   onChange={e => setLayout({...layout, scales: {...(layout.scales || {}), crop: Number(e.target.value)}})} 
                   style={{ width: '100%', marginBottom: 10 }}/>
                   
            <label style={{ display:'block', marginBottom: 5 }}>Продукты (Яйца): {(layout?.scales?.product || 1.0).toFixed(2)}</label>
            <input type="range" min="0.5" max="3" step="0.1" value={layout?.scales?.product || 1.0} 
                   onChange={e => setLayout({...layout, scales: {...(layout.scales || {}), product: Number(e.target.value)}})} 
                   style={{ width: '100%', marginBottom: 10 }}/>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h4 style={{ color: '#ef4444', marginBottom: 10, fontSize: 14, textTransform: 'uppercase' }}>Тестирование</h4>
            <button onClick={() => setBalance(b => b + 1000)} style={{ width: '100%', padding: 10, background: '#4b5563', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}>💰 Чит: +1000 монет</button>
          </div>

          <div style={{ display:'flex', gap: 10, marginTop: 20 }}>
            <button 
              onClick={async () => {
                setSaving(true);
                try {
                  await onSave();
                  alert('Сохранено успешно! ✅');
                } catch {
                  alert('Ошибка сохранения ❌');
                } finally {
                  setSaving(false);
                }
              }} 
              disabled={saving}
              style={{ flex: 1, padding: '12px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 'bold', fontSize: 16, opacity: saving ? 0.5 : 1 }}
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button onClick={onClose} style={{ flex: 1, padding: '12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 'bold', fontSize: 16 }}>Закрыть</button>
          </div>
        </div>,
        document.getElementById('editor-root') || document.body
      )}
    </>
  );
}
