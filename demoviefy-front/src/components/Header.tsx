import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../features/auth/AuthContext";

type HeaderProps = {
  themeLabel: string;
  onToggleTheme: () => void;
};

export default function Header({ themeLabel, onToggleTheme }: HeaderProps) {
  return (
    <aside className="app-header">
      <div className="app-sidebar-top">
        <div className="sidebar-brand">
          <span className="eyebrow">DeMoviefy</span>
          <h1>Painel de analise de videos</h1>
          <p>
            Interface React + Tailwind com foco em moderacao visual, acompanhamento do pipeline e revisao de artefatos.
          </p>
        </div>

        <nav className="sidebar-nav" aria-label="Navegacao principal">
          {navItems
            .filter((item) => (item.requiresAdmin ? isAdmin : true))
            .filter((item) => (item.hiddenWhenAuthenticated ? !user : true))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `sidebar-nav-link ${isActive ? "is-active" : ""}`
                }
              >
                {item.label}
              </NavLink>
            ))}
        </nav>

        <div className="sidebar-highlight">
          <span className="eyebrow">UI / UX</span>
          <strong>{isAdmin ? "Laboratorio admin habilitado" : "Acesso administrativo protegido"}</strong>
          <p>
            {isAdmin
              ? "Voce pode acessar o ambiente de testes com modelos, transcricao e reprocessamento."
              : "Somente administradores entram na area de testes. O login atual e um scaffold inicial no front."}
          </p>
        </div>
      </div>

      <div className="header-actions">
        <p>
          {user
            ? `${user.name} conectado como admin.`
            : location.pathname === "/login"
              ? "Entre com a conta administrativa para abrir o laboratorio."
              : "Paleta preservada e layout reorganizado conforme o conceito visual do time."}
        </p>
        <button type="button" className="ghost-button theme-toggle" onClick={onToggleTheme}>
          {themeLabel}
        </button>
        {isAdmin && (
          <button type="button" className="ghost-button theme-toggle" onClick={() => void handleLogout()}>
            Sair da conta admin
          </button>
        )}
      </div>
    </aside>
  );
}
