import { NavLink } from "react-router-dom";

import demoviefyLight from "src/assets/DeMoviefy-Light.png"

type HeaderProps = {
  themeLabel: string;
  onToggleTheme: () => void;
};

export default function Header({/* themeLabel, onToggleTheme */}: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-brand">
        
        <nav className="header-navigation">
          <NavLink to="/">
            <img src={demoviefyLight} alt="DeMoviefy" className="h-16 w-auto" />
          </NavLink>  

          <NavLink to="/upload" className={({ isActive }) => `header-link${isActive ? " is-active" : ""}`}>
            Upload
          </NavLink>
        </nav>
      </div>
        {/*}
      <button type="button" className="ghost-button theme-toggle" onClick={onToggleTheme}>
        {themeLabel}
      </button>
      {*/}
    </header>
  );
}
