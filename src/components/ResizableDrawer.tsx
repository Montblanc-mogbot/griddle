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
  // Log mount/unmount for debugging
  useEffect(() => {
    console.log('[ResizableDrawer] MOUNT:', storageKey);
    return () => {
      console.log('[ResizableDrawer] UNMOUNT:', storageKey);
    };
  }, [storageKey]);

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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    setIsResizing(true);

    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const delta = startXRef.current - moveEvent.clientX;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + delta));
      setWidth(newWidth);
      // keep latest width for persistence on mouseup
      startWidthRef.current = newWidth;
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, String(startWidthRef.current));
        } catch {
          // ignore
        }
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [width, minWidth, maxWidth]);

  return (
    <div className={styles.drawer} style={{ width }}>
      <div
        className={`${styles.resizeHandle} ${isResizing ? styles.active : ''}`}
        onMouseDown={handleMouseDown}
        title="Drag to resize"
      />
      <div className={styles.drawerContent}>{children}</div>
    </div>
  );
}
