from gui.main_window import LauncherForm

def main():

    if (input("Aplicar proxy da escola? (Y/n) ").lower() == "y"):
        proxy = "http://proxy.spo.ifsp.edu.br:3128"
    else:
        proxy = None

    app = LauncherForm(proxy_url=proxy)
    app.mainloop()

if __name__ == "__main__":
    main()