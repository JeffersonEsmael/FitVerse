import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, Check, X, RotateCcw, Move } from 'lucide-react';

export default function CoverCropModal({ imageSrc, onSave, onCancel }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const pinchDistRef = useRef(null);
  const initialZoomRef = useRef(1);

  const containerRef = useRef(null);
  const imgRef = useRef(null);

  // Reset positioning when image changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [imageSrc]);

  // Clamp pan so image doesn't leave crop area with gaps
  const clampPan = useCallback((newPan, currentZoom) => {
    if (!containerRef.current || !imgRef.current) return newPan;
    const container = containerRef.current.getBoundingClientRect();
    const imgWidth = imgRef.current.naturalWidth;
    const imgHeight = imgRef.current.naturalHeight;
    
    if (!imgWidth || !imgHeight) return newPan;

    // Displayed dimensions at zoom level 1 fitting cover aspect ratio
    const scaleToFit = Math.max(container.width / imgWidth, container.height / imgHeight);
    const scaledWidth = imgWidth * scaleToFit * currentZoom;
    const scaledHeight = imgHeight * scaleToFit * currentZoom;

    const maxPanX = Math.max(0, (scaledWidth - container.width) / 2);
    const maxPanY = Math.max(0, (scaledHeight - container.height) / 2);

    return {
      x: Math.min(maxPanX, Math.max(-maxPanX, newPan.x)),
      y: Math.min(maxPanY, Math.max(-maxPanY, newPan.y))
    };
  }, []);

  // Mouse / Pointer handlers for Dragging
  const handlePointerDown = (e) => {
    if (e.touches && e.touches.length === 2) {
      // Start Pinch
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      pinchDistRef.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      initialZoomRef.current = zoom;
      return;
    }

    setIsDragging(true);
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    dragStartRef.current = { x: clientX, y: clientY };
    panStartRef.current = { ...pan };
  };

  const handlePointerMove = (e) => {
    if (e.touches && e.touches.length === 2) {
      if (pinchDistRef.current) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const factor = dist / pinchDistRef.current;
        const newZoom = Math.min(3, Math.max(1, initialZoomRef.current * factor));
        setZoom(newZoom);
        setPan(prev => clampPan(prev, newZoom));
      }
      return;
    }

    if (!isDragging) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

    const deltaX = clientX - dragStartRef.current.x;
    const deltaY = clientY - dragStartRef.current.y;

    const rawPan = {
      x: panStartRef.current.x + deltaX,
      y: panStartRef.current.y + deltaY
    };

    setPan(clampPan(rawPan, zoom));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    pinchDistRef.current = null;
  };

  // Generate cropped blob from Canvas
  const handleSave = async () => {
    if (!containerRef.current || !imgRef.current) return;
    setIsProcessing(true);

    try {
      const container = containerRef.current.getBoundingClientRect();
      const img = imgRef.current;

      // Canvas dimensions (high resolution cover e.g. 1200x500)
      const targetWidth = 1200;
      const targetHeight = 500;
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;

      // Calculate source crop rectangle
      const scaleToFit = Math.max(container.width / imgWidth, container.height / imgHeight);
      const displayedWidth = imgWidth * scaleToFit * zoom;
      const displayedHeight = imgHeight * scaleToFit * zoom;

      // Center offset in displayed pixels
      const displayedOffsetX = (displayedWidth - container.width) / 2 - pan.x;
      const displayedOffsetY = (displayedHeight - container.height) / 2 - pan.y;

      // Convert displayed offsets back to natural image coordinates
      const effectiveScale = scaleToFit * zoom;
      const srcX = Math.max(0, Math.min(imgWidth, displayedOffsetX / effectiveScale));
      const srcY = Math.max(0, Math.min(imgHeight, displayedOffsetY / effectiveScale));
      const srcW = Math.min(imgWidth - srcX, container.width / effectiveScale);
      const srcH = Math.min(imgHeight - srcY, container.height / effectiveScale);

      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, targetWidth, targetHeight);

      canvas.toBlob((blob) => {
        setIsProcessing(false);
        if (blob) {
          const croppedUrl = URL.createObjectURL(blob);
          onSave(blob, croppedUrl);
        } else {
          alert('Erro ao processar imagem.');
        }
      }, 'image/jpeg', 0.9);
    } catch (err) {
      console.error('[CoverCropModal] Error cropping image:', err);
      setIsProcessing(false);
      alert('Erro ao cortar imagem de capa.');
    }
  };

  return (
    <div style={styles.overlay}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        style={styles.modalCard}
      >
        {/* Header */}
        <div style={styles.header}>
          <h3 style={styles.title}>Ajustar Foto de Capa</h3>
          <button style={styles.closeBtn} onClick={onCancel} disabled={isProcessing}>
            <X size={20} color="#999" />
          </button>
        </div>

        <p style={styles.instruction}>
          Segure e arraste a foto para ajustar a posição. Use o gesto de pinça ou a barra abaixo para dar zoom.
        </p>

        {/* Crop Frame Container */}
        <div 
          ref={containerRef}
          style={styles.cropContainer}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        >
          <img 
            ref={imgRef}
            src={imageSrc}
            alt="Capa Crop"
            draggable={false}
            onLoad={() => setPan(clampPan({ x: 0, y: 0 }, 1))}
            style={{
              ...styles.cropImage,
              transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
          />
          <div style={styles.cropOverlayHint}>
            <Move size={18} color="rgba(255,255,255,0.7)" />
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
              Arraste para posicionar
            </span>
          </div>
        </div>

        {/* Zoom Controls */}
        <div style={styles.zoomControlsRow}>
          <button 
            style={styles.iconBtn} 
            onClick={() => {
              const nz = Math.max(1, zoom - 0.2);
              setZoom(nz);
              setPan(p => clampPan(p, nz));
            }}
          >
            <ZoomOut size={18} color="#fff" />
          </button>

          <input 
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(e) => {
              const nz = parseFloat(e.target.value);
              setZoom(nz);
              setPan(p => clampPan(p, nz));
            }}
            style={styles.slider}
          />

          <button 
            style={styles.iconBtn} 
            onClick={() => {
              const nz = Math.min(3, zoom + 0.2);
              setZoom(nz);
              setPan(p => clampPan(p, nz));
            }}
          >
            <ZoomIn size={18} color="#fff" />
          </button>

          <button 
            style={styles.resetBtn}
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            title="Resetar Posição"
          >
            <RotateCcw size={16} color="#aaa" />
          </button>
        </div>

        {/* Actions */}
        <div style={styles.actionsRow}>
          <button style={styles.cancelBtn} onClick={onCancel} disabled={isProcessing}>
            Cancelar
          </button>
          <button style={styles.saveBtn} onClick={handleSave} disabled={isProcessing}>
            {isProcessing ? (
              <span>Processando...</span>
            ) : (
              <>
                <Check size={18} color="#000" style={{ marginRight: '6px' }} />
                <span>Salvar Capa</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(8px)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  },
  modalCard: {
    width: '100%',
    maxWidth: '520px',
    backgroundColor: '#1E202C',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    padding: '24px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: '18px',
    fontWeight: '700',
    margin: 0,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
  },
  instruction: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '13px',
    margin: 0,
    lineHeight: '1.4',
  },
  cropContainer: {
    position: 'relative',
    width: '100%',
    height: '180px',
    borderRadius: '16px',
    overflow: 'hidden',
    backgroundColor: '#0A0B10',
    border: '2px dashed rgba(0, 212, 255, 0.4)',
    touchAction: 'none',
    userSelect: 'none',
  },
  cropImage: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    maxHeight: 'none',
    maxWidth: 'none',
    objectFit: 'cover',
    transition: 'transform 0.05s ease-out',
  },
  cropOverlayHint: {
    position: 'absolute',
    bottom: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: '4px 12px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    pointerEvents: 'none',
  },
  zoomControlsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: '10px 16px',
    borderRadius: '14px',
  },
  slider: {
    flex: 1,
    accentColor: '#00D4FF',
    cursor: 'pointer',
  },
  iconBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: 'none',
    borderRadius: '8px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  resetBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  actionsRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    backgroundColor: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
  },
  saveBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #00D4FF, #0055FF)',
    border: 'none',
    color: '#000',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
