import type { ReactNode } from 'react';

interface PageScaffoldProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

/**
 * Shared shell for every module page. Modules that haven't been built yet
 * (Expenses, Income, Lending, etc. — all "(Future)" in the project structure)
 * render this with no children and get a consistent, honest "not built yet"
 * state instead of ten slightly-different placeholder divs. Once a module
 * is implemented, it passes real content as children and keeps the same
 * title/description header for free.
 */
export default function PageScaffold({ title, description, children }: PageScaffoldProps) {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="font-display text-2xl font-medium text-ink">{title}</h1>
      {description && <p className="text-sm text-muted">{description}</p>}

      {children ?? (
        <div
          className="mt-6 flex min-h-[40vh] items-center justify-center rounded-2xl border
            border-dashed border-white/10 text-sm text-muted"
        >
          This module isn't built yet.
        </div>
      )}
    </section>
  );
}