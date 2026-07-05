import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

function PageContainer({ children }: Props) {
  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      {children}
    </main>
  );
}

export default PageContainer;