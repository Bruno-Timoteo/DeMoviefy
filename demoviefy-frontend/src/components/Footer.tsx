import { type JSX } from "react";

export default function Footer(): JSX.Element {

  const year = new Date().getFullYear();

  return (
    <footer className="p-6 mx-auto">
      &copy; DeMoviefy {year}
    </footer>
  );
}
