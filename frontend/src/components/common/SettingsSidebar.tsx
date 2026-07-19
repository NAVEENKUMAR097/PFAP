import React from 'react';

export default function SettingsSidebar<T extends string>({
  sections,
  active,
  onSelect,
}: {
  sections: readonly T[];
  active: T;
  onSelect: (s: T) => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 border rounded-md p-3">
      <h3 className="text-lg font-semibold mb-3">Settings</h3>
      <ul className="space-y-1">
        {sections.map((s) => (
          <li key={s}>
            <button
              className={`w-full text-left px-3 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 ${
                s === active ? 'bg-slate-100 dark:bg-slate-700 font-medium' : ''
              }`}
              onClick={() => onSelect(s)}
            >
              <span className="text-slate-900 dark:text-slate-100">{s}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
