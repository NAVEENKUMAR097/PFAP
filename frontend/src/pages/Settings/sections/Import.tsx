export default function ImportSection() {
  const handleFile = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch('http://127.0.0.1:8000/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.detail || 'Import failed');
        return;
      }
      const result = await res.json();
      alert(`Import complete: ${JSON.stringify(result)}`);
    } catch {
      alert('Failed to import file');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl font-medium text-ink mb-1">Import Center</h2>
        <p className="text-sm text-muted">Upload a JSON export to import missing master data rows.</p>
      </div>
      <div className="rounded-2xl bg-surface border border-white/10 p-4 flex flex-col gap-3">
        <p className="text-sm text-muted">
          Upload a JSON file from Export Center. Existing rows are preserved — only missing rows are added.
        </p>
        <input
          type="file"
          accept="application/json"
          className="text-sm text-muted"
          onChange={(e) => handleFile(e.target.files ? e.target.files[0] : null)}
        />
      </div>
    </div>
  );
}
