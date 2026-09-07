import { NavLink } from "react-router-dom";

import demoviefyLight from "src/assets/DeMoviefy-Dark.png"


export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white">
      <div className="mx-auto flex h-20 w-full items-center justify-between px-4 lg:px-6">
        <NavLink to="/">
          <img
            src={demoviefyLight}
            alt="DeMoviefy"
            className="h-14 w-auto"
          />
        </NavLink>

        <nav>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `px-4 lg:px-6 text-base transition ${isActive
                ? "text-neutral-900"
                : "text-neutral-500 hover:text-neutral-900"
              }`
              
            }
          >
            Dashboard
          </NavLink>
        </nav>
      </div>
    </header>
  );
}