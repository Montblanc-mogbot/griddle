import React, { useState, useRef, useCallback, type ReactNode } from 'react';
import styles from './resizableDrawer.module.css';

interface ResizableDrawerProps {
  children: ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

export function ResizableDrawer({
  children,
  defaultWidth = 440,
  minWidth = 280,
  maxWidth = 800,
}: ResizableDrawerProps) {
  const [width, setWidth] = useState(defaultWidth);
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
    };

    const handleMouseUp = () => {
      setIsResizing(false);
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
