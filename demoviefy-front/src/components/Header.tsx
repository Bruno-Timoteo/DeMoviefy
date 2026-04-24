import { NavLink } from "react-router-dom";

type HeaderProps = {
  themeLabel: string;
  onToggleTheme: () => void;
};

export default function Header({ themeLabel, onToggleTheme }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-brand">
        <span className="eyebrow">DeMoviefy</span>
        <nav className="header-navigation">
          <NavLink to="/" end className={({ isActive }) => `header-link${isActive ? " is-active" : ""}`}>
            Home
          </NavLink>
          <NavLink to="/upload" className={({ isActive }) => `header-link${isActive ? " is-active" : ""}`}>
            Upload
          </NavLink>
        </nav>
      </div>
      <button type="button" className="ghost-button theme-toggle" onClick={onToggleTheme}>
        {themeLabel}
      </button>
    </header>
  );
}
