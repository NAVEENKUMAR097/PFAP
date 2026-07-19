export default function ProfileSection() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl font-medium text-ink mb-1">Profile & Preferences</h2>
        <p className="text-sm text-muted">No authentication in V1 — profile settings will be available in a future release.</p>
      </div>
      <div className="rounded-2xl bg-surface border border-white/10 p-4">
        <p className="text-sm text-muted">Currency, language, date format, and other preferences will appear here.</p>
      </div>
    </div>
  );
}
