import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Optional — if omitted, no heading renders and layout is unchanged
   * from before. Kept optional so this stays backward-compatible with
   * any other page already using PageContainer without a title. */
  title?: string;
};

function PageContainer({ children, title }: Props) {
  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      {title && (
        <h1 className="mb-4 font-display text-2xl font-medium text-ink">{title}</h1>
      )}
      {children}
    </main>
  );
}

export default PageContainer;