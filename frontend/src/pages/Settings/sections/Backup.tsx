export default function BackupSection() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl font-medium text-ink mb-1">Backup & Restore</h2>
        <p className="text-sm text-muted">Create manual backups and restore from a previous state.</p>
      </div>
      <div className="rounded-2xl bg-surface border border-white/10 p-4 flex flex-col gap-3">
        <p className="text-sm text-muted">Manual backup and restore will be available in a future release.</p>
        <div className="flex gap-2">
          <button className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-base">Create Backup</button>
          <button className="rounded-xl border border-white/10 px-4 py-2 text-sm text-muted">Restore</button>
        </div>
      </div>
    </div>
  );
}
