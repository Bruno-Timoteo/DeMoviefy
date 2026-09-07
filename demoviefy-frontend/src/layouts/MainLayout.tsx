import { type ReactNode } from "react";

import Footer from "src/core/components/Footer";
import Header from "src/core/components/Header";

type MainLayoutProps = {
  children: ReactNode;
};

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div>
      <div>
        <Header />
            <main>{children}</main>
        <Footer />
      </div>
    </div>
  );
}
