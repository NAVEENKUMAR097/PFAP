import { useEffect, useState } from 'react';

type Item = { id: number; name: string };

export default function MasterDataList(props: {
  title: string;
  fetchList: () => Promise<Item[]>;
  createItem: (name: string) => Promise<Item>;
  updateItem: (id: number, name: string) => Promise<Item>;
  deactivateItem: (id: number) => Promise<void>;
}) {
  const { title, fetchList, createItem, updateItem, deactivateItem } = props;
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setError(null);
      const res = await fetchList();
      setItems(res);
    } catch (e) {
      console.error(e);
      setError((e as any)?.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      const created = await createItem(newName.trim());
      setItems((s) => [...s, created]);
      setNewName('');
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'Failed to create');
    }
  };

  const startEdit = (id: number, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const saveEdit = async (id: number) => {
    if (!editingName.trim()) return;
    try {
      const updated = await updateItem(id, editingName.trim());
      setItems((s) => s.map((it) => (it.id === id ? updated : it)));
      setEditingId(null);
      setEditingName('');
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'Failed to update');
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm(`Deactivate this ${title}? This will hide it from dropdowns but keep history.`)) return;
    try {
      await deactivateItem(id);
      setItems((s) => s.filter((it) => it.id !== id));
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'Failed to deactivate');
    }
  };

  return (
    <div className="bg-surface p-4 rounded-2xl border border-white/10 text-ink">
      {error && (
        <div className="mb-3 rounded-xl bg-negative/10 p-3 text-sm text-negative">{error}</div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-medium mb-3">{title}</h3>

        <div className="mb-3">
          <label className="flex flex-col text-sm text-muted mb-2">Preview (as used in forms)</label>
          <select
            disabled
            className="rounded-xl bg-surface-2 px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-gold w-full disabled:cursor-not-allowed disabled:opacity-70"
            value=""
          >
            <option value="" disabled>
              {items.length === 0 ? `No ${title.toLowerCase()} available` : `Select ${title.replace(/\s+/, '')}`}
            </option>
            {items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 items-center">
          <label className="flex-1">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={`New ${title}`}
              className="rounded-xl bg-surface-2 px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-gold w-full"
            />
          </label>

          <button
            onClick={handleAdd}
            className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            + Add
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted py-2">Loading…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-sm text-muted">
                <th className="py-2">Name</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t border-white/5">
                  <td className="py-2">
                    {editingId === c.id ? (
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="rounded-xl bg-surface-2 px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-gold w-full"
                      />
                    ) : (
                      <span className="inline-block py-2">{c.name}</span>
                    )}
                  </td>
                  <td className="py-2">
                    {editingId === c.id ? (
                      <>
                        <button onClick={() => saveEdit(c.id)} className="mr-2 text-sm text-gold">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-sm">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(c.id, c.name)} className="mr-2 text-sm text-gold">Edit</button>
                        <button onClick={() => handleDeactivate(c.id)} className="text-sm text-negative">Deactivate</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}