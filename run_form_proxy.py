"""
Launch DeMoviefy GUI with the IFSP school proxy preconfigured.
"""

import os

import run_form


def main() -> None:
    proxy = "http://proxy.spo.ifsp.edu.br:3128"
    os.environ.setdefault("PROXY_URL", proxy)
    run_form.main(["--proxy", proxy])


if __name__ == "__main__":
    main()
