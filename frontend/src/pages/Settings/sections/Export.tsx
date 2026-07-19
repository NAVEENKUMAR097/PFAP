export default function ExportSection() {
  const handleExport = async () => {
    const res = await fetch('http://127.0.0.1:8000/admin/export');
    if (!res.ok) {
      alert('Export failed');
      return;
    }
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pfap-master-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl font-medium text-ink mb-1">Export Center</h2>
        <p className="text-sm text-muted">Export master data as JSON for backup or migration.</p>
      </div>
      <div className="rounded-2xl bg-surface border border-white/10 p-4 flex flex-col gap-3">
        <p className="text-sm text-muted">
          Downloads categories, accounts, payment methods, income sources, investment types, and people as a JSON file.
        </p>
        <button
          onClick={handleExport}
          className="self-start rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-base"
        >
          Download JSON Export
        </button>
      </div>
    </div>
  );
}
