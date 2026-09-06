import { type JSX } from "react";
import { FaGithub } from "react-icons/fa";

export default function Footer(): JSX.Element {
    const year = new Date().getFullYear();

    return (
        <footer>
            <div className="flex w-full items-center justify-between px-4 py-6 lg:px-8">
                <p className="text-sm text-neutral-500">
                    Copyright &copy; DeMoviefy {year}
                </p>

                <a
                    href="https://github.com/DeMoviefy/DeMoviefy"
                    rel="noopener noreferrer"
                    aria-label="GitHub do DeMoviefy"
                    className="shrink-0 text-neutral-500 transition hover:text-neutral-900"
                >
                    <FaGithub className="h-8 w-8" />
                </a>
            </div>
        </footer>
    );
}