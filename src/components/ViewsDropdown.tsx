import type { FilterSet, View } from '../domain/types';

function newId(): string {
  // modern browsers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyCrypto: any = globalThis.crypto;
  if (anyCrypto?.randomUUID) return anyCrypto.randomUUID();
  return `view_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function ViewsDropdown(props: {
  views: View[];
  activeViewId: string | null;
  activeFilterSet: FilterSet;
  onViewsChange: (next: View[]) => void;
  onLoadView: (viewId: string | null, fs: FilterSet) => void;
}) {
  const { views, activeViewId, activeFilterSet, onViewsChange, onLoadView } = props;

  const activeView = activeViewId ? views.find((v) => v.id === activeViewId) ?? null : null;

  function saveAs() {
    const name = window.prompt('View name?');
    if (!name) return;

    const v: View = {
      id: newId(),
      name,
      filterSet: activeFilterSet,
      createdAt: new Date().toISOString(),
    };

    onViewsChange([...views, v]);
    onLoadView(v.id, v.filterSet);
  }

  function updateActive() {
    if (!activeView) return;
    if (!window.confirm(`Update view "${activeView.name}" with current filters?`)) return;

    onViewsChange(
      views.map((v) => (v.id === activeView.id ? { ...v, filterSet: activeFilterSet } : v)),
    );
  }

  function deleteActive() {
    if (!activeView) return;
    if (!window.confirm(`Delete view "${activeView.name}"?`)) return;

    onViewsChange(views.filter((v) => v.id !== activeView.id));
    onLoadView(null, { name: undefined, filters: [] });
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <select
        value={activeViewId ?? ''}
        onChange={(e) => {
          const id = e.target.value || null;
          if (!id) {
            onLoadView(null, activeFilterSet);
            return;
          }
          const v = views.find((vv) => vv.id === id);
          if (!v) return;
          onLoadView(id, v.filterSet);
        }}
      >
        <option value="">(no view)</option>
        {views
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
      </select>

      <button onClick={saveAs}>Save as…</button>
      <button onClick={updateActive} disabled={!activeView}>
        Update
      </button>
      <button onClick={deleteActive} disabled={!activeView}>
        Delete
      </button>
    </div>
  );
}
