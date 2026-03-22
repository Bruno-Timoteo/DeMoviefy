import { type JSX } from "react";

export default function Footer(): JSX.Element {
  const year = new Date().getFullYear();
  return (
    <footer className="app-footer">
      <p>DeMoviefy {year} • videos em uploads/ • resumos em uploads/analysis/</p>
    </footer>
  );
}
