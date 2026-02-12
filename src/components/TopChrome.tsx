import { useEffect, useMemo, useRef, useState } from 'react';
import type { FilterSet, View } from '../domain/types';
import { ViewsDropdown } from './ViewsDropdown';
import { Menu, MenuDivider, MenuItem } from './Menu';
import styles from './topChrome.module.css';

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
          <div className={styles.mark} title="Griddle">G</div>

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
          <button className={styles.toolButton} onClick={onSave} title="Save (Ctrl+S)">
            Save
          </button>
          <button className={styles.toolButton} onClick={onOpen} title="Open (Ctrl+O)">
            Open
          </button>
          <button className={styles.toolButton} onClick={onExport} title="Export (CSV)">
            Export
          </button>
        </div>

        <div className={styles.sep} />

        <div className={styles.toolbarGroup}>
          <button className={styles.toolButton} onClick={onLayout} title="Layout">
            Layout
          </button>
          <button className={styles.toolButton} onClick={onFilters} title="Filters">
            Filters
          </button>
          <button className={styles.toolButton} onClick={onStyles} title="Styles">
            Styles
          </button>
          <button className={styles.toolButton} onClick={onFields} title="Fields">
            Fields
          </button>
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
