export default function AboutSection() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl font-medium text-ink mb-1">About PFAP</h2>
        <p className="text-sm text-muted">Personal Finance Analytics Platform</p>
      </div>
      <div className="rounded-2xl bg-surface border border-white/10 p-4 flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Version</span>
          <span className="text-ink">0.1.0</span>
        </div>
        <div className="flex justify-between border-t border-white/5 pt-2">
          <span className="text-muted">Stack</span>
          <span className="text-ink">React · FastAPI · SQLite</span>
        </div>
        <div className="flex justify-between border-t border-white/5 pt-2">
          <span className="text-muted">License</span>
          <span className="text-ink">See repository</span>
        </div>
      </div>
    </div>
  );
}
