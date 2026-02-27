import React, { useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import styles from './resizableDrawer.module.css';

interface ResizableDrawerProps {
  children: ReactNode;
  storageKey?: string;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

export function ResizableDrawer({
  children,
  storageKey,
  defaultWidth = 440,
  minWidth = 280,
  maxWidth = 800,
}: ResizableDrawerProps) {
  const [width, setWidth] = useState(() => {
    if (!storageKey) return defaultWidth;
    try {
      const raw = localStorage.getItem(storageKey);
      const n = raw ? Number(raw) : NaN;
      if (!Number.isFinite(n)) return defaultWidth;
      return Math.max(minWidth, Math.min(maxWidth, n));
    } catch {
      return defaultWidth;
    }
  });

  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(width);

  // Keep refs current so handlers don't need to close over width.
  useEffect(() => {
    startWidthRef.current = width;
  }, [width]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);

      setIsResizing(true);
      startXRef.current = e.clientX;

      const onPointerMove = (moveEvent: PointerEvent) => {
        const delta = startXRef.current - moveEvent.clientX;
        const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + delta));
        setWidth(newWidth);
        startWidthRef.current = newWidth;
      };

      const onPointerUp = () => {
        setIsResizing(false);
        if (storageKey) {
          try {
            localStorage.setItem(storageKey, String(startWidthRef.current));
          } catch {
            // ignore
          }
        }
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerUp);
      };

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerUp);
    },
    [minWidth, maxWidth, storageKey],
  );

  return (
    <div className={styles.drawer} style={{ width }}>
      <div
        className={`${styles.resizeHandle} ${isResizing ? styles.active : ''}`}
        onPointerDown={handlePointerDown}
        title="Drag to resize"
      />
      <div className={styles.drawerContent}>{children}</div>
    </div>
  );
}
