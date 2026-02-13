import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { FilterSet, View } from '../domain/types';
import { ViewsDropdown } from './ViewsDropdown';
import { Menu, MenuDivider, MenuItem } from './Menu';
import styles from './topChrome.module.css';

// Minimal inline SVG icons (outline style, consistent 1.5px stroke)
function Icon({ kind }: { kind: 'save' | 'open' | 'export' | 'layout' | 'filter' | 'styles' | 'fields' }) {
  const stroke = 'currentColor';
  const strokeWidth = 1.5;
  const strokeLinecap = 'round' as const;
  const strokeLinejoin = 'round' as const;
  const size = 18;

  switch (kind) {
    case 'save':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}/>
          <polyline points="17 21 17 13 7 13 7 21" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}/>
        </svg>
      );
    case 'open':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}/>
          <polyline points="14 2 14 8 20 8" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}/>
          <path d="M12 18v-6" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}/>
          <path d="M9 15l3-3 3 3" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}/>
        </svg>
      );
    case 'export':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}/>
          <polyline points="7 10 12 15 17 10" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}/>
          <line x1="12" y1="15" x2="12" y2="3" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}/>
        </svg>
      );
    case 'layout':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}/>
          <line x1="3" y1="9" x2="21" y2="9" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}/>
          <line x1="9" y1="21" x2="9" y2="9" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}/>
        </svg>
      );
    case 'filter':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}/>
        </svg>
      );
    case 'styles':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}/>
        </svg>
      );
    case 'fields':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <line x1="8" y1="6" x2="21" y2="6" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}/>
          <line x1="8" y1="12" x2="21" y2="12" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}/>
          <line x1="8" y1="18" x2="21" y2="18" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}/>
          <line x1="3" y1="6" x2="3.01" y2="6" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}/>
          <line x1="3" y1="12" x2="3.01" y2="12" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}/>
          <line x1="3" y1="18" x2="3.01" y2="18" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap={strokeLinecap} strokeLinejoin={strokeLinejoin}/>
        </svg>
      );
  }
}

function IconToolButton(props: { children: ReactNode; title: string; primary?: boolean; onClick: () => void }) {
  const { children, title, primary, onClick } = props;
  return (
    <button
      className={primary ? styles.toolIconButtonPrimary : styles.toolIconButton}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

export function TopChrome(props: {
  docTitle: string;
  dirty: boolean;
  theme: 'light' | 'dark';
  activeViewId: string | null;
  views: View[];
  activeFilterSet: FilterSet;

  onDocTitleChange: (next: string) => void;
  onToggleTheme: () => void;

  // File
  onNew: () => void;
  onOpen: () => void;
  onDownload: () => void;
  onExport: () => void;
  onSaveAs: () => void;
  onSave: () => void;

  // Edit
  onUndo: () => void;
  onRedo: () => void;
  onClearSelection: () => void;

  // View
  onLayout: () => void;
  onFilters: () => void;
  onStyles: () => void;
  onFields: () => void;

  // Views
  onViewsChange: (next: View[]) => void;
  onLoadView: (viewId: string | null, filterSet: FilterSet) => void;
}) {
  const {
    docTitle,
    dirty,
    theme,
    activeViewId,
    views,
    activeFilterSet,
    onDocTitleChange,
    onToggleTheme,
    onNew,
    onOpen,
    onDownload,
    onExport,
    onSaveAs,
    onSave,
    onUndo,
    onRedo,
    onClearSelection,
    onLayout,
    onFilters,
    onStyles,
    onFields,
    onViewsChange,
    onLoadView,
  } = props;

  const [editingTitle, setEditingTitle] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [draftTitle, setDraftTitle] = useState(docTitle);

  useEffect(() => setDraftTitle(docTitle), [docTitle]);

  useEffect(() => {
    if (!editingTitle) return;
    const t = window.setTimeout(() => inputRef.current?.select(), 0);
    return () => window.clearTimeout(t);
  }, [editingTitle]);

  const status = useMemo(() => (dirty ? 'Unsaved' : 'Saved'), [dirty]);

  function commitTitle() {
    const next = draftTitle.trim();
    if (next) onDocTitleChange(next);
    else setDraftTitle(docTitle);
    setEditingTitle(false);
  }

  return (
    <div className={styles.chrome}>
      {/* Row 1 */}
      <div className={styles.menuRow}>
        <div className={styles.left}>
          <div className={styles.mark} title="Griddle">
            <img src={`${import.meta.env.BASE_URL}griddle-logo.png`} alt="Griddle" className={styles.logo} />
          </div>

          <div className={styles.titleWrap}>
            {editingTitle ? (
              <input
                ref={inputRef}
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitTitle();
                  if (e.key === 'Escape') {
                    setDraftTitle(docTitle);
                    setEditingTitle(false);
                  }
                }}
                className={styles.titleInput}
              />
            ) : (
              <button
                className={styles.titleButton}
                onClick={() => setEditingTitle(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setEditingTitle(true);
                }}
                title="Rename"
              >
                {docTitle}
                {dirty ? <span className={styles.dirtyDot} title="Unsaved changes" /> : null}
              </button>
            )}
          </div>

          <div className={styles.menus}>
            <Menu label="File">
              <MenuItem label="New" shortcut="Ctrl+N" onClick={onNew} />
              <MenuItem label="Open" shortcut="Ctrl+O" onClick={onOpen} />
              <MenuDivider />
              <MenuItem label="Download" onClick={onDownload} />
              <MenuItem label="Export" onClick={onExport} />
              <MenuDivider />
              <MenuItem label="Save As" shortcut="Ctrl+Shift+S" onClick={onSaveAs} />
              <MenuItem label="Save" shortcut="Ctrl+S" onClick={onSave} />
            </Menu>

            <Menu label="Edit">
              <MenuItem label="Undo" shortcut="Ctrl+Z" onClick={onUndo} disabled />
              <MenuItem label="Redo" shortcut="Ctrl+Y" onClick={onRedo} disabled />
              <MenuDivider />
              <MenuItem label="Clear selection" shortcut="Esc" onClick={onClearSelection} />
            </Menu>

            <Menu label="View">
              <MenuItem label="Layout" onClick={onLayout} />
              <MenuItem label="Filters" shortcut="Ctrl+Shift+F" onClick={onFilters} />
              <MenuItem label="Styles" onClick={onStyles} />
              <MenuItem label="Fields" onClick={onFields} />
            </Menu>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.status}>{status}</div>
          <button className={styles.iconButton} onClick={onToggleTheme} title="Toggle dark mode">
            {theme === 'dark' ? '☾' : '☀'}
          </button>
        </div>
      </div>

      {/* Row 2 */}
      <div className={styles.toolbarRow}>
        <div className={styles.toolbarGroup}>
          <IconToolButton primary title="Save (Ctrl+S)" onClick={onSave}>
            <Icon kind="save" />
          </IconToolButton>
          <IconToolButton title="Open (Ctrl+O)" onClick={onOpen}>
            <Icon kind="open" />
          </IconToolButton>
          <IconToolButton title="Export (CSV)" onClick={onExport}>
            <Icon kind="export" />
          </IconToolButton>
        </div>

        <div className={styles.sep} />

        <div className={styles.toolbarGroup}>
          <IconToolButton title="Layout" onClick={onLayout}>
            <Icon kind="layout" />
          </IconToolButton>
          <IconToolButton title="Filters" onClick={onFilters}>
            <Icon kind="filter" />
          </IconToolButton>
          <IconToolButton title="Styles" onClick={onStyles}>
            <Icon kind="styles" />
          </IconToolButton>
          <IconToolButton title="Fields" onClick={onFields}>
            <Icon kind="fields" />
          </IconToolButton>
        </div>

        <div className={styles.sep} />

        <div className={styles.toolbarGroup}>
          <div className={styles.viewsWrap}>
            <div className={styles.viewsLabel}>Views</div>
            <ViewsDropdown
              views={views}
              activeViewId={activeViewId}
              activeFilterSet={activeFilterSet}
              onViewsChange={onViewsChange}
              onLoadView={(viewId, fs) => onLoadView(viewId, fs)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
