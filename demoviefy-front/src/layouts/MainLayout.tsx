import { useEffect, useMemo, useState, type ReactNode } from "react";

import Footer from "../components/Footer";
import Header from "../components/Header";

type MainLayoutProps = {
  children: ReactNode;
};

export default function MainLayout({ children }: MainLayoutProps) {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const stored = window.localStorage.getItem("demoviefy-theme");
      if (stored === "light" || stored === "dark") {
        return stored;
      }
    } catch (error) {
      console.warn("Nao foi possivel ler o tema salvo.", error);
    }

    try {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch (error) {
      console.warn("Nao foi possivel consultar o tema do sistema.", error);
      return "light";
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem("demoviefy-theme", theme);
    } catch (error) {
      console.warn("Nao foi possivel persistir o tema atual.", error);
    }
  }, [theme]);

  const themeLabel = useMemo(
    () => (theme === "dark" ? "Usar tema claro" : "Usar tema escuro"),
    [theme],
  );

  return (
    <div className="app-shell">
      <Header
        themeLabel={themeLabel}
        onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
      />
      <main className="app-main">{children}</main>
      <Footer />
    </div>
  );
}
